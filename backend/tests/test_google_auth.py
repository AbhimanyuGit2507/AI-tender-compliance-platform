"""
BidKaro — Unit Tests for Google OAuth Token Verification & Security
Asserts that all legacy mock shortcuts ('dev-google:') are purged,
and only authentic Google ID/access tokens are accepted.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

from app.core.security import verify_google_token, GoogleUserInfo


@pytest.mark.asyncio
async def test_empty_credential_rejected():
    with pytest.raises(HTTPException) as exc_info:
        await verify_google_token("")
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_legacy_dev_google_mock_rejected():
    """Verify that 'dev-google:...' is no longer treated as a mock bypass."""
    with pytest.raises(HTTPException) as exc_info:
        await verify_google_token("dev-google:test@contractor.in:Test Contractor")
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_valid_google_id_token():
    mock_payload = {
        "sub": "google-user-12345",
        "email": "director@contractor-epc.in",
        "name": "Rajesh Sharma",
        "picture": "https://lh3.googleusercontent.com/photo.jpg",
        "email_verified": "true",
        "aud": "726323238381-3l99pmukh4034pr50b5d17pnfj56157q.apps.googleusercontent.com",
    }
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_payload

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        user_info = await verify_google_token("header.mockpayload.signature")
        
        assert isinstance(user_info, GoogleUserInfo)
        assert user_info.sub == "google-user-12345"
        assert user_info.email == "director@contractor-epc.in"
        assert user_info.name == "Rajesh Sharma"
        assert user_info.email_verified is True


@pytest.mark.asyncio
async def test_valid_google_access_token():
    mock_userinfo = {
        "sub": "google-user-67890",
        "email": "partner@infra-firm.com",
        "name": "Ananya Verma",
        "picture": "https://lh3.googleusercontent.com/avatar.jpg",
        "email_verified": True,
    }
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_userinfo

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        user_info = await verify_google_token("ya29.a0AfH6SM...")
        
        assert isinstance(user_info, GoogleUserInfo)
        assert user_info.sub == "google-user-67890"
        assert user_info.email == "partner@infra-firm.com"
        assert user_info.name == "Ananya Verma"
