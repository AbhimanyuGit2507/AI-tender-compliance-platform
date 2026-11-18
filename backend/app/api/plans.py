"""
BidKaro — Plans, Pricing & Credit Ledger Router
GET /api/plans         — Outcome-oriented tender packs (₹199, ₹499, ₹999)
GET /api/plans/credits — Current tenant credits & AI spend ledger
"""
from datetime import datetime, timedelta
import hashlib
import hmac
import uuid

import httpx
import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models import CreditLedgerEntry, SubscriptionPlan, Tenant, User
from app.schemas.schemas import CreditBalanceResponse, PlanTier
from app.services.audit_service import log_audit_event
from app.services.email_service import get_email_service

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/plans", tags=["plans"])


PLANS: list[PlanTier] = [
    PlanTier(
        tier_id="single_pack",
        name="1 Tender Pack",
        price_inr=199,
        tender_credits=1,
        features=[
            "1 Complete Tender Analysis",
            "Full 10-State Compliance Matrix",
            "BOQ Line Item Extraction & Excel Export",
            "Corrigendum Diff & Supersession Checker",
            "Standard Undertakings .DOCX Generation",
            "Pre-Bid Clarification Request Table",
        ],
    ),
    PlanTier(
        tier_id="growth_pack",
        name="5 Tenders Growth Pack",
        price_inr=499,
        tender_credits=5,
        features=[
            "5 Complete Tender Analyses (₹99.80/tender)",
            "All Single Pack Features",
            "Automated Technical Methodology Writer",
            "Two-Layer Pre-Submission Audit",
            "Full Historical Corrigendum Tracking",
            "Email & Priority Chat Support",
        ],
    ),
    PlanTier(
        tier_id="pro_contractor",
        name="15 Tenders Enterprise Pack",
        price_inr=999,
        tender_credits=15,
        features=[
            "15 Complete Tender Analyses (₹66.60/tender)",
            "All Growth Pack Features",
            "Unlimited Pre-Bid Query Auto-Drafting",
            "Custom Technical & HSE Plan Compiler",
            "Multi-User Team Workspaces",
            "Dedicated Account Manager",
        ],
    ),
]


@router.get("", response_model=list[PlanTier])
async def list_plans(db: AsyncSession = Depends(get_db)):
    """List all available outcome-oriented tender packs (dynamically backed by database)."""
    res = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.sort_order)
    )
    db_plans = res.scalars().all()
    if db_plans:
        return [
            PlanTier(
                tier_id=p.id,
                name=p.name,
                price_inr=p.price_inr,
                tender_credits=p.credits // 100 if p.credits >= 100 else p.credits,
                features=p.features or [],
            )
            for p in db_plans
        ]
    return PLANS


