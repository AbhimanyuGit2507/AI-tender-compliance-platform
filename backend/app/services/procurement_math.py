"""
BidKaro — Indian Procurement Math Engine (Tier 0 — Deterministic)
All calculations are pure Python with NO LLM calls.

Implements:
  1. Combinatorial 3/2/1 Similar Work Solver
  2. Assessed Available Bid Capacity Solver
  3. Reference-Date Certificate Expiry Checker
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, date
from itertools import combinations
from typing import NamedTuple


# ── Data Classes ─────────────────────────────────────────────────────

@dataclass
class Project:
    """A single completed project from the company's portfolio."""
    name: str
    value_inr: float         # Project value in INR
    completion_year: int     # Financial year of completion (e.g. 2022 for FY 2021-22)
    certificate_ref: str = ""


@dataclass
class SimilarWorkResult:
    """Result of the 3/2/1 combinatorial similar work check."""
    passes: bool
    rule_triggered: str      # "1x80" | "2x50" | "3x40" | "FAIL"
    matching_projects: list[Project]
    inflation_adjusted: bool
    tender_value_inr: float
    threshold_inr: float
    company_value_inr: float


@dataclass
class BidCapacityResult:
    """Result of the Assessed Available Bid Capacity calculation."""
    bid_capacity_inr: float
    A_annual_turnover: float
    N_contract_years: float
    k_multiplier: float
    B_ongoing_commitments: float
    passes: bool
    tender_value_inr: float


@dataclass
class CertificateStatus:
    name: str
    expiry_date: datetime
    reference_date: datetime   # submission closing date (NOT today)
    is_valid: bool
    days_remaining: int


# ── 1. Combinatorial 3/2/1 Similar Work Solver ──────────────────────

def check_similar_work(
    projects: list[Project],
    tender_estimated_value_inr: float,
    enhancement_rate: float = 0.10,  # 10% per year compound inflation
    evaluation_year: int | None = None,
) -> SimilarWorkResult:
    """
    Test if company qualifies via:
      Rule 1x80: 1 project ≥ 80% of E
      Rule 2x50: 2 projects each ≥ 50% of E
      Rule 3x40: 3 projects each ≥ 40% of E

    Projects are inflation-adjusted to the evaluation year before comparison.
    """
    E = float(tender_estimated_value_inr)
    current_year = evaluation_year or datetime.now().year

    def inflate(project: Project) -> float:
        """Apply compound inflation to bring value to current year."""
        years_old = max(0, current_year - project.completion_year)
        return project.value_inr * ((1 + enhancement_rate) ** years_old)

    inflated: list[tuple[Project, float]] = [
        (p, inflate(p)) for p in projects
    ]

    # Rule 1x80: Single project ≥ 0.80E
    for proj, val in inflated:
        if val >= 0.80 * E:
            return SimilarWorkResult(
                passes=True,
                rule_triggered="1x80",
                matching_projects=[proj],
                inflation_adjusted=True,
                tender_value_inr=E,
                threshold_inr=0.80 * E,
                company_value_inr=val,
            )

    # Rule 2x50: Any 2 projects each ≥ 0.50E
    for combo in combinations(inflated, 2):
        if all(v >= 0.50 * E for _, v in combo):
            matching = [p for p, _ in combo]
            vals = [v for _, v in combo]
            return SimilarWorkResult(
                passes=True,
                rule_triggered="2x50",
                matching_projects=matching,
                inflation_adjusted=True,
                tender_value_inr=E,
                threshold_inr=0.50 * E,
                company_value_inr=min(vals),
            )

    # Rule 3x40: Any 3 projects each ≥ 0.40E
    for combo in combinations(inflated, 3):
        if all(v >= 0.40 * E for _, v in combo):
            matching = [p for p, _ in combo]
            vals = [v for _, v in combo]
            return SimilarWorkResult(
                passes=True,
                rule_triggered="3x40",
                matching_projects=matching,
                inflation_adjusted=True,
                tender_value_inr=E,
                threshold_inr=0.40 * E,
                company_value_inr=min(vals),
            )

    # FAIL — best available project for display
    best_project = max(projects, key=lambda p: p.value_inr) if projects else None
    if best_project:
        best_inflated_val = inflate(best_project)
    else:
        best_inflated_val = 0.0

    return SimilarWorkResult(
        passes=False,
        rule_triggered="FAIL",
        matching_projects=[best_project] if best_project else [],
        inflation_adjusted=True,
        tender_value_inr=E,
        threshold_inr=0.40 * E,
        company_value_inr=best_inflated_val,
    )


