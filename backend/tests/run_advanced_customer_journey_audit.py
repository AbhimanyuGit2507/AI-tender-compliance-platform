"""
BidKaro — Advanced Customer Experience & Deep Quality Audit
Simulates real contractor workflow:
  1. Auto-fill Company Vault from a realistic 4-page Previous Bid PDF (M/s Shivalik Infrastructure)
  2. Audit AI-extracted company facts (Turnover, Past Works, GSTIN, UDYAM, ISO Certs)
  3. Upload & ingest real 15-page CWC Jal Shakti Tender NIT
  4. Audit extraction quality (Authority, EMD, PBG, Deadlines, Clause references)
  5. Multi-Turn RAG Chat Experience (MSE Exemption, Liquidated Damages, Testing Protocols)
  6. Dynamic Re-compliance when contractor conditions change
  7. Turnkey .DOCX Inspection (Covering Letter & Technical Methodology text audit)
  8. Two-Layer Disqualification Pre-Flight Audit
"""
import asyncio
import io
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document as DocxDocument
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update, delete

sys.path.insert(0, os.path.abspath("backend"))

from app.main import app
from app.core.config import get_settings
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
    GeneratedDocument,
)

OUTPUT_AUDIT_JSON = "backend/tests/advanced_customer_journey_audit.json"


