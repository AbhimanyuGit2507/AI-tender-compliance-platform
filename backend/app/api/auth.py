"""
BidKaro — Auth Router
POST /api/auth/register   — Register new user + create tenant
POST /api/auth/login      — Email + password login
POST /api/auth/anonymous  — Create anonymous session token
POST /api/auth/migrate    — Migrate anonymous session to real account
GET  /api/auth/me         — Get current user info
"""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    CurrentUser,
    create_access_token,
    get_current_user,
    hash_password,
    verify_google_token,
    verify_password,
)
from app.models import CompanyFact, CreditLedgerEntry, Tenant, User
from app.services.audit_service import get_tenant_audit_logs, log_audit_event
from app.services.email_service import generate_otp_code, get_email_service
from app.core.rate_limiter import get_client_ip, rate_limiter

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    company_name: str = Field(..., min_length=2)
    name: str | None = None
    gstin: str | None = None
    marketing_opt_in: bool = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=5)
    company_name: str | None = None
    marketing_opt_in: bool = True


class OtpSendRequest(BaseModel):
    email: EmailStr


class OtpSendResponse(BaseModel):
    success: bool
    message: str
    expires_in_seconds: int = 300
    dev_otp: str | None = None


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=8)
    company_name: str | None = None  # Optional company name if provisioning new account
    marketing_opt_in: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    tenant_id: str
    is_anonymous: bool
    is_new_user: bool = False



@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limiter(max_requests=15, window_seconds=60, key_prefix="auth_reg"))],
)
async def register(body: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Create a new tenant + owner user. Awards free trial credits and dispatches welcome email."""
    settings = get_settings()

    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create tenant
    tenant = Tenant(
        id=uuid.uuid4(),
        name=body.company_name,
        plan_tier="free",
        credit_balance=settings.free_trial_credits,
    )
    db.add(tenant)
    await db.flush()

    # Create user
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.name,
        role="owner",
        is_anonymous=False,
        marketing_opt_in=body.marketing_opt_in,
        tender_alerts_opt_in=body.marketing_opt_in,
        newsletter_opt_in=body.marketing_opt_in,
    )
    db.add(user)

    # Credit ledger: signup bonus
    ledger_entry = CreditLedgerEntry(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        operation_type="signup_bonus",
        credits_delta=settings.free_trial_credits,
        idempotency_key=f"signup-{tenant.id}",
    )
    db.add(ledger_entry)

    if body.gstin:
        gstin_fact = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            fact_category="registration",
            fact_key="gstin",
            raw_value=body.gstin.strip().upper(),
            verification_status="verified",
            confidence=1.0,
        )
        db.add(gstin_fact)

    await db.flush()

    token = create_access_token(user.id, tenant.id, user.role)
    logger.info("user_registered", user_id=str(user.id), tenant=str(tenant.id))

    # Send Welcome Onboarding Email & Sync Brevo Opt-In
    try:
        email_svc = get_email_service()
        await email_svc.send_welcome_email(
            to_email=user.email,
            company_name=tenant.name,
            trial_credits=settings.free_trial_credits,
            tenant_id=tenant.id,
        )
        if body.marketing_opt_in:
            await email_svc.sync_brevo_contact(
                email=user.email,
                name=body.name,
                company=tenant.name,
                marketing_opt_in=True,
            )
    except Exception as e:
        logger.warning("welcome_email_dispatch_failed", error=str(e))

    # Record Audit Event
    await log_audit_event(
        action="auth.register",
        tenant_id=tenant.id,
        user_id=user.id,
        resource_type="tenant",
        resource_id=str(tenant.id),
        details={"company_name": tenant.name, "email": user.email, "method": "password"},
        request=request,
        db=db,
    )

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        is_anonymous=False,
        is_new_user=True,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limiter(max_requests=25, window_seconds=60, key_prefix="auth_login"))],
)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        await log_audit_event(
            action="auth.login_failed",
            details={"email": body.email, "reason": "invalid_credentials"},
            request=request,
            db=db,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id, user.tenant_id, user.role)

    await log_audit_event(
        action="auth.login",
        tenant_id=user.tenant_id,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        details={"email": user.email, "method": "password"},
        request=request,
        db=db,
    )

    # Dispatch Brevo New Login Alert
    try:
        email_svc = get_email_service()
        ip_addr = get_client_ip(request)
        ua = request.headers.get("user-agent", "Web Browser")
        await email_svc.send_new_login_alert(
            to_email=user.email,
            ip_address=ip_addr,
            device_info=ua,
            tenant_id=user.tenant_id,
        )
    except Exception as exc:
        logger.warning("login_alert_email_failed", error=str(exc))

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        is_anonymous=False,
    )


@router.post(
    "/google",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limiter(max_requests=25, window_seconds=60, key_prefix="auth_google"))],
)
async def google_login(body: GoogleAuthRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Authenticate or register via Google OAuth2 Single Sign-On (SSO).
    Verifies ID token, provisions new tenant if user is new, or signs in existing contractor.
    """
    settings = get_settings()

    # 1. Verify Google Token
    google_user = await verify_google_token(body.credential)
    clean_email = google_user.email.strip().lower()

    # 2. Check if user exists by google_id or email
    user_res = await db.execute(
        select(User).where((User.google_id == google_user.sub) | (User.email == clean_email))
    )
    user = user_res.scalar_one_or_none()

    is_new = False
    if user:
        # Link google_id if account was originally created via email/password
        if not user.google_id:
            user.google_id = google_user.sub
            await db.flush()

        tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_res.scalar_one_or_none()
    else:
        # Provision new Tenant + User
        is_new = True
        company_name = body.company_name.strip() if body.company_name else (
            (google_user.name + " EPC Infra") if google_user.name else (clean_email.split("@")[0].capitalize() + " Infra")
        )

        tenant = Tenant(
            id=uuid.uuid4(),
            name=company_name,
            plan_tier="free",
            credit_balance=settings.free_trial_credits,
        )
        db.add(tenant)
        await db.flush()

        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            email=clean_email,
            password_hash=None,
            google_id=google_user.sub,
            display_name=google_user.name,
            role="owner",
            is_anonymous=False,
            marketing_opt_in=body.marketing_opt_in,
            tender_alerts_opt_in=body.marketing_opt_in,
            newsletter_opt_in=body.marketing_opt_in,
        )
        db.add(user)

        ledger_entry = CreditLedgerEntry(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            operation_type="signup_bonus",
            credits_delta=settings.free_trial_credits,
            idempotency_key=f"signup-{tenant.id}",
        )
        db.add(ledger_entry)
        await db.flush()

        # Send welcome email & Sync Brevo Opt-in
        try:
            email_svc = get_email_service()
            await email_svc.send_welcome_email(
                to_email=clean_email,
                company_name=company_name,
                trial_credits=settings.free_trial_credits,
                tenant_id=tenant.id,
            )
            if body.marketing_opt_in:
                await email_svc.sync_brevo_contact(
                    email=clean_email,
                    name=google_user.name,
                    company=company_name,
                    marketing_opt_in=True,
                )
        except Exception as e:
            logger.warning("google_welcome_email_failed", error=str(e))

    token = create_access_token(user.id, user.tenant_id, user.role)

    await log_audit_event(
        action="auth.google_register" if is_new else "auth.google_login",
        tenant_id=user.tenant_id,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        details={"email": clean_email, "google_id": google_user.sub, "method": "google_sso"},
        request=request,
        db=db,
    )

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        is_anonymous=False,
        is_new_user=is_new,
    )



