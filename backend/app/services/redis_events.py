"""
BidKaro — Redis Pub/Sub Real-Time Event Service
Publishes and subscribes to real-time ingestion, generation, and audit events.
Channel convention: tender_events:{tender_id}
"""
from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, AsyncGenerator

import redis
import redis.asyncio as aioredis
import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


# In-memory pub/sub fallback for standalone / single-container deployment (e.g. Render web service)
_memory_status: dict[str, dict[str, Any]] = {}
_memory_subscribers: dict[str, list[asyncio.Queue]] = {}


def is_redis_available() -> bool:
    """Quick check (0.3s socket timeout) to see if Redis server is reachable."""
    try:
        settings = get_settings()
        r = redis.Redis.from_url(
            settings.redis_url,
            socket_connect_timeout=0.3,
            socket_timeout=0.3,
        )
        return bool(r.ping())
    except Exception:
        return False


def get_sync_redis() -> redis.Redis:
    """Synchronous Redis client for Celery workers."""
    settings = get_settings()
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def get_async_redis() -> aioredis.Redis:
    """Async Redis client for FastAPI routes."""
    settings = get_settings()
    return aioredis.Redis.from_url(settings.redis_url, decode_responses=True)


def channel_name(tender_id: str | uuid.UUID) -> str:
    return f"tender_events:{str(tender_id)}"


def publish_tender_progress_sync(
    tender_id: str | uuid.UUID,
    step: str,
    percent: int,
    error: str | None = None,
    extra: dict[str, Any] | None = None,
) -> bool:
    """
    Publish an event to the tender's Redis channel from a synchronous Celery task or BackgroundTask.
    Also notifies local in-memory subscribers.
    """
    str_id = str(tender_id)
    payload = {
        "tender_id": str_id,
        "step": step,
        "percent": percent,
        "error": error,
        "done": percent >= 100 or error is not None,
        **(extra or {}),
    }

    # Always record in memory for local fallback
    _memory_status[str_id] = payload
    if str_id in _memory_subscribers:
        for q in list(_memory_subscribers[str_id]):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    try:
        r = get_sync_redis()
        channel = channel_name(tender_id)
        r.publish(channel, json.dumps(payload))
        # Also store the latest state in a 1-hour Redis key so late-connecting SSE clients get it
        r.set(f"tender_status:{str_id}", json.dumps(payload), ex=3600)
        return True
    except Exception as exc:
        logger.debug("redis_publish_sync_skipped_or_failed", tender_id=str_id, error=str(exc))
        return False


async def publish_tender_progress_async(
    tender_id: str | uuid.UUID,
    step: str,
    percent: int,
    error: str | None = None,
    extra: dict[str, Any] | None = None,
) -> bool:
    """
    Publish an event from an async context.
    Also notifies local in-memory subscribers.
    """
    str_id = str(tender_id)
    payload = {
        "tender_id": str_id,
        "step": step,
        "percent": percent,
        "error": error,
        "done": percent >= 100 or error is not None,
        **(extra or {}),
    }

    # Always record in memory for local fallback
    _memory_status[str_id] = payload
    if str_id in _memory_subscribers:
        for q in list(_memory_subscribers[str_id]):
            try:
                q.put_nowait(payload)
            except Exception:
                pass

    try:
        r = get_async_redis()
        channel = channel_name(tender_id)
        await r.publish(channel, json.dumps(payload))
        await r.set(f"tender_status:{str_id}", json.dumps(payload), ex=3600)
        await r.aclose()
        return True
    except Exception as exc:
        logger.debug("redis_publish_async_skipped_or_failed", tender_id=str_id, error=str(exc))
        return False


