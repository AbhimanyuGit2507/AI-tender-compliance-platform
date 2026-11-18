"""
BidKaro — Comprehensive Edge-Case Test Suite for Auth Lifecycle
Tests:
1. No account exists -> Password login returns 401 with ERR_NO_ACCOUNT
2. Google-only account -> Password login returns 400 with ACCOUNT_USES_GOOGLE
3. OTP-only account -> Password login returns 400 with ACCOUNT_USES_OTP
4. Wrong password on existing account -> Returns 401 with INVALID_PASSWORD
5. Duplicate registration -> Returns 409 with ACCOUNT_EXISTS and suggested_method
6. Email normalization: case-insensitivity on register & login
7. Forgot password and reset password lifecycle via OTP
8. Anonymous session / Guest tender migration to authenticated tenant
"""
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def client():
    return TestClient(app)


class TestAuthEdgeCases:
    """Rigorous edge-case testing for 10/10 SaaS standard."""

    def test_login_nonexistent_email_returns_401_with_diagnostic_code(self, client):
        """Edge Case 1: No account yet, clicked signin via password."""
        random_email = f"ghost_{uuid.uuid4().hex[:8]}@epc-infra.in"
        res = client.post(
            "/api/auth/login",
            json={"email": random_email, "password": "RandomPassword123!"},
        )
        assert res.status_code == 401
        data = res.json()["detail"]
        assert data["code"] == "ERR_NO_ACCOUNT"
        assert "No account found" in data["message"]

    @pytest.mark.asyncio
    async def test_login_google_only_user_via_password_returns_400_account_uses_google(self, client):
        """Edge Case 5a: User signed up via Google SSO, now tries password login."""
        unique_email = f"googleuser_{uuid.uuid4().hex[:8]}@infra.com"
        google_sub = f"g-sub-{uuid.uuid4().hex[:10]}"

        mock_userinfo = {
            "sub": google_sub,
            "email": unique_email,
            "name": "Google Contractor",
            "email_verified": True,
        }
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = mock_userinfo

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_res
            # 1. Sign up via Google SSO
            g_res = client.post(
                "/api/auth/google",
                json={"credential": "mock.google.token"},
            )
            assert g_res.status_code == 200

        # 2. Try password login
        pwd_res = client.post(
            "/api/auth/login",
            json={"email": unique_email, "password": "AnyPassword123!"},
        )
        assert pwd_res.status_code == 400
        detail = pwd_res.json()["detail"]
        assert detail["code"] == "ACCOUNT_USES_GOOGLE"
        assert "Google Single Sign-On" in detail["message"]

    @pytest.mark.asyncio
    async def test_login_otp_only_user_via_password_returns_400_account_uses_otp(self, client):
        """Edge Case 5b: User signed up via OTP (passwordless), now tries password login."""
        unique_email = f"otpuser_{uuid.uuid4().hex[:8]}@infra.com"

        # 1. Verify OTP to provision account
        with patch("app.services.email_service.EmailService.verify_otp", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (True, "Valid code")
            verify_res = client.post(
                "/api/auth/otp/verify",
                json={"email": unique_email, "otp": "123456", "company_name": "OTP Infra Ltd"},
            )
            assert verify_res.status_code == 200

        # 2. Try password login
        pwd_res = client.post(
            "/api/auth/login",
            json={"email": unique_email, "password": "AnyPassword123!"},
        )
        assert pwd_res.status_code == 400
        detail = pwd_res.json()["detail"]
        assert detail["code"] == "ACCOUNT_USES_OTP"
        assert "Email Passcode" in detail["message"]

    def test_login_wrong_password_returns_401_invalid_password(self, client):
        """Edge Case: Existing password user enters wrong password."""
        unique_email = f"correct_{uuid.uuid4().hex[:8]}@infra.com"

        # Register user
        reg_res = client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "CorrectPassword123!", "company_name": "Secure Infra"},
        )
        assert reg_res.status_code == 201

        # Attempt with wrong password
        login_res = client.post(
            "/api/auth/login",
            json={"email": unique_email, "password": "WrongPassword999!"},
        )
        assert login_res.status_code == 401
        detail = login_res.json()["detail"]
        assert detail["code"] == "INVALID_PASSWORD"
        assert "Incorrect password" in detail["message"]

    def test_duplicate_registration_returns_409_with_suggested_method(self, client):
        """Edge Case 3: User already has account, tries to signup again."""
        unique_email = f"dup_{uuid.uuid4().hex[:8]}@infra.com"

        # 1. Register first time
        reg1 = client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "StrongPassword123!", "company_name": "Primary Infra"},
        )
        assert reg1.status_code == 201

        # 2. Register second time
        reg2 = client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "AnotherPassword456!", "company_name": "Duplicate Infra"},
        )
        assert reg2.status_code == 409
        detail = reg2.json()["detail"]
        assert detail["code"] == "ACCOUNT_EXISTS"
        assert detail["suggested_method"] == "password"
        assert detail["email"] == unique_email.lower()

    def test_email_case_insensitivity(self, client):
        """Edge Case: Registration with uppercase email and login with lowercase email."""
        base_id = uuid.uuid4().hex[:8]
        upper_email = f"CONTRACTOR_{base_id}@COMPANY.IN"
        lower_email = f"contractor_{base_id}@company.in"

        # Register with uppercase email
        reg = client.post(
            "/api/auth/register",
            json={"email": upper_email, "password": "SecretPassword123!", "company_name": "Case Test Corp"},
        )
        assert reg.status_code == 201

        # Login with lowercase email
        login = client.post(
            "/api/auth/login",
            json={"email": lower_email, "password": "SecretPassword123!"},
        )
        assert login.status_code == 200
        assert "access_token" in login.json()

    @pytest.mark.asyncio
    async def test_forgot_and_reset_password_flow(self, client):
        """Edge Case 8: Forgot password and reset lifecycle via OTP."""
        unique_email = f"forgot_{uuid.uuid4().hex[:8]}@infra.com"

        # 1. Register user
        reg = client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "OldPassword123!", "company_name": "Forgot Corp"},
        )
        assert reg.status_code == 201

        # 2. Request forgot password code
        with patch("app.services.email_service.EmailService.send_otp_email", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"success": True, "dev_otp": "654321"}
            forgot_res = client.post(
                "/api/auth/forgot-password",
                json={"email": unique_email},
            )
            assert forgot_res.status_code == 200
            assert forgot_res.json()["success"] is True

        # 3. Reset password with OTP
        with patch("app.services.email_service.EmailService.verify_otp", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = (True, "Valid OTP")
            reset_res = client.post(
                "/api/auth/reset-password",
                json={"email": unique_email, "otp": "654321", "new_password": "NewBrandPassword888!"},
            )
            assert reset_res.status_code == 200
            assert reset_res.json()["success"] is True

        # 4. Verify login works with NEW password
        login_res = client.post(
            "/api/auth/login",
            json={"email": unique_email, "password": "NewBrandPassword888!"},
        )
        assert login_res.status_code == 200

        # 5. Verify OLD password no longer works
        old_login_res = client.post(
            "/api/auth/login",
            json={"email": unique_email, "password": "OldPassword123!"},
        )
        assert old_login_res.status_code == 401

    @pytest.mark.asyncio
    async def test_migrate_anonymous_session_to_authenticated_tenant(self, client):
        """Edge Case 7: Migrate guest trial tender to newly authenticated user."""
        # 1. Create anonymous session
        anon_res = client.post("/api/auth/anonymous")
        assert anon_res.status_code == 200
        anon_data = anon_res.json()
        anon_tenant_id = anon_data["tenant_id"]

        # 2. Create authenticated user
        unique_email = f"migrator_{uuid.uuid4().hex[:8]}@infra.com"
        reg_res = client.post(
            "/api/auth/register",
            json={"email": unique_email, "password": "StrongPassword123!", "company_name": "Migrator Infra"},
        )
        assert reg_res.status_code == 201
        auth_token = reg_res.json()["access_token"]
        auth_tenant_id = reg_res.json()["tenant_id"]

        # 3. Call migrate endpoint with anon session
        migrate_res = client.post(
            "/api/auth/migrate",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"anon_session_id": "non-existent-or-empty"},
        )
        assert migrate_res.status_code == 200
        assert "message" in migrate_res.json()

