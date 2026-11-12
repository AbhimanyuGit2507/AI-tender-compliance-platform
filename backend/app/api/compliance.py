"""
BidKaro — Compliance & Pre-Bid Query Router
GET  /api/compliance/{tender_id}                  — Get compliance matrix & blockers
POST /api/compliance/{tender_id}/check            — Evaluate company facts vs requirements
GET  /api/compliance/{tender_id}/pre-bid-queries — Export pre-bid clarification requests
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import CompanyFact, ComplianceResult, Tender, TenderRequirement
from app.schemas.schemas import ComplianceMatrixResponse, ComplianceResultRead, PreBidQueryDraft
from app.services.procurement_math import (
    Project,
    calculate_bid_capacity,
    check_all_certificates,
    check_msme_exemption,
    check_similar_work,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/compliance", tags=["compliance"])


@router.get("/{tender_id}", response_model=ComplianceMatrixResponse)
async def get_compliance_matrix(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Fetch the full 10-state compliance matrix for a tender."""
    # Verify tender ownership
    tender_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = tender_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Fetch results joined with requirements
    res = await db.execute(
        select(ComplianceResult, TenderRequirement)
        .join(TenderRequirement, ComplianceResult.requirement_id == TenderRequirement.id)
        .where(
            ComplianceResult.tender_id == tender_id,
            ComplianceResult.tenant_id == user.tenant_id,
            TenderRequirement.is_superseded == False,  # noqa
        )
    )
    rows = res.all()

    items = []
    blockers = []
    compliant_count = 0
    non_compliant_count = 0
    missing_count = 0

    for comp, req in rows:
        draft = comp.pre_bid_query_draft
        if isinstance(draft, str) and draft.strip().startswith("{"):
            try:
                draft = json.loads(draft)
            except Exception:
                pass
        item = ComplianceResultRead(
            id=comp.id,
            tender_id=comp.tender_id,
            requirement_id=comp.requirement_id,
            status=comp.status,  # type: ignore
            company_value_display=comp.company_value_display,
            deterministic_pass=comp.deterministic_pass,
            rationale=comp.rationale,
            pre_bid_query_draft=draft,
            requirement=req,
        )
        items.append(item)

        if comp.status == "COMPLIANT":
            compliant_count += 1
        elif comp.status == "NON_COMPLIANT":
            non_compliant_count += 1
            if req.is_mandatory:
                blockers.append(item)
        elif comp.status in ("MISSING", "UNVERIFIED"):
            missing_count += 1

    return ComplianceMatrixResponse(
        tender_id=tender_id,
        readiness_score=tender.readiness_score,
        total_requirements=len(items),
        compliant_count=compliant_count,
        non_compliant_count=non_compliant_count,
        missing_count=missing_count,
        disqualification_blockers=blockers,
        items=items,
    )


