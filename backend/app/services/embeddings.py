"""
BidKaro — Embedding Service
CPU-only ONNX embeddings via FastEmbed (BAAI/bge-small-en-v1.5, 384-dim).
Falls back to Gemini/OpenAI if configured.
"""
from __future__ import annotations

import asyncio
from typing import List

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class EmbeddingService:
    """
    Singleton embedding service.
    All methods return List[float] of length EMBEDDING_DIM.
    """

    def __init__(self):
        self._settings = get_settings()
        self._fastembed_model = None  # lazy-loaded

    def _load_fastembed(self):
        if self._fastembed_model is None:
            from fastembed import TextEmbedding  # type: ignore[import]
            logger.info("loading_fastembed_model", model=self._settings.embedding_model)
            self._fastembed_model = TextEmbedding(
                model_name=self._settings.embedding_model
            )
            logger.info("fastembed_ready")
        return self._fastembed_model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. Runs in a thread pool to avoid blocking."""
        provider = self._settings.embedding_provider

        if provider == "fastembed":
            return await asyncio.to_thread(self._embed_fastembed, texts)
        elif provider == "gemini":
            return await self._embed_gemini(texts)
        elif provider == "openai":
            return await self._embed_openai(texts)
        else:
            raise ValueError(f"Unknown embedding provider: {provider}")

    async def embed_query(self, text: str) -> list[float]:
        """Embed a single query string."""
        results = await self.embed_texts([text])
        return results[0]

    def _embed_fastembed(self, texts: list[str]) -> list[list[float]]:
        model = self._load_fastembed()
        embeddings = list(model.embed(texts))
        return [e.tolist() for e in embeddings]

    async def _embed_gemini(self, texts: list[str]) -> list[list[float]]:
        import google.generativeai as genai
        settings = self._settings
        genai.configure(api_key=settings.gemini_api_key)
        results = []
        for text in texts:
            result = await asyncio.to_thread(
                genai.embed_content,
                model=f"models/{settings.embedding_model}",
                content=text,
                task_type="retrieval_document",
            )
            results.append(result["embedding"])
        return results

    async def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self._settings.openai_api_key)
        response = await client.embeddings.create(
            model=self._settings.embedding_model,
            input=texts,
        )
        return [item.embedding for item in response.data]


# ── Singleton ────────────────────────────────────────────────────────
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