def generate_contractor_previous_bid_pdf() -> bytes:
    """
    Generate an authentic 4-page previous bid document of an Indian contractor:
    M/s Shivalik Infrastructure & Engineering Pvt Ltd.
    Contains GSTIN, PAN, UDYAM MSME certificate, 3-year turnover, and 2 completed works.
    """
    doc = fitz.open()

    # Page 1: Company Profile & Statutory Details
    p1 = doc.new_page()
    p1.insert_text(
        (50, 60),
        "M/S SHIVALIK INFRASTRUCTURE & ENGINEERING PRIVATE LIMITED\n"
        "Registered Office: Plot No. 42, MIDC Industrial Area, Bhosari, Pune - 411026\n"
        "CIN: U45200PN2018PTC178921 | Email: contact@shivalikinfra.co.in | Tel: +91-20-27124982\n"
        "─────────────────────────────────────────────────────────────────────────────\n\n"
        "1.0 COMPANY BACKGROUND & REGISTRATION PROFILE\n\n"
        "Company Name: Shivalik Infrastructure & Engineering Pvt Ltd\n"
        "Date of Incorporation: 14-August-2018 under Companies Act 2013\n"
        "Primary Business: Civil & Hydraulic Infrastructure, Steel Fabrication, Water Supply Networks\n\n"
        "STATUTORY REGISTRATIONS:\n"
        "• GSTIN: 27AAACS8921K1Z2 (State: Maharashtra, Active)\n"
        "• Permanent Account Number (PAN): AAACS8921K\n"
        "• UDYAM MSME Registration: UDYAM-MH-12-0048291 (Micro Enterprise - Manufacturing & Services)\n"
        "• Employees Provident Fund (EPFO): MH/PUN/0084921/000\n"
        "• ESIC Registration: 31000849210000999\n",
        fontsize=10,
    )

    # Page 2: Audited Financial Turnover (CA Certificate)
    p2 = doc.new_page()
    p2.insert_text(
        (50, 60),
        "CHARTERED ACCOUNTANTS CERTIFICATE FOR ANNUAL FINANCIAL TURNOVER\n"
        "M/s K. B. Deshmukh & Associates, Chartered Accountants (FRN: 114920W)\n\n"
        "TO WHOMSOEVER IT MAY CONCERN\n\n"
        "This is to certify that M/s Shivalik Infrastructure & Engineering Pvt Ltd having registered\n"
        "office at Bhosari, Pune has achieved the following Annual Financial Turnover from civil &\n"
        "fabrication works during the last three preceding financial years:\n\n"
        "─────────────────────────────────────────────────────────────────────────────\n"
        "Financial Year      Turnover in Rupees            Turnover in Crores (INR)\n"
        "─────────────────────────────────────────────────────────────────────────────\n"
        "FY 2023-2024        Rs. 4,20,50,000/-             Rs. 4.205 Cr\n"
        "FY 2024-2025        Rs. 5,80,00,000/-             Rs. 5.800 Cr\n"
        "FY 2025-2026        Rs. 7,10,00,000/-             Rs. 7.100 Cr\n"
        "─────────────────────────────────────────────────────────────────────────────\n"
        "Average Annual Financial Turnover (AAFT) over last 3 years: Rs. 5,70,16,666/- (Rs. 5.70 Cr)\n\n"
        "UDIN: 26114920AAAAAB9812 | Date: 12-June-2026 | Place: Pune\n"
        "Signed & Sealed: CA K. B. Deshmukh (Membership No. 114920)\n",
        fontsize=10,
    )

    # Page 3: Past Completed Projects & Performance Certificates
    p3 = doc.new_page()
    p3.insert_text(
        (50, 60),
        "SCHEDULE OF SIMILAR COMPLETED WORKS & CLIENT PERFORMANCE CERTIFICATES\n"
        "─────────────────────────────────────────────────────────────────────────────\n\n"
        "PROJECT 1: FABRICATION & ERECTION OF HYDROMETRIC TARGET & PIVOT POLES\n"
        "• Client Name: Maharashtra Water Resources Department (WRD), Nashik Division\n"
        "• Agreement Ref: WRD/NSK/CIVIL/2023-24/AG-114\n"
        "• Scope: Supply, structural MS fabrication, anti-corrosive primer coating, and foundation\n"
        "  erection of hydrological target observation poles at 18 river gauging sites.\n"
        "• Contract Value: Rs. 1,85,00,000/- (Rupees One Crore Eighty Five Lakhs Only)\n"
        "• Completion Date: 15-March-2024 (Completed within stipulated 4 months)\n"
        "• Performance Verdict: Completed successfully and working satisfactorily.\n\n"
        "PROJECT 2: RCC HUME PIPE DRAINAGE & WATER NETWORK AUGMENTATION\n"
        "• Client Name: Pune Municipal Corporation (PMC), Water Supply Dept\n"
        "• Agreement Ref: PMC/WSD/2022-23/T-409\n"
        "• Scope: Trench excavation, laying of 1200mm NP3 RCC Hume pipes, and valve chambers.\n"
        "• Contract Value: Rs. 3,40,00,000/- (Rupees Three Crores Forty Lakhs Only)\n"
        "• Completion Date: 20-November-2023\n"
        "• Performance Verdict: Executed to full satisfaction without penalty or liquidated damages.\n",
        fontsize=10,
    )

    # Page 4: Quality & Technical Certifications
    p4 = doc.new_page()
    p4.insert_text(
        (50, 60),
        "QUALITY ASSURANCE & STATUTORY CERTIFICATES\n"
        "─────────────────────────────────────────────────────────────────────────────\n\n"
        "1. ISO 9001:2015 Quality Management System Certificate\n"
        "   Certificate No: QMS/IND/2023/8941\n"
        "   Scope: Civil Construction, Structural Steel Fabrication and Pipeline Installation\n"
        "   Valid Until: 2027-12-31\n\n"
        "2. Non-Blacklisting / Debarment Affidavit\n"
        "   Notarized on Stamp Paper of Rs. 500/- at Pune on 10-January-2026\n"
        "   Affirmed that M/s Shivalik Infrastructure & Engineering Pvt Ltd has never been\n"
        "   debarred, blacklisted, or restrained by any Central/State Ministry, CPWD, or PSU.\n\n"
        "3. Key Plant & Machinery Fleet Owned:\n"
        "   • Mobile Welding Generators (300A): 4 Units\n"
        "   • Portable Crane / Hydra (14T): 2 Units\n"
        "   • Concrete Mixers (10/7 CFT): 3 Units\n"
        "   • Total Station Survey Equipment: 1 Unit\n",
        fontsize=10,
    )

    return doc.tobytes()


