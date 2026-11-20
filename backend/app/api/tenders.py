"""
BidKaro — Upload & Tender Management Router
POST /api/tenders/upload     — Upload tender document(s)
GET  /api/tenders            — List tenant's tenders
GET  /api/tenders/{id}       — Get single tender with summary
DELETE /api/tenders/{id}     — Delete tender
GET  /api/tenders/{id}/status — Poll ingestion status via SSE
"""
from __future__ import annotations

import asyncio
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, get_optional_user
from app.models import ComplianceResult, GeneratedDocument, ParsedArtifact, Tender, TenderDocument, TenderRequirement
from app.services.storage import get_storage_backend, make_storage_key
from app.workers.tasks_ingestion import ingest_document_task

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/tenders", tags=["tenders"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".zip"}
MAX_UPLOAD_SIZE_MB = 50


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_tender(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    tender_title: str = Form(default="Untitled Tender"),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser | None = Depends(get_optional_user),
):
    """
    Upload one or more tender files (PDF, DOCX, XLSX, ZIP).
    Works for anonymous users (Stage 0) and authenticated users.
    Returns immediately with task IDs; use SSE endpoint to poll progress.
    """
    from pathlib import Path

    # ── Resolve tenant (anonymous or authenticated) ──────────────────
    if user:
        tenant_id = user.tenant_id
        tenant_id_str = str(tenant_id)
    else:
        # Anonymous: use a session-scoped ephemeral tenant ID
        # Real implementation: create anon tenant on demand
        tenant_id = uuid.uuid4()
        tenant_id_str = str(tenant_id)

    # ── Create Tender record ─────────────────────────────────────────
    tender = Tender(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        title=tender_title,
        status="pending",
    )
    db.add(tender)
    await db.flush()

    uploaded_docs = []
    storage = get_storage_backend()

    for file in files:
        # Validate extension
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{ext}' not supported. Allowed: {ALLOWED_EXTENSIONS}",
            )

        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        if size_mb > MAX_UPLOAD_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds {MAX_UPLOAD_SIZE_MB}MB limit.",
            )

        # Determine document category from filename heuristics
        fname_lower = (file.filename or "").lower()
        if "corrigendum" in fname_lower or "addendum" in fname_lower:
            category = "corrigendum"
            is_corrigendum = True
        elif "boq" in fname_lower or "bill" in fname_lower:
            category = "boq"
            is_corrigendum = False
        elif "nit" in fname_lower:
            category = "nit"
            is_corrigendum = False
        elif ext in (".xlsx", ".xls"):
            category = "boq"
            is_corrigendum = False
        else:
            category = "tender"
            is_corrigendum = False

        # Store file
        storage_key = make_storage_key(tenant_id, tender.id, file.filename or "document")
        await storage.put(storage_key, content, file.content_type or "application/octet-stream")

        # Create TenderDocument record
        doc = TenderDocument(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender.id,
            filename=file.filename or "document",
            doc_category=category,
            storage_key=storage_key,
            is_corrigendum=is_corrigendum,
            processing_status="queued",
        )
        db.add(doc)
        uploaded_docs.append({
            "doc": doc,
            "doc_id": str(doc.id),
            "filename": file.filename,
            "category": category,
            "storage_key": storage_key,
            "is_corrigendum": is_corrigendum,
            "size_mb": round(size_mb, 2),
        })

    # Commit Tender and TenderDocument records to database first
    # This guarantees child ingestion sessions can immediately read and update the rows
    await db.commit()

    from app.services.redis_events import is_redis_available
    from app.services.ingestion import run_direct_ingestion

    redis_up = is_redis_available()
    results_docs = []

    for item in uploaded_docs:
        doc = item["doc"]
        task_id = f"bg-{uuid.uuid4().hex[:12]}"
        task_dispatched = False

        if redis_up:
            try:
                task = ingest_document_task.apply_async(
                    kwargs={
                        "tenant_id": str(tenant_id),
                        "tender_id": str(tender.id),
                        "doc_id": item["doc_id"],
                        "storage_key": item["storage_key"],
                        "filename": item["filename"],
                        "doc_category": item["category"],
                        "is_corrigendum": item["is_corrigendum"],
                    }
                )
                task_id = task.id
                task_dispatched = True
            except Exception as celery_err:
                logger.warning("celery_dispatch_failed_using_background_tasks", error=str(celery_err))

        if not task_dispatched:
            logger.info("dispatching_direct_ingestion_task", tender_id=str(tender.id), doc_id=item["doc_id"])
            asyncio.create_task(
                run_direct_ingestion(
                    tenant_id=str(tenant_id),
                    tender_id=str(tender.id),
                    doc_id=item["doc_id"],
                    storage_key=item["storage_key"],
                    filename=item["filename"] or "document",
                    doc_category=item["category"],
                    is_corrigendum=item["is_corrigendum"],
                )
            )

        results_docs.append({
            "doc_id": item["doc_id"],
            "filename": item["filename"],
            "category": item["category"],
            "task_id": task_id,
            "size_mb": item["size_mb"],
        })

    logger.info("upload_complete", tender_id=str(tender.id), docs=len(results_docs))

    return {
        "tender_id": str(tender.id),
        "tenant_id": tenant_id_str,
        "documents": results_docs,
        "status": "processing",
        "message": f"Uploaded {len(results_docs)} document(s). Processing in background.",
    }


