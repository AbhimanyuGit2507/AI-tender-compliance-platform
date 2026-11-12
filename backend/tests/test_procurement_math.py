"""
BidKaro — Tests for Procurement Math Engine (Tier 0 — no DB, no LLM)
Run: pytest tests/test_procurement_math.py -v
"""
from datetime import datetime
import pytest

from app.services.procurement_math import (
    Project,
    calculate_average_turnover,
    calculate_bid_capacity,
    check_all_certificates,
    check_certificate_expiry,
    check_msme_exemption,
    check_similar_work,
)


# ── Similar Work Tests ────────────────────────────────────────────────

class TestSimilarWork:
    def test_rule_1x80_passes(self):
        """Single project ≥ 80% of ₹10 Cr = ₹8 Cr"""
        projects = [Project("Road A", 8_00_00_000, 2023)]
        result = check_similar_work(projects, 10_00_00_000, evaluation_year=2024)
        assert result.passes is True
        assert result.rule_triggered == "1x80"

    def test_rule_2x50_passes(self):
        """Two projects ≥ 50% of ₹10 Cr = ₹5 Cr each"""
        projects = [
            Project("Road A", 5_50_00_000, 2023),
            Project("Road B", 5_00_00_000, 2023),
        ]
        result = check_similar_work(projects, 10_00_00_000, evaluation_year=2024)
        assert result.passes is True
        assert result.rule_triggered == "2x50"

    def test_rule_3x40_passes(self):
        """Three projects ≥ 40% of ₹10 Cr = ₹4 Cr each"""
        projects = [
            Project("P1", 4_00_00_000, 2024),
            Project("P2", 4_50_00_000, 2024),
            Project("P3", 4_20_00_000, 2024),
        ]
        result = check_similar_work(projects, 10_00_00_000, evaluation_year=2024)
        assert result.passes is True
        assert result.rule_triggered == "3x40"

    def test_fails_when_all_too_small(self):
        """Projects too small for any rule"""
        projects = [Project("P1", 1_00_00_000, 2023)]
        result = check_similar_work(projects, 10_00_00_000, evaluation_year=2024)
        assert result.passes is False
        assert result.rule_triggered == "FAIL"

    def test_no_projects_fails(self):
        result = check_similar_work([], 10_00_00_000)
        assert result.passes is False

    def test_inflation_adjustment(self):
        """Old project gets inflated by 10%/year compound"""
        # ₹7 Cr project from 2020, evaluated in 2024 (4 years): 7 * 1.1^4 = ~10.24 Cr
        # Threshold for 1x80 of ₹12 Cr = ₹9.6 Cr — should pass after inflation
        projects = [Project("Old Road", 7_00_00_000, 2020)]
        result = check_similar_work(projects, 12_00_00_000, evaluation_year=2024)
        assert result.passes is True


# ── Bid Capacity Tests ────────────────────────────────────────────────

class TestBidCapacity:
    def test_basic_capacity_calculation(self):
        """A=5Cr, N=2, k=2.0, B=0 → capacity = 20 Cr"""
        result = calculate_bid_capacity(
            max_annual_turnover_inr=5_00_00_000,
            contract_period_years=2,
            k_multiplier=2.0,
            ongoing_commitments_inr=0,
            tender_estimated_value_inr=15_00_00_000,
            enhancement_rate=0,  # no inflation for deterministic test
            turnover_year=2024,
            evaluation_year=2024,
        )
        assert result.bid_capacity_inr == pytest.approx(20_00_00_000, rel=1e-3)
        assert result.passes is True

    def test_fails_when_capacity_too_low(self):
        """B=15Cr eats into capacity"""
        result = calculate_bid_capacity(
            max_annual_turnover_inr=5_00_00_000,
            contract_period_years=2,
            k_multiplier=2.0,
            ongoing_commitments_inr=15_00_00_000,
            tender_estimated_value_inr=10_00_00_000,
            enhancement_rate=0,
            turnover_year=2024,
            evaluation_year=2024,
        )
        assert result.bid_capacity_inr == pytest.approx(5_00_00_000, rel=1e-3)
        assert result.passes is False


