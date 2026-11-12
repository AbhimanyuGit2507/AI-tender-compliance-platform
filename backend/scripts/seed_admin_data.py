"""
BidKaro — Admin Seed Script
Populates initial database-backed subscription plans and system settings if not already present.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import db_session
from app.models import SubscriptionPlan, SystemSetting

INITIAL_PLANS = [
    {
        "id": "single_pack",
        "name": "Single Tender Pass",
        "badge": "1 Full Tender",
        "price_inr": 199.0,
        "credits": 100,
        "effective_per_tender": "₹199 / tender",
        "features": [
            "Complete 1 full tender lifecycle from NIT screening to .DOCX bundle",
            "Stage 1: NIT & Commercial Red Flags Screening (15 Cr)",
            "Stage 2: Detailed Eligibility & Risk Audit (+25 Cr)",
            "Stage 3: Technical Proposal, Undertakings & Priced BOQ (+60 Cr)",
            "1 Corrigendum Impact Sync included",
        ],
        "is_popular": False,
        "is_active": True,
        "sort_order": 1,
    },
    {
        "id": "growth_pack",
        "name": "Active Bidder 5-Tender Pack",
        "badge": "Most Popular · 50% Off",
        "price_inr": 499.0,
        "credits": 500,
        "effective_per_tender": "₹99.8 / tender",
        "features": [
            "Complete 5 full tender lifecycles (₹99/tender effective)",
            "Unlimited Corrigendum Side-by-Side Clause Diffs",
            "Priority OCR for Scanned/State PWD Annexures",
            "1-Click Pre-Bid Relaxation Request Generator",
            "Direct .DOCX & .XLSX Export Bundles with 0 Blockers",
        ],
        "is_popular": True,
        "is_active": True,
        "sort_order": 2,
    },
    {
        "id": "pro_contractor",
        "name": "Enterprise EPC 15-Tender Pack",
        "badge": "Best Value · 67% Off",
        "price_inr": 999.0,
        "credits": 1500,
        "effective_per_tender": "₹66.6 / tender",
        "features": [
            "Complete 15 full tenders (₹66/tender effective)",
            "Shared Multi-User Company Qualification Vault",
            "Custom Joint Venture (JV) Partner Split Calculator",
            "Two-Layer Final Bid Audit & Clause Verification",
            "Direct Priority EPC Support Line",
        ],
        "is_popular": False,
        "is_active": True,
        "sort_order": 3,
    },
]

INITIAL_SETTINGS = [
    {
        "key": "economics.stage_costs",
        "category": "economics",
        "description": "Progressive 3-Stage Delta Credit pricing and free allowances",
        "value_json": {
            "stage1": 15,
            "stage2_delta": 25,
            "stage3_delta": 60,
            "free_trial_credits": 25,
            "daily_free_discount": 15,
        },
    },
    {
        "key": "economics.guest_trial",
        "category": "economics",
        "description": "Public guest trial screening thresholds",
        "value_json": {
            "daily_free_limit": 1,
            "window_hours": 24,
            "max_pages": 50,
            "enabled": True,
        },
    },
    {
        "key": "ai.routing",
        "category": "ai",
        "description": "LLM model routing and generation parameters",
        "value_json": {
            "primary_provider": "groq",
            "secondary_provider": "openrouter",
            "active_model": "llama-3.3-70b-versatile",
            "temperature": 0.1,
            "max_tokens": 4096,
        },
    },
    {
        "key": "system.governance",
        "category": "governance",
        "description": "Global operational flags and service switches",
        "value_json": {
            "maintenance_mode": False,
            "maintenance_banner": "",
            "allow_signups": True,
            "brevo_live_email": True,
            "strict_gstin_check": False,
        },
    },
]


async def seed_data():
    print("Seeding dynamic admin plans and system settings...")
    async with db_session() as db:
        # 1. Seed plans
        for plan_data in INITIAL_PLANS:
            existing = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_data["id"]))
            if not existing.scalar_one_or_none():
                plan = SubscriptionPlan(**plan_data)
                db.add(plan)
                print(f"  + Added plan: {plan_data['name']} ({plan_data['id']})")
            else:
                print(f"  ~ Plan exists: {plan_data['id']}")

        # 2. Seed settings
        for setting_data in INITIAL_SETTINGS:
            existing = await db.execute(select(SystemSetting).where(SystemSetting.key == setting_data["key"]))
            if not existing.scalar_one_or_none():
                setting = SystemSetting(**setting_data)
                db.add(setting)
                print(f"  + Added system setting: {setting_data['key']}")
            else:
                print(f"  ~ Setting exists: {setting_data['key']}")

        await db.commit()
    print("Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())

