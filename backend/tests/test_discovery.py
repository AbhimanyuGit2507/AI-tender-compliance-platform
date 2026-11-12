"""
BidKaro — Integration Tests for Security Middleware & Tender Discovery Feeds
Verifies:
1. Security headers & processing latency middleware (X-Process-Time-Ms, X-Content-Type-Options, etc.)
2. GET /api/discovery/feed with deterministic Company Vault pre-qualification
3. Filtering discovery feed by portal and qualified_only
4. POST /api/discovery/{id}/import 1-click workspace ingestion
"""
from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import get_session_factory
from app.core.security import create_access_token, hash_password
from app.main import create_app
from app.models import Tenant, Tender, TenderRequirement, User

app = create_app()
db_session = get_session_factory()


@pytest.mark.asyncio
async def test_security_and_timing_middleware():
    """Verify production security headers and latency header on API responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert "X-Process-Time-Ms" in res.headers
        assert float(res.headers["X-Process-Time-Ms"]) >= 0.0
        assert res.headers.get("X-Content-Type-Options") == "nosniff"
        assert res.headers.get("X-Frame-Options") == "DENY"
        assert res.headers.get("X-XSS-Protection") == "1; mode=block"


@pytest.mark.asyncio
async def test_discovery_feed_and_prequalification():
    """Verify live discovery feed calculates qualification against tenant's vault."""
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    email = f"discovery_{uuid.uuid4().hex[:6]}@apexinfra.in"

    async with db_session() as db:
        tenant = Tenant(
            id=tenant_id,
            name="Apex Infratech Ltd",
            plan_tier="growth_pack",
            credit_balance=20,
        )
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=email,
            password_hash=hash_password("Password123!"),
            role="owner",
            is_anonymous=False,
        )
        db.add_all([tenant, user])
        await db.commit()

    token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="owner")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Unauthenticated request should fail
        unauth_res = await client.get("/api/discovery/feed")
        assert unauth_res.status_code == 401

        # 2. Populate Company Vault via API
        vault_payload = {
            "company_name": "Apex Infratech Ltd",
            "is_msme": True,
            "msme_reg_no": "UDYAM-MH-03-0099887",
            "turnovers": [
                {"year": 2024, "value_inr": 45_00_00_000.0},
                {"year": 2023, "value_inr": 42_00_00_000.0},
                {"year": 2022, "value_inr": 40_00_00_000.0},
            ],
            "max_turnover_a": 45_00_00_000.0,
            "active_commitments_b": 15_00_00_000.0,
            "net_worth": 50_00_00_000.0,
        }
        await client.put("/api/company/vault", headers=headers, json=vault_payload)

        # Add past high-value project
        await client.post(
            "/api/company/projects",
            headers=headers,
            json={
                "name": "Nagpur Water Pipeline & WTP Phase-I",
                "client": "Maharashtra Jeevan Pradhikaran",
                "value_inr": 42_00_00_000.0,
                "completion_year": 2024,
                "category": "Water Infrastructure",
            },
        )

        # 3. Authenticated feed fetch
        feed_res = await client.get("/api/discovery/feed", headers=headers)
        assert feed_res.status_code == 200
        feed_data = feed_res.json()
        assert "feed" in feed_data
        assert feed_data["total_count"] >= 5
        assert feed_data["qualified_count"] >= 1

        # Check pre-qualification details for MJP water tender
        mjp_item = next(t for t in feed_data["feed"] if t["external_id"] == "gem-water-mjp-042")
        assert mjp_item["qualification"]["is_eligible"] is True
        assert mjp_item["qualification"]["verdict"] == "QUALIFIED"
        assert mjp_item["qualification"]["match_score"] >= 80
        assert mjp_item["qualification"]["turnover_check"]["is_qualified"] is True
        assert mjp_item["qualification"]["emd_check"]["is_exempted"] is True

        # 4. Filter by Portal
        gem_res = await client.get("/api/discovery/feed?portal=GeM", headers=headers)
        assert gem_res.status_code == 200
        gem_items = gem_res.json()["feed"]
        assert all(t["portal"] == "GeM" for t in gem_items)

        # 5. Filter by Qualified Only
        qual_res = await client.get("/api/discovery/feed?qualified_only=true", headers=headers)
        assert qual_res.status_code == 200
        qual_items = qual_res.json()["feed"]
        assert all(t["qualification"]["is_eligible"] is True for t in qual_items)


@pytest.mark.asyncio
async def test_1click_import_discovery_tender():
    """Verify 1-Click import pulls public tender into tenant's database workspace."""
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    email = f"import_{uuid.uuid4().hex[:6]}@apexinfra.in"

    async with db_session() as db:
        tenant = Tenant(
            id=tenant_id,
            name="Apex Infratech Ltd",
            plan_tier="growth_pack",
            credit_balance=20,
        )
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=email,
            password_hash=hash_password("Password123!"),
            role="owner",
            is_anonymous=False,
        )
        db.add_all([tenant, user])
        await db.commit()

    token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="owner")
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. 1-Click Import MJP Water Tender
        import_res = await client.post(
            "/api/discovery/gem-water-mjp-042/import",
            headers=headers,
        )
        assert import_res.status_code == 200
        res_data = import_res.json()
        assert "tender_id" in res_data
        assert res_data["redirect_url"] == f"/workspace/{res_data['tender_id']}"
        tender_id = uuid.UUID(res_data["tender_id"])

        # 2. Verify Database records created
        async with db_session() as db:
            tender_row = await db.get(Tender, tender_id)
            assert tender_row is not None
            assert tender_row.tenant_id == tenant_id
            assert "MJP" in tender_row.title

            # Verify requirements were seeded
            req_res = await db.execute(
                select(TenderRequirement).where(TenderRequirement.tender_id == tender_id)
            )
            reqs = req_res.scalars().all()
            assert len(reqs) >= 3
            categories = {r.category for r in reqs}
            assert "financial" in categories
            assert "experience" in categories
            assert "submission" in categories

        # 3. Idempotent re-import returns existing tender without duplicate error
        reimport_res = await client.post(
            "/api/discovery/gem-water-mjp-042/import",
            headers=headers,
        )
        assert reimport_res.status_code == 200
        assert reimport_res.json()["tender_id"] == str(tender_id)
        assert "already" in reimport_res.json()["message"].lower()
