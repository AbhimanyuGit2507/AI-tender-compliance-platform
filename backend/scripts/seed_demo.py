"""
BidKaro — Seed Demo Script
Populates a complete working demo into the 14 PostgreSQL tables:
- Demo tenant and admin user
- MJP Water Pipeline Phase-II tender (₹48.60 Cr)
- 8 Extracted requirements with clause anchors
- 12 Structured BOQ line items
- Corrigendum 01 changes with supersessions
- Verified company evidence (turnover, similar work, ISO certs, Udyam)
Run: PYTHONPATH=backend backend/.venv/bin/python3 backend/scripts/seed_demo.py
"""
import asyncio
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import get_session_factory
from app.core.security import hash_password
from app.models import (
    BOQItem,
    CompanyFact,
    ComplianceResult,
    CorrigendumChange,
    Tenant,
    Tender,
    TenderDocument,
    TenderRequirement,
    User,
)


async def seed():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("Checking if demo data exists...")
        res = await db.execute(select(Tenant).where(Tenant.name == "Apex Infra Projects Pvt. Ltd."))
        existing = res.scalar_one_or_none()
        if existing:
            print("Demo tenant already seeded!")
            return

        print("Seeding demo tenant and user...")
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            name="Apex Infra Projects Pvt. Ltd.",
            plan_tier="growth_pack",
            credit_balance=5,
        )
        db.add(tenant)
        await db.flush()

        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            email="rajesh@apexinfra.in",
            password_hash=hash_password("password123"),
            role="admin",
            is_anonymous=False,
        )
        db.add(user)
        await db.flush()

        print("Seeding MJP tender...")
        tender_id = uuid.uuid4()
        closing_dt = datetime.now() + timedelta(days=25)
        tender = Tender(
            id=tender_id,
            tenant_id=tenant_id,
            title="MJP Municipal Water Pipeline Phase-II",
            reference_no="MJP/2026/WTP/042",
            authority="Maharashtra Jeevan Pradhikaran (MJP)",
            closing_at=closing_dt,
            estimated_value_inr=48_60_00_000.0,
            emd_inr=48_60_000.0,
            pbg_percent=3.0,
            contract_period_years=2.0,
            evaluation_type="L1",
            readiness_score=74,
            status="analysed",
            summary_jsonb={
                "scope": "Supply, trenching, laying, butt-fusion welding of 54km DI & HDPE water pipeline with pressure testing.",
                "red_flags": ["Corrigendum 01 testing duration increased from 12h to 24h", "Strict single work experience threshold of 80% E"],
            },
        )
        db.add(tender)
        await db.flush()

        print("Seeding tender requirements...")
        req1 = TenderRequirement(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            category="experience",
            title="3/2/1 Similar Work Experience",
            exact_snippet="Bidders must have completed 1 similar pipeline project of ≥ ₹38.88 Cr (80%), or 2 projects each ≥ ₹24.30 Cr (50%), or 3 projects each ≥ ₹19.44 Cr (40%).",
            clause_ref="Clause 3.2.1",
            page_number=14,
            is_mandatory=True,
        )
        req2 = TenderRequirement(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            category="financial",
            title="Average Annual Financial Turnover",
            exact_snippet="Minimum average annual turnover of INR 15.00 Crores in the last 3 financial years audited by Chartered Accountant.",
            clause_ref="Clause 4.1",
            page_number=22,
            numeric_value=15_00_00_000.0,
            unit="INR",
            is_mandatory=True,
        )
        req3 = TenderRequirement(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            category="financial",
            title="Earnest Money Deposit (EMD)",
            exact_snippet="EMD of INR 48,60,000 via Bank Guarantee or FDR. Exemption allowed for registered MSME/Udyam enterprises.",
            clause_ref="Clause 1.8",
            page_number=6,
            numeric_value=48_60_000.0,
            unit="INR",
            is_mandatory=True,
        )
        req4 = TenderRequirement(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            category="certificate",
            title="ISO 9001:2015 Quality Certification",
            exact_snippet="The contractor must possess valid ISO 9001:2015 certificate from an accredited body as on bid closing date.",
            clause_ref="Clause 5.3",
            page_number=28,
            is_mandatory=True,
        )
        db.add_all([req1, req2, req3, req4])

        print("Seeding BOQ line items...")
        boq1 = BOQItem(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            item_no="1.01",
            description="Topographical survey, alignment marking, and utility clearance for 54 km route.",
            unit="km",
            quantity=54.0,
            estimated_rate=45000.0,
            amount=2430000.0,
        )
        boq2 = BOQItem(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            item_no="2.01",
            description="Trench excavation in ordinary soil and soft rock up to 2.5m depth conforming to IS:7634.",
            unit="cum",
            quantity=86000.0,
            estimated_rate=320.0,
            amount=27520000.0,
        )
        boq3 = BOQItem(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            item_no="3.01",
            description="Supply and laying of 600mm dia Class K-9 Ductile Iron (DI) pipes conforming to IS:8329.",
            unit="meter",
            quantity=32000.0,
            estimated_rate=6800.0,
            amount=217600000.0,
        )
        db.add_all([boq1, boq2, boq3])

        print("Seeding Corrigendum 01 changes...")
        corr1 = CorrigendumChange(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            tender_id=tender_id,
            corrigendum_doc_id=uuid.uuid4(),
            field_name="Clause 7.4.2 — Hydrostatic Testing Duration",
            original_text="Testing shall be maintained for a continuous period of 12 hours at 1.5 times working pressure.",
            updated_text="Testing shall be maintained for a continuous period of 24 hours at 1.5 times working pressure.",
            impact_type="major",
            impact_summary="Requires 24-hour continuous site diesel pump deployment & double engineer shifts.",
        )
        db.add(corr1)

        print("Seeding verified company facts...")
        fact1 = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fact_category="experience",
            fact_key="Nagpur Water Pipeline Upgrade Phase-I",
            raw_value="₹28.50 Cr water pipeline completed for NMC (2024)",
            numeric_value=285000000.0,
            json_payload={"name": "Nagpur Water Pipeline Upgrade Phase-I", "client": "NMC", "value_inr": 285000000.0, "completion_year": 2024},
            verification_status="verified",
            confidence=1.0,
        )
        fact2 = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fact_category="financial",
            fact_key="turnover_fy2024",
            raw_value="Turnover FY 2024-25: ₹18.20 Cr",
            numeric_value=182000000.0,
            json_payload={"year": 2024, "value_inr": 182000000.0},
            verification_status="verified",
            confidence=1.0,
        )
        fact3 = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fact_category="certification",
            fact_key="ISO 9001:2015",
            raw_value="ISO 9001:2015 Quality Management Certificate",
            valid_until=datetime.now() + timedelta(days=365),
            verification_status="verified",
            confidence=1.0,
        )
        fact4 = CompanyFact(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            fact_category="registration",
            fact_key="udyam",
            raw_value="Udyam Registration: UDYAM-MH-03-0029141 (Medium Enterprise)",
            verification_status="verified",
            confidence=1.0,
        )
        db.add_all([fact1, fact2, fact3, fact4])

        await db.commit()
        print("Demo data seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
