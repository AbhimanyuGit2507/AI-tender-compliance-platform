"""
BidKaro — Integration Tests for FastAPI Endpoints
Run: pytest backend/tests/test_api_endpoints.py -v
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthAndPlans:
    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "BidKaro" in data["service"]

    def test_list_plans(self, client):
        response = client.get("/api/plans")
        assert response.status_code == 200
        plans = response.json()
        assert len(plans) == 3
        tiers = [p["tier_id"] for p in plans]
        assert "single_pack" in tiers
        assert "growth_pack" in tiers
        assert "pro_contractor" in tiers
        prices = [p["price_inr"] for p in plans]
        assert 199 in prices
        assert 499 in prices
        assert 999 in prices


class TestAuthProtection:
    def test_protected_routes_require_auth(self, client):
        # Without auth header, should return 401
        res = client.get("/api/tenders")
        assert res.status_code == 401

        res = client.get("/api/company/facts")
        assert res.status_code == 401

        res = client.get("/api/plans/credits")
        assert res.status_code == 401
