"""
BidKaro — Audit Logging Service
Enterprise Security & SOC 2 Compliance Audit Trail
Records who performed what action, when, against which resource, and from what IP/User-Agent.
"""
from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import db_session
from app.models import AuditLog

logger = structlog.get_logger(__name__)


def extract_client_info(request: Request | None) -> tuple[str | None, str | None]:
    """Extract client IP address and User-Agent from FastAPI request."""
    if not request:
        return None, None

    # Check forward headers if behind reverse proxy
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else None

    user_agent = request.headers.get("user-agent", "")[:255] or None
    return ip, user_agent


async def log_audit_event(
    action: str,
    tenant_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
    db: AsyncSession | None = None,
) -> AuditLog | None:
    """
    Record an immutable audit event.
    Can be called with an active db session or will spawn its own isolated session.
    Fails safely without raising exceptions to parent business flow.
    """
    if request and not ip_address:
        ip, ua = extract_client_info(request)
        ip_address = ip
        if not user_agent:
            user_agent = ua

    entry = AuditLog(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details_jsonb=details or {},
    )

    try:
        if db:
            db.add(entry)
            await db.flush()
        else:
            async with db_session() as session:
                session.add(entry)
                await session.commit()

        logger.info(
            "audit_event_logged",
            action=action,
            tenant_id=str(tenant_id) if tenant_id else None,
            user_id=str(user_id) if user_id else None,
            resource=f"{resource_type}:{resource_id}" if resource_type else None,
        )
        return entry
    except Exception as e:
        logger.error("audit_log_failed", error=str(e), action=action)
        return None


async def get_tenant_audit_logs(
    tenant_id: uuid.UUID,
    db: AsyncSession,
    limit: int = 50,
    offset: int = 0,
    action: str | None = None,
    resource_type: str | None = None,
) -> tuple[list[AuditLog], int]:
    """Retrieve audit logs for a tenant with pagination and optional filtering."""
    query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)

    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)

    # Order newest first
    query = query.order_by(desc(AuditLog.created_at))

    # Total count
    from sqlalchemy import func
    count_query = select(func.count(AuditLog.id)).where(AuditLog.tenant_id == tenant_id)
    if action:
        count_query = count_query.where(AuditLog.action == action)
    if resource_type:
        count_query = count_query.where(AuditLog.resource_type == resource_type)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    res = await db.execute(query.limit(limit).offset(offset))
    logs = res.scalars().all()

    return list(logs), total
