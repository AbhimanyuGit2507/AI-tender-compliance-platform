"""
BidKaro — Document Compilation & Two-Layer Final Audit Router
POST /api/generation/{tender_id}/compile          — Compile sections or complete bid package
GET  /api/generation/{tender_id}/documents        — List generated documents
POST /api/generation/{tender_id}/audit            — Run Two-Layer Pre-Submission Audit
GET  /api/generation/{tender_id}/download/{doc_id}— Download compiled .docx document
"""
from __future__ import annotations

import io
import uuid
from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import (
    CompanyFact,
    CorrigendumChange,
    GeneratedDocument,
    Tenant,
    Tender,
    TenderRequirement,
)
from app.schemas.schemas import DocumentGenerateRequest, GeneratedDocumentRead
from app.services.bid_compiler import BidCompilerService
from app.services.storage import get_storage_backend, make_storage_key

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/generation", tags=["generation"])


@router.post("/{tender_id}/compile")
async def compile_bid_documents(
    tender_id: uuid.UUID,
    body: DocumentGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Compile a specific bid section or complete bid package:
    - Cover Letter, Non-Blacklisting, Bid Validity (deterministic)
    - Technical Methodology, QC Plan, HSE Plan (AI with action placeholders)
    """
    tender_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = tender_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    company_name = tenant.name if tenant else "M/s Bidder Organization"

    # Fetch company facts
    facts_res = await db.execute(
        select(CompanyFact).where(CompanyFact.tenant_id == user.tenant_id)
    )
    facts = facts_res.scalars().all()

    # Fetch corrigenda
    corr_res = await db.execute(
        select(CorrigendumChange).where(
            CorrigendumChange.tender_id == tender_id,
            CorrigendumChange.tenant_id == user.tenant_id,
        )
    )
    corrigenda = corr_res.scalars().all()
    corrigenda_notes = [f"{c.field_name}: {c.updated_text}" for c in corrigenda if c.updated_text]

    compiler = BidCompilerService(user.tenant_id, tender)
    sections: dict[str, str] = {}

    doc_type = body.doc_type.lower()
    custom_fields = body.custom_fields or {}

    signatory = custom_fields.get("authorized_signatory") or custom_fields.get("signatory_name") or ""
    address = custom_fields.get("address") or custom_fields.get("company_address") or ""

    if doc_type in ("cover_letter", "all"):
        sections["cover_letter"] = compiler.generate_cover_letter(
            company_name=company_name,
            authorized_signatory=signatory,
            address=address,
        )

    if doc_type in ("non_blacklisting", "all"):
        sections["non_blacklisting"] = compiler.generate_non_blacklisting_undertaking(
            company_name=company_name,
            authorized_signatory=signatory,
        )

    if doc_type in ("bid_validity", "all"):
        sections["bid_validity"] = compiler.generate_bid_validity_declaration(company_name)

    if doc_type in ("experience_table", "all"):
        projects = [
            f.json_payload for f in facts
            if f.fact_category in ("experience", "project") and f.json_payload
        ]
        sections["experience_table"] = compiler.generate_experience_table(company_name, projects)

    if doc_type in ("tech_methodology", "all"):
        verified_equip = [
            f.raw_value for f in facts if "equipment" in f.fact_category.lower() or "plant" in f.fact_key.lower()
        ]
        sections["tech_methodology"] = await compiler.generate_technical_methodology(
            company_name=company_name,
            corrigenda_notes=corrigenda_notes,
            verified_equipment=verified_equip,
        )

    if doc_type in ("qc_plan", "hse_plan", "all"):
        sections["qc_and_hse_plan"] = await compiler.generate_qc_and_hse_plan(company_name, [])

    # Post-process sections to replace remaining [[ACTION REQUIRED: ...]] placeholders
    if custom_fields:
        import re
        resolved_sections = {}
        for sec_name, sec_text in sections.items():
            text = sec_text
            if "designation" in custom_fields:
                text = re.sub(r"\[\[ACTION REQUIRED:\s*Enter Signatory Designation\s*\]\]", custom_fields["designation"], text, flags=re.I)
            if "place" in custom_fields:
                text = re.sub(r"\[\[ACTION REQUIRED:\s*Place\s*\]\]", custom_fields["place"], text, flags=re.I)
            if "age" in custom_fields:
                text = re.sub(r"\[\[ACTION REQUIRED:\s*Enter Age\s*\]\]", str(custom_fields["age"]), text, flags=re.I)
            if "residential_address" in custom_fields:
                text = re.sub(r"\[\[ACTION REQUIRED:\s*Enter Residential Address\s*\]\]", custom_fields["residential_address"], text, flags=re.I)
            if "authorized_signatory" in custom_fields:
                text = re.sub(r"\[\[ACTION REQUIRED:\s*Enter (?:Authorized Signatory Name|Deponent Name)\s*\]\]", custom_fields["authorized_signatory"], text, flags=re.I)
            if "address" in custom_fields:
                text = re.sub(r"\[\[ACTION REQUIRED:\s*Enter Registered Company Address\s*\]\]", custom_fields["address"], text, flags=re.I)
            for k, v in custom_fields.items():
                if v:
                    text = re.sub(rf"\[\[ACTION REQUIRED:\s*(?:Enter\s*)?{re.escape(k)}.*?\]\]", str(v), text, flags=re.I)
            resolved_sections[sec_name] = text
        sections = resolved_sections

    # Run Two-Layer Pre-Submission Audit
    reqs_res = await db.execute(
        select(TenderRequirement).where(TenderRequirement.tender_id == tender_id)
    )
    reqs = reqs_res.scalars().all()
    audit_findings = await compiler.run_two_layer_audit(
        sections=sections,
        requirements=reqs,
        company_facts=facts,
        corrigenda_count=len(corrigenda),
    )
    audit_findings_dicts = [f.to_dict() for f in audit_findings]

    # Compile to DOCX binary
    docx_bytes = compiler.compile_to_docx(sections, company_name)

    # Store DOCX
    storage = get_storage_backend()
    storage_key = make_storage_key(user.tenant_id, tender.id, f"bid_package_{doc_type}_{int(datetime.now().timestamp())}.docx")
    await storage.put(storage_key, docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    # Save to generated_documents table
    gen_doc = GeneratedDocument(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        tender_id=tender.id,
        doc_type=doc_type,
        version_num=1,
        sections_jsonb=sections,
        docx_storage_key=storage_key,
        audit_findings_jsonb=audit_findings_dicts,
        status="completed",
    )
    db.add(gen_doc)
    await db.commit()
    await db.refresh(gen_doc)

    return {
        "id": str(gen_doc.id),
        "document_id": str(gen_doc.id),
        "tender_id": str(tender_id),
        "doc_type": doc_type,
        "sections": list(sections.keys()),
        "storage_key": storage_key,
        "audit_findings": audit_findings_dicts,
        "status": "completed",
        "message": f"Successfully compiled '{doc_type}' with {len(sections)} section(s).",
    }


@router.get("/{tender_id}/documents")
async def list_generated_documents(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """List all previously generated bid document compilations for this tender."""
    res = await db.execute(
        select(GeneratedDocument)
        .where(
            GeneratedDocument.tender_id == tender_id,
            GeneratedDocument.tenant_id == user.tenant_id,
        )
        .order_by(GeneratedDocument.created_at.desc())
    )
    docs = res.scalars().all()
    return [
        {
            "id": str(d.id),
            "tender_id": str(d.tender_id),
            "doc_type": d.doc_type,
            "version_num": d.version_num,
            "sections": list((d.sections_jsonb or {}).keys()),
            "status": d.status,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.post("/{tender_id}/audit")
async def run_pre_submission_audit(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Two-Layer Pre-Submission Audit:
    - Layer A: Programmatic check for mandatory documents, unresolved [[ACTION REQUIRED]] tags,
               certificate expiries against closing date, and unacknowledged corrigenda.
    - Layer B: Semantic LLM audit checking consistency against tender specifications.
    """
    tender_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = tender_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Fetch latest generated document
    gen_res = await db.execute(
        select(GeneratedDocument)
        .where(
            GeneratedDocument.tender_id == tender_id,
            GeneratedDocument.tenant_id == user.tenant_id,
        )
        .order_by(GeneratedDocument.created_at.desc())
        .limit(1)
    )
    latest_doc = gen_res.scalar_one_or_none()
    sections = latest_doc.sections_jsonb if latest_doc and latest_doc.sections_jsonb else {}

    # Fetch requirements
    req_res = await db.execute(
        select(TenderRequirement).where(
            TenderRequirement.tender_id == tender_id,
            TenderRequirement.tenant_id == user.tenant_id,
            TenderRequirement.is_superseded == False,  # noqa
        )
    )
    requirements = req_res.scalars().all()

    # Fetch company facts
    facts_res = await db.execute(
        select(CompanyFact).where(CompanyFact.tenant_id == user.tenant_id)
    )
    facts = facts_res.scalars().all()

    # Fetch corrigenda count
    corr_res = await db.execute(
        select(CorrigendumChange).where(
            CorrigendumChange.tender_id == tender_id,
            CorrigendumChange.tenant_id == user.tenant_id,
        )
    )
    corrigenda_count = len(corr_res.scalars().all())

    compiler = BidCompilerService(user.tenant_id, tender)
    findings = await compiler.run_two_layer_audit(
        sections=sections,
        requirements=requirements,
        company_facts=facts,
        corrigenda_count=corrigenda_count,
    )

    finding_dicts = [f.to_dict() for f in findings]
    critical_count = sum(1 for f in findings if f.severity == "critical")
    warning_count = sum(1 for f in findings if f.severity == "warning")

    if latest_doc:
        latest_doc.audit_findings_jsonb = finding_dicts
        await db.commit()

    return {
        "tender_id": str(tender_id),
        "total_findings": len(finding_dicts),
        "critical_blockers": critical_count,
        "warnings": warning_count,
        "is_submission_ready": critical_count == 0,
        "findings": finding_dicts,
    }


@router.get("/{tender_id}/download/{doc_id}")
async def download_docx(
    tender_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Download the generated .docx file from object storage."""
    res = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == doc_id,
            GeneratedDocument.tender_id == tender_id,
            GeneratedDocument.tenant_id == user.tenant_id,
        )
    )
    doc = res.scalar_one_or_none()
    if not doc or not doc.docx_storage_key:
        raise HTTPException(status_code=404, detail="Document file not found")

    storage = get_storage_backend()
    content = await storage.get(doc.docx_storage_key)
    if not content:
        raise HTTPException(status_code=404, detail="Stored binary not found")

    filename = f"{doc.doc_type}_{str(tender_id)[:8]}.docx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
