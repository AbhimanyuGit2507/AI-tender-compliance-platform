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
    Publish an event to the tender's Redis channel from a synchronous Celery task.
    """
    payload = {
        "tender_id": str(tender_id),
        "step": step,
        "percent": percent,
        "error": error,
        "done": percent >= 100 or error is not None,
        **(extra or {}),
    }
    try:
        r = get_sync_redis()
        channel = channel_name(tender_id)
        r.publish(channel, json.dumps(payload))
        # Also store the latest state in a 1-hour Redis key so late-connecting SSE clients get it
        r.set(f"tender_status:{str(tender_id)}", json.dumps(payload), ex=3600)
        return True
    except Exception as exc:
        logger.warning("redis_publish_sync_failed", tender_id=str(tender_id), error=str(exc))
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
    """
    payload = {
        "tender_id": str(tender_id),
        "step": step,
        "percent": percent,
        "error": error,
        "done": percent >= 100 or error is not None,
        **(extra or {}),
    }
    try:
        r = get_async_redis()
        channel = channel_name(tender_id)
        await r.publish(channel, json.dumps(payload))
        await r.set(f"tender_status:{str(tender_id)}", json.dumps(payload), ex=3600)
        await r.aclose()
        return True
    except Exception as exc:
        logger.warning("redis_publish_async_failed", tender_id=str(tender_id), error=str(exc))
        return False


async def stream_tender_events(
    tender_id: str | uuid.UUID,
    keep_alive_seconds: int = 15,
    max_duration_seconds: int = 300,
) -> AsyncGenerator[str, None]:
    """
    Async generator yielding Server-Sent Events from Redis Pub/Sub.
    Emits keep-alive comment pings every 15s to keep reverse-proxies from timing out.
    """
    str_id = str(tender_id)
    channel = channel_name(str_id)
    r = get_async_redis()
    pubsub = r.pubsub()

    try:
        await pubsub.subscribe(channel)

        # Check if an existing status was already set (e.g. fast completion before SSE connect)
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
                # Wait for message with a timeout for keep-alive
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
                # Keep-alive comment ping (prevents Nginx / reverse-proxy 504 timeouts)
                yield ": keep-alive\n\n"
                elapsed += keep_alive_seconds

    except asyncio.CancelledError:
        logger.info("sse_client_disconnected", tender_id=str_id)
    except Exception as exc:
        logger.error("sse_stream_error", tender_id=str_id, error=str(exc))
        err_payload = json.dumps({"tender_id": str_id, "step": "error", "percent": 0, "error": str(exc), "done": True})
        yield f"event: progress\ndata: {err_payload}\n\n"
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            await r.aclose()
        except Exception:
            pass