@router.post(
    "/otp/send",
    response_model=OtpSendResponse,
    dependencies=[Depends(rate_limiter(max_requests=10, window_seconds=60, key_prefix="auth_otp_send"))],
)
async def send_otp(body: OtpSendRequest):
    """
    Generate and dispatch a 6-digit OTP code to the requested email via Brevo transactional email.
    If Brevo API key is not configured, logs code locally and returns dev fallback.
    """
    email_service = get_email_service()
    otp_code = generate_otp_code(6)

    result = await email_service.send_otp_email(to_email=body.email, otp_code=otp_code)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Failed to dispatch email via Brevo. Please try again."),
        )

    return OtpSendResponse(
        success=True,
        message=f"A 6-digit verification code has been dispatched to {body.email}",
        expires_in_seconds=email_service.settings.otp_expire_seconds,
        dev_otp=result.get("dev_otp"),
    )


@router.post(
    "/otp/verify",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limiter(max_requests=20, window_seconds=60, key_prefix="auth_otp_verify"))],
)
async def verify_otp(body: OtpVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Verify 6-digit OTP code.
    If valid:
    - If user already exists: authenticates and returns JWT.
    - If user does not exist: provisions a new tenant + user with welcome credits and returns JWT.
    """
    settings = get_settings()
    email_service = get_email_service()

    # 1. Verify code
    is_valid, msg = await email_service.verify_otp(email=body.email, code=body.otp)
    if not is_valid:
        await log_audit_event(
            action="auth.otp_verify_failed",
            details={"email": body.email, "reason": msg},
            request=request,
            db=db,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

    # 2. Check if user exists
    clean_email = body.email.strip().lower()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()

    is_new = False
    if not user:
        is_new = True
        company_name = body.company_name.strip() if body.company_name else clean_email.split("@")[0].capitalize() + " Infra"

        tenant = Tenant(
            id=uuid.uuid4(),
            name=company_name,
            plan_tier="free",
            credit_balance=settings.free_trial_credits,
        )
        db.add(tenant)
        await db.flush()

        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            email=clean_email,
            password_hash=None,  # Passwordless / OTP user
            role="owner",
            is_anonymous=False,
            marketing_opt_in=body.marketing_opt_in,
            tender_alerts_opt_in=body.marketing_opt_in,
            newsletter_opt_in=body.marketing_opt_in,
        )
        db.add(user)

        ledger_entry = CreditLedgerEntry(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            operation_type="signup_bonus",
            credits_delta=settings.free_trial_credits,
            idempotency_key=f"signup-{tenant.id}",
        )
        db.add(ledger_entry)
        await db.flush()

        # Send welcome email via Brevo & Sync Opt-in
        try:
            await email_service.send_welcome_email(
                to_email=clean_email,
                company_name=company_name,
                trial_credits=settings.free_trial_credits,
                tenant_id=tenant.id,
            )
            if body.marketing_opt_in:
                await email_service.sync_brevo_contact(
                    email=clean_email,
                    company=company_name,
                    marketing_opt_in=True,
                )
        except Exception as e:
            logger.warning("welcome_email_failed_otp", error=str(e))

        logger.info("otp_user_provisioned", user_id=str(user.id), tenant_id=str(tenant.id), email=clean_email)

    token = create_access_token(user.id, user.tenant_id, user.role)

    await log_audit_event(
        action="auth.otp_register" if is_new else "auth.otp_login",
        tenant_id=user.tenant_id,
        user_id=user.id,
        resource_type="user",
        resource_id=str(user.id),
        details={"email": clean_email, "method": "brevo_otp"},
        request=request,
        db=db,
    )

    # If returning user, send new login alert email
    if not is_new:
        try:
            ip_addr = get_client_ip(request)
            ua = request.headers.get("user-agent", "Web Browser")
            await email_service.send_new_login_alert(
                to_email=clean_email,
                ip_address=ip_addr,
                device_info=ua,
                tenant_id=user.tenant_id,
            )
        except Exception as exc:
            logger.warning("login_alert_email_failed_otp", error=str(exc))

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        is_anonymous=False,
        is_new_user=is_new,
    )



@router.post("/anonymous", response_model=TokenResponse)
async def create_anonymous_session(db: AsyncSession = Depends(get_db)):
    """
    Stage 0: Create a short-lived anonymous tenant + user for pre-signup uploads.
    The session_id is returned so it can be migrated after signup.
    """
    session_id = uuid.uuid4().hex

    tenant = Tenant(id=uuid.uuid4(), name="Anonymous", plan_tier="free", credit_balance=0)
    db.add(tenant)
    await db.flush()

    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        role="owner",
        is_anonymous=True,
        anon_session_id=session_id,
    )
    db.add(user)
    await db.flush()

    # Short-lived token: 2 hours
    token = create_access_token(user.id, tenant.id, user.role, is_anonymous=True, expires_minutes=120)

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        tenant_id=str(tenant.id),
        is_anonymous=True,
    )


@router.get("/me")
async def get_me(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Tenant).where(Tenant.id == user.tenant_id)
    )
    tenant = result.scalar_one_or_none()

    u_res = await db.execute(select(User).where(User.id == user.user_id))
    u = u_res.scalar_one_or_none()

    gstin_res = await db.execute(
        select(CompanyFact.raw_value).where(
            CompanyFact.tenant_id == user.tenant_id,
            CompanyFact.fact_key.in_(["gstin", "registration_gstin"]),
        )
    )
    gstin = gstin_res.scalar_one_or_none()

    return {
        "user_id": str(user.user_id),
        "tenant_id": str(user.tenant_id),
        "email": u.email if u else None,
        "display_name": u.display_name if u else None,
        "company_name": tenant.name if tenant else None,
        "gstin": gstin,
        "role": user.role,
        "is_anonymous": user.is_anonymous,
        "onboarding_complete": u.onboarding_complete if u else False,
        "marketing_opt_in": u.marketing_opt_in if u else True,
        "tender_alerts_opt_in": u.tender_alerts_opt_in if u else True,
        "newsletter_opt_in": u.newsletter_opt_in if u else True,
        "credit_balance": tenant.credit_balance if tenant else 0,
        "plan_tier": tenant.plan_tier if tenant else "free",
    }


@router.get("/audit-logs")
async def get_audit_trail(
    limit: int = 50,
    offset: int = 0,
    action: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve immutable enterprise audit trail for the current tenant.
    SOC 2 & ISO 27001 compliance export ready.
    """
    logs, total = await get_tenant_audit_logs(
        tenant_id=user.tenant_id,
        db=db,
        limit=min(limit, 100),
        offset=offset,
        action=action,
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": str(log.id),
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "user_id": str(log.user_id) if log.user_id else None,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "details": log.details_jsonb,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


@router.patch("/me/onboarding")
async def complete_onboarding(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark the current user's onboarding as complete."""
    result = await db.execute(select(User).where(User.id == user.user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.onboarding_complete = True
    await db.flush()
    logger.info("onboarding_completed", user_id=str(user.user_id))
    return {"success": True, "onboarding_complete": True}


@router.patch("/me/profile")
async def update_profile(
    body: dict,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update display name for current user."""
    result = await db.execute(select(User).where(User.id == user.user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if "display_name" in body:
        u.display_name = str(body["display_name"])[:255]
    await db.flush()
    return {"success": True, "display_name": u.display_name}