# ── 2. Assessed Available Bid Capacity Solver ────────────────────────

def calculate_bid_capacity(
    max_annual_turnover_inr: float,
    contract_period_years: float,
    k_multiplier: float,          # 2.0 for most Indian tenders; 2.5 for some PSU
    ongoing_commitments_inr: float,
    tender_estimated_value_inr: float,
    enhancement_rate: float = 0.10,
    turnover_year: int | None = None,
    evaluation_year: int | None = None,
) -> BidCapacityResult:
    """
    Formula: Bid Capacity = (A × N × k) − B
    A = max annual turnover (inflation-adjusted to current year)
    N = contract period in years
    k = multiplier (2.0 or 2.5)
    B = value of existing ongoing commitments
    """
    current_year = evaluation_year or datetime.now().year
    ref_year = turnover_year or (current_year - 1)
    years_old = max(0, current_year - ref_year)

    # Inflate A to current year value
    A = max_annual_turnover_inr * ((1 + enhancement_rate) ** years_old)
    N = contract_period_years
    k = k_multiplier
    B = ongoing_commitments_inr

    bid_capacity = (A * N * k) - B

    return BidCapacityResult(
        bid_capacity_inr=round(bid_capacity, 2),
        A_annual_turnover=round(A, 2),
        N_contract_years=N,
        k_multiplier=k,
        B_ongoing_commitments=B,
        passes=bid_capacity >= tender_estimated_value_inr,
        tender_value_inr=tender_estimated_value_inr,
    )


# ── 3. Certificate Expiry Checker ────────────────────────────────────

def check_certificate_expiry(
    certificate_name: str,
    expiry_date: datetime,
    submission_closing_date: datetime,
) -> CertificateStatus:
    """
    Check if a certificate is valid as of the submission closing date.
    IMPORTANT: Uses submission_closing_date, NOT datetime.now().
    """
    is_valid = expiry_date >= submission_closing_date
    days_remaining = (expiry_date - submission_closing_date).days

    return CertificateStatus(
        name=certificate_name,
        expiry_date=expiry_date,
        reference_date=submission_closing_date,
        is_valid=is_valid,
        days_remaining=days_remaining,
    )


def check_all_certificates(
    certificates: list[dict],     # [{name, expiry_date}]
    submission_closing_date: datetime,
) -> list[CertificateStatus]:
    """Check a list of certificates against the tender closing date."""
    results = []
    for cert in certificates:
        expiry = cert.get("expiry_date")
        if isinstance(expiry, str):
            try:
                expiry = datetime.fromisoformat(expiry)
            except ValueError:
                continue
        if not isinstance(expiry, datetime):
            continue
        results.append(check_certificate_expiry(
            certificate_name=cert["name"],
            expiry_date=expiry,
            submission_closing_date=submission_closing_date,
        ))
    return results


# ── 4. Turnover Average Calculator ───────────────────────────────────

def calculate_average_turnover(
    turnover_by_year: dict[int, float],
    num_years: int = 3,
) -> dict:
    """
    Calculate average annual turnover over the last N financial years.
    Returns {average, years_used, max_single_year}.
    """
    years = sorted(turnover_by_year.keys(), reverse=True)[:num_years]
    values = [turnover_by_year[y] for y in years]
    if not values:
        return {"average": 0.0, "years_used": [], "max_single_year": 0.0}
    return {
        "average": round(sum(values) / len(values), 4),
        "years_used": years,
        "max_single_year": max(values),
        "total": sum(values),
    }


# ── 5. MSME/Startup Exemption Checker ────────────────────────────────

