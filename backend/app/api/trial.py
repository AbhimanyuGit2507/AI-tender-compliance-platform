"""
BidKaro — Guest Trial Endpoint
POST /api/trial/analyze  — Public, 1 free analysis per IP per 24h
GET  /api/trial/status   — Check if current IP has trial available
"""
from __future__ import annotations

import hashlib
import io
import uuid
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
import structlog
from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from app.core.config import get_settings

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/trial", tags=["trial"])

TRIAL_WINDOW_SECONDS = 86_400  # 24 hours
MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


def _get_client_fingerprint(request: Request) -> str:
    """Derive a stable fingerprint from IP + User-Agent for light device isolation."""
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )
    ua = request.headers.get("user-agent", "")[:120]
    raw = f"{ip}:{ua}"
    return hashlib.sha256(raw.encode()).hexdigest()[:40]


_MEMORY_TRIAL_STORE: dict[str, float] = {}


async def _check_and_consume_trial(fingerprint: str, settings) -> tuple[bool, int]:
    """
    Returns (allowed, seconds_remaining_until_reset).
    Consumes the trial slot atomically if allowed.
    """
    key = f"trial:v2:{fingerprint}"
    now = datetime.now(timezone.utc).timestamp()
    if settings.redis_url:
        try:
            r = aioredis.from_url(settings.redis_url, decode_responses=True)
            pipe = r.pipeline()
            pipe.incr(key)
            pipe.ttl(key)
            count, ttl = await pipe.execute()

            if count == 1:
                # First hit — set expiry
                await r.expire(key, TRIAL_WINDOW_SECONDS)
                ttl = TRIAL_WINDOW_SECONDS

            await r.aclose()

            if count > 1:
                return False, max(0, ttl)
            return True, 0

        except Exception as exc:
            logger.warning("trial_redis_unavailable", error=str(exc))

    # Memory fallback
    expiry = _MEMORY_TRIAL_STORE.get(fingerprint)
    if expiry and expiry > now:
        return False, int(expiry - now)

    _MEMORY_TRIAL_STORE[fingerprint] = now + TRIAL_WINDOW_SECONDS
    return True, 0


class TrialStatusResponse(BaseModel):
    available: bool
    message: str
    reset_in_seconds: int | None = None


class TrialAnalysisResponse(BaseModel):
    success: bool
    trial_id: str
    filename: str
    summary: str
    key_requirements: list[str]
    key_risks: list[str]
    compliance_score: int  # 0-100
    readiness_label: str  # "Strong" | "Conditional" | "Challenging"
    page_count: int
    word_count_estimate: int
    cta_message: str


@router.get("/status", response_model=TrialStatusResponse)
async def get_trial_status(request: Request):
    """Check if the current device/IP has a free trial available."""
    settings = get_settings()
    fingerprint = _get_client_fingerprint(request)
    key = f"trial:v2:{fingerprint}"

    try:
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        count_str = await r.get(key)
        ttl = await r.ttl(key)
        await r.aclose()

        if count_str and int(count_str) >= 1:
            return TrialStatusResponse(
                available=False,
                message="Your free analysis has been used. Sign up for unlimited access.",
                reset_in_seconds=max(0, ttl),
            )
    except Exception:
        pass

    now = datetime.now(timezone.utc).timestamp()
    expiry = _MEMORY_TRIAL_STORE.get(fingerprint)
    if expiry and expiry > now:
        return TrialStatusResponse(
            available=False,
            message="Your free analysis has been used. Sign up for unlimited access.",
            reset_in_seconds=int(expiry - now),
        )

    return TrialStatusResponse(
        available=True,
        message="You have 1 free tender analysis available — no signup required.",
    )


@router.post("/analyze", response_model=TrialAnalysisResponse)
async def guest_analyze(
    request: Request,
    file: UploadFile = File(..., description="Tender PDF (max 20MB)"),
):
    """
    Public endpoint. Accepts a tender PDF and returns a quick AI analysis.
    Rate limited: 1 per device fingerprint per 24 hours.
    """
    settings = get_settings()

    # ── 1. Fingerprint + Rate limit ───────────────────────────────────
    fingerprint = _get_client_fingerprint(request)
    allowed, reset_secs = await _check_and_consume_trial(fingerprint, settings)

    if not allowed:
        hours = round(reset_secs / 3600, 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "TrialExhausted",
                "message": f"Your free analysis slot resets in ~{hours}h. Create a free account for unlimited access.",
                "reset_in_seconds": reset_secs,
                "signup_url": "/signup",
            },
        )

    # ── 2. Validate file ──────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("pdf",):
        raise HTTPException(
            status_code=415,
            detail="Only PDF files are accepted for trial analysis.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_BYTES // (1024*1024)}MB.",
        )

    # ── 3. Quick extraction + AI analysis ────────────────────────────
    try:
        result = await _run_quick_analysis(contents, file.filename or "tender.pdf", settings)
    except Exception as exc:
        logger.error("trial_analysis_failed", error=str(exc))
        raise HTTPException(
            status_code=500,
            detail="Analysis failed. Please try again or upload a clearer PDF.",
        )

    trial_id = uuid.uuid4().hex[:12]
    logger.info(
        "trial_analysis_complete",
        trial_id=trial_id,
        fingerprint=fingerprint,
        filename=file.filename,
        score=result["compliance_score"],
    )

    return TrialAnalysisResponse(
        success=True,
        trial_id=trial_id,
        filename=file.filename or "tender.pdf",
        summary=result["summary"],
        key_requirements=result["key_requirements"],
        key_risks=result["key_risks"],
        compliance_score=result["compliance_score"],
        readiness_label=result["readiness_label"],
        page_count=result["page_count"],
        word_count_estimate=result["word_count_estimate"],
        cta_message=(
            "This is your free preview. Sign up free to unlock full compliance matrix, "
            "BOQ analysis, document generation, and our AI procurement copilot."
        ),
    )


