"""
BidKaro — Corrigendum Diff & Supersession Router
GET  /api/corrigendum/{tender_id}       — View Original vs Updated diff cards
POST /api/corrigendum/{tender_id}/apply — Apply corrigendum changes & supersessions
"""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import CorrigendumChange, KnowledgeChunk, Tender, TenderRequirement
from app.schemas.schemas import CorrigendumChangeRead

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/corrigendum", tags=["corrigendum"])


@router.get("/{tender_id}", response_model=list[CorrigendumChangeRead])
async def get_corrigendum_diffs(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Retrieve all Corrigendum / Addendum modifications for this tender.
    Presents Original vs Updated side-by-side diff cards with severity.
    """
    tender_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    if not tender_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tender not found")

    res = await db.execute(
        select(CorrigendumChange)
        .where(
            CorrigendumChange.tender_id == tender_id,
            CorrigendumChange.tenant_id == user.tenant_id,
        )
        .order_by(CorrigendumChange.created_at.desc())
    )
    changes = res.scalars().all()
    return [CorrigendumChangeRead.model_validate(c) for c in changes]


@router.post("/{tender_id}/apply")
async def apply_corrigendum_supersessions(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Process corrigendum changes:
      1. Mark matching previous requirements as `is_superseded = True`
      2. Mark matching knowledge chunks as `is_superseded = True`
      3. Trigger compliance re-check
    """
    res = await db.execute(
        select(CorrigendumChange)
        .where(
            CorrigendumChange.tender_id == tender_id,
            CorrigendumChange.tenant_id == user.tenant_id,
        )
    )
    changes = res.scalars().all()

    superseded_reqs = 0
    superseded_chunks = 0

    for change in changes:
        if change.target_req_id:
            # Supersede specific requirement
            await db.execute(
                update(TenderRequirement)
                .where(TenderRequirement.id == change.target_req_id)
                .values(is_superseded=True)
            )
            superseded_reqs += 1

        # Match chunks by clause reference or field name
        if change.field_name:
            chunk_res = await db.execute(
                update(KnowledgeChunk)
                .where(
                    KnowledgeChunk.tender_id == tender_id,
                    KnowledgeChunk.clause_ref.ilike(f"%{change.field_name}%"),
                )
                .values(is_superseded=True)
            )
            superseded_chunks += chunk_res.rowcount

    await db.commit()
    logger.info("corrigenda_applied", tender_id=str(tender_id), reqs=superseded_reqs, chunks=superseded_chunks)

    return {
        "tender_id": str(tender_id),
        "superseded_requirements": superseded_reqs,
        "superseded_chunks": superseded_chunks,
        "status": "success",
        "message": f"Applied {len(changes)} corrigendum changes. Superseded {superseded_reqs} requirement(s).",
    }
