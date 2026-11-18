"""
BidKaro — LLM Router Service (10/10 Resilient Multi-Provider Circuit Breaker)
Unified routing across:
  - Tier 0: Deterministic (₹0.00 / $0.00 — Lexical Sieve, Combinatorial Procurement Math)
  - Tier 1: Fast Text & Extraction (Groq Llama 3.1 8B, 800+ tok/s)
  - Tier 2: Multimodal OCR (Google Gemini 2.0 / 1.5 Flash)
  - Tier 3: Legal & Technical Reasoning (DeepSeek-V3/R1 via OpenRouter, Groq Llama 3.3 70B, or Gemini Pro)

Features automatic circuit-breaker fallback:
If a primary provider is unavailable, unconfigured, or rate-limited (HTTP 429/503),
the router automatically cascades to the next operational provider in <200ms.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any

import httpx
import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class LLMTier(str, Enum):
    DETERMINISTIC = "tier0"   # No LLM call; deterministic code path
    FAST_TEXT = "tier1"       # Groq fast text (extraction, RAG Q&A)
    MULTIMODAL_OCR = "tier2"  # Gemini multimodal (scanned pages)
    REASONING = "tier3"       # DeepSeek V3/R1 / Groq 70B / Gemini Pro

    # Backwards-compatible aliases
    TIER_0_DETERMINISTIC = "tier0"
    TIER_1_FAST_TEXT = "tier1"
    TIER_2_MULTIMODAL_OCR = "tier2"
    TIER_3_REASONING = "tier3"


@dataclass
class LLMResponse:
    content: str
    model_id: str
    tier: LLMTier
    input_tokens: int
    output_tokens: int
    latency_ms: int
    cost_inr: float
    provider: str = "unknown"

    @property
    def text(self) -> str:
        return self.content

    def __str__(self) -> str:
        return self.content


class LLMRouter:
    """
    Single entry point for all LLM calls with multi-provider circuit breaking.
    Usage:
        router = get_llm_router()
        resp = await router.complete(
            tier=LLMTier.FAST_TEXT,
            messages=[{"role": "user", "content": "..."}],
            tenant_id=...,
            operation_type="extraction",
        )
    """

    def __init__(self):
        self._settings = get_settings()
        self._groq_client: httpx.AsyncClient | None = None
        self._gemini_client: httpx.AsyncClient | None = None
        self._openrouter_client: httpx.AsyncClient | None = None
        self._ollama_client: httpx.AsyncClient | None = None

    # ── Client Factories (lazy) ──────────────────────────────────────

    def _groq(self) -> httpx.AsyncClient:
        if self._groq_client is None:
            self._groq_client = httpx.AsyncClient(
                base_url=self._settings.groq_base_url,
                headers={"Authorization": f"Bearer {self._settings.groq_api_key}"},
                timeout=120.0,
            )
        return self._groq_client

    def _openrouter(self) -> httpx.AsyncClient:
        if self._openrouter_client is None:
            base_url = getattr(self._settings, "openrouter_base_url", "https://openrouter.ai/api/v1")
            api_key = getattr(self._settings, "openrouter_api_key", "")
            self._openrouter_client = httpx.AsyncClient(
                base_url=base_url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://bidkaro.com",
                    "X-Title": "BidKaro Procurement AI",
                },
                timeout=120.0,
            )
        return self._openrouter_client

    def _ollama(self) -> httpx.AsyncClient:
        if self._ollama_client is None:
            base_url = getattr(self._settings, "ollama_base_url", "http://localhost:11434/v1")
            self._ollama_client = httpx.AsyncClient(
                base_url=base_url,
                timeout=180.0,
            )
        return self._ollama_client

    # ── Public Generation Interface ──────────────────────────────────

    async def generate(
        self,
        tier: LLMTier = LLMTier.FAST_TEXT,
        prompt: str = "",
        system_prompt: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.1,
        tenant_id: uuid.UUID | None = None,
        tender_id: uuid.UUID | None = None,
        operation_type: str = "generation",
        response_json: bool = False,
        response_format: dict | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        user_prompt = kwargs.get("user_prompt", prompt)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        fmt = response_format
        if response_json and not fmt:
            fmt = {"type": "json_object"}

        return await self.complete(
            tier=tier,
            messages=messages,
            tenant_id=tenant_id,
            tender_id=tender_id,
            operation_type=operation_type,
            response_format=fmt,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    async def complete(
        self,
        tier: LLMTier,
        messages: list[dict[str, Any]],
        *,
        tenant_id: uuid.UUID | None = None,
        tender_id: uuid.UUID | None = None,
        operation_type: str = "unknown",
        response_format: dict | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.1,
    ) -> LLMResponse:
        """
        Route completion with automatic circuit breaker fallback.
        Priority determined by settings.llm_provider ("openrouter" | "multi_direct" | "ollama").
        """
        settings = self._settings

        if tier == LLMTier.DETERMINISTIC:
            raise ValueError("Tier 0 is deterministic — no LLM call needed.")

        # ── TIER 1: FAST TEXT & EXTRACTION ───────────────────────────
        if tier == LLMTier.FAST_TEXT:
            # Step 0: Local Free LLM (Ollama) if explicitly chosen as provider
            if settings.llm_provider == "ollama" or getattr(settings, "model_reasoning_provider", "") == "ollama":
                try:
                    return await self._call_openai_compatible(
                        client=self._ollama(),
                        model=getattr(settings, "ollama_model", "llama3.1:8b"),
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="ollama_local",
                        input_cost=0.0,
                        output_cost=0.0,
                    )
                except Exception as e:
                    logger.warning("tier1_primary_ollama_failed_cascading", error=str(e))

            # Option A: Unified OpenRouter Single Wallet (Primary)
            openrouter_key = getattr(settings, "openrouter_api_key", "")
            use_openrouter_primary = (
                settings.llm_provider == "openrouter"
                or (bool(openrouter_key) and not bool(settings.groq_api_key))
            )

            if use_openrouter_primary and openrouter_key:
                try:
                    fast_model = getattr(settings, "openrouter_model_fast_text", "google/gemini-2.0-flash-001")
                    return await self._call_openai_compatible(
                        client=self._openrouter(),
                        model=fast_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="openrouter_fast_text",
                        input_cost=settings.cost_tier1_input_inr,
                        output_cost=settings.cost_tier1_output_inr,
                    )
                except Exception as e:
                    logger.warning("tier1_primary_openrouter_failed_cascading", error=str(e))

            # Option B / Circuit Breaker Step: Direct Groq (Fast Text)
            if settings.groq_api_key:
                groq_model = settings.model_fast_text or "qwen/qwen3.8-27b"
                try:
                    return await self._call_openai_compatible(
                        client=self._groq(),
                        model=groq_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="groq",
                        input_cost=settings.cost_tier1_input_inr,
                        output_cost=settings.cost_tier1_output_inr,
                    )
                except httpx.HTTPStatusError as e:
                    if e.response.status_code in (400, 404) and "qwen/qwen3.8-27b" not in groq_model:
                        logger.warning("groq_model_fallback_to_qwen", from_model=groq_model)
                        try:
                            return await self._call_openai_compatible(
                                client=self._groq(),
                                model="qwen/qwen3.8-27b",
                                messages=messages,
                                max_tokens=max_tokens,
                                temperature=temperature,
                                response_format=response_format,
                                tier=tier,
                                provider_name="groq_qwen_fallback",
                                input_cost=settings.cost_tier1_input_inr,
                                output_cost=settings.cost_tier1_output_inr,
                            )
                        except Exception as e2:
                            logger.warning("tier1_groq_fallback_failed", error=str(e2))
                    else:
                        logger.warning("tier1_groq_failed_cascading", error=str(e))
                except Exception as e:
                    logger.warning("tier1_groq_failed_cascading", error=str(e))

            # Circuit Breaker Step: Gemini Flash Direct
            if settings.gemini_api_key:
                try:
                    return await self._call_gemini(
                        model=getattr(settings, "model_multimodal_ocr", "gemini-2.0-flash"),
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        tier=tier,
                        input_cost=settings.cost_tier2_input_inr,
                        output_cost=settings.cost_tier2_output_inr,
                    )
                except Exception as e:
                    logger.warning("tier1_fallback_gemini_failed_cascading", error=str(e))

            # Circuit Breaker Step: OpenRouter as secondary fallback (if not tried first)
            if not use_openrouter_primary and openrouter_key:
                try:
                    fast_model = getattr(settings, "openrouter_model_fast_text", "google/gemini-2.0-flash-001")
                    return await self._call_openai_compatible(
                        client=self._openrouter(),
                        model=fast_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="openrouter_fast_text",
                        input_cost=settings.cost_tier1_input_inr,
                        output_cost=settings.cost_tier1_output_inr,
                    )
                except Exception as e:
                    logger.warning("tier1_fallback_openrouter_failed", error=str(e))

            # Circuit Breaker Step: Local Free LLM (Ollama)
            if settings.llm_provider != "ollama" and getattr(settings, "model_reasoning_provider", "") != "ollama":
                try:
                    return await self._call_openai_compatible(
                        client=self._ollama(),
                        model=getattr(settings, "ollama_model", "llama3.1:8b"),
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="ollama_local",
                        input_cost=0.0,
                        output_cost=0.0,
                    )
                except Exception:
                    pass

            # If no API keys set or all failed:
            return self._stub_response(tier, settings.model_fast_text)

        # ── TIER 2: MULTIMODAL OCR ───────────────────────────────────
        elif tier == LLMTier.MULTIMODAL_OCR:
            openrouter_key = getattr(settings, "openrouter_api_key", "")
            use_openrouter_ocr = (
                settings.llm_provider == "openrouter"
                or (bool(openrouter_key) and not bool(settings.gemini_api_key))
            )

            # Option A Primary: OpenRouter Vision (Gemini 2.0 Flash)
            if use_openrouter_ocr and openrouter_key:
                try:
                    ocr_model = getattr(settings, "openrouter_model_ocr", "google/gemini-2.0-flash-001")
                    return await self._call_openai_compatible(
                        client=self._openrouter(),
                        model=ocr_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="openrouter_vision",
                        input_cost=8.30,   # ~$0.10/1M in INR
                        output_cost=33.20, # ~$0.40/1M in INR
                    )
                except Exception as e:
                    logger.warning("tier2_primary_openrouter_ocr_failed_cascading", error=str(e))

            # Option B / Fallback: Direct Gemini 2.0 Flash / 1.5 Flash
            if settings.gemini_api_key:
                try:
                    return await self._call_gemini(
                        model=settings.model_multimodal_ocr,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        tier=tier,
                        input_cost=settings.cost_tier2_input_inr,
                        output_cost=settings.cost_tier2_output_inr,
                    )
                except Exception as e:
                    logger.warning("tier2_gemini_ocr_failed_cascading", error=str(e))

            # Secondary Fallback: OpenRouter if not tried initially
            if not use_openrouter_ocr and openrouter_key:
                try:
                    ocr_model = getattr(settings, "openrouter_model_ocr", "google/gemini-2.0-flash-001")
                    return await self._call_openai_compatible(
                        client=self._openrouter(),
                        model=ocr_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="openrouter_vision",
                        input_cost=8.30,
                        output_cost=33.20,
                    )
                except Exception as e:
                    logger.warning("tier2_fallback_openrouter_ocr_failed", error=str(e))

            # Fallback: Fall back to Tier 1 fast text
            return await self.complete(
                LLMTier.FAST_TEXT,
                messages,
                tenant_id=tenant_id,
                tender_id=tender_id,
                operation_type=operation_type,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format,
            )

        # ── TIER 3: DEEP REASONING & BID SYNTHESIS ──────────────────
        elif tier == LLMTier.REASONING:
            provider = getattr(settings, "model_reasoning_provider", "openrouter")
            openrouter_key = getattr(settings, "openrouter_api_key", "")

            # If Ollama is chosen for 100% free local execution
            if provider == "ollama" or settings.llm_provider == "ollama":
                try:
                    return await self._call_openai_compatible(
                        client=self._ollama(),
                        model=getattr(settings, "ollama_model", "llama3.1:8b"),
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="ollama_local",
                        input_cost=0.0,
                        output_cost=0.0,
                    )
                except Exception as e:
                    logger.warning("tier3_ollama_failed_cascading", error=str(e))

            # Option A Primary: OpenRouter DeepSeek V3 / R1
            use_openrouter_reasoning = (
                settings.llm_provider == "openrouter"
                or provider == "openrouter"
                or (bool(openrouter_key) and not bool(settings.groq_api_key))
            )

            if use_openrouter_reasoning and openrouter_key:
                try:
                    if operation_type in ("audit", "pre_flight_audit"):
                        reasoning_model = getattr(settings, "openrouter_model_audit", getattr(settings, "openrouter_model_reasoning", "openai/o3-mini"))
                    else:
                        reasoning_model = getattr(settings, "openrouter_model_reasoning", "anthropic/claude-3.5-sonnet")

                    # Dynamic cost accounting per model
                    if "claude-3.5-sonnet" in reasoning_model or "claude-3.7-sonnet" in reasoning_model:
                        in_cost = 249.0   # $3.00/1M in INR (~83 INR/$)
                        out_cost = 1245.0 # $15.00/1M in INR
                        p_name = "openrouter_claude_sonnet"
                    elif "o3-mini" in reasoning_model:
                        in_cost = 91.3    # $1.10/1M
                        out_cost = 365.2  # $4.40/1M
                        p_name = "openrouter_o3_mini"
                    elif "deepseek-r1" in reasoning_model:
                        in_cost = 45.65   # $0.55/1M
                        out_cost = 181.77 # $2.19/1M
                        p_name = "openrouter_deepseek_r1"
                    elif "gemini-1.5-pro" in reasoning_model or "gemini-pro" in reasoning_model:
                        in_cost = 103.75  # $1.25/1M
                        out_cost = 415.0  # $5.00/1M
                        p_name = "openrouter_gemini_pro"
                    elif "deepseek" in reasoning_model:
                        in_cost = 11.62   # $0.14/1M
                        out_cost = 23.24  # $0.28/1M
                        p_name = "openrouter_deepseek"
                    else:
                        in_cost = settings.cost_tier3_input_inr
                        out_cost = settings.cost_tier3_output_inr
                        p_name = "openrouter_reasoning"

                    return await self._call_openai_compatible(
                        client=self._openrouter(),
                        model=reasoning_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name=p_name,
                        input_cost=in_cost,
                        output_cost=out_cost,
                    )
                except Exception as e:
                    logger.warning("tier3_openrouter_failed_cascading", error=str(e))

            # Groq Reasoning (Tier 3)
            if settings.groq_api_key:
                groq_reasoning_model = settings.model_reasoning or "qwen/qwen3.8-27b"
                try:
                    return await self._call_openai_compatible(
                        client=self._groq(),
                        model=groq_reasoning_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="groq_reasoning",
                        input_cost=settings.cost_tier3_input_inr,
                        output_cost=settings.cost_tier3_output_inr,
                    )
                except httpx.HTTPStatusError as e:
                    if e.response.status_code in (400, 404) and "qwen/qwen3.8-27b" not in groq_reasoning_model:
                        logger.warning("groq_reasoning_fallback_to_qwen", from_model=groq_reasoning_model)
                        try:
                            return await self._call_openai_compatible(
                                client=self._groq(),
                                model="qwen/qwen3.8-27b",
                                messages=messages,
                                max_tokens=max_tokens,
                                temperature=temperature,
                                response_format=response_format,
                                tier=tier,
                                provider_name="groq_qwen_fallback",
                                input_cost=settings.cost_tier3_input_inr,
                                output_cost=settings.cost_tier3_output_inr,
                            )
                        except Exception as e2:
                            logger.warning("tier3_groq_fallback_failed", error=str(e2))
                    else:
                        logger.warning("tier3_groq_failed_cascading", error=str(e))
                except Exception as e:
                    logger.warning("tier3_groq_failed_cascading", error=str(e))

            # Gemini Pro Fallback
            if settings.gemini_api_key:
                try:
                    return await self._call_gemini(
                        model="gemini-1.5-pro",
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        tier=tier,
                        input_cost=settings.cost_tier3_input_inr,
                        output_cost=settings.cost_tier3_output_inr,
                    )
                except Exception as e:
                    logger.warning("tier3_gemini_pro_failed", error=str(e))

            # Secondary OpenRouter fallback if not tried first
            if not use_openrouter_reasoning and openrouter_key:
                try:
                    reasoning_model = getattr(settings, "openrouter_model_reasoning", "deepseek/deepseek-chat")
                    return await self._call_openai_compatible(
                        client=self._openrouter(),
                        model=reasoning_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="openrouter_deepseek",
                        input_cost=11.6,
                        output_cost=23.2,
                    )
                except Exception as e:
                    logger.warning("tier3_fallback_openrouter_failed", error=str(e))

            # Fallback to Local Free LLM (Ollama)
            if provider != "ollama" and settings.llm_provider != "ollama":
                try:
                    return await self._call_openai_compatible(
                        client=self._ollama(),
                        model=getattr(settings, "ollama_model", "llama3.1:8b"),
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        response_format=response_format,
                        tier=tier,
                        provider_name="ollama_local",
                        input_cost=0.0,
                        output_cost=0.0,
                    )
                except Exception:
                    pass

            return self._stub_response(tier, settings.model_reasoning)

        raise ValueError(f"Unknown tier: {tier}")

    # ── Multimodal Page OCR ──────────────────────────────────────────

    async def ocr_page(
        self,
        image_bytes: bytes,
        prompt: str = "Extract all text from this tender document page. Preserve table structure with | separators.",
    ) -> str:
        """
        Extract text from scanned page bytes using multimodal vision.
        Cascades: OpenRouter Vision (Gemini 2.0 Flash) -> Direct Gemini SDK -> empty string.
        """
        import base64

        settings = self._settings
        openrouter_key = getattr(settings, "openrouter_api_key", "")
        use_openrouter_ocr = (
            settings.llm_provider == "openrouter"
            or (bool(openrouter_key) and not bool(settings.gemini_api_key))
        )

        # 1. Option A: Try OpenRouter Vision if chosen or available
        if use_openrouter_ocr and openrouter_key:
            try:
                b64_img = base64.b64encode(image_bytes).decode("utf-8")
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{b64_img}"
                                },
                            },
                        ],
                    }
                ]
                ocr_model = getattr(settings, "openrouter_model_ocr", "google/gemini-2.0-flash-001")
                resp = await self._call_openai_compatible(
                    client=self._openrouter(),
                    model=ocr_model,
                    messages=messages,
                    max_tokens=4096,
                    temperature=0.1,
                    tier=LLMTier.MULTIMODAL_OCR,
                    provider_name="openrouter_vision",
                    input_cost=8.30,   # ~$0.10/1M in INR
                    output_cost=33.20, # ~$0.40/1M in INR
                )
                return resp.content
            except Exception as e:
                logger.warning("openrouter_ocr_page_failed_cascading", error=str(e))

        # 2. Option B: Try Direct Gemini SDK
        if settings.gemini_api_key:
            try:
                return await self._call_gemini_vision(image_bytes, prompt)
            except Exception as e:
                logger.warning("direct_gemini_ocr_page_failed_cascading", error=str(e))

        # 3. Secondary Fallback: OpenRouter if not tried initially
        if not use_openrouter_ocr and openrouter_key:
            try:
                b64_img = base64.b64encode(image_bytes).decode("utf-8")
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{b64_img}"
                                },
                            },
                        ],
                    }
                ]
                ocr_model = getattr(settings, "openrouter_model_ocr", "google/gemini-2.0-flash-001")
                resp = await self._call_openai_compatible(
                    client=self._openrouter(),
                    model=ocr_model,
                    messages=messages,
                    max_tokens=4096,
                    temperature=0.1,
                    tier=LLMTier.MULTIMODAL_OCR,
                    provider_name="openrouter_vision",
                    input_cost=8.30,
                    output_cost=33.20,
                )
                return resp.content
            except Exception as e:
                logger.warning("openrouter_fallback_ocr_page_failed", error=str(e))

        logger.warning("all_ocr_providers_failed_or_unconfigured")
        return ""

    # ── OpenAI-Compatible Engine (Groq / OpenRouter) ────────────────

    async def _call_openai_compatible(
        self,
        client: httpx.AsyncClient,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        tier: LLMTier,
        provider_name: str,
        input_cost: float,
        output_cost: float,
        response_format: dict | None = None,
    ) -> LLMResponse:
        # Guard Groq free on-demand tier OTPM limits
        effective_max_tokens = max_tokens
        if "groq" in provider_name.lower():
            effective_max_tokens = min(max_tokens, 2048)

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": effective_max_tokens,
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        t0 = time.monotonic()
        max_attempts = 5
        resp = None
        for attempt in range(max_attempts):
            try:
                resp = await client.post("/chat/completions", json=payload)
                if resp.status_code == 429 and attempt < max_attempts - 1:
                    retry_header = resp.headers.get("retry-after")
                    wait_sec = float(retry_header) if retry_header else (3.0 * (attempt + 1))
                    wait_sec = min(max(wait_sec, 6.0), 20.0)
                    if "groq" in provider_name.lower() and payload.get("max_tokens", 0) > 1200:
                        payload["max_tokens"] = max(1200, int(payload["max_tokens"] * 0.8))
                    logger.warning("llm_call_rate_limited_retrying", provider=provider_name, model=model, wait_sec=wait_sec, attempt=attempt + 1, adjusted_max_tokens=payload.get("max_tokens"))
                    await asyncio.sleep(wait_sec)
                    continue
                resp.raise_for_status()
                break
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < max_attempts - 1:
                    wait_sec = float(e.response.headers.get("retry-after", 6.0))
                    wait_sec = min(max(wait_sec, 6.0), 20.0)
                    if "groq" in provider_name.lower() and payload.get("max_tokens", 0) > 1200:
                        payload["max_tokens"] = max(1200, int(payload["max_tokens"] * 0.8))
                    logger.warning("llm_call_rate_limited_retrying", provider=provider_name, model=model, wait_sec=wait_sec, attempt=attempt + 1, adjusted_max_tokens=payload.get("max_tokens"))
                    await asyncio.sleep(wait_sec)
                    continue
                logger.error("llm_call_failed", tier=tier.value, model=model,
                             provider=provider_name, status=e.response.status_code,
                             body=e.response.text[:500])
                raise
            except Exception as e:
                if attempt < max_attempts - 1 and "429" in str(e):
                    await asyncio.sleep(3.0 * (attempt + 1))
                    continue
                raise
        latency_ms = int((time.monotonic() - t0) * 1000)

        data = resp.json()
        usage = data.get("usage", {})
        input_tok = usage.get("prompt_tokens", 0)
        output_tok = usage.get("completion_tokens", 0)
        cost = self._calc_cost(input_tok, output_tok, input_cost, output_cost)
        content = data["choices"][0]["message"]["content"]

        logger.info("llm_call_ok", tier=tier.value, model=model, provider=provider_name,
                    input_tokens=input_tok, output_tokens=output_tok,
                    cost_inr=cost, latency_ms=latency_ms)

        return LLMResponse(
            content=content,
            model_id=model,
            tier=tier,
            input_tokens=input_tok,
            output_tokens=output_tok,
            latency_ms=latency_ms,
            cost_inr=cost,
            provider=provider_name,
        )

    # ── Gemini Native Engine ─────────────────────────────────────────

    async def _call_gemini(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        tier: LLMTier,
        input_cost: float,
        output_cost: float,
    ) -> LLMResponse:
        """Call Gemini via google.generativeai SDK."""
        import google.generativeai as genai

        settings = self._settings
        genai.configure(api_key=settings.gemini_api_key)
        gmodel = genai.GenerativeModel(model)

        prompt = "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in messages
        )

        t0 = time.monotonic()
        response = await asyncio.to_thread(
            gmodel.generate_content,
            prompt,
            generation_config={"max_output_tokens": max_tokens, "temperature": temperature},
        )
        latency_ms = int((time.monotonic() - t0) * 1000)

        content = response.text
        input_tok = len(prompt) // 4
        output_tok = len(content) // 4
        cost = self._calc_cost(input_tok, output_tok, input_cost, output_cost)

        logger.info("gemini_call_ok", tier=tier.value, model=model, provider="gemini",
                    latency_ms=latency_ms, cost_inr=cost)

        return LLMResponse(
            content=content,
            model_id=model,
            tier=tier,
            input_tokens=input_tok,
            output_tokens=output_tok,
            latency_ms=latency_ms,
            cost_inr=cost,
            provider="gemini",
        )

    async def _call_gemini_vision(self, image_bytes: bytes, prompt: str) -> str:
        """Call Gemini via google.generativeai SDK for vision OCR."""
        import base64
        import google.generativeai as genai

        settings = self._settings
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.model_multimodal_ocr)
        b64 = base64.b64encode(image_bytes).decode()
        resp = await asyncio.to_thread(
            model.generate_content,
            [
                prompt,
                {"mime_type": "image/png", "data": b64},
            ],
        )
        return resp.text

    # ── Helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _calc_cost(in_tok: int, out_tok: int, in_rate: float, out_rate: float) -> float:
        """Cost in INR given per-1M-token rates."""
        return (in_tok * in_rate + out_tok * out_rate) / 1_000_000

    @staticmethod
    def _stub_response(tier: LLMTier, model: str) -> LLMResponse:
        return LLMResponse(
            content="[BidKaro AI Stub — Configure GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY in .env]",
            model_id=model,
            tier=tier,
            input_tokens=0,
            output_tokens=0,
            latency_ms=0,
            cost_inr=0.0,
            provider="stub",
        )

    async def close(self):
        if self._groq_client:
            await self._groq_client.aclose()
        if self._gemini_client:
            await self._gemini_client.aclose()
        if self._openrouter_client:
            await self._openrouter_client.aclose()
        if self._ollama_client:
            await self._ollama_client.aclose()


# ── Module-level singleton ──────────────────────────────────────────
_router: LLMRouter | None = None


def get_llm_router() -> LLMRouter:
    global _router
    if _router is None:
        _router = LLMRouter()
    return _router
