"""
Unit Tests for Unified OpenRouter LLM Routing (Option A Single Wallet Architecture).
Tests Tier 1 (Fast Text), Tier 2 (Multimodal OCR), Tier 3 (Reasoning), and circuit breaker fallbacks.
"""
from __future__ import annotations

import base64
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.core.config import Settings
from app.services.llm_router import LLMRouter, LLMTier, LLMResponse


@pytest.fixture
def mock_openrouter_settings():
    return Settings(
        llm_provider="openrouter",
        openrouter_api_key="sk-or-v1-testkey12345",
        openrouter_base_url="https://openrouter.ai/api/v1",
        openrouter_model_fast_text="google/gemini-2.0-flash-001",
        openrouter_model_ocr="google/gemini-2.0-flash-001",
        openrouter_model_reasoning="deepseek/deepseek-chat",
        groq_api_key="gsk-testgroq",
        gemini_api_key="gem-testgemini",
    )


@pytest.mark.asyncio
async def test_tier1_fast_text_routes_to_openrouter(mock_openrouter_settings):
    """Tier 1 calls OpenRouter with Gemini 2.0 Flash when in openrouter mode."""
    router = LLMRouter()
    router._settings = mock_openrouter_settings

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": '{"title": "NHAI Road Construction"}'}}],
        "usage": {"prompt_tokens": 120, "completion_tokens": 45},
    }
    mock_client.post.return_value = mock_resp
    router._openrouter_client = mock_client

    messages = [{"role": "user", "content": "Extract tender metadata"}]
    res = await router.complete(tier=LLMTier.FAST_TEXT, messages=messages)

    assert res.provider == "openrouter_fast_text"
    assert res.model_id == "google/gemini-2.0-flash-001"
    assert "NHAI Road Construction" in res.content
    assert res.input_tokens == 120
    assert res.output_tokens == 45
    assert res.cost_inr > 0.0

    mock_client.post.assert_called_once()
    payload = mock_client.post.call_args[1]["json"]
    assert payload["model"] == "google/gemini-2.0-flash-001"


@pytest.mark.asyncio
async def test_tier2_multimodal_ocr_routes_to_openrouter_vision(mock_openrouter_settings):
    """ocr_page correctly encodes image bytes and routes to OpenRouter vision."""
    router = LLMRouter()
    router._settings = mock_openrouter_settings

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "| Item No | Description | Qty |\n| 1 | Excavation | 500 cum |"}}],
        "usage": {"prompt_tokens": 800, "completion_tokens": 60},
    }
    mock_client.post.return_value = mock_resp
    router._openrouter_client = mock_client

    sample_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    ocr_result = await router.ocr_page(sample_png, prompt="Extract tender BOQ")

    assert "| Excavation | 500 cum |" in ocr_result

    mock_client.post.assert_called_once()
    payload = mock_client.post.call_args[1]["json"]
    assert payload["model"] == "google/gemini-2.0-flash-001"
    messages = payload["messages"]
    assert len(messages) == 1
    content_parts = messages[0]["content"]
    assert content_parts[0]["type"] == "text"
    assert content_parts[1]["type"] == "image_url"
    expected_b64 = base64.b64encode(sample_png).decode("utf-8")
    assert content_parts[1]["image_url"]["url"] == f"data:image/png;base64,{expected_b64}"


@pytest.mark.asyncio
async def test_tier3_deep_reasoning_routes_to_openrouter(mock_openrouter_settings):
    """Tier 3 calls OpenRouter with DeepSeek-V3 for reasoning."""
    router = LLMRouter()
    router._settings = mock_openrouter_settings

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Comprehensive Legal Analysis of Clause 4.2..."}}],
        "usage": {"prompt_tokens": 1500, "completion_tokens": 400},
    }
    mock_client.post.return_value = mock_resp
    router._openrouter_client = mock_client

    messages = [{"role": "user", "content": "Analyze CPWD Clause 4.2 deviations"}]
    res = await router.complete(tier=LLMTier.REASONING, messages=messages)

    assert res.provider == "openrouter_deepseek"
    assert res.model_id == "deepseek/deepseek-chat"
    assert "Comprehensive Legal Analysis" in res.content


@pytest.mark.asyncio
async def test_tier3_claude_sonnet_routes_when_configured():
    """Tier 3 calls OpenRouter with Claude 3.5 Sonnet when configured as primary reasoning model."""
    settings = Settings(
        llm_provider="openrouter",
        openrouter_api_key="sk-or-v1-testkey12345",
        openrouter_model_reasoning="anthropic/claude-3.5-sonnet",
        openrouter_model_audit="openai/o3-mini",
    )
    router = LLMRouter()
    router._settings = settings

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Exhaustive Claude 3.5 Sonnet Technical Methodology..."}}],
        "usage": {"prompt_tokens": 4000, "completion_tokens": 2500},
    }
    mock_client.post.return_value = mock_resp
    router._openrouter_client = mock_client

    messages = [{"role": "user", "content": "Draft methodology"}]
    res = await router.complete(tier=LLMTier.REASONING, messages=messages, operation_type="methodology")

    assert res.provider == "openrouter_claude_sonnet"
    assert res.model_id == "anthropic/claude-3.5-sonnet"
    assert "Claude 3.5 Sonnet" in res.content
    assert res.cost_inr > 0.0


@pytest.mark.asyncio
async def test_circuit_breaker_cascades_from_openrouter_to_groq(mock_openrouter_settings):
    """If OpenRouter throws an exception, circuit breaker cascades to Groq seamlessly."""
    router = LLMRouter()
    router._settings = mock_openrouter_settings

    # OpenRouter client throws connection error
    mock_or_client = AsyncMock(spec=httpx.AsyncClient)
    mock_or_client.post.side_effect = httpx.ConnectError("OpenRouter unreachable")
    router._openrouter_client = mock_or_client

    # Groq client succeeds
    mock_groq_client = AsyncMock(spec=httpx.AsyncClient)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Fallback output from Groq Llama 3.1"}}],
        "usage": {"prompt_tokens": 90, "completion_tokens": 20},
    }
    mock_groq_client.post.return_value = mock_resp
    router._groq_client = mock_groq_client

    messages = [{"role": "user", "content": "Extract clause"}]
    res = await router.complete(tier=LLMTier.FAST_TEXT, messages=messages)

    assert res.provider == "groq"
    assert res.content == "Fallback output from Groq Llama 3.1"
    mock_or_client.post.assert_called_once()
    mock_groq_client.post.assert_called_once()


@pytest.mark.asyncio
async def test_ocr_page_cascades_to_gemini_on_openrouter_failure(mock_openrouter_settings):
    """If OpenRouter vision fails, ocr_page falls back to direct Gemini vision."""
    router = LLMRouter()
    router._settings = mock_openrouter_settings

    mock_or_client = AsyncMock(spec=httpx.AsyncClient)
    mock_or_client.post.side_effect = httpx.HTTPStatusError("500 Internal Error", request=MagicMock(), response=MagicMock())
    router._openrouter_client = mock_or_client

    with patch.object(router, "_call_gemini_vision", new=AsyncMock(return_value="Direct Gemini OCR text")):
        ocr_result = await router.ocr_page(b"sample-png-bytes")
        assert ocr_result == "Direct Gemini OCR text"