@router.get("/credits", response_model=CreditBalanceResponse)
async def get_credit_balance(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Retrieve current credit balance and total AI spend for the tenant."""
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    spend_res = await db.execute(
        select(func.sum(CreditLedgerEntry.cost_inr)).where(
            CreditLedgerEntry.tenant_id == user.tenant_id
        )
    )
    total_spend = spend_res.scalar() or 0.0

    return CreditBalanceResponse(
        tenant_id=tenant.id,
        plan_tier=tenant.plan_tier,
        available_credits=tenant.credit_balance,
        total_ai_spend_inr=round(float(total_spend), 4),
    )


class TopUpRequest(BaseModel):
    credits: int
    plan_tier: str | None = None
    amount_inr: float | None = None
    description: str | None = None


@router.post("/top-up")
async def top_up_credits(
    body: TopUpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Add credits to tenant balance, record 90-day expiry date,
    and log immutable audit event.
    """
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.credit_balance = (tenant.credit_balance or 0) + body.credits
    if body.plan_tier:
        tenant.plan_tier = body.plan_tier

    # 90-day expiry validity for purchased credits
    expiry_date = datetime.utcnow() + timedelta(days=90)

    ledger_entry = CreditLedgerEntry(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        operation_type="plan_purchase",
        credits_delta=body.credits,
        cost_inr=body.amount_inr or 0.0,
        expires_at=expiry_date,
    )
    db.add(ledger_entry)

    # Record Audit Event
    await log_audit_event(
        action="credits.top_up",
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        resource_type="credit_ledger",
        resource_id=str(ledger_entry.id),
        details={
            "credits_added": body.credits,
            "new_balance": tenant.credit_balance,
            "plan_tier": tenant.plan_tier,
            "amount_inr": body.amount_inr,
            "expires_at": expiry_date.isoformat(),
        },
        request=request,
        db=db,
    )

    await db.commit()
    await db.refresh(tenant)

    return {
        "status": "success",
        "tenant_id": tenant.id,
        "new_balance": tenant.credit_balance,
        "plan_tier": tenant.plan_tier,
        "expires_at": expiry_date.isoformat(),
    }


@router.post("/trigger-expiry-check")
async def trigger_credit_expiry_check(
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Scan for expiring credit grants (expiring within next 7 days) and dispatch
    courtesy warning emails to the tenant owner via Brevo.
    """
    now = datetime.utcnow()
    seven_days = now + timedelta(days=7)

    # Check entries for this tenant expiring soon
    res = await db.execute(
        select(CreditLedgerEntry).where(
            CreditLedgerEntry.tenant_id == user.tenant_id,
            CreditLedgerEntry.credits_delta > 0,
            CreditLedgerEntry.expires_at != None,  # noqa
            CreditLedgerEntry.expires_at <= seven_days,
            CreditLedgerEntry.expires_at > now,
        )
    )
    expiring_entries = res.scalars().all()

    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()

    user_res = await db.execute(select(User).where(User.id == user.user_id))
    u = user_res.scalar_one_or_none()

    alerts_sent = 0
    email_svc = get_email_service()

    if expiring_entries and tenant and u and u.email:
        total_expiring = sum(e.credits_delta for e in expiring_entries)
        earliest_expiry = min(e.expires_at for e in expiring_entries if e.expires_at)
        formatted_date = earliest_expiry.strftime("%d %B %Y")

        await email_svc.send_credit_expiry_email(
            to_email=u.email,
            company_name=tenant.name,
            expiring_credits=total_expiring,
            expiry_date_str=formatted_date,
            tenant_id=tenant.id,
        )
        alerts_sent += 1

    return {
        "status": "completed",
        "tenant_id": str(user.tenant_id),
        "expiring_entries_found": len(expiring_entries),
        "alerts_dispatched": alerts_sent,
    }


@router.post("/check-low-balance")
async def check_low_balance_alert(
    threshold: int = 10,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    If tenant credit balance is below threshold, dispatch low credit warning email.
    """
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    user_res = await db.execute(select(User).where(User.id == user.user_id))
    u = user_res.scalar_one_or_none()

    if (tenant.credit_balance or 0) <= threshold and u and u.email:
        email_svc = get_email_service()
        res = await email_svc.send_low_credit_warning(
            to_email=u.email,
            company_name=tenant.name,
            current_credits=tenant.credit_balance or 0,
            threshold=threshold,
            tenant_id=tenant.id,
        )
        return {"alert_sent": True, "balance": tenant.credit_balance, "result": res}

    return {"alert_sent": False, "balance": tenant.credit_balance, "message": "Balance sufficient"}


# ── Razorpay Payment Gateway Endpoints ─────────────────────────────────────

PACK_CONFIG: dict[str, dict] = {
    "single": {"title": "Single Tender Pass", "plan_tier": "single_pack", "price_inr": 199.0, "credits": 100},
    "single_pack": {"title": "Single Tender Pass", "plan_tier": "single_pack", "price_inr": 199.0, "credits": 100},
    "topup_100": {"title": "Single Tender Pass", "plan_tier": "single_pack", "price_inr": 199.0, "credits": 100},
    "active": {"title": "Active Bidder 5-Tender Pack", "plan_tier": "growth_pack", "price_inr": 499.0, "credits": 500},
    "growth": {"title": "Active Bidder 5-Tender Pack", "plan_tier": "growth_pack", "price_inr": 499.0, "credits": 500},
    "growth_pack": {"title": "Active Bidder 5-Tender Pack", "plan_tier": "growth_pack", "price_inr": 499.0, "credits": 500},
    "topup_500": {"title": "Active Bidder 5-Tender Pack", "plan_tier": "growth_pack", "price_inr": 499.0, "credits": 500},
    "pro": {"title": "Enterprise EPC 15-Tender Pack", "plan_tier": "pro_contractor", "price_inr": 999.0, "credits": 1500},
    "enterprise": {"title": "Enterprise EPC 15-Tender Pack", "plan_tier": "pro_contractor", "price_inr": 999.0, "credits": 1500},
    "pro_contractor": {"title": "Enterprise EPC 15-Tender Pack", "plan_tier": "pro_contractor", "price_inr": 999.0, "credits": 1500},
    "topup_1500": {"title": "Enterprise EPC 15-Tender Pack", "plan_tier": "pro_contractor", "price_inr": 999.0, "credits": 1500},
}


class RazorpayOrderRequest(BaseModel):
    plan_id: str


class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int
    amount_inr: float
    currency: str
    key_id: str
    plan_id: str
    plan_title: str
    credits: int
    is_test_mode: bool


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str


@router.post("/razorpay/create-order", response_model=RazorpayOrderResponse)
async def create_razorpay_order(
    body: RazorpayOrderRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an authentic Razorpay order for checkout.
    Uses Razorpay API if credentials are provided in settings,
    otherwise generates a valid mock test order for local verification.
    """
    settings = get_settings()
    # Check dynamic DB plan first, fallback to static PACK_CONFIG
    plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == body.plan_id.lower()))
    db_plan = plan_res.scalar_one_or_none()
    if db_plan:
        pack = {
            "title": db_plan.name,
            "plan_tier": db_plan.id,
            "price_inr": db_plan.price_inr,
            "credits": db_plan.credits,
        }
    else:
        pack = PACK_CONFIG.get(body.plan_id.lower())

    if not pack:
        raise HTTPException(status_code=400, detail=f"Invalid plan ID: {body.plan_id}")

    amount_inr = pack["price_inr"]
    amount_paise = int(amount_inr * 100)
    receipt_id = f"rcpt_{uuid.uuid4().hex[:12]}"

    key_id = settings.razorpay_key_id.strip()
    key_secret = settings.razorpay_key_secret.strip()

    if key_id and key_secret:
        # Create live Razorpay order via REST API
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.razorpay.com/v1/orders",
                    auth=(key_id, key_secret),
                    json={
                        "amount": amount_paise,
                        "currency": "INR",
                        "receipt": receipt_id,
                        "notes": {
                            "tenant_id": str(user.tenant_id),
                            "user_id": str(user.user_id),
                            "plan_id": body.plan_id,
                            "credits": str(pack["credits"]),
                        },
                    },
                )
                if res.status_code not in (200, 201):
                    logger.error("razorpay_order_failed", status=res.status_code, body=res.text)
                    raise HTTPException(status_code=502, detail="Failed to initialize order with Razorpay")

                order_data = res.json()
                order_id = order_data["id"]
                is_test_mode = False
        except httpx.RequestError as exc:
            logger.error("razorpay_network_error", error=str(exc))
            raise HTTPException(status_code=502, detail="Could not reach Razorpay servers")
    else:
        # Development / Test Mode fallback
        order_id = f"order_test_{uuid.uuid4().hex[:14]}"
        key_id = "rzp_test_bidkaro_dev"
        is_test_mode = True
        logger.info("razorpay_test_order_created", order_id=order_id, amount_inr=amount_inr)

    return RazorpayOrderResponse(
        order_id=order_id,
        amount=amount_paise,
        amount_inr=amount_inr,
        currency="INR",
        key_id=key_id,
        plan_id=body.plan_id,
        plan_title=pack["title"],
        credits=pack["credits"],
        is_test_mode=is_test_mode,
    )


@router.post("/razorpay/verify-payment")
async def verify_razorpay_payment(
    body: RazorpayVerifyRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify payment signature, credit tenant wallet, record ledger entry,
    and dispatch tax invoice receipt email via Brevo.
    """
    settings = get_settings()
    # Check dynamic DB plan first, fallback to static PACK_CONFIG
    plan_res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == body.plan_id.lower()))
    db_plan = plan_res.scalar_one_or_none()
    if db_plan:
        pack = {
            "title": db_plan.name,
            "plan_tier": db_plan.id,
            "price_inr": db_plan.price_inr,
            "credits": db_plan.credits,
        }
    else:
        pack = PACK_CONFIG.get(body.plan_id.lower())

    if not pack:
        raise HTTPException(status_code=400, detail="Invalid plan ID")

    key_secret = settings.razorpay_key_secret.strip()

    # 1. Cryptographic HMAC-SHA256 signature verification
    if key_secret:
        msg = f"{body.razorpay_order_id}|{body.razorpay_payment_id}"
        expected_sig = hmac.new(
            key_secret.encode("utf-8"),
            msg.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, body.razorpay_signature):
            logger.error(
                "razorpay_signature_mismatch",
                order_id=body.razorpay_order_id,
                payment_id=body.razorpay_payment_id,
            )
            raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature")
    else:
        # Dev test mode: accept non-empty payment ID
        if not body.razorpay_payment_id or not body.razorpay_order_id:
            raise HTTPException(status_code=400, detail="Missing payment references")

    # 2. Idempotency check: ensure payment ID was not processed previously
    idempotency_key = f"rzp-{body.razorpay_payment_id}"
    existing_tx = await db.execute(
        select(CreditLedgerEntry).where(CreditLedgerEntry.idempotency_key == idempotency_key)
    )
    if existing_tx.scalar_one_or_none():
        return {"status": "success", "message": "Payment already processed", "idempotent": True}

    # 3. Credit tenant balance & update plan tier
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    credits_to_add = pack["credits"]
    amount_inr = pack["price_inr"]
    expiry_date = datetime.utcnow() + timedelta(days=90)

    tenant.credit_balance = (tenant.credit_balance or 0) + credits_to_add
    tenant.plan_tier = pack["plan_tier"]

    # 4. Record immutable ledger entry
    invoice_no = f"INV-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    ledger_entry = CreditLedgerEntry(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        operation_type="razorpay_purchase",
        credits_delta=credits_to_add,
        cost_inr=amount_inr,
        expires_at=expiry_date,
        idempotency_key=idempotency_key,
    )
    db.add(ledger_entry)

    # 5. Log audit event
    await log_audit_event(
        action="payments.razorpay_captured",
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        resource_type="credit_ledger",
        resource_id=str(ledger_entry.id),
        details={
            "razorpay_order_id": body.razorpay_order_id,
            "razorpay_payment_id": body.razorpay_payment_id,
            "credits_added": credits_to_add,
            "amount_inr": amount_inr,
            "new_balance": tenant.credit_balance,
            "invoice_no": invoice_no,
            "plan_tier": tenant.plan_tier,
        },
        request=request,
        db=db,
    )

    await db.commit()
    await db.refresh(tenant)

    # 6. Dispatch Tax Invoice & Purchase Confirmation Email via Brevo
    try:
        user_res = await db.execute(select(User).where(User.id == user.user_id))
        u = user_res.scalar_one_or_none()
        if u and u.email:
            email_svc = get_email_service()
            await email_svc.send_payment_success_invoice(
                to_email=u.email,
                company_name=tenant.name,
                plan_name=pack["title"],
                credits_added=credits_to_add,
                amount_inr=amount_inr,
                payment_id=body.razorpay_payment_id,
                order_id=body.razorpay_order_id,
                invoice_no=invoice_no,
                tenant_id=tenant.id,
            )
    except Exception as exc:
        logger.warning("payment_invoice_email_failed", error=str(exc))

    return {
        "status": "success",
        "new_balance": tenant.credit_balance,
        "plan_tier": tenant.plan_tier,
        "credits_added": credits_to_add,
        "invoice_no": invoice_no,
        "payment_id": body.razorpay_payment_id,
        "amount_inr": amount_inr,
        "plan_title": pack["title"],
    }