@router.get("")
async def list_tenders(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """List all tenders for the authenticated tenant with requirement counts."""
    result = await db.execute(
        select(Tender)
        .where(Tender.tenant_id == user.tenant_id)
        .order_by(Tender.created_at.desc())
        .limit(50)
    )
    tenders = result.scalars().all()

    # Get requirement counts per tender
    counts_res = await db.execute(
        select(
            TenderRequirement.tender_id,
            func.count(TenderRequirement.id),
        )
        .where(TenderRequirement.tenant_id == user.tenant_id)
        .group_by(TenderRequirement.tender_id)
    )
    req_counts = dict(counts_res.all())

    return [
        {
            "id": str(t.id),
            "title": t.title,
            "authority": t.authority,
            "reference_no": t.reference_no,
            "closing_at": t.closing_at.isoformat() if t.closing_at else None,
            "estimated_value_inr": float(t.estimated_value_inr) if t.estimated_value_inr else None,
            "emd_inr": float(t.emd_inr) if t.emd_inr else None,
            "readiness_score": t.readiness_score,
            "status": t.status,
            "requirements_count": req_counts.get(t.id, 0),
            "created_at": t.created_at.isoformat(),
        }
        for t in tenders
    ]


@router.get("/{tender_id}")
async def get_tender(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser | None = Depends(get_optional_user),
):
    """Get full tender details including requirements, generated documents, and compliance results."""
    query = select(Tender).where(Tender.id == tender_id)
    if user:
        query = query.where(Tender.tenant_id == user.tenant_id)
    result = await db.execute(query)
    tender = result.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Fetch documents with page count from parsed_artifacts
    docs_result = await db.execute(
        select(TenderDocument, ParsedArtifact.page_count)
        .outerjoin(ParsedArtifact, TenderDocument.file_sha256 == ParsedArtifact.file_sha256)
        .where(TenderDocument.tender_id == tender_id)
    )
    docs_with_pages = docs_result.all()
    page_counts = [page_count for _, page_count in docs_with_pages if page_count]
    total_pages = max(page_counts) if page_counts else 1

    # Fetch requirements
    reqs_result = await db.execute(
        select(TenderRequirement)
        .where(TenderRequirement.tender_id == tender_id)
        .order_by(TenderRequirement.created_at.asc())
    )
    reqs = reqs_result.scalars().all()

    # Fetch generated documents
    gendocs_result = await db.execute(
        select(GeneratedDocument)
        .where(GeneratedDocument.tender_id == tender_id)
        .order_by(GeneratedDocument.created_at.desc())
    )
    gendocs = gendocs_result.scalars().all()

    # Fetch latest compliance results
    comp_result = await db.execute(
        select(ComplianceResult).where(ComplianceResult.tender_id == tender_id)
    )
    comp_records = comp_result.scalars().all()

    return {
        "id": str(tender.id),
        "title": tender.title,
        "authority": tender.authority,
        "reference_no": tender.reference_no,
        "closing_at": tender.closing_at.isoformat() if tender.closing_at else None,
        "estimated_value_inr": float(tender.estimated_value_inr) if tender.estimated_value_inr else None,
        "emd_inr": float(tender.emd_inr) if tender.emd_inr else None,
        "pbg_percent": float(tender.pbg_percent) if tender.pbg_percent else None,
        "contract_period_years": float(tender.contract_period_years) if tender.contract_period_years else None,
        "evaluation_type": tender.evaluation_type,
        "readiness_score": tender.readiness_score,
        "page_count": total_pages,
        "status": tender.status,
        "summary": tender.summary_jsonb,
        "documents": [
            {
                "id": str(d.id),
                "filename": d.filename,
                "category": d.doc_category,
                "status": d.processing_status,
                "is_corrigendum": d.is_corrigendum,
                "page_count": page_count or 1,
                "created_at": d.created_at.isoformat(),
            }
            for d, page_count in docs_with_pages
        ],
        "requirements": [
            {
                "id": str(r.id),
                "clause_ref": r.clause_ref,
                "category": r.category,
                "title": r.title,
                "mandatory": r.is_mandatory,
                "is_mandatory": r.is_mandatory,
                "page_number": r.page_number,
                "exact_snippet": r.exact_snippet,
                "numeric_value": float(r.numeric_value) if r.numeric_value else None,
                "unit": r.unit,
                "is_superseded": r.is_superseded,
            }
            for r in reqs
        ],
        "generated_documents": [
            {
                "id": str(gd.id),
                "doc_type": gd.doc_type,
                "version_num": gd.version_num,
                "sections": list(gd.sections_jsonb.keys()) if gd.sections_jsonb else [],
                "docx_storage_key": gd.docx_storage_key,
                "audit_findings": gd.audit_findings_jsonb or [],
                "status": gd.status,
                "created_at": gd.created_at.isoformat(),
            }
            for gd in gendocs
        ],
        "compliance_results": [
            {
                "requirement_id": str(c.requirement_id),
                "status": c.status,
                "company_value_display": c.company_value_display,
                "deterministic_pass": c.deterministic_pass,
                "rationale": c.rationale,
                "pre_bid_query_draft": c.pre_bid_query_draft,
            }
            for c in comp_records
        ],
    }


@router.get("/{tender_id}/pages/{page_number}/image")
async def get_tender_page_image(
    tender_id: uuid.UUID,
    page_number: int,
    highlight_clause: str | None = None,
    highlight_text: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser | None = Depends(get_optional_user),
):
    """
    Renders page_number (1-indexed) of the tender PDF at 150 DPI to PNG bytes.
    Optionally highlights cited clause text/numbers using PyMuPDF annotations.
    Returns 404 if the document or page is not available.
    """
    if page_number < 1:
        raise HTTPException(status_code=400, detail="Page number must be >= 1")

    # Find primary tender document
    query = select(TenderDocument).where(
        TenderDocument.tender_id == tender_id,
        TenderDocument.doc_category.in_(["nit", "tender"]),
    ).order_by(TenderDocument.created_at.asc())
    res = await db.execute(query)
    doc = res.scalar_one_or_none()
    if not doc:
        res2 = await db.execute(
            select(TenderDocument).where(TenderDocument.tender_id == tender_id)
        )
        doc = res2.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="No tender document found")

    storage = get_storage_backend()
    try:
        pdf_bytes = await storage.get(doc.storage_key)
    except Exception:
        raise HTTPException(status_code=404, detail="Document file not found in storage")

    try:
        import fitz
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if page_number > len(pdf_doc):
            raise HTTPException(status_code=404, detail=f"Page {page_number} exceeds document page count {len(pdf_doc)}")
        page = pdf_doc.load_page(page_number - 1)

        # Highlight clause or text if requested
        if highlight_clause or highlight_text:
            search_terms = []
            if highlight_clause:
                search_terms.append(highlight_clause.strip())
                # If clause is "Clause 22.9", also search for "22.9"
                clean_num = re.sub(r"[^\d.]", "", highlight_clause).strip()
                if clean_num and clean_num != highlight_clause:
                    search_terms.append(clean_num)
            if highlight_text:
                # Add snippet prefix
                clean_snippet = re.sub(r"\s+", " ", highlight_text).strip()
                if len(clean_snippet) > 8:
                    search_terms.append(clean_snippet[:40])

            highlight_applied = False
            for term in search_terms:
                if len(term) < 2:
                    continue
                quads = page.search_for(term)
                if quads:
                    for quad in quads:
                        annot = page.add_highlight_annot(quad)
                        annot.set_colors(stroke=(1.0, 0.65, 0.05))  # Electric Amber
                        annot.update()
                    highlight_applied = True
                    break

        pix = page.get_pixmap(dpi=150)
        png_bytes = pix.tobytes("png")
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Cache-Control": "private, max-age=300" if (highlight_clause or highlight_text) else "public, max-age=86400",
                "Content-Disposition": f"inline; filename=page_{page_number}.png",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("render_pdf_page_failed", error=str(e), tender_id=str(tender_id), page=page_number)
        raise HTTPException(status_code=500, detail="Failed to render page image")