async def stream_tender_events(
    tender_id: str | uuid.UUID,
    keep_alive_seconds: int = 15,
    max_duration_seconds: int = 300,
) -> AsyncGenerator[str, None]:
    """
    Async generator yielding Server-Sent Events from Redis Pub/Sub or in-memory fallback.
    Emits keep-alive comment pings every 15s to keep reverse-proxies from timing out.
    """
    str_id = str(tender_id)

    # ── Path A: Real Redis Pub/Sub (if available) ────────────────────
    if is_redis_available():
        channel = channel_name(str_id)
        r = get_async_redis()
        pubsub = r.pubsub()

        try:
            await pubsub.subscribe(channel)

            initial = await r.get(f"tender_status:{str_id}")
            if initial:
                yield f"event: progress\ndata: {initial}\n\n"
                try:
                    init_data = json.loads(initial)
                    if init_data.get("done"):
                        return
                except Exception:
                    pass

            elapsed = 0
            while elapsed < max_duration_seconds:
                try:
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True, timeout=keep_alive_seconds),
                        timeout=keep_alive_seconds + 1,
                    )
                except asyncio.TimeoutError:
                    message = None

                if message and message.get("type") == "message":
                    data_str = message.get("data", "")
                    yield f"event: progress\ndata: {data_str}\n\n"
                    try:
                        data = json.loads(data_str)
                        if data.get("done"):
                            break
                    except Exception:
                        pass
                else:
                    yield ": keep-alive\n\n"
                    elapsed += keep_alive_seconds

            return
        except asyncio.CancelledError:
            logger.info("sse_client_disconnected", tender_id=str_id)
            return
        except Exception as exc:
            logger.warning("sse_redis_stream_failed_fallback_to_memory", tender_id=str_id, error=str(exc))
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.close()
                await r.aclose()
            except Exception:
                pass

    # ── Path B: In-Memory + DB Polling Fallback (standalone/single container) ──
    logger.info("sse_using_in_memory_stream", tender_id=str_id)
    q: asyncio.Queue = asyncio.Queue()
    _memory_subscribers.setdefault(str_id, []).append(q)

    try:
        # Check if latest status exists in memory
        if str_id in _memory_status:
            init_payload = _memory_status[str_id]
            yield f"event: progress\ndata: {json.dumps(init_payload)}\n\n"
            if init_payload.get("done"):
                return
        else:
            # Check DB to see if tender is already processed
            try:
                from app.core.database import db_session
                from app.models import Tender
                from sqlalchemy import select
                async with db_session() as db:
                    t_res = await db.execute(select(Tender).where(Tender.id == uuid.UUID(str_id)))
                    t_obj = t_res.scalar_one_or_none()
                    if t_obj and t_obj.status in ("ready", "FAILED", "invalid_document"):
                        db_payload = {
                            "tender_id": str_id,
                            "step": "Analysis ready & readiness score calculation" if t_obj.status == "ready" else t_obj.status,
                            "percent": 100 if t_obj.status in ("ready", "invalid_document") else 0,
                            "done": True,
                        }
                        yield f"event: progress\ndata: {json.dumps(db_payload)}\n\n"
                        return
            except Exception as dbe:
                logger.debug("db_status_precheck_failed", error=str(dbe))

        elapsed = 0
        while elapsed < max_duration_seconds:
            try:
                event_data = await asyncio.wait_for(q.get(), timeout=keep_alive_seconds)
                yield f"event: progress\ndata: {json.dumps(event_data)}\n\n"
                if event_data.get("done"):
                    break
            except asyncio.TimeoutError:
                yield ": keep-alive\n\n"
                elapsed += keep_alive_seconds

                # Periodically verify DB state in case background task finished without pubsub event
                try:
                    from app.core.database import db_session
                    from app.models import Tender
                    from sqlalchemy import select
                    async with db_session() as db:
                        t_res = await db.execute(select(Tender).where(Tender.id == uuid.UUID(str_id)))
                        t_obj = t_res.scalar_one_or_none()
                        if t_obj and t_obj.status in ("ready", "FAILED", "invalid_document"):
                            db_payload = {
                                "tender_id": str_id,
                                "step": "Analysis ready & readiness score calculation" if t_obj.status == "ready" else t_obj.status,
                                "percent": 100 if t_obj.status in ("ready", "invalid_document") else 0,
                                "done": True,
                            }
                            yield f"event: progress\ndata: {json.dumps(db_payload)}\n\n"
                            break
                except Exception:
                    pass

    except asyncio.CancelledError:
        logger.info("sse_in_memory_client_disconnected", tender_id=str_id)
    except Exception as exc:
        logger.error("sse_in_memory_stream_error", tender_id=str_id, error=str(exc))
        err_payload = json.dumps({"tender_id": str_id, "step": "error", "percent": 0, "error": str(exc), "done": True})
        yield f"event: progress\ndata: {err_payload}\n\n"
    finally:
        if str_id in _memory_subscribers and q in _memory_subscribers[str_id]:
            _memory_subscribers[str_id].remove(q)
            if not _memory_subscribers[str_id]:
                _memory_subscribers.pop(str_id, None)