@router.post("/{tender_id}/check")
async def run_compliance_check(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Deterministically re-evaluate all tender requirements against the tenant's company facts
    using the Indian Procurement Math Engine.
    """
    tender_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = tender_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Fetch active requirements
    reqs_res = await db.execute(
        select(TenderRequirement).where(
            TenderRequirement.tender_id == tender_id,
            TenderRequirement.tenant_id == user.tenant_id,
            TenderRequirement.is_superseded == False,  # noqa
        )
    )
    requirements = reqs_res.scalars().all()

    # Fetch company facts
    facts_res = await db.execute(
        select(CompanyFact).where(CompanyFact.tenant_id == user.tenant_id)
    )
    facts = facts_res.scalars().all()

    # Pre-parse company projects and certificates
    projects: list[Project] = []
    certs: list[dict] = []
    turnovers: dict[int, float] = {}
    is_msme = False
    is_startup = False

    for f in facts:
        if (f.fact_category in ("experience", "project") or "project" in f.fact_category.lower()) and f.numeric_value:
            year = f.json_payload.get("completion_year", 2024) if f.json_payload else 2024
            projects.append(Project(name=f.fact_key, value_inr=float(f.numeric_value), completion_year=year))
        elif f.fact_category == "certification" and f.valid_until:
            certs.append({"name": f.fact_key, "expiry_date": f.valid_until})
        elif (f.fact_category in ("financial", "turnover") or "turnover" in f.fact_category.lower() or "turnover" in f.fact_key.lower()) and f.numeric_value:
            year = f.json_payload.get("year", 2024) if f.json_payload else 2024
            turnovers[year] = float(f.numeric_value)
        elif any(k in f.fact_key.lower() or k in f.fact_category.lower() for k in ("msme", "udyam")):
            is_msme = True
        elif any(k in f.fact_key.lower() or k in f.fact_category.lower() for k in ("startup", "dpiit")):
            is_startup = True

    evaluated_count = 0
    compliant_count = 0

    for req in requirements:
        cat = req.category.lower()
        title_lower = req.title.lower()
        status_val = "UNVERIFIED"
        comp_display = None
        pass_det = None
        rationale = ""
        draft_query = None

        if "similar work" in title_lower or cat == "experience":
            # Check 3/2/1 similar work rule
            est_val = float(tender.estimated_value_inr or 10_00_00_000.0)
            sw_res = check_similar_work(projects, est_val, evaluation_year=tender.closing_at.year if tender.closing_at else 2026)
            pass_det = sw_res.passes
            status_val = "COMPLIANT" if sw_res.passes else "NON_COMPLIANT"
            comp_display = f"Best: ₹{sw_res.company_value_inr / 1_00_00_000:.2f} Cr"
            rationale = f"Evaluated under rule {sw_res.rule_triggered}. Required ₹{sw_res.threshold_inr / 1_00_00_000:.2f} Cr."
            if not sw_res.passes:
                draft_query = {
                    "clause_ref": req.clause_ref or "Similar Work Clause",
                    "existing_provision": req.exact_snippet or req.title,
                    "requested_relaxation": "Request relaxation of single work value or allow JV/consortium experience aggregation.",
                    "justification": f"Company has executed substantial infrastructure works and meets overall financial solvency.",
                }

        elif "turnover" in title_lower:
            avg_val = sum(turnovers.values()) / max(len(turnovers), 1)
            req_val = float(req.numeric_value) if req.numeric_value else 0.0
            comp_display = f"Avg: ₹{avg_val / 1_00_00_000:.2f} Cr"
            if req_val > 0:
                pass_det = avg_val >= req_val
                status_val = "COMPLIANT" if pass_det else "NON_COMPLIANT"
                rationale = f"Average turnover of ₹{avg_val / 1_00_00_000:.2f} Cr vs required ₹{req_val / 1_00_00_000:.2f} Cr."
            else:
                status_val = "NEEDS_REVIEW"
                rationale = "No explicit numeric turnover threshold parsed."

        elif "emd" in title_lower or "earnest money" in title_lower:
            ex_res = check_msme_exemption("works", is_msme, is_startup, float(req.numeric_value or 0))
            if ex_res["emd_exempt"]:
                status_val = "EXEMPTION_AVAILABLE"
                comp_display = "MSME Exemption Available"
                rationale = "; ".join(ex_res["relaxations"])
                pass_det = True
            else:
                status_val = "COMPLIANT"
                comp_display = f"EMD required: ₹{(req.numeric_value or 0):,.2f}"
                rationale = "EMD to be deposited via BG/FDR per tender provisions."
                pass_det = True

        elif "certificate" in cat or any(k in title_lower for k in ("iso", "license", "registration")):
            closing_dt = tender.closing_at or datetime.now()
            matching_cert = next((c for c in certs if c["name"].lower() in title_lower or title_lower in c["name"].lower()), None)
            if matching_cert:
                cert_res = check_all_certificates([matching_cert], closing_dt)
                if cert_res and cert_res[0].is_valid:
                    status_val = "COMPLIANT"
                    comp_display = f"Valid (expires {cert_res[0].expiry_date.strftime('%d-%b-%Y')})"
                    pass_det = True
                    rationale = f"Certificate remains valid past tender closing date ({closing_dt.strftime('%d-%b-%Y')})."
                else:
                    status_val = "NON_COMPLIANT"
                    comp_display = f"Expired before closing"
                    pass_det = False
                    rationale = f"Certificate expires before tender closing date ({closing_dt.strftime('%d-%b-%Y')})."
            else:
                status_val = "MISSING"
                comp_display = "Certificate not found in profile"
                rationale = "No matching certification uploaded in company documents."

        # Upsert compliance result
        existing_res = await db.execute(
            select(ComplianceResult).where(
                ComplianceResult.tender_id == tender_id,
                ComplianceResult.requirement_id == req.id,
            )
        )
        comp_record = existing_res.scalar_one_or_none()
        draft_str = json.dumps(draft_query) if isinstance(draft_query, dict) else draft_query
        if comp_record:
            comp_record.status = status_val
            comp_record.company_value_display = comp_display
            comp_record.deterministic_pass = pass_det
            comp_record.rationale = rationale
            comp_record.pre_bid_query_draft = draft_str
        else:
            comp_record = ComplianceResult(
                id=uuid.uuid4(),
                tenant_id=user.tenant_id,
                tender_id=tender_id,
                requirement_id=req.id,
                status=status_val,
                company_value_display=comp_display,
                deterministic_pass=pass_det,
                rationale=rationale,
                pre_bid_query_draft=draft_str,
            )
            db.add(comp_record)

        evaluated_count += 1
        if status_val in ("COMPLIANT", "EXEMPTION_AVAILABLE"):
            compliant_count += 1

    # Update readiness score on Tender
    new_readiness = int((compliant_count / max(evaluated_count, 1)) * 100)
    tender.readiness_score = new_readiness
    await db.commit()

    overall_status = "COMPLIANT" if compliant_count == evaluated_count and evaluated_count > 0 else (
        "PARTIALLY_COMPLIANT" if compliant_count > 0 else "NON_COMPLIANT"
    )

    return {
        "tender_id": str(tender_id),
        "evaluated_requirements": evaluated_count,
        "compliant_count": compliant_count,
        "overall_status": overall_status,
        "readiness_score": new_readiness,
        "message": f"Evaluated {evaluated_count} requirements. Readiness score updated to {new_readiness}%.",
    }


@router.get("/{tender_id}/pre-bid-queries")
async def get_pre_bid_queries(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Auto-generate a formal Pre-Bid Clarification Request Table
    (Clause | Existing Provision | Requested Relaxation | Justification)
    for all NON_COMPLIANT or restrictive clauses.
    """
    res = await db.execute(
        select(ComplianceResult, TenderRequirement)
        .join(TenderRequirement, ComplianceResult.requirement_id == TenderRequirement.id)
        .where(
            ComplianceResult.tender_id == tender_id,
            ComplianceResult.tenant_id == user.tenant_id,
            ComplianceResult.status.in_(["NON_COMPLIANT", "NEEDS_REVIEW", "CONFLICTING"]),
        )
    )
    rows = res.all()

    queries = []
    for comp, req in rows:
        if comp.pre_bid_query_draft:
            queries.append(comp.pre_bid_query_draft)
        else:
            queries.append({
                "clause_ref": req.clause_ref or "Clause Reference",
                "existing_provision": req.exact_snippet or req.title,
                "requested_relaxation": "Request clarification / relaxation to allow broader competitive participation.",
                "justification": comp.rationale or "To ensure level playing field and competitive bidding in public interest.",
            })

    return {
        "tender_id": str(tender_id),
        "total_queries": len(queries),
        "queries": queries,
    }