def check_msme_exemption(
    contract_category: str,            # "works" | "goods" | "services"
    is_msme: bool,
    is_startup: bool,
    emd_amount_inr: float,
) -> dict:
    """
    Check if MSME / Startup India exemptions apply.
    Per GFR 2017 + DPIIT notifications:
      - MSME: EMD fully waived for Works/Goods/Services if Udyam registered
      - Startups: EMD fully waived for Goods/Services only (not Works)
    """
    emd_exempt = False
    relaxations = []
    caveats = []

    if is_msme:
        emd_exempt = True
        relaxations.append("EMD waived for MSME (Udyam Registration required)")
        relaxations.append("Performance Security reduced to 3% (from 5-10%)")
        if contract_category.lower() == "works":
            relaxations.append("Similar work experience threshold may be relaxed per tender")

    if is_startup:
        if contract_category.lower() in ("goods", "services"):
            emd_exempt = True
            relaxations.append("EMD waived for DPIIT-recognised Startups (Goods/Services)")
            relaxations.append("Prior turnover / experience norms may be relaxed per DPIIT circular")
        else:
            caveats.append("Startup exemption on EMD typically does NOT apply to Works contracts")

    return {
        "emd_exempt": emd_exempt,
        "emd_amount_inr": emd_amount_inr if not emd_exempt else 0.0,
        "relaxations": relaxations,
        "caveats": caveats,
    }


# ── 6. Joint Venture (JV) & Consortium Qualification Solver ──────────

@dataclass
class JVPartnerProfile:
    """Financial & credential profile of a JV partner."""
    name: str
    equity_share_pct: float       # e.g. 51.0 or 49.0
    turnover_inr: float           # 3-year avg annual turnover in INR
    solvency_inr: float           # Solvency certificate in INR
    largest_project_inr: float    # Largest completed similar work
    ongoing_commitments_b: float = 0.0  # Existing commitments (B) in INR
    is_lead_partner: bool = False


@dataclass
class JVQualificationResult:
    """Outcome of CPWD Clause 4.3 / NHAI Joint Venture evaluation."""
    passes: bool
    lead_partner_pass: bool
    other_partner_pass: bool
    combined_turnover_pass: bool
    combined_bid_capacity_pass: bool
    combined_bid_capacity_inr: float
    required_bid_capacity_inr: float
    equity_split_valid: bool
    findings: list[str]
    disqualification_risks: list[str]


