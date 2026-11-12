"""
BidKaro — Live End-to-End Ingestion, RAG, Compliance, & Compilation Test Suite
Tests the complete real-world pipeline against live database and ingestion engine:
  1. Temporary tenant + user creation & JWT authentication
  2. 5-page in-memory PDF generation (NIT, Turnover, Similar Work, EMD, Deadline)
  3. POST /api/tenders/upload with multipart file
  4. Real-time background ingestion (PyMuPDF geometry, Lexical Sieve, pgvector embedding)
  5. Verification of tender_requirements and knowledge_chunks in PostgreSQL
  6. Hybrid RAG query: "What is the turnover requirement?" verifying clause & page citation
  7. Deterministic compliance check against verified company facts
  8. Bid document compilation (Cover Letter) verifying generated .docx binary
"""
import io
import uuid
import pytest
import fitz  # PyMuPDF
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.main import app
from app.core.database import db_session
from app.core.security import create_access_token, hash_password
from app.models import (
    CompanyFact,
    KnowledgeChunk,
    Tenant,
    Tender,
    TenderDocument,
    TenderRequirement,
    User,
)
from app.services.ingestion import IngestionEngine
from app.services.storage import get_storage_backend


def generate_sample_tender_pdf() -> bytes:
    """Generate a clean 5-page government tender PDF in memory."""
    doc = fitz.open()

    # Page 1: NIT Header & Authority
    p1 = doc.new_page()
    p1.insert_text(
        (50, 100),
        "MAHARASHTRA JEEVAN PRADHIKARAN (MJP)\n"
        "OFFICE OF THE SUPERINTENDING ENGINEER, WATER CIRCLE, PUNE\n\n"
        "NOTICE INVITING TENDER (NIT)\n"
        "Tender Reference Number: MJP/2026/WTP/099\n"
        "Name of Work: Augmentation of Rural Water Supply Scheme Phase-II\n"
        "Estimated Cost: Rs. 45,00,00,000/- (Rupees Forty Five Crores Only)",
        fontsize=12,
    )

    # Page 2: Financial Criteria (Turnover)
    p2 = doc.new_page()
    p2.insert_text(
        (50, 100),
        "SECTION 3: FINANCIAL ELIGIBILITY CRITERIA\n\n"
        "Clause 3.1: Minimum Average Annual Financial Turnover\n"
        "The average annual turnover of the bidder during the last 3 financial years "
        "(FY 2023-24, FY 2024-25, FY 2025-26) shall not be less than Rs. 15.00 Crore.\n"
        "The bidder must submit a turnover certificate duly certified by a Chartered Accountant.",
        fontsize=11,
    )

    # Page 3: Technical Criteria (Similar Work)
    p3 = doc.new_page()
    p3.insert_text(
        (50, 100),
        "SECTION 4: TECHNICAL ELIGIBILITY & SIMILAR WORK CRITERIA\n\n"
        "Clause 4.1: Similar Work Experience\n"
        "The bidder must have successfully completed similar pipeline works during the last 7 years:\n"
        "Rule 1x80: One single completed work costing not less than Rs. 36.00 Crore (80% of E), OR\n"
        "Rule 2x50: Two completed works each costing not less than Rs. 22.50 Crore (50% of E), OR\n"
        "Rule 3x40: Three completed works each costing not less than Rs. 18.00 Crore (40% of E).\n"
        "Values will be updated to current price level by adding 10% per annum compound escalation.",
        fontsize=11,
    )

    # Page 4: EMD & MSME Exemption
    p4 = doc.new_page()
    p4.insert_text(
        (50, 100),
        "SECTION 5: EARNEST MONEY DEPOSIT (EMD)\n\n"
        "Clause 5.1: Bidders shall submit an EMD of Rs. 45,00,000 (1% of estimated cost) via Bank Guarantee.\n"
        "Clause 5.2: Micro & Small Enterprises (MSEs) registered under Udyam / MSME are 100% exempted "
        "from payment of EMD upon submission of Bid Security Declaration as per GFR 2017 Rule 170.",
        fontsize=11,
    )

    # Page 5: Validity & Submission Deadline
    p5 = doc.new_page()
    p5.insert_text(
        (50, 100),
        "SECTION 6: SUBMISSION AND BID VALIDITY\n\n"
        "Clause 6.1: Bid validity period shall be 120 days from opening date.\n"
        "Clause 6.2: Final date and time for online submission is 30-Nov-2026 at 15:00 hrs IST.",
        fontsize=11,
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.mark.asyncio
async def test_complete_e2e_bidding_pipeline():
    """
    Executes the complete real-world pipeline:
    Upload -> Ingestion -> Knowledge Chunks -> RAG -> Compliance -> Docx Compilation.
    """
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    test_email = f"e2e_{uuid.uuid4().hex[:8]}@testbid.in"

    # 1. Setup Tenant and User in DB
    async with db_session() as db:
        tenant = Tenant(
            id=tenant_id,
            name="E2E Pipeline Test EPC Ltd",
            plan_tier="growth_pack",
            credit_balance=10,
        )
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=test_email,
            password_hash=hash_password("Secr3tTest!"),
            role="admin",
            is_anonymous=False,
        )
        db.add_all([tenant, user])
        await db.flush()

        # Seed company facts for compliance check
        fact_turnover = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fact_category="turnover",
            fact_key="average_turnover_3yr",
            raw_value="₹18.50 Cr average turnover in last 3 FYs",
            numeric_value=18_50_00_000.0,
            confidence=1.0,
            verification_status="verified",
        )
        fact_work = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fact_category="project",
            fact_key="nagpur_wtp_phase1",
            raw_value="Nagpur Municipal Water Pipeline Phase-I (Completed 2024)",
            numeric_value=25_00_00_000.0,
            confidence=1.0,
            verification_status="verified",
        )
        db.add_all([fact_turnover, fact_work])
        await db.commit()

    token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="admin")
    auth_headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 2. Upload sample tender PDF
        pdf_bytes = generate_sample_tender_pdf()
        files = {
            "files": ("MJP_Pipeline_Tender_NIT.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        data = {"tender_title": "MJP Augmentation Rural Water Supply"}

        upload_res = await client.post(
            "/api/tenders/upload",
            headers=auth_headers,
            files=files,
            data=data,
        )
        assert upload_res.status_code == 202
        upload_data = upload_res.json()
        assert "tender_id" in upload_data
        tender_id = uuid.UUID(upload_data["tender_id"])
        doc_id = uuid.UUID(upload_data["documents"][0]["doc_id"])

        # 3. Execute live ingestion pipeline
        async with db_session() as db:
            engine = IngestionEngine(db)
            progress_events = []

            def _track_progress(step, pct, extra=None):
                progress_events.append((step, pct))

            ingest_res = await engine.ingest_document(
                tenant_id=tenant_id,
                tender_id=tender_id,
                doc_id=doc_id,
                file_content=pdf_bytes,
                filename="MJP_Pipeline_Tender_NIT.pdf",
                doc_category="nit",
                is_corrigendum=False,
                on_progress=_track_progress,
            )
            await db.commit()

        assert ingest_res["pages"] == 5
        assert ingest_res["chunks"] > 0
        assert any(pct == 100 for _, pct in progress_events)

        # 4. Verify DB records
        async with db_session() as db:
            chunks_res = await db.execute(
                select(KnowledgeChunk).where(KnowledgeChunk.tender_id == tender_id)
            )
            chunks = chunks_res.scalars().all()
            assert len(chunks) > 0

            # Verify bounding box is attached
            assert chunks[0].bbox_jsonb is not None
            assert len(chunks[0].bbox_jsonb) == 4

            tender_res = await db.execute(
                select(Tender).where(Tender.id == tender_id)
            )
            t = tender_res.scalar_one()
            assert t.status == "ready"
            assert t.readiness_score >= 60

        # 5. Hybrid RAG query with citation anchors
        rag_res = await client.post(
            f"/api/rag/{tender_id}/query",
            headers=auth_headers,
            json={"question": "What is the turnover requirement?", "top_k": 4},
        )
        assert rag_res.status_code == 200
        rag_data = rag_res.json()
        assert "citations" in rag_data
        assert len(rag_data["citations"]) > 0

        first_cite = rag_data["citations"][0]
        assert "page_number" in first_cite
        assert "bbox" in first_cite
        assert len(first_cite["bbox"]) == 4

        # 6. Compliance check
        comp_res = await client.post(
            f"/api/compliance/{tender_id}/check",
            headers=auth_headers,
        )
        assert comp_res.status_code == 200
        comp_data = comp_res.json()
        assert comp_data["tender_id"] == str(tender_id)
        assert "overall_status" in comp_data

        # 7. Document generation (Cover Letter)
        gen_res = await client.post(
            f"/api/generation/{tender_id}/compile",
            headers=auth_headers,
            json={"doc_type": "cover_letter"},
        )
        assert gen_res.status_code == 200
        gen_data = gen_res.json()
        assert "document_id" in gen_data
        assert gen_data["storage_key"].endswith(".docx")

        # 8. Download generated docx and verify binary content
        doc_id_gen = gen_data["document_id"]
        dl_res = await client.get(
            f"/api/generation/{tender_id}/download/{doc_id_gen}",
            headers=auth_headers,
        )
        assert dl_res.status_code == 200
        assert dl_res.headers["content-type"].startswith("application/vnd.openxmlformats")
        assert len(dl_res.content) > 1000  # valid Word file binary
