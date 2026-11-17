"""
BidKaro — FastAPI Application Entry Point
"""
import time
import uuid
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
import structlog
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.api import (
    admin,
    auth,
    boq,
    company,
    compliance,
    corrigendum,
    discovery,
    generation,
    newsletter,
    plans,
    rag,
    tenders,
    trial,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info(
        "bidkaro_startup",
        env=settings.app_env,
        storage=settings.storage_backend,
        embedding=settings.embedding_provider,
    )
    # Pre-warm embedding model on startup (avoid cold start on first request)
    if settings.embedding_provider == "fastembed":
        try:
            from app.services.embeddings import get_embedding_service
            svc = get_embedding_service()
            await svc.embed_query("warm up")
            logger.info("embedding_model_warmed_up")
        except Exception as e:
            logger.warning("embedding_warmup_failed", error=str(e))

    # Ensure database tables exist (automatic schema migration / creation on VPS startup)
    try:
        from app.core.database import Base, get_engine
        import app.models  # noqa
        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("db_schema_ready")
    except Exception as e:
        logger.warning("db_schema_init_warning", error=str(e))

    yield

    # Shutdown: close LLM HTTP clients
    from app.services.llm_router import get_llm_router
    await get_llm_router().close()
    logger.info("bidkaro_shutdown")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="BidKaro API",
        description="AI Tender Analysis & Bid Preparation Platform",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── 1. Request Correlation ID & Security Headers Middleware ──────
    @app.middleware("http")
    async def request_context_and_security_middleware(request: Request, call_next):
        start_time = time.perf_counter()

        # Extract or generate unique correlation Request ID
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_id = request_id

        # Bind request_id to structlog context
        structlog.contextvars.bind_contextvars(request_id=request_id)

        try:
            response: Response = await call_next(request)
        except Exception as exc:
            # Catch unhandled exceptions and return structured JSON
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "unhandled_server_exception",
                request_id=request_id,
                path=request.url.path,
                method=request.method,
                error=str(exc),
                duration_ms=round(duration_ms, 2),
            )
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "InternalServerError",
                    "message": "An unexpected error occurred. Please contact support with this Request ID.",
                    "request_id": request_id,
                },
                headers={
                    "X-Request-ID": request_id,
                    "X-Process-Time-Ms": f"{duration_ms:.2f}",
                },
            )

        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

    # ── 2. Sliding-Window Rate Limiter Middleware for Auth Endpoints ──
    @app.middleware("http")
    async def rate_limiting_middleware(request: Request, call_next):
        path = request.url.path

        # Only apply strict rate limits to sensitive auth actions
        if request.method == "POST" and any(
            path.startswith(prefix) for prefix in [
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/otp/send",
                "/api/auth/otp/verify",
                "/api/auth/google",
            ]
        ):
            client_ip = request.headers.get("x-forwarded-for") or (
                request.client.host if request.client else "unknown"
            )
            client_ip = client_ip.split(",")[0].strip()

            rate_limit_key = f"ratelimit:{client_ip}:{path.replace('/', '_')}"
            max_requests = 20  # 20 attempts per minute
            window_seconds = 60

            try:
                r = aioredis.from_url(settings.redis_url, decode_responses=True)
                current = await r.incr(rate_limit_key)
                if current == 1:
                    await r.expire(rate_limit_key, window_seconds)
                await r.aclose()

                if current > max_requests:
                    request_id = getattr(request.state, "request_id", uuid.uuid4().hex)
                    logger.warning(
                        "rate_limit_exceeded",
                        ip=client_ip,
                        path=path,
                        current=current,
                        max=max_requests,
                    )
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "error": "RateLimitExceeded",
                            "message": f"Too many requests. Maximum {max_requests} attempts per minute.",
                            "request_id": request_id,
                        },
                        headers={
                            "Retry-After": str(window_seconds),
                            "X-RateLimit-Limit": str(max_requests),
                            "X-RateLimit-Remaining": "0",
                        },
                    )
            except Exception as e:
                # Fail open if Redis is momentarily unreachable so legitimate users aren't locked out
                logger.warning("rate_limit_redis_check_skipped", error=str(e))

        return await call_next(request)

    # ── 3. CORS ───────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    # ── Routers ─────────────────────────────────────────────────────
    app.include_router(auth.router)
    app.include_router(trial.router)
    app.include_router(discovery.router)
    app.include_router(tenders.router)
    app.include_router(rag.router)
    app.include_router(compliance.router)
    app.include_router(boq.router)
    app.include_router(corrigendum.router)
    app.include_router(company.router)
    app.include_router(generation.router)
    app.include_router(plans.router)
    app.include_router(admin.router)
    app.include_router(newsletter.router)

    # ── Static file serving for local storage ───────────────────────
    if settings.storage_backend == "local":
        import os
        os.makedirs(settings.storage_local_path, exist_ok=True)
        app.mount(
            "/storage",
            StaticFiles(directory=settings.storage_local_path),
            name="storage",
        )

    # ── Health check ────────────────────────────────────────────────
    @app.get("/api/health", tags=["health"])
    async def health():
        return {"status": "ok", "service": "BidKaro API", "version": "1.0.0"}

    return app


app = create_app()