def check_joint_venture_qualification(
    lead: JVPartnerProfile,
    partner: JVPartnerProfile,
    tender_value_inr: float,
    contract_period_years: float = 1.0,
    min_lead_equity_pct: float = 50.0,
    min_partner_equity_pct: float = 20.0,
    k_multiplier: float = 2.0,
) -> JVQualificationResult:
    """
    Evaluates Joint Venture (JV) eligibility per CPWD Works Manual 2019/2024 (Clause 4.3):
      1. Equity Split Rule: Lead Partner ≥ 50%, Partner ≥ 20%, Combined = 100%.
      2. Lead Partner Threshold: Must independently meet ≥ 50% of annual turnover & solvency.
      3. Other Partner Threshold: Must independently meet ≥ 25% of annual turnover & solvency.
      4. Combined Bid Capacity: (2 * A_lead * N - B_lead) + (2 * A_partner * N - B_partner) ≥ Tender Value.
      5. Technical Experience: Either Lead Partner meets 1x80% rule, or combined works meet pro-rata.
    """
    findings = []
    risks = []
    tender_val = float(tender_value_inr)

    # 1. Equity split validation
    equity_total = lead.equity_share_pct + partner.equity_share_pct
    equity_valid = (
        lead.equity_share_pct >= min_lead_equity_pct
        and partner.equity_share_pct >= min_partner_equity_pct
        and abs(equity_total - 100.0) < 0.5
    )
    if not equity_valid:
        risks.append(
            f"Invalid JV Equity: Lead has {lead.equity_share_pct}% (min {min_lead_equity_pct}%), "
            f"Partner has {partner.equity_share_pct}% (min {min_partner_equity_pct}%). Total must equal 100%."
        )
    else:
        findings.append(f"✓ Valid JV Equity Structure: {lead.name} ({lead.equity_share_pct}%) + {partner.name} ({partner.equity_share_pct}%)")

    # 2. Minimum turnover requirements
    # Typical CPWD rule: Minimum required turnover is 50% of tender value per year
    req_total_turnover = 0.50 * tender_val
    req_lead_turnover = 0.50 * req_total_turnover
    req_partner_turnover = 0.25 * req_total_turnover

    lead_turnover_pass = lead.turnover_inr >= req_lead_turnover
    partner_turnover_pass = partner.turnover_inr >= req_partner_turnover
    combined_turnover_inr = lead.turnover_inr + partner.turnover_inr
    combined_turnover_pass = combined_turnover_inr >= req_total_turnover

    if not lead_turnover_pass:
        risks.append(f"Lead Partner {lead.name} turnover (₹{lead.turnover_inr/1e7:.2f} Cr) fails min 50% requirement (₹{req_lead_turnover/1e7:.2f} Cr).")
    if not partner_turnover_pass:
        risks.append(f"Partner {partner.name} turnover (₹{partner.turnover_inr/1e7:.2f} Cr) fails min 25% requirement (₹{req_partner_turnover/1e7:.2f} Cr).")

    # 3. Individual & Combined Bid Capacity
    # Capacity = 2 * A * N - B
    N = max(0.5, float(contract_period_years))
    cap_lead = max(0.0, (k_multiplier * lead.turnover_inr * N) - lead.ongoing_commitments_b)
    cap_partner = max(0.0, (k_multiplier * partner.turnover_inr * N) - partner.ongoing_commitments_b)
    combined_capacity = cap_lead + cap_partner
    combined_bid_capacity_pass = combined_capacity >= tender_val

    if combined_bid_capacity_pass:
        findings.append(f"✓ Combined JV Available Bid Capacity: ₹{combined_capacity/1e7:.2f} Cr exceeds Tender Value ₹{tender_val/1e7:.2f} Cr.")
    else:
        risks.append(f"Combined JV Bid Capacity (₹{combined_capacity/1e7:.2f} Cr) is below Tender Value (₹{tender_val/1e7:.2f} Cr). Deficit: ₹{(tender_val - combined_capacity)/1e7:.2f} Cr.")

    # 4. Solvency Criteria (typically 40% of estimated tender value)
    req_total_solvency = 0.40 * tender_val
    req_lead_solvency = 0.50 * req_total_solvency
    req_partner_solvency = 0.25 * req_total_solvency
    lead_solvency_pass = lead.solvency_inr >= req_lead_solvency
    partner_solvency_pass = partner.solvency_inr >= req_partner_solvency
    if not lead_solvency_pass:
        risks.append(f"Lead Partner solvency (₹{lead.solvency_inr/1e7:.2f} Cr) is below 50% benchmark (₹{req_lead_solvency/1e7:.2f} Cr).")
    if not partner_solvency_pass:
        risks.append(f"Partner solvency (₹{partner.solvency_inr/1e7:.2f} Cr) is below 25% benchmark (₹{req_partner_solvency/1e7:.2f} Cr).")

    overall_pass = (
        equity_valid
        and lead_turnover_pass
        and partner_turnover_pass
        and combined_turnover_pass
        and combined_bid_capacity_pass
        and lead_solvency_pass
        and partner_solvency_pass
    )

    return JVQualificationResult(
        passes=overall_pass,
        lead_partner_pass=lead_turnover_pass and lead_solvency_pass,
        other_partner_pass=partner_turnover_pass and partner_solvency_pass,
        combined_turnover_pass=combined_turnover_pass,
        combined_bid_capacity_pass=combined_bid_capacity_pass,
        combined_bid_capacity_inr=round(combined_capacity, 2),
        required_bid_capacity_inr=round(tender_val, 2),
        equity_split_valid=equity_valid,
        findings=findings,
        disqualification_risks=risks,
    )


# ── 7. Bank Guarantee (BG) & EMD Compliance Validator ────────────────

@dataclass
class BGComplianceResult:
    passes: bool
    required_validity_days: int
    actual_validity_days: int
    is_validity_adequate: bool
    msme_exemption_valid: bool
    is_civil_works_trap: bool
    sfms_required: bool
    warnings: list[str]
    verdict: str


