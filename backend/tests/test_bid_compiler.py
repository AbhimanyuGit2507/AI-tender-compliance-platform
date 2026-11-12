"""
BidKaro — Tests for Bid Compiler and Two-Layer Audit
Run: pytest backend/tests/test_bid_compiler.py -v
"""
import uuid
from datetime import datetime, timedelta
import pytest

from app.models import CompanyFact, Tender, TenderRequirement
from app.services.bid_compiler import BidCompilerService


@pytest.fixture
def sample_tender():
    return Tender(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        title="Construction of 4-Lane Bridge Over River Yamuna",
        reference_no="PWD/ND/2026/042",
        authority="Executive Engineer, PWD Division 1, New Delhi",
        closing_at=datetime(2026, 12, 31),
        estimated_value_inr=50_00_00_000.0,
        contract_period_years=2.0,
    )


class TestBidCompilerDeterministic:
    def test_generate_cover_letter(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        letter = compiler.generate_cover_letter(
            company_name="Apex Infrastructure Ltd",
            authorized_signatory="Rajesh Kumar",
            address="Plot 10, Okhla Phase 3, New Delhi",
        )
        assert "Apex Infrastructure Ltd" in letter
        assert "PWD/ND/2026/042" in letter
        assert "Construction of 4-Lane Bridge" in letter
        assert "Rajesh Kumar" in letter
        assert "120 days" in letter

    def test_generate_non_blacklisting(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        affidavit = compiler.generate_non_blacklisting_undertaking(
            company_name="Apex Infrastructure Ltd",
            authorized_signatory="Rajesh Kumar",
        )
        assert "AFFIDAVIT / DECLARATION REGARDING NON-BLACKLISTING" in affidavit
        assert "Apex Infrastructure Ltd" in affidavit
        assert "debarred, blacklisted, or suspended" in affidavit

    def test_generate_bid_validity(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        decl = compiler.generate_bid_validity_declaration("Apex Infrastructure Ltd")
        assert "NO DEVIATIONS" in decl
        assert "120 days" in decl

    def test_generate_experience_table(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        projects = [
            {"name": "Highway Bypass NH-48", "client": "NHAI", "value_inr": 45_00_00_000, "completion_year": 2024},
            {"name": "Flyover at Janakpuri", "client": "Delhi PWD", "value_inr": 32_00_00_000, "completion_year": 2023},
        ]
        table = compiler.generate_experience_table("Apex Infrastructure Ltd", projects)
        assert "Highway Bypass NH-48" in table
        assert "NHAI" in table
        assert "45.00 Cr" in table
        assert "Flyover at Janakpuri" in table

    def test_compile_to_docx_bytes(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        sections = {
            "cover_letter": compiler.generate_cover_letter("Apex", "Rajesh", "Delhi"),
            "non_blacklisting": compiler.generate_non_blacklisting_undertaking("Apex", "Rajesh"),
        }
        raw_bytes = compiler.compile_to_docx(sections, "Apex Infrastructure Ltd")
        assert len(raw_bytes) > 100
        assert isinstance(raw_bytes, bytes)


class TestTwoLayerAudit:
    @pytest.mark.asyncio
    async def test_audit_catches_unresolved_action_placeholders(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        sections = {
            "cover_letter": "Valid cover letter text here with proper format.",
            "non_blacklisting": "Valid text.",
            "bid_validity": "Valid declaration.",
            "tech_methodology": "We will deploy crane [[ACTION REQUIRED: Enter Crane Model]] for lifting.",
        }
        findings = await compiler.run_two_layer_audit(
            sections=sections,
            requirements=[],
            company_facts=[],
            corrigenda_count=0,
        )
        assert any("ACTION REQUIRED" in f.issue for f in findings)
        assert any(f.severity == "critical" for f in findings)

    @pytest.mark.asyncio
    async def test_audit_catches_expired_certificate(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        sections = {
            "cover_letter": "Valid cover letter.",
            "non_blacklisting": "Valid non blacklisting.",
            "bid_validity": "Valid bid validity.",
        }
        # Tender closing is 2026-12-31, certificate expires 2026-10-01 (before closing)
        expired_fact = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=sample_tender.tenant_id,
            fact_category="certification",
            fact_key="ISO 9001:2015",
            raw_value="ISO Certificate",
            valid_until=datetime(2026, 10, 1),
        )
        findings = await compiler.run_two_layer_audit(
            sections=sections,
            requirements=[],
            company_facts=[expired_fact],
            corrigenda_count=0,
        )
        assert any("ISO 9001:2015" in f.clause_ref and "expires on" in f.issue for f in findings)

    @pytest.mark.asyncio
    async def test_audit_catches_unacknowledged_corrigendum(self, sample_tender):
        compiler = BidCompilerService(sample_tender.tenant_id, sample_tender)
        sections = {
            "cover_letter": "Standard cover letter with clean submission text.",
            "non_blacklisting": "Standard affidavit.",
            "bid_validity": "Standard declaration.",
        }
        findings = await compiler.run_two_layer_audit(
            sections=sections,
            requirements=[],
            company_facts=[],
            corrigenda_count=2,
        )
        assert any("Corrigendum" in f.issue for f in findings)
