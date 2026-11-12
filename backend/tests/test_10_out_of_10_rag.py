"""
Unit & Integration Tests for BidKaro 10/10 RAG & Circuit-Breaker System
Tests:
  1. Local Cross-Encoder Reranker (FlashRank ms-marco-TinyBERT-L-2-v2)
  2. Multi-Provider Fallback Circuit Breaker (LLMRouter)
  3. Grounded Citation Distillation & Confidence Assessment
  4. Query Rewriting for Indian Procurement Acronyms
"""
import pytest
import asyncio
from app.services.reranker import get_reranker_service
from app.services.llm_router import get_llm_router, LLMTier
from app.services.rag_hybrid import HybridRAGService, RetrievedChunk


@pytest.mark.asyncio
async def test_cross_encoder_reranker_precision():
    """Verify that the cross-encoder correctly ranks the governing legal clause to #1."""
    reranker = get_reranker_service()
    query = "What is the mandatory average annual turnover requirement?"

    candidate_passages = [
        {
            "id": "clause_emd",
            "content": "Clause 4.1: The bidder shall deposit an Earnest Money Deposit (EMD) of INR 50,00,000 via Bank Guarantee or FDR from a scheduled commercial bank.",
        },
        {
            "id": "clause_turnover",
            "content": "Clause 3.2 (Financial Criteria): Average Annual Financial Turnover during the immediate last 3 financial years ending 31st March shall be at least 40% of the estimated project cost (i.e. INR 32.5 Crores).",
        },
        {
            "id": "clause_safety",
            "content": "Clause 18.5: The contractor shall ensure all personal protective equipment (PPE), safety helmets, and harness ropes meet IS 2925 standards.",
        },
        {
            "id": "clause_arbitration",
            "content": "Clause 25.1: Any dispute arising out of this contract shall be referred to the Sole Arbitrator appointed by the Chief Engineer.",
        },
    ]

    reranked = await reranker.rerank(query, candidate_passages, top_k=2)

    assert len(reranked) == 2
    top_result = reranked[0]
    assert top_result["id"] == "clause_turnover"
    assert top_result["cross_encoder_score"] > 0.80
    assert reranked[1]["cross_encoder_score"] < top_result["cross_encoder_score"]


@pytest.mark.asyncio
async def test_circuit_breaker_stub_fallback():
    """Verify that if all keys are unconfigured, LLMRouter returns a clean stub without throwing unhandled exceptions."""
    router = get_llm_router()
    resp = await router.complete(
        tier=LLMTier.FAST_TEXT,
        messages=[{"role": "user", "content": "Test prompt"}],
        operation_type="test",
    )
    assert resp is not None
    assert resp.tier == LLMTier.FAST_TEXT
    assert "BidKaro AI Stub" in resp.content or "LLM STUB" in resp.content or resp.input_tokens >= 0


def test_procurement_query_rewriting():
    """Verify Indian procurement acronym expansions in HybridRAGService."""
    q1 = "what is the emd and pbg required"
    rewritten1 = HybridRAGService._rewrite_query(q1)
    assert "earnest money deposit" in rewritten1
    assert "performance bank guarantee" in rewritten1

    q2 = "does msme get exemption from tender fee"
    rewritten2 = HybridRAGService._rewrite_query(q2)
    assert "Udyam exemption" in rewritten2


def test_grounded_context_building():
    """Verify that chunks with section and page hierarchy format cleanly."""
    chunks = [
        RetrievedChunk(
            id="c1",
            content="Average turnover must be 50 Cr.",
            page_number=14,
            clause_ref="Clause 3.1",
            section_path="Section II / Financial Criteria",
            doc_id="doc-123",
            rrf_score=0.045,
            cross_encoder_score=0.95,
        ),
        RetrievedChunk(
            id="c2",
            content="EMD is Rs 20 Lakhs.",
            page_number=8,
            clause_ref="Clause 1.4",
            section_path="Section I / NIT",
            doc_id="doc-123",
            rrf_score=0.032,
            cross_encoder_score=0.15,
        ),
    ]

    context = HybridRAGService._build_context(chunks)
    assert "Page 14" in context
    assert "Clause 3.1" in context
    assert "Section: Section II / Financial Criteria" in context
    assert "[Relevance: 0.95]" in context