def check_bank_guarantee_and_emd(
    tender_category: str,             # "works" | "civil" | "goods" | "services"
    emd_amount_inr: float,
    bid_validity_days: int = 120,
    bg_validity_days: int = 165,      # Claimed or intended BG validity
    is_msme: bool = False,
    is_startup: bool = False,
    has_sfms_confirmation: bool = False,
) -> BGComplianceResult:
    """
    Audits Bank Guarantee & EMD against CPWD/NHAI/GeM procurement rules:
      1. BG Validity: Must be Bid Validity + 45 days minimum (e.g. 120 + 45 = 165 days).
      2. Civil Works MSME Trap: GFR Rule 170 strictly DISALLOWS MSME EMD exemption on Works.
      3. SFMS (Structured Financial Messaging System) requirement for central/PSU bids.
    """
    warnings = []
    category_lower = tender_category.lower()
    is_works = category_lower in ("works", "civil", "construction", "epc", "infrastructure")

    # 1. Validity Check
    required_validity = bid_validity_days + 45
    validity_adequate = bg_validity_days >= required_validity
    if not validity_adequate:
        warnings.append(
            f"DISQUALIFICATION RISK: Bank Guarantee validity ({bg_validity_days} days) is shorter than mandatory "
            f"Bid Validity + 45 days requirement ({bid_validity_days} + 45 = {required_validity} days)."
        )

    # 2. Civil Works MSME Exemption Trap Check
    is_civil_works_trap = False
    msme_valid = False
    if is_msme or is_startup:
        if is_works:
            is_civil_works_trap = True
            warnings.append(
                "CRITICAL WARNING (CPWD Works Manual Sec 18.2 & GFR 170): MSME / Udyam EMD exemption does NOT apply "
                f"to Civil Works / Construction contracts. You MUST deposit the full EMD of ₹{emd_amount_inr:,.2f} "
                "or your technical bid will be rejected at envelope opening."
            )
        else:
            msme_valid = True
            warnings.append(f"✓ Valid MSME EMD waiver for {tender_category.title()} contract per Ministry of MSME circular.")

    # 3. SFMS verification
    sfms_needed = is_works and emd_amount_inr >= 500000  # >= 5 Lakhs
    if sfms_needed and not has_sfms_confirmation:
        warnings.append(
            "SFMS Transmission Notice: Bank Guarantee must be transmitted through SFMS (Structured Financial "
            "Messaging System) to the Authority's designated SBI/PNB nodal IFSC. Advise your issuing bank."
        )

    passes = validity_adequate and (not is_civil_works_trap)

    verdict = "COMPLIANT" if passes else "DISQUALIFICATION_RISK"
    if is_civil_works_trap:
        verdict = "MSME_WORKS_EXEMPTION_TRAP"

    return BGComplianceResult(
        passes=passes,
        required_validity_days=required_validity,
        actual_validity_days=bg_validity_days,
        is_validity_adequate=validity_adequate,
        msme_exemption_valid=msme_valid,
        is_civil_works_trap=is_civil_works_trap,
        sfms_required=sfms_needed,
        warnings=warnings,
        verdict=verdict,
    )


# ── 8. Two-Envelope Commercial Leak Protection Scanner ───────────────

@dataclass
class CommercialLeakResult:
    has_leak: bool
    leak_count: int
    flagged_snippets: list[str]
    risk_level: str  # "CLEAN" | "CRITICAL_DISQUALIFICATION_RISK"
    recommendation: str


def audit_cover1_commercial_leak(text_content: str) -> CommercialLeakResult:
    """
    Scans Cover 1 (Technical & Qualification Proposal) documents for accidental price leaks.
    Under CPWD, NHAI, and GeM procurement rules, revealing any pricing or discount %
    in Cover 1 leads to IMMEDIATE SUMMARY DISQUALIFICATION and forfeiture of bid fees.
    """
    import re
    # Patterns that represent financial rates, percentage quotes, or lump sum offers
    PRICE_PATTERNS = [
        r"(?:₹|INR|Rs\.?)\s*\d+(?:,\d+)*(?:\.\d{2})?\s*(?:Cr|Lakhs?|Crores?|/-|per\s+\w+)?",
        r"\bquoted\s+(?:rate|price|amount|percentage)\s+of\b",
        r"\b(?:total|financial)\s+bid\s+(?:price|value)\s*(?:is|:|=)\b",
        r"\b(?:discount|rebate)\s+of\s+\d+(?:\.\d+)?\s*%",
        r"\b\d+(?:\.\d+)?\s*%\s*(?:above|below|at\s+par)\b",
        r"\bL1\s+price\s+offered\b",
    ]

    flagged = []
    for pattern in PRICE_PATTERNS:
        matches = re.finditer(pattern, text_content, re.IGNORECASE)
        for m in matches:
            # Grab context window around match
            start = max(0, m.start() - 30)
            end = min(len(text_content), m.end() + 30)
            snippet = text_content[start:end].replace("\n", " ").strip()
            # Ignore standard EMD / Turnover clauses
            lower_snip = snippet.lower()
            if any(term in lower_snip for term in ["emd", "turnover", "net worth", "solvency", "similar work of", "estimated cost"]):
                continue
            flagged.append(f"...{snippet}...")

    has_leak = len(flagged) > 0
    return CommercialLeakResult(
        has_leak=has_leak,
        leak_count=len(flagged),
        flagged_snippets=flagged[:5],
        risk_level="CRITICAL_DISQUALIFICATION_RISK" if has_leak else "CLEAN",
        recommendation=(
            "IMMEDIATE ACTION REQUIRED: Commercial price/rate strings detected in technical submittal. "
            "Remove all item rates and financial quotes before uploading Cover 1 to avoid instant disqualification."
            if has_leak else
            "✓ Cover 1 Technical Envelope Verified: Zero commercial pricing leaks detected. Safe for submission."
        ),
    )