@router.get("/{tender_id}/status")
async def tender_status_sse(
    tender_id: uuid.UUID,
    request: Request,
    user: CurrentUser | None = Depends(get_optional_user),
):
    """
    Server-Sent Events stream for real-time ingestion progress.
    Subscribes to Redis Pub/Sub channel tender_events:{tender_id}.
    Includes a 15-second keep-alive comment ping.
    """
    from app.services.redis_events import stream_tender_events

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        stream_tender_events(tender_id),
        media_type="text/event-stream",
        headers=headers,
    )


@router.post("/{tender_id}/process")
async def process_tender(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Trigger or retry background analysis for queued tender documents.
    Runs direct ingestion in-process if Celery is not active.
    """
    res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    docs_res = await db.execute(
        select(TenderDocument).where(TenderDocument.tender_id == tender_id)
    )
    docs = docs_res.scalars().all()
    triggered = []

    from app.services.ingestion import run_direct_ingestion
    for d in docs:
        asyncio.create_task(
            run_direct_ingestion(
                tenant_id=str(user.tenant_id),
                tender_id=str(tender_id),
                doc_id=str(d.id),
                storage_key=d.storage_key,
                filename=d.filename,
                doc_category=d.doc_category,
                is_corrigendum=d.is_corrigendum,
            )
        )
        triggered.append(str(d.id))

    return {
        "ok": True,
        "tender_id": str(tender_id),
        "triggered_documents": triggered,
        "message": f"Triggered analysis for {len(triggered)} document(s).",
    }


@router.delete("/{tender_id}", status_code=status.HTTP_200_OK)
async def delete_tender(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Delete a tender and all associated documents and requirements."""
    res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    await db.delete(tender)
    await db.commit()
    return {"ok": True, "message": "Tender deleted successfully"}


@router.post("/{tender_id}/transfer-to-vault")
async def transfer_tender_to_vault(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Transfers a non-tender document (Aadhaar, PAN, GST, statutory KYC) from the
    tender pipeline to the Company Vault under Director/Signatory KYC or Statutory evidence.
    """
    from datetime import datetime
    from app.models import CompanyFact

    t_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = t_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    summary = tender.summary_jsonb or {}
    doc_type = summary.get("doc_type", "identity_other")
    subject_name = summary.get("identified_subject") or "Authorized Signatory"
    human_type = summary.get("human_readable_type") or "Statutory Identity Document"

    # Add to CompanyFact
    fact_key = "signatory_kyc" if "identity" in doc_type else "statutory_cert"
    fact = CompanyFact(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        fact_category="statutory",
        fact_key=fact_key,
        raw_value=subject_name,
        json_payload={
            "document_type": human_type,
            "issuing_entity": summary.get("issuing_entity", "Government Authority"),
            "subject_name": subject_name,
            "filename": summary.get("filename", tender.title),
            "transferred_at": datetime.utcnow().isoformat(),
        },
        verification_status="verified",
        confidence=1.0,
    )
    db.add(fact)

    # If signatory name is identified, also update signatory_name fact
    if subject_name and subject_name != "Authorized Signatory":
        sig_fact = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=user.tenant_id,
            fact_category="statutory",
            fact_key="signatory_name",
            raw_value=subject_name,
            verification_status="verified",
            confidence=1.0,
        )
        db.add(sig_fact)

    # Remove the tender from the active tender pipeline
    await db.delete(tender)
    await db.commit()

    return {
        "ok": True,
        "message": f"Successfully transferred {human_type} to Company Vault.",
        "fact_key": fact_key,
        "subject_name": subject_name,
    }

