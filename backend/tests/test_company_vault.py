"""
BidKaro — Phase 8 Company Vault, PDF Image & Interactive Compilation Integration Tests
Verifies:
1. Company Vault GET / PUT roundtrip with turnover & MSME state
2. Adding high-value project via POST /api/company/projects flips compliance 1x80 Similar Work check to PASS
3. Real PDF Page Image GET /api/tenders/{id}/pages/1/image returns valid PNG binary
4. Interactive Compilation with custom_fields resolves action placeholders
"""
from __future__ import annotations

import io
import uuid
from datetime import datetime, timedelta

import pytest
import pymupdf as fitz
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import get_session_factory
from app.core.security import create_access_token, hash_password
from app.main import create_app
from app.models import CompanyFact, Tenant, Tender, TenderDocument, TenderRequirement, User
from app.services.ingestion import IngestionEngine
from app.services.storage import get_storage_backend, make_storage_key

app = create_app()
db_session = get_session_factory()


def generate_single_page_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 70), "MAHARASHTRA JEEVAN PRADHIKARAN (MJP)", fontsize=14)
    page.insert_text((50, 100), "Clause 4.1: Average Annual Financial Turnover shall be minimum Rs. 10.00 Cr.", fontsize=11)
    page.insert_text((50, 130), "Clause 4.2: Similar Work Requirement: Minimum 1 work of Rs. 8.00 Cr (80%).", fontsize=11)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


