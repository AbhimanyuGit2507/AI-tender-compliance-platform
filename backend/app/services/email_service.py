"""
BidKaro — Enterprise Brevo Email Service & OTP Store
Features:
- Cryptographic 6-digit OTP generation with Redis/Memory caching
- Multi-template transactional emails via Brevo (Sendinblue) REST API v3:
    1. OTP Verification Code
    2. Welcome Onboarding with Free Trial Credits
    3. Low Credit Balance Warning (<10 credits)
    4. Credit Expiry / Monthly Reset Notice
    5. Tender Analysis Complete & Readiness Notification
- Immutable logging of every dispatched email to PostgreSQL `email_logs` table
- Dev fallback mode when BREVO_API_KEY is not configured
"""
from __future__ import annotations

import json
import secrets
import time
import uuid
from datetime import datetime
from typing import Any

import httpx
import redis.asyncio as aioredis
import structlog

from app.core.config import get_settings
from app.core.database import db_session
from app.models import EmailLog

logger = structlog.get_logger(__name__)

# Fallback in-memory OTP cache: { email: { "code": str, "expires_at": float, "attempts": int } }
_MEMORY_OTP_STORE: dict[str, dict[str, Any]] = {}


def generate_otp_code(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


class EmailService:
    def __init__(self):
        self.settings = get_settings()
        self.brevo_api_url = "https://api.brevo.com/v3/smtp/email"
        self._redis_client: aioredis.Redis | None = None

    async def _get_redis(self) -> aioredis.Redis | None:
        """Get or initialize Redis connection."""
        if self._redis_client is None:
            try:
                self._redis_client = aioredis.from_url(
                    self.settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                )
            except Exception as e:
                logger.warning("redis_connection_failed_using_memory", error=str(e))
                self._redis_client = None
        return self._redis_client

    async def save_otp(self, email: str, code: str) -> None:
        """Store OTP with expiration in Redis or fallback memory cache."""
        email_clean = email.strip().lower()
        ttl = self.settings.otp_expire_seconds
        redis_client = await self._get_redis()

        data = {"code": code, "attempts": 0}

        if redis_client:
            try:
                key = f"otp:{email_clean}"
                await redis_client.set(key, json.dumps(data), ex=ttl)
                return
            except Exception as e:
                logger.warning("redis_set_otp_error_falling_back", error=str(e))

        # In-memory fallback
        _MEMORY_OTP_STORE[email_clean] = {
            "code": code,
            "expires_at": time.time() + ttl,
            "attempts": 0,
        }

    async def verify_otp(self, email: str, code: str) -> tuple[bool, str]:
        """
        Verify user-submitted OTP code.
        Returns: (success: bool, message: str)
        """
        email_clean = email.strip().lower()
        code_clean = code.strip()
        redis_client = await self._get_redis()

        # 1. Try Redis first
        if redis_client:
            try:
                key = f"otp:{email_clean}"
                raw = await redis_client.get(key)
                if not raw:
                    return False, "Verification code has expired or was not requested. Please request a new code."

                stored_data = json.loads(raw)
                if stored_data.get("code") == code_clean:
                    await redis_client.delete(key)
                    return True, "Verification successful"

                # Increment attempts
                attempts = stored_data.get("attempts", 0) + 1
                if attempts >= 4:
                    await redis_client.delete(key)
                    return False, "Too many invalid attempts. This OTP has been invalidated. Please request a new one."

                stored_data["attempts"] = attempts
                ttl = await redis_client.ttl(key)
                if ttl > 0:
                    await redis_client.set(key, json.dumps(stored_data), ex=ttl)

                return False, f"Incorrect verification code ({4 - attempts} attempts remaining)."
            except Exception as e:
                logger.warning("redis_verify_otp_error_checking_memory", error=str(e))

        # 2. Check in-memory store
        record = _MEMORY_OTP_STORE.get(email_clean)
        if not record:
            return False, "Verification code has expired or was not requested. Please request a new code."

        if time.time() > record["expires_at"]:
            _MEMORY_OTP_STORE.pop(email_clean, None)
            return False, "Verification code has expired. Please request a new code."

        if record["code"] == code_clean:
            _MEMORY_OTP_STORE.pop(email_clean, None)
            return True, "Verification successful"

        record["attempts"] += 1
        if record["attempts"] >= 4:
            _MEMORY_OTP_STORE.pop(email_clean, None)
            return False, "Too many invalid attempts. This OTP has been invalidated. Please request a new one."

        return False, f"Incorrect verification code ({4 - record['attempts']} attempts remaining)."

    # ── Internal Email Sender & Persistent Logger ──────────────────────────
    async def _send_brevo_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        template_type: str,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatches an email via Brevo REST API and records an entry in email_logs."""
        clean_email = to_email.strip().lower()
        api_key = self.settings.brevo_api_key.strip()

        # Dev Fallback
        if not api_key:
            logger.warning(
                "brevo_email_simulated_no_api_key",
                email=clean_email,
                template=template_type,
                subject=subject,
            )
            await self._record_email_log(
                recipient=clean_email,
                subject=subject,
                template_type=template_type,
                status="dev_fallback",
                tenant_id=tenant_id,
            )
            return {
                "success": True,
                "status": "dev_fallback",
                "message": f"Email '{subject}' logged (Dev mode)",
            }

        payload = {
            "sender": {
                "name": self.settings.brevo_sender_name,
                "email": self.settings.brevo_sender_email,
            },
            "to": [{"email": clean_email}],
            "subject": subject,
            "htmlContent": html_content,
        }

        headers = {
            "api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    self.brevo_api_url,
                    json=payload,
                    headers=headers,
                )

                if res.status_code in (200, 201, 202):
                    resp_json = res.json()
                    msg_id = resp_json.get("messageId")
                    logger.info("brevo_email_delivered", email=clean_email, message_id=msg_id)
                    await self._record_email_log(
                        recipient=clean_email,
                        subject=subject,
                        template_type=template_type,
                        status="sent",
                        brevo_message_id=msg_id,
                        tenant_id=tenant_id,
                    )
                    return {"success": True, "status": "sent", "messageId": msg_id}
                else:
                    err_msg = f"Brevo HTTP {res.status_code}: {res.text}"
                    logger.error("brevo_email_rejected", error=err_msg, email=clean_email)
                    await self._record_email_log(
                        recipient=clean_email,
                        subject=subject,
                        template_type=template_type,
                        status="failed",
                        error_message=err_msg,
                        tenant_id=tenant_id,
                    )
                    return {"success": False, "status": "failed", "error": err_msg}
        except Exception as e:
            err_msg = str(e)
            logger.error("brevo_email_exception", error=err_msg, email=clean_email)
            await self._record_email_log(
                recipient=clean_email,
                subject=subject,
                template_type=template_type,
                status="failed",
                error_message=err_msg,
                tenant_id=tenant_id,
            )
            return {"success": False, "status": "error", "error": err_msg}

    async def _record_email_log(
        self,
        recipient: str,
        subject: str,
        template_type: str,
        status: str,
        brevo_message_id: str | None = None,
        error_message: str | None = None,
        tenant_id: uuid.UUID | None = None,
    ) -> None:
        """Persist transactional email dispatch record into PostgreSQL."""
        try:
            async with db_session() as session:
                log_entry = EmailLog(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    recipient_email=recipient,
                    subject=subject,
                    template_type=template_type,
                    status=status,
                    brevo_message_id=brevo_message_id,
                    error_message=error_message,
                )
                session.add(log_entry)
                await session.commit()
        except Exception as e:
            logger.error("failed_to_persist_email_log", error=str(e))

    # ── Obsidian Layout Shell ──────────────────────────────────────────────
    def _base_email_shell(self, title: str, badge: str, inner_html: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #050508;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
    }}
    .wrapper {{
      width: 100%;
      table-layout: fixed;
      background-color: #050508;
      padding: 40px 16px;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      background-color: #0B0E14;
      border: 1px solid #1E293B;
      border-radius: 16px;
      padding: 36px 32px;
    }}
    .brand {{
      display: inline-block;
      font-size: 22px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.03em;
      margin-bottom: 24px;
    }}
    .badge {{
      display: inline-block;
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60A5FA;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }}
    h1 {{
      font-size: 20px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0 0 12px 0;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #94A3B8;
      margin: 0 0 20px 0;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #1E293B;
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand">BidKaro</div>
      <div><span class="badge">{badge}</span></div>
      {inner_html}
      <div class="footer">
        Automated transactional message transmitted via BidKaro Procurement AI & Brevo Delivery.
        If you have questions, please reach our tender operations desk at support@bidkaro.com.
      </div>
    </div>
  </div>
</body>
</html>"""

    # ── 1. OTP Verification Email ──────────────────────────────────────────
    async def send_otp_email(self, to_email: str, otp_code: str, tenant_id: uuid.UUID | None = None) -> dict[str, Any]:
        """Dispatch 6-digit OTP verification email."""
        clean_email = to_email.strip().lower()
        await self.save_otp(clean_email, otp_code)

        expire_mins = max(1, self.settings.otp_expire_seconds // 60)
        inner = f"""
        <h1>Your Verification Passcode</h1>
        <p>Use the one-time passcode below to authenticate your account at <strong>{clean_email}</strong> for the BidKaro AI Autonomous Bidding Workspace.</p>
        <div style="background: #06070A; border: 1px solid #3B82F6; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
          <span style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #60A5FA;">
            {otp_code}
          </span>
        </div>
        <p style="font-size: 13px; text-align: center; color: #64748B;">
          Valid for the next <strong>{expire_mins} minutes</strong>. Never share this code with anyone.
        </p>
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; font-size: 12px; color: #F87171; margin-top: 20px;">
          <strong>Security Check:</strong> BidKaro support or engineers will never ask for your OTP via phone, WhatsApp, or unsolicited message.
        </div>
        """
        html = self._base_email_shell("BidKaro Verification Code", "Enterprise Verification", inner)
        res = await self._send_brevo_email(
            to_email=clean_email,
            subject=f"BidKaro Verification Passcode: {otp_code}",
            html_content=html,
            template_type="otp",
            tenant_id=tenant_id,
        )
        if not self.settings.brevo_api_key.strip():
            res["dev_otp"] = otp_code
        return res

    # ── 2. Welcome Email ───────────────────────────────────────────────────
    async def send_welcome_email(
        self,
        to_email: str,
        company_name: str,
        trial_credits: int = 25,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch welcome onboarding email with trial credits notice."""
        inner = f"""
        <h1>Welcome to BidKaro, {company_name}!</h1>
        <p>Your enterprise qualification workspace has been successfully provisioned. You can now analyze complex multi-hundred-page Indian government EPC tenders in seconds.</p>
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 12px; color: #34D399; font-weight: 600; text-transform: uppercase;">Trial Bonus Granted</div>
          <div style="font-size: 32px; font-weight: 800; color: #FFFFFF; margin: 6px 0;">{trial_credits} Credits</div>
          <div style="font-size: 13px; color: #94A3B8;">Ready for immediate tender extraction, compliance analysis, and BOQ parsing.</div>
        </div>
        <p style="font-size: 13.5px; color: #CBD5E1;"><strong>Next steps to qualify faster:</strong></p>
        <ul style="font-size: 13px; color: #94A3B8; line-height: 1.7; padding-left: 20px;">
          <li>Upload your first RFP or NIT (CPWD, NHAI, Railways, GeM, State PWD).</li>
          <li>Set up your <strong>Company Vault</strong> evidence base for automated 1x80/2x50/3x40 checks.</li>
          <li>Draft automated pre-bid queries for unclarified clauses.</li>
        </ul>
        """
        html = self._base_email_shell("Welcome to BidKaro", "Workspace Provisioned", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Welcome to BidKaro — {trial_credits} Free Procurement Credits Active",
            html_content=html,
            template_type="welcome",
            tenant_id=tenant_id,
        )

    # ── 3. Low Credit Balance Warning ──────────────────────────────────────
    async def send_low_credit_warning(
        self,
        to_email: str,
        company_name: str,
        current_credits: int,
        threshold: int = 10,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch warning when tenant's credit balance drops below threshold."""
        inner = f"""
        <h1 style="color: #FBBF24;">Low Procurement Credits Notice</h1>
        <p>Dear <strong>{company_name}</strong> Tender Desk,</p>
        <p>Your BidKaro balance has dropped to <strong>{current_credits} credits</strong> (below the recommended threshold of {threshold} credits).</p>
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 12px; color: #FBBF24; font-weight: 600; text-transform: uppercase;">Available Balance</div>
          <div style="font-size: 34px; font-weight: 800; color: #FFFFFF; margin: 6px 0;">{current_credits} Cr</div>
          <div style="font-size: 13px; color: #94A3B8;">Upcoming document generations or AI compliance runs may be paused once credits reach zero.</div>
        </div>
        <p style="font-size: 13px; color: #94A3B8;">To ensure uninterrupted bid preparation and avoid missing critical NIT deadlines, please top up your workspace plan.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/settings" style="display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            Top Up Credits
          </a>
        </div>
        """
        html = self._base_email_shell("BidKaro Low Credits Alert", "Balance Warning", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Urgent: BidKaro Credit Balance is Low ({current_credits} Credits Remaining)",
            html_content=html,
            template_type="low_credits",
            tenant_id=tenant_id,
        )

    # ── 4. Credit Expiry / Monthly Notice ──────────────────────────────────
    async def send_credit_expiry_email(
        self,
        to_email: str,
        company_name: str,
        expiring_credits: int,
        expiry_date_str: str,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch notice of expiring promotional/monthly credits."""
        inner = f"""
        <h1>Credit Expiration Notice</h1>
        <p>Dear <strong>{company_name}</strong>,</p>
        <p>This is a courtesy reminder that <strong>{expiring_credits} credits</strong> in your BidKaro account are scheduled to expire on <strong>{expiry_date_str}</strong>.</p>
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 12px; color: #F87171; font-weight: 600; text-transform: uppercase;">Expiring Amount</div>
          <div style="font-size: 34px; font-weight: 800; color: #FFFFFF; margin: 6px 0;">{expiring_credits} Cr</div>
          <div style="font-size: 13px; color: #94A3B8;">Expiration Date: {expiry_date_str}</div>
        </div>
        <p style="font-size: 13px; color: #94A3B8;">You can utilize these credits right away for comprehensive tender extractions, BOQ pricing analysis, or technical proposal generation.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/workspace" style="display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            Open Tender Workspace
          </a>
        </div>
        """
        html = self._base_email_shell("BidKaro Credit Expiry Notice", "Credit Expiry", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Notice: {expiring_credits} BidKaro Credits Expiring on {expiry_date_str}",
            html_content=html,
            template_type="credit_expiry",
            tenant_id=tenant_id,
        )

    # ── 5. Tender Analysis Complete / Ready Alert ──────────────────────────
    async def send_tender_ready_alert(
        self,
        to_email: str,
        company_name: str,
        tender_title: str,
        readiness_score: int,
        tender_id: str | uuid.UUID,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch notification when background tender ingestion completes."""
        inner = f"""
        <h1>Tender Analysis Ready</h1>
        <p>The autonomous EPC extraction pipeline has finished analyzing your tender document:</p>
        <div style="background: #06070A; border: 1px solid #1E293B; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 14px; font-weight: 700; color: #F8FAFC;">{tender_title}</div>
          <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; color: #94A3B8;">Readiness Score:</span>
            <span style="font-size: 15px; font-weight: 800; color: {'#34D399' if readiness_score >= 70 else '#FBBF24'};">
              {readiness_score}%
            </span>
          </div>
        </div>
        <p style="font-size: 13px; color: #94A3B8;">The 10-state compliance matrix, BOQ line items, and corrigendum tracker are compiled and available in your workspace.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/workspace/{str(tender_id)}" style="display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            Review Tender Evaluation
          </a>
        </div>
        """
        html = self._base_email_shell("Tender Analysis Complete", "Tender Ready", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Analysis Ready: {tender_title[:45]}... ({readiness_score}% Readiness)",
            html_content=html,
            template_type="tender_ready",
            tenant_id=tenant_id,
        )

    # ── 6. New Login Security Alert ─────────────────────────────────────────
    async def send_new_login_alert(
        self,
        to_email: str,
        company_name: str,
        ip_address: str,
        user_agent: str,
        login_time_str: str | None = None,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch security notice on account sign-in from a new session."""
        time_str = login_time_str or datetime.utcnow().strftime("%d %b %Y, %H:%M:%S UTC")
        device_summary = user_agent[:64] if user_agent else "Unknown Browser / Client"

        inner = f"""
        <h1>Security Notice: New Sign-In Detected</h1>
        <p>Dear <strong>{company_name}</strong>,</p>
        <p>A new sign-in session was successfully established for your BidKaro account (<strong>{to_email}</strong>).</p>

        <div style="background: #06070A; border: 1px solid #1E293B; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #94A3B8; padding: 6px 0; width: 35%;">Time:</td>
              <td style="color: #F8FAFC; font-weight: 600; font-family: 'SFMono-Regular', Consolas, monospace;">{time_str}</td>
            </tr>
            <tr>
              <td style="color: #94A3B8; padding: 6px 0;">IP Address:</td>
              <td style="color: #60A5FA; font-weight: 600; font-family: 'SFMono-Regular', Consolas, monospace;">{ip_address}</td>
            </tr>
            <tr>
              <td style="color: #94A3B8; padding: 6px 0;">Client / Device:</td>
              <td style="color: #F8FAFC; font-size: 12px;">{device_summary}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #94A3B8;">
          If this was you, you can safely disregard this email. If you did not perform this login, please immediately revoke all active sessions and change your credentials.
        </p>

        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; font-size: 12px; color: #F87171; margin-top: 16px;">
          <strong>Unauthorized Access?</strong> Forward this email immediately to <a href="mailto:security@bidkaro.com" style="color: #F87171; text-decoration: underline;">security@bidkaro.com</a> to lock your workspace.
        </div>
        """
        html = self._base_email_shell("BidKaro Security Alert", "Security Alert", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Security Alert: New Sign-In to BidKaro from {ip_address}",
            html_content=html,
            template_type="login_alert",
            tenant_id=tenant_id,
        )

    # ── 7. Razorpay Purchase Confirmation & Tax Invoice ─────────────────────
    async def send_payment_success_invoice(
        self,
        to_email: str,
        company_name: str,
        plan_name: str,
        credits_added: int,
        amount_inr: float,
        payment_id: str,
        order_id: str,
        invoice_no: str,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch official tax invoice and credit recharge confirmation."""
        # Calculate GST: 18% inclusive
        base_amount = round(amount_inr / 1.18, 2)
        gst_amount = round(amount_inr - base_amount, 2)
        cgst = round(gst_amount / 2, 2)
        sgst = round(gst_amount / 2, 2)

        inner = f"""
        <h1>Payment Successful · Tax Invoice #{invoice_no}</h1>
        <p>Dear <strong>{company_name}</strong>,</p>
        <p>Thank you for your purchase. We have received your payment via Razorpay. Your workspace has been credited with <strong>{credits_added} Tender Credits</strong>.</p>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
          <div style="font-size: 11px; color: #34D399; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Recharge Credited</div>
          <div style="font-size: 30px; font-weight: 800; color: #FFFFFF; margin: 4px 0;">+{credits_added} Credits</div>
          <div style="font-size: 13px; color: #94A3B8;">Package: {plan_name} · 90-Day Validity</div>
        </div>

        <div style="background: #06070A; border: 1px solid #1E293B; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: 700; color: #F8FAFC; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.04em;">
            Tax Invoice Breakdown
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="color: #94A3B8; padding: 6px 0;">Payment Reference:</td>
              <td style="color: #F8FAFC; text-align: right; font-family: monospace;">{payment_id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="color: #94A3B8; padding: 6px 0;">Order Reference:</td>
              <td style="color: #F8FAFC; text-align: right; font-family: monospace;">{order_id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="color: #94A3B8; padding: 6px 0;">Base Taxable Value:</td>
              <td style="color: #F8FAFC; text-align: right;">₹{base_amount:.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="color: #94A3B8; padding: 6px 0;">CGST (9%):</td>
              <td style="color: #F8FAFC; text-align: right;">₹{cgst:.2f}</td>
            </tr>
            <tr style="border-bottom: 1px solid #1E293B;">
              <td style="color: #94A3B8; padding: 6px 0;">SGST (9%):</td>
              <td style="color: #F8FAFC; text-align: right;">₹{sgst:.2f}</td>
            </tr>
            <tr>
              <td style="color: #F8FAFC; font-weight: 700; padding: 10px 0 4px 0;">Total Amount Paid:</td>
              <td style="color: #34D399; font-weight: 800; font-size: 16px; text-align: right; padding-top: 10px;">₹{amount_inr:.2f}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/settings" style="display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            View Credit Ledger & Receipts
          </a>
        </div>
        """
        html = self._base_email_shell("Tax Invoice Receipt", "Payment Confirmed", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Tax Invoice #{invoice_no}: Payment of ₹{amount_inr:.0f} Confirmed ({plan_name})",
            html_content=html,
            template_type="payment_invoice",
            tenant_id=tenant_id,
        )

    # ── 8. Corrigendum Impact Alert ─────────────────────────────────────────
    async def send_corrigendum_alert(
        self,
        to_email: str,
        company_name: str,
        tender_title: str,
        corrigendum_title: str,
        impact_summary: str,
        tender_id: str | uuid.UUID,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch alert when tender authority releases a corrigendum/addendum."""
        inner = f"""
        <h1 style="color: #FBBF24;">Corrigendum / Addendum Published</h1>
        <p>Dear <strong>{company_name}</strong>,</p>
        <p>A new corrigendum has been identified for your tracked tender:</p>

        <div style="background: #06070A; border: 1px solid #1E293B; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 12px; color: #FBBF24; font-weight: 700; text-transform: uppercase;">{corrigendum_title}</div>
          <div style="font-size: 14.5px; font-weight: 700; color: #F8FAFC; margin: 4px 0 8px 0;">{tender_title}</div>
          <div style="font-size: 12.5px; color: #CBD5E1; line-height: 1.5; background: rgba(245, 158, 11, 0.08); padding: 10px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.2);">
            {impact_summary}
          </div>
        </div>

        <p style="font-size: 13px; color: #94A3B8;">
          Review the side-by-side clause diff in your workspace to verify if submission dates, turnover requirements, or BOQ rates were modified.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/workspace/{str(tender_id)}" style="display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            View Corrigendum Diff
          </a>
        </div>
        """
        html = self._base_email_shell("Corrigendum Notice", "Portal Corrigendum", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Corrigendum Alert: Addendum for {tender_title[:45]}",
            html_content=html,
            template_type="corrigendum_alert",
            tenant_id=tenant_id,
        )

    # ── 9. Pre-Bid Queries Ready Alert ──────────────────────────────────────
    async def send_prebid_queries_alert(
        self,
        to_email: str,
        company_name: str,
        tender_title: str,
        query_count: int,
        tender_id: str | uuid.UUID,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch alert when automated pre-bid clarification letter is compiled."""
        inner = f"""
        <h1>Pre-Bid Queries Letter Compiled</h1>
        <p>Dear <strong>{company_name}</strong>,</p>
        <p>BidKaro's legal compliance engine has compiled <strong>{query_count} pre-bid clarification queries</strong> for:</p>

        <div style="background: #06070A; border: 1px solid #1E293B; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 14px; font-weight: 700; color: #F8FAFC;">{tender_title}</div>
          <div style="font-size: 12.5px; color: #34D399; margin-top: 6px;">
            ✓ {query_count} Ambiguous clauses mapped to statutory CPWD/GeM precedent
          </div>
        </div>

        <p style="font-size: 13px; color: #94A3B8;">
          The formal clarification letter is formatted with official table citations ready for submission to the tendering authority.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/workspace/{str(tender_id)}" style="display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            Download Pre-Bid Queries (.DOCX)
          </a>
        </div>
        """
        html = self._base_email_shell("Pre-Bid Queries Compiled", "Pre-Bid Queries", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Pre-Bid Queries Ready: {query_count} Questions for {tender_title[:45]}",
            html_content=html,
            template_type="prebid_queries",
            tenant_id=tenant_id,
        )

    # ── 10. Stage 3 Bid Package Assembled Alert ─────────────────────────────
    async def send_bid_package_ready_alert(
        self,
        to_email: str,
        company_name: str,
        tender_title: str,
        tender_id: str | uuid.UUID,
        tenant_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Dispatch notification when full Stage 3 turnkey bid bundle is ready."""
        inner = f"""
        <h1>Turnkey Bid Package Ready for Submission</h1>
        <p>Dear <strong>{company_name}</strong>,</p>
        <p>Your complete turnkey bid submission bundle has been compiled with zero blockers:</p>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 14.5px; font-weight: 700; color: #F8FAFC;">{tender_title}</div>
          <ul style="font-size: 12.5px; color: #34D399; margin: 8px 0 0 0; padding-left: 20px; line-height: 1.6;">
            <li>Technical Proposal & Construction Methodology (.DOCX)</li>
            <li>Statutory Undertakings & Non-Blacklisting Stamp Drafts</li>
            <li>Audited BOQ Schedule with Price Variation Formulas (.XLSX)</li>
          </ul>
        </div>

        <p style="font-size: 13px; color: #94A3B8;">
          All documents are certified against the official tender clauses and ready for uploading to the e-procurement portal.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/workspace/{str(tender_id)}" style="display: inline-block; background: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
            Download Complete Bid Bundle (.ZIP)
          </a>
        </div>
        """
        html = self._base_email_shell("Bid Package Assembled", "Stage 3 Complete", inner)
        return await self._send_brevo_email(
            to_email=to_email,
            subject=f"Bid Package Assembled: Submission Ready for {tender_title[:45]}",
            html_content=html,
            template_type="bid_package_ready",
            tenant_id=tenant_id,
        )


_email_service_singleton: EmailService | None = None


def get_email_service() -> EmailService:
    global _email_service_singleton
    if _email_service_singleton is None:
        _email_service_singleton = EmailService()
    return _email_service_singleton
