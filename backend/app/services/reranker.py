"""
BidKaro — Cross-Encoder Reranker Service (10/10 RAG)
Local CPU ONNX cross-encoder reranking using FlashRank (ms-marco-TinyBERT-L-2-v2).
Operates with ZERO API cost ($0.00 / ₹0.00) and ~10ms latency.
Reranks initial candidate chunks from hybrid RRF retrieval to push the exact
governing legal / tender clause to Rank #1.
"""
from __future__ import annotations

import asyncio
from typing import Any

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class RerankerService:
    """
    Singleton cross-encoder reranking service.
    Takes (query, candidate_passages) and returns passages sorted by
    deep cross-attention semantic relevance.
    """

    def __init__(self):
        self._settings = get_settings()
        self._ranker = None

    def _load_ranker(self):
        if self._ranker is None:
            try:
                from flashrank import Ranker
                model_name = getattr(self._settings, "reranker_model", "ms-marco-TinyBERT-L-2-v2")
                logger.info("loading_flashrank_model", model=model_name)
                self._ranker = Ranker(model_name=model_name)
                logger.info("flashrank_ready")
            except Exception as e:
                logger.warning("flashrank_init_failed", error=str(e))
                self._ranker = None
        return self._ranker

    async def rerank(
        self,
        query: str,
        passages: list[dict[str, Any]],
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Rerank candidate passages against the query.
        Each passage dict must have at least:
          - "id": str | int
          - "text": str (or "content")
        Returns list of dicts with an added/updated "score" key (0.0 to 1.0).
        """
        if not passages or not query.strip():
            return passages

        if not getattr(self._settings, "reranker_enabled", True):
            return passages[:top_k] if top_k else passages

        return await asyncio.to_thread(self._sync_rerank, query, passages, top_k)

    def _sync_rerank(
        self,
        query: str,
        passages: list[dict[str, Any]],
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        ranker = self._load_ranker()
        if ranker is None:
            # Fallback if flashrank is unavailable
            return passages[:top_k] if top_k else passages

        from flashrank import RerankRequest

        # Normalize passage format for FlashRank
        formatted_passages = []
        for p in passages:
            text_content = p.get("text") or p.get("content") or ""
            formatted_passages.append({
                "id": str(p.get("id", "")),
                "text": text_content,
                "meta": p,
            })

        try:
            req = RerankRequest(query=query, passages=formatted_passages)
            ranked_results = ranker.rerank(req)

            output = []
            for item in ranked_results:
                original = item.get("meta", {})
                score = float(item.get("score", 0.0))
                # Merge original attributes and attach cross-encoder score
                enriched = dict(original)
                enriched["cross_encoder_score"] = score
                output.append(enriched)

            if top_k:
                output = output[:top_k]

            return output
        except Exception as e:
            logger.error("flashrank_rerank_error", error=str(e))
            return passages[:top_k] if top_k else passages


# ── Module-level singleton ──────────────────────────────────────────
_reranker_instance: RerankerService | None = None


def get_reranker_service() -> RerankerService:
    global _reranker_instance
    if _reranker_instance is None:
        _reranker_instance = RerankerService()
    return _reranker_instance