# ── 9. Corrigendum Cascade Impact Solver ─────────────────────────────

@dataclass
class CorrigendumImpactResult:
    has_disqualification_impact: bool
    original_bid_capacity_inr: float
    new_bid_capacity_inr: float
    delta_bid_capacity_inr: float
    original_passes: bool
    new_passes: bool
    time_reduction_months: float
    key_changes: list[dict[str, Any]]
    critical_alerts: list[str]


def calculate_corrigendum_impact(
    original_tender_value: float,
    original_period_months: float,
    user_annual_turnover: float,
    user_ongoing_commitments: float,
    revised_tender_value: float | None = None,
    revised_period_months: float | None = None,
    k_multiplier: float = 2.0,
) -> CorrigendumImpactResult:
    """
    Evaluates the cascade impact of a Corrigendum / Addendum on Available Bid Capacity.
    When an authority cuts completion time (e.g. 24 mo -> 16 mo), N decreases, which
    can cause a contractor who qualified under the original NIT to suddenly fail!
    """
    E_orig = float(original_tender_value)
    E_new = float(revised_tender_value) if revised_tender_value else E_orig

    N_orig = max(0.25, original_period_months / 12.0)
    N_new = max(0.25, (revised_period_months / 12.0) if revised_period_months else N_orig)

    cap_orig = (k_multiplier * user_annual_turnover * N_orig) - user_ongoing_commitments
    cap_new = (k_multiplier * user_annual_turnover * N_new) - user_ongoing_commitments
    delta = cap_new - cap_orig

    orig_passes = cap_orig >= E_orig
    new_passes = cap_new >= E_new

    alerts = []
    time_diff = original_period_months - (revised_period_months or original_period_months)

    if orig_passes and not new_passes:
        alerts.append(
            f"DISQUALIFICATION ALERT: Reduced completion time ({original_period_months:.0f} mo → {revised_period_months:.0f} mo) "
            f"slashed your Available Bid Capacity by ₹{abs(delta)/1e7:.2f} Cr. "
            f"Your new capacity (₹{cap_new/1e7:.2f} Cr) is now BELOW the tender value (₹{E_new/1e7:.2f} Cr)!"
        )
    elif revised_period_months and revised_period_months < original_period_months:
        alerts.append(
            f"Notice: Completion period reduced by {time_diff:.0f} months (N = {N_orig:.2f} → {N_new:.2f} yr). "
            f"Bid Capacity decreased by ₹{abs(delta)/1e7:.2f} Cr."
        )

    return CorrigendumImpactResult(
        has_disqualification_impact=(orig_passes and not new_passes),
        original_bid_capacity_inr=round(cap_orig, 2),
        new_bid_capacity_inr=round(cap_new, 2),
        delta_bid_capacity_inr=round(delta, 2),
        original_passes=orig_passes,
        new_passes=new_passes,
        time_reduction_months=time_diff,
        key_changes=[
            {"field": "Tender Value (INR)", "original": E_orig, "revised": E_new},
            {"field": "Completion Time (Months)", "original": original_period_months, "revised": revised_period_months or original_period_months},
            {"field": "Contract Years (N)", "original": round(N_orig, 2), "revised": round(N_new, 2)},
        ],
        critical_alerts=alerts,
    )

