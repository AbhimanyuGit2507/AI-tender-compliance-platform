"""
BidKaro — Company Vault, Profile & Evidence Base Router
GET    /api/company/vault                — Get complete Company Vault profile & facts
PUT    /api/company/vault                — Update company entity, financial capacity & onboarding
POST   /api/company/projects             — Add past executed project (for 1x80/2x50/3x40 checks)
DELETE /api/company/projects/{id}        — Delete project
POST   /api/company/certificates         — Add compliance certificate with expiry date
DELETE /api/company/certificates/{id}   — Delete certificate
GET    /api/company/credits              — Get live credit balance and transaction history
GET    /api/company/facts                — Get verified company evidence base
POST   /api/company/facts                — Create or update company fact
POST   /api/company/upload-old-bid       — 'Drop Old Bid to Auto-Fill Profile' dropzone
"""
from __future__ import annotations

import io
import uuid
from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import CompanyFact, CreditLedgerEntry, Tenant
from app.schemas.schemas import CompanyFactCreate, CompanyFactRead
from app.services.llm_router import LLMTier, get_llm_router

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/company", tags=["company"])


# ── Schemas for Vault ────────────────────────────────────────────────

class TurnoverItem(BaseModel):
    year: int
    value_inr: float
    display: str | None = None


class CompanyVaultUpdateRequest(BaseModel):
    company_name: str | None = None
    business_type: str | None = None
    industry_sector: str | None = None
    location: str | None = None
    gstin: str | None = None
    pan: str | None = None
    is_msme: bool | None = None
    msme_reg_no: str | None = None
    is_startup: bool | None = None
    startup_reg_no: str | None = None
    registration_year: int | None = None
    turnovers: list[TurnoverItem] | None = None
    max_turnover_a: float | None = None
    active_commitments_b: float | None = None
    net_worth: float | None = None
    solvency_inr: float | None = None


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    client: str = Field(..., min_length=2)
    value_inr: float = Field(..., gt=0)
    completion_year: int = Field(default=2024)
    category: str | None = "Infrastructure & Civil"


class CertificateCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    issuer: str | None = None
    valid_from: datetime | None = None
    valid_until: datetime
    doc_ref: str | None = None


# ── 1. Complete Company Vault CRUD ───────────────────────────────────

