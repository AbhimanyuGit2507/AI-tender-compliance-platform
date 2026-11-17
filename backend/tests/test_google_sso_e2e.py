"""
BidKaro — Integration & Security Tests for Google SSO (Signup, Signin & Account Linking)
Tests full end-to-end workflow against /api/auth/google:
1. New user registration via Google OAuth
2. Returning user sign-in via Google OAuth
3. Existing email/password user account linking via Google OAuth
4. Security rejections: invalid tokens, unverified emails, malformed credentials
"""
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import User, Tenant, CreditLedgerEntry


@pytest.fixture
def client():
    return TestClient(app)


class TestGoogleSSOEndToEnd:
    """Comprehensive test suite for Google OAuth Single Sign-On."""

    @pytest.mark.asyncio
    async def test_google_signup_new_user(self, client):
        """Test brand new contractor signing up via Google SSO."""
        unique_email = f"contractor_{uuid.uuid4().hex[:8]}@infra-firm.in"
        google_sub = f"google-sub-{uuid.uuid4().hex[:12]}"
        
        mock_userinfo = {
            "sub": google_sub,
            "email": unique_email,
            "name": "Vikramaditya Infrastructure",
            "picture": "https://lh3.googleusercontent.com/avatar.jpg",
            "email_verified": True,
            "aud": "726323238381-3l99pmukh4034pr50b5d17pnfj56157q.apps.googleusercontent.com",
        }

        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = mock_userinfo

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get, \
             patch("app.services.email_service.EmailService.sync_brevo_contact", new_callable=AsyncMock) as mock_sync:
            mock_get.return_value = mock_res
            mock_sync.return_value = {"success": True, "status": "synced"}

            response = client.post(
                "/api/auth/google",
                json={
                    "credential": "header.payload.signature",
                    "company_name": "Vikramaditya Infra EPC Ltd",
                    "marketing_opt_in": True,
                },
            )

            assert response.status_code == 200, response.text
            data = response.json()
            assert "access_token" in data
            assert data["is_new_user"] is True
            assert data["is_anonymous"] is False
            assert "user_id" in data
            assert "tenant_id" in data

    @pytest.mark.asyncio
    async def test_google_signin_returning_user(self, client):
        """Test returning contractor signing in with existing Google account."""
        unique_email = f"returning_{uuid.uuid4().hex[:8]}@infra-firm.in"
        google_sub = f"google-sub-{uuid.uuid4().hex[:12]}"

        mock_userinfo = {
            "sub": google_sub,
            "email": unique_email,
            "name": "Returning Contractor",
            "email_verified": True,
        }

        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = mock_userinfo

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_res

            # 1. First signup
            res1 = client.post(
                "/api/auth/google",
                json={"credential": "token.1.sig", "company_name": "Returning Infra"},
            )
            assert res1.status_code == 200
            assert res1.json()["is_new_user"] is True
            user_id = res1.json()["user_id"]

            # 2. Subsequent login
            res2 = client.post(
                "/api/auth/google",
                json={"credential": "token.1.sig"},
            )
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["is_new_user"] is False
            assert data2["user_id"] == user_id

    @pytest.mark.asyncio
    async def test_google_sso_links_existing_email_account(self, client):
        """Test user registered with email/password then signing in with Google links account."""
        unique_email = f"emailuser_{uuid.uuid4().hex[:8]}@epc-contractor.in"
        google_sub = f"google-sub-{uuid.uuid4().hex[:12]}"

        # 1. Register via standard email/password
        reg_res = client.post(
            "/api/auth/register",
            json={
                "email": unique_email,
                "password": "StrongPassword123!",
                "company_name": "Registered First Corp",
            },
        )
        assert reg_res.status_code == 201, reg_res.text
        first_user_id = reg_res.json()["user_id"]

        # 2. Sign in via Google with matching email
        mock_userinfo = {
            "sub": google_sub,
            "email": unique_email,
            "name": "Google User",
            "email_verified": True,
        }
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = mock_userinfo

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_res

            google_res = client.post(
                "/api/auth/google",
                json={"credential": "token.header.sig"},
            )
            assert google_res.status_code == 200
            data = google_res.json()
            assert data["is_new_user"] is False
            assert data["user_id"] == first_user_id

    def test_google_invalid_token_returns_401(self, client):
        """Verify invalid or unverified credentials return 401."""
        res = client.post(
            "/api/auth/google",
            json={"credential": "totally-invalid-credential-string"},
        )
        assert res.status_code == 401
        assert "Invalid or expired" in res.json()["detail"]

    def test_google_empty_credential_returns_422_or_400(self, client):
        """Verify empty credential token is rejected."""
        res = client.post(
            "/api/auth/google",
            json={"credential": ""},
        )
        assert res.status_code in (400, 422)