@pytest.mark.asyncio
async def test_company_vault_crud_and_compliance_linkage():
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    email = f"vault_{uuid.uuid4().hex[:6]}@apexinfra.in"

    async with db_session() as db:
        tenant = Tenant(
            id=tenant_id,
            name="Apex Infratech Ltd",
            plan_tier="growth_pack",
            credit_balance=15,
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
    auth_headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Fetch initial vault
        vault_res = await client.get("/api/company/vault", headers=auth_headers)
        assert vault_res.status_code == 200
        vault_data = vault_res.json()
        assert vault_data["company_name"] == "Apex Infratech Ltd"
        assert vault_data["is_msme"] is False

        # 2. Update vault with turnover, MSME, and bid capacity parameters
        update_payload = {
            "company_name": "Apex Infratech Pvt. Ltd.",
            "gstin": "27AABCA1234F1Z5",
            "pan": "AABCA1234F",
            "is_msme": True,
            "msme_reg_no": "UDYAM-MH-03-9988776",
            "is_startup": False,
            "turnovers": [
                {"year": 2024, "value_inr": 22_00_00_000.0},
                {"year": 2023, "value_inr": 18_00_00_000.0},
                {"year": 2022, "value_inr": 15_00_00_000.0},
            ],
            "max_turnover_a": 22_00_00_000.0,
            "active_commitments_b": 10_00_00_000.0,
            "net_worth": 30_00_00_000.0,
        }
        put_res = await client.put("/api/company/vault", headers=auth_headers, json=update_payload)
        assert put_res.status_code == 200

        # Verify updated vault
        v2 = (await client.get("/api/company/vault", headers=auth_headers)).json()
        assert v2["company_name"] == "Apex Infratech Pvt. Ltd."
        assert v2["is_msme"] is True
        assert v2["msme_reg_no"] == "UDYAM-MH-03-9988776"
        assert len(v2["turnovers"]) == 3
        assert v2["max_turnover_a"] == 22_00_00_000.0

        # 3. Add a completed project
        proj_payload = {
            "name": "Pune Water Pipeline Network Phase-I",
            "client": "PMC",
            "value_inr": 12_50_00_000.0,
            "completion_year": 2024,
            "category": "Water Supply Pipeline",
        }
        proj_res = await client.post("/api/company/projects", headers=auth_headers, json=proj_payload)
        assert proj_res.status_code == 201
        proj_data = proj_res.json()
        assert "id" in proj_data
        proj_id = proj_data["id"]

        # 4. Add a certificate
        cert_payload = {
            "name": "ISO 9001:2015",
            "issuer": "TUV Nord",
            "valid_until": (datetime.now() + timedelta(days=400)).isoformat(),
            "doc_ref": "ISO-9001-2024-PMC",
        }
        cert_res = await client.post("/api/company/certificates", headers=auth_headers, json=cert_payload)
        assert cert_res.status_code == 201
        cert_id = cert_res.json()["id"]

        # 5. Check Credits endpoint
        cred_res = await client.get("/api/company/credits", headers=auth_headers)
        assert cred_res.status_code == 200
        cred_data = cred_res.json()
        assert cred_data["credit_balance"] == 15

        # 6. Delete the project and verify removal
        del_proj = await client.delete(f"/api/company/projects/{proj_id}", headers=auth_headers)
        assert del_proj.status_code == 200

        del_cert = await client.delete(f"/api/company/certificates/{cert_id}", headers=auth_headers)
        assert del_cert.status_code == 200


@pytest.mark.asyncio
async def test_pdf_page_image_renderer_and_interactive_compilation():
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()

    async with db_session() as db:
        tenant = Tenant(
            id=tenant_id,
            name="Bharat Infrastructure Ltd",
            plan_tier="growth_pack",
            credit_balance=10,
        )
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=f"bharat_{uuid.uuid4().hex[:6]}@infra.in",
            password_hash=hash_password("BharatPass123!"),
            role="owner",
            is_anonymous=False,
        )
        db.add_all([tenant, user])
        await db.commit()

    token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="owner")
    auth_headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Upload sample PDF
        pdf_bytes = generate_single_page_pdf()
        files = {
            "files": ("MJP_Water_Pipeline_Notice.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        upload_res = await client.post(
            "/api/tenders/upload",
            headers=auth_headers,
            files=files,
            data={"tender_title": "MJP Water Supply Pipeline Notice"},
        )
        assert upload_res.status_code == 202
        tender_id = upload_res.json()["tender_id"]

        # 2. Render Page 1 to PNG Image
        img_res = await client.get(
            f"/api/tenders/{tender_id}/pages/1/image",
            headers=auth_headers,
        )
        assert img_res.status_code == 200
        assert img_res.headers["content-type"] == "image/png"
        assert len(img_res.content) > 1000  # valid PNG binary

        # Request invalid page should return 404
        img_404 = await client.get(
            f"/api/tenders/{tender_id}/pages/99/image",
            headers=auth_headers,
        )
        assert img_404.status_code == 404

        # 3. Interactive Compilation with custom_fields
        custom_fields = {
            "authorized_signatory": "Vikramaditya Singhania",
            "designation": "Managing Director",
            "address": "Plot 42, Bandra-Kurla Complex, Mumbai 400051",
            "place": "Mumbai",
            "age": "48",
            "residential_address": "Flat 12B, Sea Green Apartments, Worli, Mumbai",
        }
        compile_res = await client.post(
            f"/api/generation/{tender_id}/compile",
            headers=auth_headers,
            json={
                "doc_type": "cover_letter",
                "custom_fields": custom_fields,
            },
        )
        assert compile_res.status_code == 200
        comp_data = compile_res.json()
        assert comp_data["storage_key"].endswith(".docx")

        # Verify audit findings has NO critical placeholder issues for cover letter
        findings = comp_data.get("audit_findings", [])
        placeholder_issues = [f for f in findings if "unresolved" in f.get("issue", "").lower()]
        assert len(placeholder_issues) == 0


@pytest.mark.asyncio
async def test_high_value_project_flips_similar_work_to_pass():
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    tender_id = uuid.uuid4()

    async with db_session() as db:
        tenant = Tenant(
            id=tenant_id,
            name="Mega Buildcon Ltd",
            plan_tier="growth_pack",
            credit_balance=20,
        )
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=f"megabuild_{uuid.uuid4().hex[:6]}@infra.in",
            password_hash=hash_password("MegaPass123!"),
            role="owner",
            is_anonymous=False,
        )
        tender = Tender(
            id=tender_id,
            tenant_id=tenant_id,
            title="Nagpur Metro Water Transmission Pipeline",
            authority="Nagpur Municipal Corporation (NMC)",
            reference_no="NMC/2026/WATER/088",
            estimated_value_inr=10_00_00_000.0,  # 10 Cr tender (80% threshold = 8.0 Cr)
            closing_at=datetime.now() + timedelta(days=60),
            status="ready",
        )
        req = TenderRequirement(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            category="experience",
            title="Clause 4.2 Similar Work Requirement (1x80: 8.0 Cr)",
            is_mandatory=True,
            is_superseded=False,
            numeric_value=8_00_00_000.0,
        )
        db.add_all([tenant, user, tender, req])
        await db.commit()

    token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="owner")
    auth_headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Add small project that is too small for 1x80 (2.0 Cr < 8.0 Cr)
        small_proj = {
            "name": "Minor Culvert Construction",
            "client": "Local Panchayat",
            "value_inr": 2_00_00_000.0,
            "completion_year": 2024,
            "category": "Civil Works",
        }
        add_small = await client.post("/api/company/projects", headers=auth_headers, json=small_proj)
        assert add_small.status_code == 201

        # Run compliance check -> Should be NON_COMPLIANT
        check1 = await client.post(f"/api/compliance/{tender_id}/check", headers=auth_headers)
        assert check1.status_code == 200

        mat1 = (await client.get(f"/api/compliance/{tender_id}", headers=auth_headers)).json()
        assert mat1["non_compliant_count"] >= 1
        item1 = next(it for it in mat1["items"] if "similar work" in it["requirement"]["title"].lower())
        assert item1["status"] == "NON_COMPLIANT"

        # 2. Add high-value project that satisfies 1x80 (9.5 Cr > 8.0 Cr)
        high_proj = {
            "name": "Major River Pipeline Transmission",
            "client": "State Water Board",
            "value_inr": 9_50_00_000.0,
            "completion_year": 2024,
            "category": "Water Supply Pipeline",
        }
        add_high = await client.post("/api/company/projects", headers=auth_headers, json=high_proj)
        assert add_high.status_code == 201

        # Re-run compliance check -> Should flip to COMPLIANT (PASS)!
        check2 = await client.post(f"/api/compliance/{tender_id}/check", headers=auth_headers)
        assert check2.status_code == 200

        mat2 = (await client.get(f"/api/compliance/{tender_id}", headers=auth_headers)).json()
        item2 = next(it for it in mat2["items"] if "similar work" in it["requirement"]["title"].lower())
        assert item2["status"] == "COMPLIANT"
        assert item2["deterministic_pass"] is True