@router.get("/vault")
async def get_company_vault(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Returns the authenticated tenant's complete Company Profile & Vault."""
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    facts_res = await db.execute(
        select(CompanyFact).where(CompanyFact.tenant_id == user.tenant_id)
    )
    facts = facts_res.scalars().all()

    # Extract fields
    gstin = None
    pan = None
    business_type = None
    industry_sector = None
    location = None
    signatory_name = None
    signatory_kyc = None
    is_msme = False
    msme_reg_no = None
    is_startup = False
    startup_reg_no = None
    registration_year = 2018
    max_turnover_a = 0.0
    active_commitments_b = 0.0
    net_worth = 0.0
    solvency_inr = 0.0
    onboarding_completed = False

    turnovers_dict: dict[int, float] = {}
    projects: list[dict[str, Any]] = []
    certificates: list[dict[str, Any]] = []

    for f in facts:
        cat = f.fact_category.lower()
        key = f.fact_key.lower()

        if key in ("gstin", "registration_gstin"):
            gstin = f.raw_value
        elif key in ("pan", "registration_pan"):
            pan = f.raw_value
        elif key in ("business_type", "primary_business_type"):
            business_type = f.raw_value
        elif key in ("industry_sector", "sector"):
            industry_sector = f.raw_value
        elif key in ("location", "region_of_operations"):
            location = f.raw_value
        elif key == "signatory_name":
            signatory_name = f.raw_value
        elif key in ("signatory_kyc", "signatory_aadhaar"):
            signatory_kyc = f.json_payload or {"raw": f.raw_value}
        elif key in ("msme", "udyam"):
            is_msme = True
            msme_reg_no = f.raw_value
        elif key in ("startup", "dpiit"):
            is_startup = True
            startup_reg_no = f.raw_value
        elif key == "registration_year" and f.numeric_value:
            registration_year = int(f.numeric_value)
        elif key == "max_turnover_a" and f.numeric_value:
            max_turnover_a = float(f.numeric_value)
        elif key == "active_commitments_b" and f.numeric_value:
            active_commitments_b = float(f.numeric_value)
        elif key == "net_worth" and f.numeric_value:
            net_worth = float(f.numeric_value)
        elif key == "solvency_inr" and f.numeric_value:
            solvency_inr = float(f.numeric_value)
        elif key == "onboarding_completed":
            onboarding_completed = True
        elif cat in ("financial", "turnover") and "turnover" in key and f.numeric_value:
            year = f.json_payload.get("year", 2024) if f.json_payload else 2024
            turnovers_dict[year] = float(f.numeric_value)
        elif cat in ("experience", "project") and f.numeric_value:
            payload = f.json_payload or {}
            projects.append({
                "id": str(f.id),
                "name": payload.get("name") or f.fact_key,
                "client": payload.get("client") or "Public Sector Client",
                "value_inr": float(f.numeric_value),
                "completion_year": payload.get("completion_year") or 2024,
                "category": payload.get("category") or "Infrastructure",
                "raw_value": f.raw_value,
            })
        elif cat == "certification" and f.valid_until:
            payload = f.json_payload or {}
            certificates.append({
                "id": str(f.id),
                "name": f.fact_key,
                "issuer": payload.get("issuer") or "Accredited Registrar",
                "valid_from": f.valid_from.isoformat() if f.valid_from else None,
                "expiry_date": f.valid_until.isoformat(),
                "doc_ref": payload.get("doc_ref") or "CERT-VERIFIED",
            })

    # Prepare sorted turnovers
    turnover_list = []
    for y in sorted(turnovers_dict.keys(), reverse=True):
        val = turnovers_dict[y]
        turnover_list.append({
            "year": y,
            "value_inr": val,
            "display": f"₹{val / 1_00_00_000:.2f} Cr",
        })

    if not max_turnover_a and turnover_list:
        max_turnover_a = max(t["value_inr"] for t in turnover_list)

    return {
        "tenant_id": str(tenant.id),
        "company_name": tenant.name,
        "gstin": gstin,
        "pan": pan,
        "business_type": business_type,
        "industry_sector": industry_sector,
        "location": location,
        "signatory_name": signatory_name,
        "signatory_kyc": signatory_kyc,
        "is_msme": is_msme,
        "msme_reg_no": msme_reg_no,
        "is_startup": is_startup,
        "startup_reg_no": startup_reg_no,
        "registration_year": registration_year,
        "turnovers": turnover_list,
        "max_turnover_a": max_turnover_a,
        "active_commitments_b": active_commitments_b,
        "net_worth": net_worth,
        "solvency_inr": solvency_inr,
        "projects": projects,
        "certificates": certificates,
        "onboarding_completed": onboarding_completed or len(turnover_list) > 0,
        "credit_balance": tenant.credit_balance,
        "plan_tier": tenant.plan_tier,
    }


@router.put("/vault")
async def update_company_vault(
    body: CompanyVaultUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Updates company entity details, financial capacity, and onboarding state."""
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if body.company_name:
        tenant.name = body.company_name.strip()

    async def _upsert_fact(category: str, key: str, raw: str | None, num: float | None = None, payload: dict | None = None):
        res = await db.execute(
            select(CompanyFact).where(
                CompanyFact.tenant_id == user.tenant_id,
                CompanyFact.fact_key == key,
            )
        )
        fact = res.scalar_one_or_none()
        if fact:
            fact.fact_category = category
            fact.raw_value = raw
            fact.numeric_value = num
            fact.json_payload = payload
            fact.verification_status = "verified"
            fact.confidence = 1.0
        else:
            fact = CompanyFact(
                id=uuid.uuid4(),
                tenant_id=user.tenant_id,
                fact_category=category,
                fact_key=key,
                raw_value=raw,
                numeric_value=num,
                json_payload=payload,
                verification_status="verified",
                confidence=1.0,
            )
            db.add(fact)

    if body.gstin is not None:
        await _upsert_fact("registration", "gstin", body.gstin.strip().upper())
    if body.pan is not None:
        await _upsert_fact("registration", "pan", body.pan.strip().upper())
    if body.business_type is not None:
        await _upsert_fact("registration", "business_type", body.business_type.strip())
    if body.industry_sector is not None:
        await _upsert_fact("registration", "industry_sector", body.industry_sector.strip())
    if body.location is not None:
        await _upsert_fact("registration", "location", body.location.strip())

    if body.is_msme is not None:
        if body.is_msme:
            reg_val = body.msme_reg_no or "UDYAM-VERIFIED"
            await _upsert_fact("registration", "udyam", reg_val)
        else:
            await db.execute(
                delete(CompanyFact).where(
                    CompanyFact.tenant_id == user.tenant_id,
                    CompanyFact.fact_key.in_(["udyam", "msme"]),
                )
            )

    if body.is_startup is not None:
        if body.is_startup:
            s_val = body.startup_reg_no or "DPIIT-VERIFIED"
            await _upsert_fact("registration", "startup", s_val)
        else:
            await db.execute(
                delete(CompanyFact).where(
                    CompanyFact.tenant_id == user.tenant_id,
                    CompanyFact.fact_key.in_(["startup", "dpiit"]),
                )
            )

    if body.registration_year:
        await _upsert_fact("registration", "registration_year", str(body.registration_year), float(body.registration_year))

    if body.max_turnover_a is not None:
        await _upsert_fact("financial", "max_turnover_a", f"₹{body.max_turnover_a / 1e7:.2f} Cr", body.max_turnover_a)
    if body.active_commitments_b is not None:
        await _upsert_fact("financial", "active_commitments_b", f"₹{body.active_commitments_b / 1e7:.2f} Cr", body.active_commitments_b)
    if body.net_worth is not None:
        await _upsert_fact("financial", "net_worth", f"₹{body.net_worth / 1e7:.2f} Cr", body.net_worth)
    if body.solvency_inr is not None:
        await _upsert_fact("financial", "solvency_inr", f"₹{body.solvency_inr / 1e7:.2f} Cr", body.solvency_inr)

    # Upsert turnovers
    if body.turnovers:
        for t in body.turnovers:
            key = f"turnover_fy{t.year}"
            raw = f"Turnover FY {t.year}: ₹{t.value_inr / 1_00_00_000:.2f} Cr"
            payload = {"year": t.year, "value_inr": t.value_inr}
            await _upsert_fact("financial", key, raw, t.value_inr, payload)

    # Mark onboarding complete
    await _upsert_fact("onboarding", "onboarding_completed", "Completed", 1.0)

    await db.commit()
    logger.info("company_vault_updated", tenant_id=str(user.tenant_id))
    return {"status": "success", "message": "Company Vault successfully updated."}


# ── 2. Project Sub-Resource Endpoints ────────────────────────────────

@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def add_company_project(
    body: ProjectCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Add a completed project to the Company Vault (directly feeds 1x80/2x50/3x40 checks)."""
    fact = CompanyFact(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        fact_category="project",
        fact_key=body.name.strip(),
        raw_value=f"{body.name} for {body.client} (₹{body.value_inr / 1_00_00_000:.2f} Cr, {body.completion_year})",
        numeric_value=body.value_inr,
        json_payload={
            "name": body.name.strip(),
            "client": body.client.strip(),
            "value_inr": body.value_inr,
            "completion_year": body.completion_year,
            "category": body.category,
        },
        verification_status="verified",
        confidence=1.0,
    )
    db.add(fact)
    await db.commit()
    await db.refresh(fact)
    logger.info("company_project_added", project_id=str(fact.id), name=body.name)
    return {
        "id": str(fact.id),
        "name": body.name,
        "client": body.client,
        "value_inr": body.value_inr,
        "completion_year": body.completion_year,
        "category": body.category,
    }


@router.delete("/projects/{project_id}")
async def delete_company_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Remove a project from the Company Vault."""
    res = await db.execute(
        select(CompanyFact).where(
            CompanyFact.id == project_id,
            CompanyFact.tenant_id == user.tenant_id,
        )
    )
    fact = res.scalar_one_or_none()
    if not fact:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(fact)
    await db.commit()
    return {"status": "success", "message": "Project removed."}


# ── 3. Certificate Sub-Resource Endpoints ───────────────────────────

@router.post("/certificates", status_code=status.HTTP_201_CREATED)
async def add_company_certificate(
    body: CertificateCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Add a compliance certificate with expiry date."""
    fact = CompanyFact(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        fact_category="certification",
        fact_key=body.name.strip(),
        raw_value=f"{body.name} (Valid until {body.valid_until.strftime('%d-%b-%Y')})",
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        json_payload={
            "name": body.name.strip(),
            "issuer": body.issuer or "Accredited Body",
            "doc_ref": body.doc_ref or "CERT-VERIFIED",
        },
        verification_status="verified",
        confidence=1.0,
    )
    db.add(fact)
    await db.commit()
    await db.refresh(fact)
    logger.info("company_certificate_added", cert_id=str(fact.id), name=body.name)
    return {
        "id": str(fact.id),
        "name": body.name,
        "issuer": body.issuer,
        "expiry_date": body.valid_until.isoformat(),
        "doc_ref": body.doc_ref,
    }


@router.delete("/certificates/{cert_id}")
async def delete_company_certificate(
    cert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Remove a certificate from the Company Vault."""
    res = await db.execute(
        select(CompanyFact).where(
            CompanyFact.id == cert_id,
            CompanyFact.tenant_id == user.tenant_id,
        )
    )
    fact = res.scalar_one_or_none()
    if not fact:
        raise HTTPException(status_code=404, detail="Certificate not found")

    await db.delete(fact)
    await db.commit()
    return {"status": "success", "message": "Certificate removed."}


# ── 4. Live Credit Balance & Transaction History ────────────────────

@router.get("/credits")
async def get_company_credits(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Returns the tenant's current credit balance and recent transactions."""
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    ledger_res = await db.execute(
        select(CreditLedgerEntry)
        .where(CreditLedgerEntry.tenant_id == user.tenant_id)
        .order_by(CreditLedgerEntry.created_at.desc())
        .limit(20)
    )
    entries = ledger_res.scalars().all()

    return {
        "tenant_id": str(tenant.id),
        "credit_balance": tenant.credit_balance,
        "plan_tier": tenant.plan_tier,
        "transactions": [
            {
                "id": str(e.id),
                "operation_type": e.operation_type,
                "credits_delta": e.credits_delta,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ],
    }


# ── 5. Legacy Raw Facts Endpoints ───────────────────────────────────

@router.get("/facts", response_model=list[CompanyFactRead])
async def list_company_facts(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Retrieve all raw company profile facts for the tenant."""
    query = select(CompanyFact).where(CompanyFact.tenant_id == user.tenant_id)
    if category:
        query = query.where(CompanyFact.fact_category == category)
    query = query.order_by(CompanyFact.created_at.desc())

    res = await db.execute(query)
    facts = res.scalars().all()
    return [CompanyFactRead.model_validate(f) for f in facts]


@router.post("/facts", response_model=CompanyFactRead)
async def create_or_update_fact(
    body: CompanyFactCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Create or manually confirm a company fact."""
    existing_res = await db.execute(
        select(CompanyFact).where(
            CompanyFact.tenant_id == user.tenant_id,
            CompanyFact.fact_category == body.fact_category,
            CompanyFact.fact_key == body.fact_key,
        )
    )
    fact = existing_res.scalar_one_or_none()

    if fact:
        fact.raw_value = body.raw_value
        fact.numeric_value = body.numeric_value
        fact.json_payload = body.json_payload
        fact.valid_from = body.valid_from
        fact.valid_until = body.valid_until
        fact.verification_status = "verified"
        fact.confidence = 1.0
    else:
        fact = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=user.tenant_id,
            fact_category=body.fact_category,
            fact_key=body.fact_key,
            raw_value=body.raw_value,
            numeric_value=body.numeric_value,
            json_payload=body.json_payload,
            valid_from=body.valid_from,
            valid_until=body.valid_until,
            source_type="manual",
            verification_status="verified",
            confidence=1.0,
        )
        db.add(fact)

    await db.commit()
    await db.refresh(fact)
    return CompanyFactRead.model_validate(fact)


@router.post("/upload-old-bid")
async def upload_old_bid_to_autofill(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """'Drop Old Bid to Auto-Fill Profile': AI auto-extraction from past bids."""
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 25MB limit")

    text_excerpt = ""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        pages_text = [page.get_text() for page in doc[:15]]
        text_excerpt = "\n".join(pages_text)
    except Exception:
        text_excerpt = content[:50000].decode("utf-8", errors="ignore")

    router_svc = get_llm_router()
    prompt = f"""You are an Indian procurement data extraction specialist.
Analyze this submitted bid document excerpt and extract structured company credentials.
Format strictly as a JSON object with keys:
- "company_name": string
- "turnover": list of {{"year": int, "value_inr": float}}
- "past_projects": list of {{"name": string, "client": string, "value_inr": float, "completion_year": int}}
- "certificates": list of {{"name": string, "valid_until": "YYYY-MM-DD" or null}}
- "registrations": list of {{"type": "GSTIN"|"PAN"|"UDYAM"|"CIN", "number": string}}

Document text:
{text_excerpt[:12000]}"""

    extracted_facts = []
    try:
        resp = await router_svc.generate(
            tier=LLMTier.TIER_1_FAST_TEXT,
            prompt=prompt,
            system_prompt="Return only valid parseable JSON. Do not hallucinate credentials not present in the document.",
            response_json=True,
            max_tokens=2000,
        )

        import json
        clean_json_str = resp.text.strip()
        if "```json" in clean_json_str:
            clean_json_str = clean_json_str.split("```json")[1].split("```")[0].strip()
        parsed = json.loads(clean_json_str)

        for p in parsed.get("past_projects", []):
            fact = CompanyFact(
                id=uuid.uuid4(),
                tenant_id=user.tenant_id,
                fact_category="project",
                fact_key=p.get("name", "Past Project"),
                raw_value=f"{p.get('name')} for {p.get('client')} — ₹{p.get('value_inr', 0):,.2f}",
                numeric_value=p.get("value_inr"),
                json_payload=p,
                source_type="old_bid_ai_extracted",
                verification_status="unverified",
                confidence=0.85,
            )
            db.add(fact)
            extracted_facts.append(fact)

        for t in parsed.get("turnover", []):
            fact = CompanyFact(
                id=uuid.uuid4(),
                tenant_id=user.tenant_id,
                fact_category="financial",
                fact_key=f"turnover_fy{t.get('year')}",
                raw_value=f"Annual Turnover FY{t.get('year')}: ₹{t.get('value_inr', 0):,.2f}",
                numeric_value=t.get("value_inr"),
                json_payload=t,
                source_type="old_bid_ai_extracted",
                verification_status="unverified",
                confidence=0.90,
            )
            db.add(fact)
            extracted_facts.append(fact)

        for c in parsed.get("certificates", []):
            exp_date = None
            if c.get("valid_until"):
                try:
                    exp_date = datetime.strptime(c["valid_until"], "%Y-%m-%d")
                except Exception:
                    pass
            fact = CompanyFact(
                id=uuid.uuid4(),
                tenant_id=user.tenant_id,
                fact_category="certification",
                fact_key=c.get("name", "Certification"),
                raw_value=c.get("name", "Certification"),
                valid_until=exp_date,
                json_payload=c,
                source_type="old_bid_ai_extracted",
                verification_status="unverified",
                confidence=0.88,
            )
            db.add(fact)
            extracted_facts.append(fact)

        await db.commit()

    except Exception as e:
        logger.warning("old_bid_extraction_partial", error=str(e))

    return {
        "status": "success",
        "extracted_candidate_facts_count": len(extracted_facts),
        "message": f"Successfully extracted {len(extracted_facts)} candidate facts. Please review and confirm in your Company Profile.",
    }
