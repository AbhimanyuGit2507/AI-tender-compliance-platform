"""
BidKaro — Advanced Agentic AI Router
Exposes Next-Gen AI capabilities within the ₹10–₹50 variable economic ceiling:
  1. POST /api/advanced/{tender_id}/swarm-review       — 4-specialist parallel review board & consensus
  2. POST /api/advanced/{tender_id}/monte-carlo-ptw   — 10,000-run Price-to-Win margin curve simulator
  3. POST /api/advanced/{tender_id}/mock-committee   — Adversarial scrutiny committee defense interrogation
  4. GET  /api/advanced/{tender_id}/voice-briefing    — Executive pre-bid voice rehearsal transcript
  5. GET  /api/advanced/{tender_id}/precedence-graph  — Statutory clause precedence resolver (Corrigenda > SCC > GCC)
"""
from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import CompanyFact, CorrigendumChange, Tender
from app.services.clause_graph import StatutoryClauseGraphEngine
from app.services.mock_committee import MockTenderCommitteeDefenseRoom
from app.services.monte_carlo_ptw import MonteCarloPriceToWinSimulator
from app.services.swarm_review import ParallelSwarmReviewBoard
from app.services.voice_briefing import PreBidVoiceBriefingService

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/advanced", tags=["advanced-ai"])


# ── Schemas ──────────────────────────────────────────────────────────

class MonteCarloRequest(BaseModel):
    contractor_base_cost_inr: float | None = Field(default=None, description="Direct project execution cost")
    authority_mean_discount: float = Field(default=0.14, description="Historical discount vs SoR (e.g. 0.14 = 14%)")
    authority_std_dev: float = Field(default=0.035, description="Standard deviation of winning bids")
    competitor_count: int = Field(default=6, ge=1, le=25, description="Expected rival bidders")
    simulations: int = Field(default=10_000, ge=1_000, le=50_000)


class MockCommitteeRequest(BaseModel):
    contractor_response: str = Field(default="", description="Contractor's answer to committee interrogation")
    chat_history: list[dict[str, str]] = Field(default_factory=list)


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/{tender_id}/swarm-review")
async def run_swarm_review(
    tender_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Executes the 4-specialist parallel review board and synthesizes an authoritative verdict."""
    board = ParallelSwarmReviewBoard(db, user.tenant_id, tender_id)
    try:
        verdict = await board.evaluate_tender()
        return verdict.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("swarm_review_failed", tender_id=str(tender_id), error=str(e))
        raise HTTPException(status_code=500, detail=f"Swarm review failed: {e}")


@router.post("/{tender_id}/monte-carlo-ptw")
async def run_monte_carlo_ptw(
    tender_id: uuid.UUID,
    req: MonteCarloRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Runs 10,000 Monte Carlo bidding simulations to compute optimal Price-to-Win."""
    t_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = t_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    est_val = float(tender.estimated_value_inr or 50_00_00_000.0)
    base_cost = float(req.contractor_base_cost_inr) if req.contractor_base_cost_inr else float(est_val * 0.82)

    sim = MonteCarloPriceToWinSimulator(
        estimated_value_inr=est_val,
        contractor_base_cost_inr=base_cost,
        authority_mean_discount=req.authority_mean_discount,
        authority_std_dev=req.authority_std_dev,
        competitors=req.competitor_count,
        simulations=req.simulations,
    )
    res = sim.run_simulation()
    return res.to_dict()


@router.post("/{tender_id}/mock-committee")
async def interrogate_mock_committee(
    tender_id: uuid.UUID,
    req: MockCommitteeRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Interrogates contractor credentials simulating a tough Superintending Engineer scrutiny board."""
    t_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = t_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    facts_res = await db.execute(
        select(CompanyFact).where(CompanyFact.tenant_id == user.tenant_id)
    )
    facts = facts_res.scalars().all()

    room = MockTenderCommitteeDefenseRoom(user.tenant_id, tender, facts)
    turn = await room.conduct_interrogation(
        contractor_response=req.contractor_response,
        chat_history=req.chat_history,
    )
    return turn.to_dict()


@router.get("/{tender_id}/voice-briefing")
async def get_voice_briefing(
    tender_id: uuid.UUID,
    max_turnover_cr: float = Query(default=25.0, description="Highest annual turnover in Cr"),
    commitments_cr: float = Query(default=12.0, description="Existing ongoing commitments in Cr"),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Generates the executive pre-bid audio briefing transcript and statutory math checks."""
    t_res = await db.execute(
        select(Tender).where(Tender.id == tender_id, Tender.tenant_id == user.tenant_id)
    )
    tender = t_res.scalar_one_or_none()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    corr_res = await db.execute(
        select(CorrigendumChange).where(CorrigendumChange.tender_id == tender_id)
    )
    corrigenda = corr_res.scalars().all()

    service = PreBidVoiceBriefingService(tender, corrigenda)
    briefing = service.generate_briefing_script(
        max_turnover_cr=max_turnover_cr,
        commitments_cr=commitments_cr,
    )
    return briefing.to_dict()


@router.get("/{tender_id}/precedence-graph")
async def resolve_precedence(
    tender_id: uuid.UUID,
    topic: str = Query(default="defect liability", description="Clause keyword to trace across contract documents"),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Resolves conflicting clauses across Corrigenda > SCC > GCC hierarchy."""
    engine = StatutoryClauseGraphEngine(db, tender_id)
    result = await engine.resolve_clause_conflict(topic)
    return result.to_dict()
