"""
BidKaro — RAG / Copilot Chat Router
POST /api/rag/{tender_id}/query   — Single Q&A query
POST /api/rag/{tender_id}/stream  — SSE streaming answer
"""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import CreditLedgerEntry, Tenant
from app.services.rag_hybrid import HybridRAGService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/rag", tags=["rag"])

COPILOT_QUERY_COST_CREDITS = 1


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    top_k: int = Field(default=6, ge=1, le=20)
    include_superseded: bool = False


@router.post("/{tender_id}/query")
async def rag_query(
    tender_id: uuid.UUID,
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Run a hybrid RAG query against the tender's knowledge base.
    Deducts 1 Copilot credit from the tenant's wallet and records an immutable ledger entry.
    Returns the grounded answer + source citations.
    """
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if (tenant.credit_balance or 0) < COPILOT_QUERY_COST_CREDITS:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "insufficient_credits",
                "message": "Insufficient credits for Copilot inquiry. Please top up your credits.",
                "required_credits": COPILOT_QUERY_COST_CREDITS,
                "available_credits": tenant.credit_balance or 0,
            },
        )

    rag = HybridRAGService(db)
    try:
        result = await rag.query(
            question=body.question,
            tenant_id=user.tenant_id,
            tender_id=tender_id,
            top_k=body.top_k,
            include_superseded=body.include_superseded,
        )
    except Exception as e:
        logger.error("rag_query_failed", error=str(e))
        raise HTTPException(status_code=500, detail="RAG query failed")

    # Deduct credit and append to immutable audit ledger
    tenant.credit_balance = max(0, (tenant.credit_balance or 0) - COPILOT_QUERY_COST_CREDITS)
    ledger_entry = CreditLedgerEntry(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        tender_id=tender_id,
        operation_type="rag_query",
        credits_delta=-COPILOT_QUERY_COST_CREDITS,
        model_id=result.model_id,
        cost_inr=result.cost_inr or 0.0,
        latency_ms=result.latency_ms,
    )
    db.add(ledger_entry)
    await db.commit()
    await db.refresh(tenant)

    return {
        "answer": result.answer,
        "confidence": result.confidence,
        "citations": [
            {
                "id": c.id,
                "page_number": c.page_number or 1,
                "clause_ref": c.clause_ref or "Cited Clause",
                "section_path": c.section_path,
                "doc_id": c.doc_id,
                "rrf_score": round(c.rrf_score, 4),
                "relevance_score": round(c.cross_encoder_score, 4) if c.cross_encoder_score is not None else round(c.rrf_score, 4),
                "content_preview": c.content[:300],
                "content": c.content,
                "bbox": c.bbox or [0.08, 0.22, 0.92, 0.38],
                "cross_refs": c.cross_refs,
            }
            for c in result.chunks
        ],
        "structured_citations": [
            {
                "source_index": cit.source_index,
                "page_number": cit.page_number,
                "clause_ref": cit.clause_ref,
                "section_path": cit.section_path,
                "snippet": cit.snippet,
                "relevance_score": cit.relevance_score,
            }
            for cit in result.citations
        ],
        "model_id": result.model_id,
        "cost_inr": round(result.cost_inr, 6),
        "latency_ms": result.latency_ms,
        "credits_deducted": COPILOT_QUERY_COST_CREDITS,
        "available_credits": tenant.credit_balance,
    }