async def _run_quick_analysis(pdf_bytes: bytes, filename: str, settings) -> dict:
    """
    Lightweight analysis pipeline for guest trial:
    1. Extract text via pdfplumber (first 30 pages max)
    2. Send to LLM with a tightly-scoped prompt
    3. Parse structured JSON response
    """
    import json
    import re

    # Extract text
    text_snippet = _extract_pdf_text(pdf_bytes, max_pages=30)
    word_count = len(text_snippet.split())
    page_count = _estimate_page_count(pdf_bytes)

    # Build prompt
    prompt = f"""You are an expert Indian government procurement analyst. Analyze this tender document excerpt and return ONLY valid JSON (no markdown, no explanation).

TENDER TEXT (first ~{len(text_snippet)} chars):
{text_snippet[:8000]}

Return this exact JSON structure:
{{
  "summary": "2-3 sentence summary of what this tender is for",
  "key_requirements": ["requirement 1", "requirement 2", "requirement 3", "requirement 4", "requirement 5"],
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "compliance_score": <integer 0-100 representing how well a typical mid-size contractor would qualify>,
  "readiness_label": "<one of: Strong | Conditional | Challenging>"
}}"""

    # Call LLM router
    from app.services.llm_router import LLMTier, get_llm_router
    router_svc = get_llm_router()
    raw_response = await router_svc.generate(
        tier=LLMTier.FAST_TEXT,
        system_prompt="You are a JSON-only procurement analysis engine. Output only valid JSON with keys: summary, key_requirements, key_risks, compliance_score, readiness_label.",
        prompt=prompt,
        user_prompt=prompt,
        response_json=True,
        max_tokens=800,
        temperature=0.1,
    )

    # Parse response
    try:
        content_str = raw_response.content if hasattr(raw_response, "content") else str(raw_response)
        clean = re.sub(r"```(?:json)?|```", "", content_str).strip()
        data = json.loads(clean)
        if not isinstance(data, dict):
            data = {}
    except (json.JSONDecodeError, Exception):
        data = {}

    # Extract with rock-solid defaults to ensure schema conformance
    summary = str(data.get("summary") or "Tender document received and processed. Sign up for detailed analysis.")
    key_requirements = data.get("key_requirements") if isinstance(data.get("key_requirements"), list) else [
        "Valid GSTIN registration",
        "Experience in similar domain",
        "Adequate financial capacity",
        "Technical qualification certificate",
        "EMD submission required",
    ]
    key_risks = data.get("key_risks") if isinstance(data.get("key_risks"), list) else [
        "Complex technical specifications",
        "Short submission timeline",
        "High EMD requirement",
    ]
    try:
        score_val = int(data.get("compliance_score", 65))
    except (ValueError, TypeError):
        score_val = 65

    readiness = str(data.get("readiness_label") or "Conditional")
    if readiness not in ("Strong", "Conditional", "Challenging"):
        readiness = "Conditional"

    return {
        "summary": summary,
        "key_requirements": [str(r) for r in key_requirements],
        "key_risks": [str(r) for r in key_risks],
        "compliance_score": score_val,
        "readiness_label": readiness,
        "page_count": page_count,
        "word_count_estimate": word_count,
    }


def _extract_pdf_text(pdf_bytes: bytes, max_pages: int = 30) -> str:
    """Extract clean text from PDF using PyMuPDF (fitz) or pdfplumber."""
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        texts = []
        for i in range(min(len(doc), max_pages)):
            page_text = doc[i].get_text()
            if page_text and page_text.strip():
                texts.append(page_text)
        if texts:
            return "\n\n".join(texts)
    except Exception as exc:
        logger.warning("fitz_text_extract_failed", error=str(exc))

    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = pdf.pages[:max_pages]
            texts = [p.extract_text() for p in pages if p.extract_text()]
            return "\n\n".join(texts)
    except Exception:
        return ""


def _estimate_page_count(pdf_bytes: bytes) -> int:
    """Estimate page count from PDF."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return len(pdf.pages)
    except Exception:
        # Rough estimate: ~3KB per page
        return max(1, len(pdf_bytes) // 3000)