# ── Certificate Expiry Tests ──────────────────────────────────────────

class TestCertificateExpiry:
    def test_valid_certificate(self):
        expiry = datetime(2027, 1, 1)
        closing = datetime(2026, 10, 24)
        result = check_certificate_expiry("ISO 9001:2015", expiry, closing)
        assert result.is_valid is True
        assert result.days_remaining > 0

    def test_expired_certificate(self):
        expiry = datetime(2026, 9, 1)
        closing = datetime(2026, 10, 24)
        result = check_certificate_expiry("PWD Class-I", expiry, closing)
        assert result.is_valid is False
        assert result.days_remaining < 0

    def test_expiry_uses_closing_date_not_today(self):
        """Ensures we compare against closing date, not datetime.now()"""
        # Cert expired last year relative to today, but tender is in the past
        expiry = datetime(2025, 12, 31)
        past_closing = datetime(2025, 10, 1)  # Closing was before expiry
        result = check_certificate_expiry("ISO 14001", expiry, past_closing)
        assert result.is_valid is True  # Valid at closing date, even if expired now


# ── Turnover Average Tests ────────────────────────────────────────────

class TestTurnoverAverage:
    def test_three_year_average(self):
        data = {2023: 8.5, 2022: 7.2, 2021: 6.8}
        result = calculate_average_turnover(data, num_years=3)
        assert result["average"] == pytest.approx(7.5, rel=1e-3)

    def test_uses_only_latest_n_years(self):
        data = {2023: 10, 2022: 8, 2021: 6, 2020: 4}  # 4 years of data
        result = calculate_average_turnover(data, num_years=3)
        assert 2020 not in result["years_used"]
        assert result["average"] == pytest.approx(8.0, rel=1e-3)


# ── MSME Exemption Tests ──────────────────────────────────────────────

class TestMSMEExemption:
    def test_msme_exemption_works(self):
        result = check_msme_exemption("works", is_msme=True, is_startup=False, emd_amount_inr=100_000)
        assert result["emd_exempt"] is True
        assert result["emd_amount_inr"] == 0

    def test_startup_exempt_for_goods(self):
        result = check_msme_exemption("goods", is_msme=False, is_startup=True, emd_amount_inr=50_000)
        assert result["emd_exempt"] is True

    def test_startup_not_exempt_for_works(self):
        result = check_msme_exemption("works", is_msme=False, is_startup=True, emd_amount_inr=100_000)
        assert result["emd_exempt"] is False
        assert any("Works" in c for c in result["caveats"])


# ── Joint Venture (JV) Tests ──────────────────────────────────────────

class TestJointVenture:
    def test_jv_passing_qualification(self):
        from app.services.procurement_math import JVPartnerProfile, check_joint_venture_qualification

        lead = JVPartnerProfile(
            name="Shivalik Infra",
            equity_share_pct=51.0,
            turnover_inr=25_00_00_000,   # ₹25 Cr
            solvency_inr=10_00_00_000,   # ₹10 Cr
            largest_project_inr=18_00_00_000,
            ongoing_commitments_b=5_00_00_000,
            is_lead_partner=True,
        )
        partner = JVPartnerProfile(
            name="Apex Engineering",
            equity_share_pct=49.0,
            turnover_inr=15_00_00_000,   # ₹15 Cr
            solvency_inr=6_00_00_000,    # ₹6 Cr
            largest_project_inr=10_00_00_000,
            ongoing_commitments_b=2_00_00_000,
        )
        # Tender value ₹30 Cr, 2 years contract
        result = check_joint_venture_qualification(
            lead=lead,
            partner=partner,
            tender_value_inr=30_00_00_000,
            contract_period_years=2.0,
        )
        assert result.passes is True
        assert result.equity_split_valid is True
        assert result.combined_bid_capacity_pass is True
        assert len(result.disqualification_risks) == 0

    def test_jv_fails_on_lead_equity_below_50(self):
        from app.services.procurement_math import JVPartnerProfile, check_joint_venture_qualification

        lead = JVPartnerProfile(name="A", equity_share_pct=45.0, turnover_inr=20e7, solvency_inr=10e7, largest_project_inr=10e7)
        partner = JVPartnerProfile(name="B", equity_share_pct=55.0, turnover_inr=20e7, solvency_inr=10e7, largest_project_inr=10e7)
        result = check_joint_venture_qualification(lead=lead, partner=partner, tender_value_inr=30e7)
        assert result.passes is False
        assert result.equity_split_valid is False
        assert any("min 50" in r for r in result.disqualification_risks)