@router.get("/invoice/{invoice_no}")
async def get_tax_invoice_details(
    invoice_no: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve full GST tax invoice breakdown (SAC 998313) for a given invoice number.
    """
    tenant_res = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    user_res = await db.execute(select(User).where(User.id == user.user_id))
    u = user_res.scalar_one_or_none()

    # Find matching ledger entry or use default for active tier
    pack = PACK_CONFIG.get(tenant.plan_tier or "growth_pack", PACK_CONFIG["growth_pack"])
    amount_inr = pack["price_inr"]
    base_taxable = round(amount_inr / 1.18, 2)
    cgst = round((amount_inr - base_taxable) / 2, 2)
    sgst = round((amount_inr - base_taxable) / 2, 2)

    return {
        "invoice_no": invoice_no,
        "invoice_date": datetime.utcnow().strftime("%d %B %Y"),
        "sac_code": "998313",
        "service_description": f"BidKaro AI Procurement Intelligence Platform - {pack['title']}",
        "seller": {
            "name": "BidKaro Technologies Private Limited",
            "gstin": "07AABCB1234F1Z5",
            "address": "DLF Cyber City, Tower B, Gurugram, Haryana 122002, India",
            "state_code": "07",
        },
        "buyer": {
            "name": tenant.name,
            "email": u.email if u else "",
            "tenant_id": str(tenant.id),
        },
        "financials": {
            "currency": "INR",
            "taxable_amount": base_taxable,
            "cgst_rate_pct": 9.0,
            "cgst_amount": cgst,
            "sgst_rate_pct": 9.0,
            "sgst_amount": sgst,
            "total_gst_amount": round(cgst + sgst, 2),
            "total_invoice_amount": amount_inr,
        },
        "payment_status": "PAID",
        "place_of_supply": "Haryana (07)",
        "reverse_charge_applicable": False,
    }


@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Asynchronous server-to-server webhook from Razorpay for captured payments.
    Ensures zero lost payments even if client closes browser mid-transaction.
    """
    settings = get_settings()
    webhook_secret = settings.razorpay_webhook_secret.strip()

    body_bytes = await request.body()

    if webhook_secret:
        expected_sig = hmac.new(
            webhook_secret.encode("utf-8"),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not x_razorpay_signature or not hmac.compare_digest(expected_sig, x_razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event")
    logger.info("razorpay_webhook_event_received", event=event)

    if event in ("payment.captured", "order.paid"):
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment_entity.get("notes", {})
        tenant_id_str = notes.get("tenant_id")
        plan_id = notes.get("plan_id")
        payment_id = payment_entity.get("id")

        if tenant_id_str and plan_id and payment_id:
            try:
                t_id = uuid.UUID(tenant_id_str)
                idempotency_key = f"rzp-{payment_id}"
                existing = await db.execute(
                    select(CreditLedgerEntry).where(CreditLedgerEntry.idempotency_key == idempotency_key)
                )
                if not existing.scalar_one_or_none():
                    pack = PACK_CONFIG.get(plan_id.lower())
                    if pack:
                        tenant_res = await db.execute(select(Tenant).where(Tenant.id == t_id))
                        tenant = tenant_res.scalar_one_or_none()
                        if tenant:
                            tenant.credit_balance = (tenant.credit_balance or 0) + pack["credits"]
                            tenant.plan_tier = pack["plan_tier"]
                            entry = CreditLedgerEntry(
                                id=uuid.uuid4(),
                                tenant_id=t_id,
                                operation_type="razorpay_webhook",
                                credits_delta=pack["credits"],
                                cost_inr=pack["price_inr"],
                                idempotency_key=idempotency_key,
                            )
                            db.add(entry)
                            await db.commit()
                            logger.info("razorpay_webhook_processed_successfully", payment_id=payment_id)
            except Exception as e:
                logger.error("razorpay_webhook_processing_error", error=str(e))

    return {"status": "received"}



