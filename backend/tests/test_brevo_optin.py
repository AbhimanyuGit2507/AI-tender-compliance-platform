"""
BidKaro — Unit & Integration Tests for Brevo Opt-In Emailing System
Tests:
1. Public newsletter subscription (lead capture)
2. Opt-in confirmation email dispatch
3. Brevo contact synchronization
4. One-click CAN-SPAM unsubscribe
5. Authenticated email preferences retrieval & update
"""
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestBrevoOptInSystem:

    @pytest.mark.asyncio
    async def test_public_newsletter_subscribe(self, client):
        """Test public contractor opting into tender alerts & circulars."""
        unique_email = f"lead_{uuid.uuid4().hex[:8]}@infrastructure-tender.in"

        with patch("app.services.email_service.EmailService.sync_brevo_contact", new_callable=AsyncMock) as mock_sync, \
             patch("app.services.email_service.EmailService.send_opt_in_confirmation_email", new_callable=AsyncMock) as mock_email:
            
            mock_sync.return_value = {"success": True, "status": "synced", "contact_id": 42}
            mock_email.return_value = {"success": True, "status": "sent"}

            res = client.post(
                "/api/newsletter/subscribe",
                json={
                    "email": unique_email,
                    "name": "Arjun Singhania",
                    "company": "Singhania Heavy Civil Works",
                    "source": "landing_page_footer",
                },
            )

            assert res.status_code == 200, res.text
            data = res.json()
            assert data["success"] is True
            assert data["email"] == unique_email
            assert "confirmation email" in data["message"].lower()

            mock_sync.assert_called_once()
            mock_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_public_newsletter_unsubscribe(self, client):
        """Test CAN-SPAM / GDPR one-click unsubscribe."""
        unique_email = f"unsub_{uuid.uuid4().hex[:8]}@epc-firm.in"

        # 1. First subscribe
        with patch("app.services.email_service.EmailService.sync_brevo_contact", new_callable=AsyncMock) as mock_sync:
            mock_sync.return_value = {"success": True, "status": "synced", "contact_id": "mock-42"}
            client.post("/api/newsletter/subscribe", json={"email": unique_email})

        # 2. Unsubscribe
        with patch("app.services.email_service.EmailService.unsubscribe_brevo_contact", new_callable=AsyncMock) as mock_unsub:
            mock_unsub.return_value = {"success": True, "status": "unsubscribed"}

            res = client.post(
                "/api/newsletter/unsubscribe",
                json={"email": unique_email},
            )

            assert res.status_code == 200
            assert res.json()["success"] is True
            assert "unsubscribed" in res.json()["message"].lower()
            mock_unsub.assert_called_once_with(unique_email)

    @pytest.mark.asyncio
    async def test_authenticated_email_preferences_lifecycle(self, client):
        """Test contractor managing email preferences in Workspace Settings."""
        unique_email = f"contractor_prefs_{uuid.uuid4().hex[:8]}@infra.in"

        # 1. Register user
        reg_res = client.post(
            "/api/auth/register",
            json={
                "email": unique_email,
                "password": "Password123!",
                "company_name": "Precision Infra Corp",
                "marketing_opt_in": True,
            },
        )
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get preferences
        get_res = client.get("/api/newsletter/preferences", headers=headers)
        assert get_res.status_code == 200
        prefs = get_res.json()
        assert prefs["email"] == unique_email
        assert prefs["marketing_opt_in"] is True
        assert prefs["tender_alerts_opt_in"] is True

        # 3. Update preferences
        with patch("app.services.email_service.EmailService.sync_brevo_contact", new_callable=AsyncMock) as mock_sync:
            mock_sync.return_value = {"success": True, "status": "updated"}

            patch_res = client.patch(
                "/api/newsletter/preferences",
                headers=headers,
                json={
                    "marketing_opt_in": True,
                    "tender_alerts_opt_in": False,
                    "newsletter_opt_in": True,
                },
            )
            assert patch_res.status_code == 200
            updated = patch_res.json()["preferences"]
            assert updated["tender_alerts_opt_in"] is False
            assert updated["newsletter_opt_in"] is True
            mock_sync.assert_called_once()