# ── Bank Guarantee & EMD Compliance Tests ──────────────────────────────

class TestBankGuaranteeCompliance:
    def test_bg_validity_adequate(self):
        from app.services.procurement_math import check_bank_guarantee_and_emd
        # Bid validity 120 days -> required 165 days. Given 180 days -> pass
        res = check_bank_guarantee_and_emd(
            tender_category="goods",
            emd_amount_inr=500_000,
            bid_validity_days=120,
            bg_validity_days=180,
        )
        assert res.passes is True
        assert res.required_validity_days == 165

    def test_bg_validity_too_short_fails(self):
        from app.services.procurement_math import check_bank_guarantee_and_emd
        # Given 150 days when 165 days required -> fails
        res = check_bank_guarantee_and_emd(
            tender_category="goods",
            emd_amount_inr=500_000,
            bid_validity_days=120,
            bg_validity_days=150,
        )
        assert res.passes is False
        assert res.is_validity_adequate is False
        assert any("DISQUALIFICATION RISK" in w for w in res.warnings)

    def test_civil_works_msme_trap_flagged(self):
        from app.services.procurement_math import check_bank_guarantee_and_emd
        res = check_bank_guarantee_and_emd(
            tender_category="works",
            emd_amount_inr=1_000_000,
            bid_validity_days=120,
            bg_validity_days=180,
            is_msme=True,
        )
        assert res.is_civil_works_trap is True
        assert res.passes is False
        assert "MSME_WORKS_EXEMPTION_TRAP" in res.verdict


# ── Commercial Leak Audit Tests ────────────────────────────────────────

class TestCommercialLeakAudit:
    def test_flags_price_quotes_in_technical_cover(self):
        from app.services.procurement_math import audit_cover1_commercial_leak
        leaky_text = "We propose to execute the road works with our equipment. Our financial bid price is ₹4,50,00,000/- for the complete scope."
        res = audit_cover1_commercial_leak(leaky_text)
        assert res.has_leak is True
        assert res.risk_level == "CRITICAL_DISQUALIFICATION_RISK"
        assert len(res.flagged_snippets) > 0

    def test_clean_technical_text_passes(self):
        from app.services.procurement_math import audit_cover1_commercial_leak
        clean_text = "The contractor will deploy 2 Nos. 50T Mobile Cranes and ensure concrete curing as per IS 456 specifications."
        res = audit_cover1_commercial_leak(clean_text)
        assert res.has_leak is False
        assert res.risk_level == "CLEAN"


# ── Corrigendum Impact Tests ──────────────────────────────────────────

class TestCorrigendumImpact:
    def test_completion_time_reduction_triggers_disqualification(self):
        from app.services.procurement_math import calculate_corrigendum_impact
        # Tender ₹25 Cr. Turnover ₹10 Cr/yr. Commitments ₹5 Cr.
        # Original: 24 months (N=2.0) -> Capacity = 2*10*2 - 5 = ₹35 Cr >= ₹25 Cr (PASS)
        # Corrigendum cuts to 12 months (N=1.0) -> Capacity = 2*10*1 - 5 = ₹15 Cr < ₹25 Cr (FAIL!)
        res = calculate_corrigendum_impact(
            original_tender_value=25_00_00_000,
            original_period_months=24.0,
            user_annual_turnover=10_00_00_000,
            user_ongoing_commitments=5_00_00_000,
            revised_period_months=12.0,
        )
        assert res.original_passes is True
        assert res.new_passes is False
        assert res.has_disqualification_impact is True
        assert res.delta_bid_capacity_inr == -20_00_00_000
        assert any("DISQUALIFICATION ALERT" in a for a in res.critical_alerts)

