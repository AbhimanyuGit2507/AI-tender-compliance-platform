"""
BidKaro — Precedence-Aware Statutory Clause Graph
Resolves contradictory clauses across tender documents according to Indian Procurement Hierarchy:
  1. Corrigenda / Addenda (Highest Precedence)
  2. Special Conditions of Contract (SCC)
  3. General Conditions of Contract (GCC)
  4. CPWD Works Manual / GFR 2017 (Statutory Baseline)
Target Latency: < 2ms | Zero external graph DB overhead.
"""
from __future__ import annotations

import re
import uuid
from dataclasses import asdict, dataclass
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CorrigendumChange, TenderRequirement

logger = structlog.get_logger(__name__)

# Strict Indian public procurement hierarchy weight (higher weight = overrides lower)
PRECEDENCE_WEIGHTS = {
    "corrigendum": 40,
    "addendum": 40,
    "scc": 30,
    "special_conditions": 30,
    "gcc": 20,
    "general_conditions": 20,
    "manual": 10,
    "default": 15,
}


@dataclass
class ResolvedPrecedenceResult:
    clause_key: str
    active_clause: str
    active_source: str  # "Corrigendum" | "SCC" | "GCC"
    precedence_score: int
    overridden_clauses: list[dict[str, str]]
    statutory_rule: str
    is_conflicted: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class StatutoryClauseGraphEngine:
    """Evaluates conflicting contract terms and resolves authoritative active terms."""

    def __init__(self, db: AsyncSession, tender_id: uuid.UUID):
        self.db = db
        self.tender_id = tender_id

    async def resolve_clause_conflict(self, clause_topic: str) -> ResolvedPrecedenceResult:
        """
        Finds all requirements and corrigenda mentioning a topic (e.g. 'defect liability', 'emd', 'validity')
        and resolves the statutory winner.
        """
        # Fetch requirements matching topic
        reqs_res = await self.db.execute(
            select(TenderRequirement).where(TenderRequirement.tender_id == self.tender_id)
        )
        all_reqs = reqs_res.scalars().all()

        corr_res = await self.db.execute(
            select(CorrigendumChange).where(CorrigendumChange.tender_id == self.tender_id)
        )
        all_corr = corr_res.scalars().all()

        # Filter candidate clauses
        topic_lower = clause_topic.lower()
        candidates: list[dict[str, Any]] = []

        for r in all_reqs:
            full_text = f"{r.title or ''} {r.exact_snippet or ''} {r.clause_ref or ''}".lower()
            if topic_lower in full_text or any(w in full_text for w in topic_lower.split()):
                source = "SCC" if "scc" in full_text or (r.category and "special" in r.category.lower()) else "GCC"
                weight = PRECEDENCE_WEIGHTS.get(source.lower(), 20)
                candidates.append({
                    "id": str(r.id),
                    "source": source,
                    "weight": weight,
                    "clause_ref": r.clause_ref or "GCC Clause",
                    "text": r.exact_snippet or r.title,
                })

        for c in all_corr:
            full_text = f"{c.field_name or ''} {c.updated_text or ''} {c.original_text or ''}".lower()
            if topic_lower in full_text or any(w in full_text for w in topic_lower.split()):
                corr_num = getattr(c, "corrigendum_no", None)
                source_label = f"Corrigendum #{corr_num}" if corr_num is not None else "Corrigendum"
                candidates.append({
                    "id": str(c.id),
                    "source": source_label,
                    "weight": PRECEDENCE_WEIGHTS["corrigendum"],
                    "clause_ref": c.field_name or "Corrigendum",
                    "text": c.updated_text or "Amended specification",
                })

        if not candidates:
            return ResolvedPrecedenceResult(
                clause_key=clause_topic,
                active_clause=f"Standard statutory provisions apply for {clause_topic}.",
                active_source="Standard Works GCC",
                precedence_score=20,
                overridden_clauses=[],
                statutory_rule="GCC baseline governing when no SCC or Corrigendum specifies otherwise.",
                is_conflicted=False,
            )

        # Sort by precedence weight descending
        candidates.sort(key=lambda x: x["weight"], reverse=True)
        winner = candidates[0]
        overridden = [
            {"source": c["source"], "clause_ref": c["clause_ref"], "text": c["text"][:150]}
            for c in candidates[1:]
        ]

        statutory_rule = (
            f"Per CPWD Manual Section 14.1 and Supreme Court procurement precedence rules, "
            f"{winner['source']} overrides earlier conflicting conditions in {', '.join(set(o['source'] for o in overridden)) or 'lower contract documents'}."
        ) if overridden else "Single governing clause identified."

        return ResolvedPrecedenceResult(
            clause_key=clause_topic,
            active_clause=winner["text"],
            active_source=winner["source"],
            precedence_score=winner["weight"],
            overridden_clauses=overridden,
            statutory_rule=statutory_rule,
            is_conflicted=bool(overridden),
        )