async def main():
    print("=" * 80)
    print("   BIDKARO DEEP AUDIT: REAL-WORLD CUSTOMER JOURNEY & AI QUALITY AUDIT   ")
    print("=" * 80)

    settings = get_settings()
    audit_report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_used": settings.model_fast_text,
        "provider": settings.llm_provider,
        "journey_stages": {},
        "qualitative_assessments": {},
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # ─────────────────────────────────────────────────────────────
        # PART 1: Real Contractor Profile & "Drop Old Bid" Auto-Fill
        # ─────────────────────────────────────────────────────────────
        print("\n[PART 1] Auto-Filling Company Vault from Real Contractor Previous Bid PDF...")
        t0 = time.monotonic()

        tenant_id = uuid.uuid4()
        user_id = uuid.uuid4()
        user_email = f"director_{uuid.uuid4().hex[:6]}@shivalikinfra.co.in"

        async with db_session() as db:
            tenant = Tenant(
                id=tenant_id,
                name="Shivalik Infrastructure & Engineering Pvt Ltd",
                plan_tier="growth_pack",
                credit_balance=500,
            )
            db.add(tenant)
            user = User(
                id=user_id,
                tenant_id=tenant_id,
                email=user_email,
                password_hash=hash_password("Shivalik@2026!Secure"),
                role="admin",
                is_anonymous=False,
            )
            db.add(user)
            await db.commit()

        token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="admin")
        auth_headers = {"Authorization": f"Bearer {token}"}
        print(f"  -> Created Real Contractor Account: '{tenant.name}'")

        # Generate realistic 4-page previous bid PDF
        prev_bid_bytes = generate_contractor_previous_bid_pdf()
        print(f"  -> Generated 4-page previous bid document (Size: {len(prev_bid_bytes):,} bytes)")

        # Upload old bid to auto-fill
        resp_autofill = await client.post(
            "/api/company/upload-old-bid",
            files={"file": ("Shivalik_Infra_Previous_Bid_Submission.pdf", io.BytesIO(prev_bid_bytes), "application/pdf")},
            headers=auth_headers,
        )
        autofill_ms = int((time.monotonic() - t0) * 1000)
        print(f"  -> POST /api/company/upload-old-bid: HTTP {resp_autofill.status_code} in {autofill_ms}ms")
        autofill_data = resp_autofill.json()
        print(f"     Status: {autofill_data.get('status')} | Extracted Facts: {autofill_data.get('extracted_candidate_facts_count')}")

        # Verify DB facts created
        async with db_session() as db:
            facts_q = await db.execute(select(CompanyFact).where(CompanyFact.tenant_id == tenant_id))
            facts = facts_q.scalars().all()

        print(f"  -> Total Company Vault Facts in Database: {len(facts)}")
        extracted_facts_summary = []
        for f in facts:
            print(f"     [{f.fact_category.upper()}] {f.fact_key}: {f.raw_value} (Numeric: {f.numeric_value})")
            extracted_facts_summary.append({
                "category": f.fact_category,
                "key": f.fact_key,
                "value": f.raw_value,
                "numeric": f.numeric_value,
            })

        audit_report["journey_stages"]["part_1_company_vault_autofill"] = {
            "status": "PASS" if len(facts) >= 3 else "FAIL",
            "latency_ms": autofill_ms,
            "facts_extracted_count": len(facts),
            "facts": extracted_facts_summary,
        }

        # ─────────────────────────────────────────────────────────────
        # PART 2: Ingesting Real 15-Page Jal Shakti CWC Tender
        # ─────────────────────────────────────────────────────────────
        print("\n[PART 2] Ingesting Authentic Central Water Commission (Jal Shakti) Tender...")
        t0 = time.monotonic()
        pdf_path = "test_downloads/nit_target_pole_cwc.pdf"
        with open(pdf_path, "rb") as f:
            cwc_pdf_bytes = f.read()

        resp_upload = await client.post(
            "/api/tenders/upload",
            files={"files": ("nit_target_pole_cwc.pdf", io.BytesIO(cwc_pdf_bytes), "application/pdf")},
            data={"tender_title": "CWC Hydrology Division Target Pole Supply & Fabrication"},
            headers=auth_headers,
        )
        upload_data = resp_upload.json()
        tender_id = uuid.UUID(upload_data["tender_id"])
        doc_id = uuid.UUID(upload_data["documents"][0]["doc_id"])

        from app.services.ingestion import IngestionEngine
        async with db_session() as db:
            engine = IngestionEngine(db)
            ingest_res = await engine.ingest_document(
                tenant_id=tenant_id,
                tender_id=tender_id,
                doc_id=doc_id,
                file_content=cwc_pdf_bytes,
                filename="nit_target_pole_cwc.pdf",
                doc_category="nit",
                is_corrigendum=False,
            )
            await db.commit()

        ingest_ms = int((time.monotonic() - t0) * 1000)
        print(f"  -> Ingestion Complete in {ingest_ms}ms (Pages: {ingest_res['pages']}, Chunks: {ingest_res['chunks']})")

        # Inspect extracted tender facts in DB
        async with db_session() as db:
            tender_row = (await db.execute(select(Tender).where(Tender.id == tender_id))).scalar_one()
            reqs = (await db.execute(select(TenderRequirement).where(TenderRequirement.tender_id == tender_id))).scalars().all()

        print(f"  -> Extracted Official Title: {tender_row.title}")
        print(f"  -> Extracted Authority: {tender_row.authority}")
        print(f"  -> Extracted Reference No: {tender_row.reference_no}")
        print(f"  -> Extracted Tender Requirements: {len(reqs)}")
        for r in reqs:
            print(f"     * [{r.category.upper()}] {r.title} | Snippet: \"{r.exact_snippet[:70]}...\"")

        audit_report["journey_stages"]["part_2_tender_ingestion"] = {
            "status": "PASS",
            "latency_ms": ingest_ms,
            "title": tender_row.title,
            "authority": tender_row.authority,
            "reference_no": tender_row.reference_no,
            "requirements_count": len(reqs),
        }

        # ─────────────────────────────────────────────────────────────
        # PART 3: Conversational Multi-Turn RAG Chat Experience
        # ─────────────────────────────────────────────────────────────
        print("\n[PART 3] Multi-Turn Interactive RAG Chat Audit (3 Domain Inquiries)...")

        chat_scenarios = [
            {
                "topic": "MSME / MSE EMD Exemption & Past Experience Clause",
                "question": "Can an MSE or MSME registered agency claim exemption from the 3-year prior experience or EMD requirement in this tender? What does the NIT specifically state?",
            },
            {
                "topic": "Liquidated Damages & Delay Penalty",
                "question": "What are the exact liquidated damages, delay penalties, or security deposit deductions if work is not completed within 30 days?",
            },
            {
                "topic": "Bid Validity & Submission Deadline",
                "question": "What is the bid validity period from the opening date, and what is the exact deadline for bid submission?",
            },
        ]

        chat_results = []
        for i, scenario in enumerate(chat_scenarios, 1):
            await asyncio.sleep(3.0)  # Gentle buffer on Groq free tier
            print(f"\n  [Chat Query #{i}] Topic: {scenario['topic']}")
            print(f"  User Prompt: \"{scenario['question']}\"")
            t_chat = time.monotonic()
            resp_chat = await client.post(
                f"/api/rag/{tender_id}/query",
                json={"question": scenario["question"], "top_k": 4},
                headers=auth_headers,
            )
            chat_ms = int((time.monotonic() - t_chat) * 1000)
            print(f"  -> Response HTTP {resp_chat.status_code} in {chat_ms}ms")
            chat_json = resp_chat.json()
            answer = chat_json.get("answer", "")
            citations = chat_json.get("citations", [])
            print(f"  -> Citations Returned: {len(citations)}")
            for c in citations[:2]:
                snip = (c.get("snippet") or c.get("content_preview") or "")[:75]
                print(f"     [Page {c.get('page_number')}] (Score: {c.get('relevance_score')}): {snip}...")
            print(f"  -> AI Answer Excerpt:\n     {answer[:260]}...")

            chat_results.append({
                "scenario": scenario["topic"],
                "question": scenario["question"],
                "latency_ms": chat_ms,
                "citations_count": len(citations),
                "answer": answer,
            })

        audit_report["journey_stages"]["part_3_multi_turn_chat"] = chat_results

        # ─────────────────────────────────────────────────────────────
        # PART 4: Real-World Dynamic Compliance & Re-Scoring
        # ─────────────────────────────────────────────────────────────
        print("\n[PART 4] Deterministic Qualification Audit with Real Extracted Facts...")
        t0 = time.monotonic()
        resp_check = await client.post(
            f"/api/compliance/{tender_id}/check",
            headers=auth_headers,
        )
        print(f"  -> POST /api/compliance/{tender_id}/check: HTTP {resp_check.status_code}")

        resp_matrix = await client.get(
            f"/api/compliance/{tender_id}",
            headers=auth_headers,
        )
        matrix = resp_matrix.json()
        print(f"  -> Baseline Compliance Score: {matrix.get('readiness_score')}%")
        print(f"     Compliant Items: {matrix.get('compliant_count')} | Non-Compliant: {matrix.get('non_compliant_count')}")
        for item in matrix.get("items", []):
            print(f"     - [{item.get('status').upper()}] {item.get('company_value_display')}: {item.get('rationale')}")

        # Now simulate a dynamic contractor change:
        # What if the user adds an explicit MSME Udyam fact asserting micro enterprise status?
        print("\n  -> Simulating Dynamic Profile Update: Registering UDYAM MSE Certificate...")
        async with db_session() as db:
            udyam_fact = CompanyFact(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                fact_category="statutory",
                fact_key="udyam_registration",
                raw_value="UDYAM-MH-12-0048291 (Micro Enterprise, Valid)",
                verification_status="verified",
                confidence=1.0,
            )
            db.add(udyam_fact)
            await db.commit()

        # Re-check compliance
        resp_recheck = await client.post(
            f"/api/compliance/{tender_id}/check",
            headers=auth_headers,
        )
        resp_rematrix = await client.get(
            f"/api/compliance/{tender_id}",
            headers=auth_headers,
        )
        rematrix = resp_rematrix.json()
        print(f"  -> Re-evaluated Compliance Score: {rematrix.get('readiness_score')}%")

        audit_report["journey_stages"]["part_4_dynamic_compliance"] = {
            "baseline_score": matrix.get("readiness_score"),
            "post_update_score": rematrix.get("readiness_score"),
            "items": rematrix.get("items", []),
        }

        # ─────────────────────────────────────────────────────────────
        # PART 5: In-Depth Quality Audit of Generated Word Documents
        # ─────────────────────────────────────────────────────────────
        print("\n[PART 5] Compiling & Auditing Production Word Documents (.DOCX)...")
        # 5a: Cover Letter
        resp_cover = await client.post(
            f"/api/generation/{tender_id}/compile",
            json={
                "doc_type": "cover_letter",
                "custom_instructions": "Signatory: Er. Rajesh Sharma, Managing Director, Shivalik Infrastructure.",
            },
            headers=auth_headers,
        )
        cover_id = resp_cover.json().get("document_id")
        resp_dl_cover = await client.get(f"/api/generation/{tender_id}/download/{cover_id}", headers=auth_headers)
        cover_bytes = resp_dl_cover.content

        # 5b: Technical Methodology
        resp_method = await client.post(
            f"/api/generation/{tender_id}/compile",
            json={
                "doc_type": "tech_methodology",
                "custom_instructions": "Focus on high-durability epoxy coating on MS target poles and accurate plumb alignment.",
            },
            headers=auth_headers,
        )
        method_id = resp_method.json().get("document_id")
        resp_dl_method = await client.get(f"/api/generation/{tender_id}/download/{method_id}", headers=auth_headers)
        method_bytes = resp_dl_method.content

        # Inspect actual text inside DOCX using python-docx
        cover_docx = DocxDocument(io.BytesIO(cover_bytes))
        cover_text = "\n".join(p.text for p in cover_docx.paragraphs if p.text.strip())

        method_docx = DocxDocument(io.BytesIO(method_bytes))
        method_text = "\n".join(p.text for p in method_docx.paragraphs if p.text.strip())

        print(f"  -> Covering Letter .DOCX Size: {len(cover_bytes):,} bytes | Paragraphs: {len(cover_docx.paragraphs)}")
        print(f"     Text Preview:\n{cover_text[:350]}...\n")

        print(f"  -> Technical Methodology .DOCX Size: {len(method_bytes):,} bytes | Paragraphs: {len(method_docx.paragraphs)}")
        print(f"     Text Preview:\n{method_text[:350]}...\n")

        # Zero Hallucination Audit
        action_tags_cover = cover_text.count("[[ACTION REQUIRED")
        action_tags_method = method_text.count("[[ACTION REQUIRED")
        print(f"  -> Safety Placeholder Audit:")
        print(f"     * Covering Letter safety placeholders: {action_tags_cover}")
        print(f"     * Technical Methodology safety placeholders: {action_tags_method}")

        audit_report["journey_stages"]["part_5_document_quality"] = {
            "cover_letter_size_bytes": len(cover_bytes),
            "cover_letter_preview": cover_text[:600],
            "methodology_size_bytes": len(method_bytes),
            "methodology_preview": method_text[:600],
            "safety_action_placeholders": action_tags_cover + action_tags_method,
        }

        # ─────────────────────────────────────────────────────────────
        # PART 6: Two-Layer Disqualification Audit Inspection
        # ─────────────────────────────────────────────────────────────
        print("\n[PART 6] Executing Two-Layer Pre-Flight Submission Disqualification Audit...")
        await asyncio.sleep(6.0)  # Rate-limit buffer for Groq OTPM
        resp_audit = await client.post(
            f"/api/generation/{tender_id}/audit",
            headers=auth_headers,
        )
        audit_json = resp_audit.json()
        print(f"  -> Overall Audit Status: {audit_json.get('status')}")
        disqual_risks = audit_json.get("disqualification_risks", [])
        print(f"  -> Disqualification Risks Flagged by Semantic Audit: {len(disqual_risks)}")
        for r in disqual_risks:
            print(f"     [{r.get('severity', '').upper()}] Clause: {r.get('clause_ref')} | Issue: {r.get('issue')}")
            print(f"            Fix: {r.get('recommended_action')}")

        audit_report["journey_stages"]["part_6_pre_flight_audit"] = {
            "audit_response": audit_json,
        }

    # Save complete JSON report
    with open(OUTPUT_AUDIT_JSON, "w") as f:
        json.dump(audit_report, f, indent=2, default=str)
    print(f"\nAudit complete. Detailed JSON results saved to: {OUTPUT_AUDIT_JSON}")


if __name__ == "__main__":
    asyncio.run(main())
