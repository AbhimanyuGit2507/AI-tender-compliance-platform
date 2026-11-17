"""
BidKaro — Brevo Newsletter & Marketing Email Opt-In Endpoints
Handles:
1. Public lead capture subscription (e.g. Landing page footer)
2. One-click CAN-SPAM / GDPR unsubscribe
3. Authenticated contractor email notification preference controls
"""
from datetime import UTC, datetime
import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import NewsletterSubscriber, User
from app.services.email_service import get_email_service

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])


def _utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


class SubscribeRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    company: str | None = None
    source: str = "landing_page"


class UnsubscribeRequest(BaseModel):
    email: EmailStr


class UpdatePreferencesRequest(BaseModel):
    marketing_opt_in: bool
    tender_alerts_opt_in: bool
    newsletter_opt_in: bool


@router.post("/subscribe")
async def subscribe_newsletter(
    body: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public opt-in endpoint to subscribe to BidKaro government procurement circulars,
    high-value tender alerts, and regulatory intelligence briefs via Brevo.
    """
    clean_email = body.email.strip().lower()
    email_service = get_email_service()

    # 1. Upsert into newsletter_subscribers table
    res = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == clean_email)
    )
    subscriber = res.scalar_one_or_none()

    if subscriber:
        subscriber.is_active = True
        subscriber.opt_in_source = body.source or subscriber.opt_in_source
        if body.name:
            subscriber.name = body.name.strip()
        if body.company:
            subscriber.company = body.company.strip()
        subscriber.updated_at = _utc_now()
    else:
        subscriber = NewsletterSubscriber(
            id=uuid.uuid4(),
            email=clean_email,
            name=body.name.strip() if body.name else None,
            company=body.company.strip() if body.company else None,
            is_active=True,
            opt_in_source=body.source or "landing_page",
        )
        db.add(subscriber)

    await db.flush()

    # 2. Sync to Brevo Contacts API
    try:
        brevo_res = await email_service.sync_brevo_contact(
            email=clean_email,
            name=body.name,
            company=body.company,
            marketing_opt_in=True,
            tender_alerts_opt_in=True,
            newsletter_opt_in=True,
        )
        if isinstance(brevo_res, dict) and brevo_res.get("contact_id"):
            subscriber.brevo_contact_id = str(brevo_res["contact_id"])[:64]
            await db.flush()
    except Exception as e:
        logger.warning("newsletter_brevo_sync_failed", email=clean_email, error=str(e))

    # 3. Dispatch Opt-In Confirmation Email
    try:
        await email_service.send_opt_in_confirmation_email(
            to_email=clean_email,
            name=body.name,
            company=body.company,
        )
    except Exception as e:
        logger.warning("opt_in_confirmation_email_failed", email=clean_email, error=str(e))

    return {
        "success": True,
        "email": clean_email,
        "message": "Thank you for subscribing! A confirmation email with CPWD/NHAI procurement intelligence has been dispatched.",
    }


@router.post("/unsubscribe")
async def unsubscribe_newsletter(
    body: UnsubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public 1-click unsubscribe endpoint complying with CAN-SPAM and GDPR requirements.
    """
    clean_email = body.email.strip().lower()
    email_service = get_email_service()

    # 1. Update newsletter_subscribers table
    res = await db.execute(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == clean_email)
    )
    subscriber = res.scalar_one_or_none()
    if subscriber:
        subscriber.is_active = False
        subscriber.updated_at = _utc_now()

    # 2. Update user if registered
    user_res = await db.execute(select(User).where(User.email == clean_email))
    user = user_res.scalar_one_or_none()
    if user:
        user.marketing_opt_in = False
        user.newsletter_opt_in = False
        user.opt_in_updated_at = _utc_now()

    await db.flush()

    # 3. Update Brevo contact
    try:
        await email_service.unsubscribe_brevo_contact(clean_email)
    except Exception as e:
        logger.warning("newsletter_brevo_unsub_failed", email=clean_email, error=str(e))

    return {
        "success": True,
        "email": clean_email,
        "message": "You have been successfully unsubscribed from BidKaro marketing and tender intelligence emails.",
    }


@router.get("/preferences")
async def get_email_preferences(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's email opt-in and notification preferences.
    """
    u_res = await db.execute(select(User).where(User.id == user.user_id))
    u = u_res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "email": u.email,
        "marketing_opt_in": u.marketing_opt_in,
        "tender_alerts_opt_in": u.tender_alerts_opt_in,
        "newsletter_opt_in": u.newsletter_opt_in,
        "opt_in_updated_at": u.opt_in_updated_at.isoformat() if u.opt_in_updated_at else None,
    }


@router.patch("/preferences")
async def update_email_preferences(
    body: UpdatePreferencesRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user's email opt-in preferences and sync them with Brevo.
    """
    u_res = await db.execute(select(User).where(User.id == user.user_id))
    u = u_res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    u.marketing_opt_in = body.marketing_opt_in
    u.tender_alerts_opt_in = body.tender_alerts_opt_in
    u.newsletter_opt_in = body.newsletter_opt_in
    u.opt_in_updated_at = _utc_now()

    await db.flush()

    # Sync with Brevo
    if u.email:
        email_service = get_email_service()
        try:
            if not body.marketing_opt_in:
                await email_service.unsubscribe_brevo_contact(u.email)
            else:
                await email_service.sync_brevo_contact(
                    email=u.email,
                    name=u.display_name,
                    marketing_opt_in=body.marketing_opt_in,
                    tender_alerts_opt_in=body.tender_alerts_opt_in,
                    newsletter_opt_in=body.newsletter_opt_in,
                )
        except Exception as e:
            logger.warning("brevo_pref_sync_failed", error=str(e))

    return {
        "success": True,
        "preferences": {
            "marketing_opt_in": u.marketing_opt_in,
            "tender_alerts_opt_in": u.tender_alerts_opt_in,
            "newsletter_opt_in": u.newsletter_opt_in,
            "opt_in_updated_at": u.opt_in_updated_at.isoformat() if u.opt_in_updated_at else None,
        },
        "message": "Email preferences successfully updated and synchronized.",
    }
