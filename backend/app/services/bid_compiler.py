"""
BidKaro — Section-by-Section Bid Compiler & Two-Layer Final Audit Service
Implements:
  1. Deterministic standard undertakings (Cover Letter, Non-Blacklisting, Bid Validity, Experience Table)
  2. Custom narrative sections (Technical Methodology, QC Plan, HSE Plan) with [[ACTION REQUIRED: ...]] placeholders
  3. Real docx binary generation (using python-docx)
  4. Two-Layer Final Audit (Layer A: Deterministic Checklist, Layer B: Semantic Consistency Audit)
"""
from __future__ import annotations

import io
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import structlog

from app.models import CompanyFact, GeneratedDocument, Tender, TenderDocument, TenderRequirement
from app.services.llm_router import LLMTier, get_llm_router

logger = structlog.get_logger(__name__)


# ── Audit Findings Data Class ────────────────────────────────────────

@dataclass
class AuditFindingItem:
    clause_ref: str
    issue: str
    severity: str  # "critical" | "warning" | "info"
    resolution: str

    def to_dict(self) -> dict[str, str]:
        return {
            "clause_ref": self.clause_ref,
            "issue": self.issue,
            "severity": self.severity,
            "resolution": self.resolution,
        }


# ── Bid Compiler Service ─────────────────────────────────────────────

class BidCompilerService:
    def __init__(self, tenant_id: uuid.UUID, tender: Tender):
        self.tenant_id = tenant_id
        self.tender = tender

    # ── 1. Deterministic Undertaking Generators ───────────────────────

    def generate_cover_letter(self, company_name: str, authorized_signatory: str, address: str) -> str:
        """Standard formal cover letter to Tender Inviting Authority."""
        date_str = datetime.now().strftime("%d-%B-%Y")
        ref_no = self.tender.reference_no or "Tender Ref: Not Specified"
        title = self.tender.title or "Untitled Tender"
        authority = self.tender.authority or "The Executive Engineer / Tender Inviting Authority"

        return f"""
FORM - A: COVERING LETTER FOR TENDER SUBMISSION
(To be printed on Bidder's Official Letterhead)

Date: {date_str}

To,
{authority}

Sub: Submission of Techno-Commercial Bid for: "{title}"
Ref: Tender Notice / NIT No: {ref_no}

Dear Sir/Madam,

1. Having examined the tender documents, GCC, SCC, Technical Specifications, and Addenda/Corrigenda issued by your authority, we, {company_name}, hereby submit our complete and unconditional bid for the execution of the subject works in strict accordance with the terms and conditions outlined in the RFP/NIT.

2. We confirm that our bid remains valid for a period of 120 days from the date of opening of technical bids, or as stipulated in the tender documents, and shall remain binding upon us.

3. We have enclosed the required Earnest Money Deposit (EMD) / Bid Security Declaration in the prescribed format.

4. We solemnly affirm that all statements, documents, and technical credentials submitted herein are true, complete, and verifiable from original records.

Yours faithfully,
For {company_name}

_____________________________
(Authorized Signatory)
Name: {authorized_signatory or "[[ACTION REQUIRED: Enter Authorized Signatory Name]]"}
Designation: [[ACTION REQUIRED: Enter Signatory Designation]]
Official Seal & Stamp
Address: {address or "[[ACTION REQUIRED: Enter Registered Company Address]]"}
""".strip()

    def generate_non_blacklisting_undertaking(self, company_name: str, authorized_signatory: str) -> str:
        """Formal Non-Blacklisting / Debarment Affidavit."""
        ref_no = self.tender.reference_no or "the NIT"
        authority = self.tender.authority or "Central/State Government Departments"

        return f"""
AFFIDAVIT / DECLARATION REGARDING NON-BLACKLISTING
(To be executed on Non-Judicial Stamp Paper of appropriate value and duly notarized)

I, {authorized_signatory or "[[ACTION REQUIRED: Enter Deponent Name]]"}, aged about [[ACTION REQUIRED: Enter Age]] years, residing at [[ACTION REQUIRED: Enter Residential Address]], do hereby solemnly affirm and state as follows:

1. That I am the Authorized Signatory of M/s {company_name} (hereinafter referred to as the "Bidder") and am competent to swear this affidavit on its behalf.

2. That the Bidder has not been debarred, blacklisted, or suspended by any Central / State Government Department, Public Sector Undertaking (PSU), Autonomous Body, or Urban Local Body from participating in public tenders as on the date of submission of this tender ({ref_no}).

3. That no partner, director, or promoter of the Bidder has ever been convicted by a court of law for fraud, corruption, or criminal offences related to business operations.

4. That if this declaration is found to be false or incorrect at any stage, the Employer/Tender Inviting Authority ({authority}) shall have full right to cancel our bid, forfeit the EMD/Performance Security, and initiate appropriate legal proceedings.

DEPONENT
For M/s {company_name}

VERIFICATION:
Verified at [[ACTION REQUIRED: Place]] on this {datetime.now().strftime("%d day of %B, %Y")} that the contents of paragraphs 1 to 4 are true and correct to the best of my knowledge and belief. No part is false and nothing material has been concealed.

DEPONENT
Duly Attested by Notary Public
""".strip()

    def generate_bid_validity_declaration(self, company_name: str) -> str:
        """Bid Validity & Acceptance of GCC/SCC."""
        ref_no = self.tender.reference_no or "NIT"
        return f"""
DECLARATION OF UNCONDITIONAL ACCEPTANCE & BID VALIDITY
(On Bidder's Letterhead)

To,
{self.tender.authority or "Tender Inviting Authority"}

Tender Reference: {ref_no}
Title: {self.tender.title}

1. We hereby certify that we have thoroughly read and understood all clauses of the General Conditions of Contract (GCC), Special Conditions of Contract (SCC), Technical Specifications, and all Corrigenda / Addenda published for this tender.

2. We confirm that our bid contains NO DEVIATIONS or reservations whatsoever. Any deviation appearing in our submission shall be deemed null, void, and withdrawn.

3. We explicitly accept the defect liability period, liquidated damages schedule, milestone delivery conditions, and payment milestones specified in the tender.

4. Our bid shall remain strictly valid for acceptance for a period of 120 days from technical bid opening.

For {company_name}
Authorized Signatory & Seal
""".strip()

    def generate_experience_table(self, company_name: str, past_projects: list[dict[str, Any]]) -> str:
        """Generate structured Past Similar Work Experience Table."""
        lines = [
            f"SUMMARY OF SIMILAR COMPLETED WORKS — M/s {company_name}",
            "═" * 80,
            f"{'No.':<4} {'Project Name / Scope':<32} {'Client / Authority':<22} {'Value (₹ Cr)':<12} {'Year':<6}",
            "─" * 80,
        ]

        if not past_projects:
            lines.append("No projects found in verified company facts. [[ACTION REQUIRED: Add past projects in Profile]]")
        else:
            for idx, p in enumerate(past_projects, 1):
                name = (p.get("name") or "Project")[:30]
                client = (p.get("client") or "Govt / PSU")[:20]
                val_cr = p.get("value_inr", 0) / 1_00_00_000
                year = str(p.get("completion_year") or p.get("year") or "N/A")
                lines.append(f"{idx:<4} {name:<32} {client:<22} ₹{val_cr:>7.2f} Cr   {year:<6}")

        lines.append("─" * 80)
        lines.append("Note: Attested copies of Work Orders, Agreements, and Completion Certificates attached in Annexure-E.")
        return "\n".join(lines)

    def generate_form_b_turnover(
        self,
        company_name: str,
        turnover_by_year: dict[str, float] | None = None,
        net_worth_inr: float = 0.0,
        solvency_inr: float = 0.0,
    ) -> str:
        """CPWD Form B: Financial Information & Statutory Auditor Certificate with CA UDIN."""
        years = turnover_by_year or {
            "2023-24": 0.0,
            "2022-23": 0.0,
            "2021-22": 0.0,
        }
        avg_turnover = sum(years.values()) / max(len(years), 1)

        lines = [
            "FORM - B: FINANCIAL INFORMATION & ANNUAL TURNOVER",
            "(To be certified by a Practicing Chartered Accountant on official letterhead with valid UDIN)",
            "",
            f"Name of Bidder: M/s {company_name}",
            f"Tender Reference: {self.tender.reference_no or 'NIT'}",
            f"Work: {self.tender.title or 'Public Procurement'}",
            "",
            "1. ANNUAL FINANCIAL TURNOVER (LAST 3 FINANCIAL YEARS):",
            "═" * 70,
            f"{'Financial Year':<20} {'Gross Annual Turnover (₹ In Lacs)':<30} {'Net Worth (₹ In Lacs)':<20}",
            "─" * 70,
        ]
        for yr, val in years.items():
            lines.append(f"{yr:<20} ₹{(val / 100000):>15.2f} Lacs      ₹{(net_worth_inr / 100000):>10.2f} Lacs")
        lines.extend([
            "─" * 70,
            f"Average Annual Turnover (3 Years): ₹{(avg_turnover / 100000):.2f} Lacs (₹{(avg_turnover / 10000000):.2f} Cr)",
            f"Bank Solvency Certificate Amount: ₹{(solvency_inr / 100000):.2f} Lacs (₹{(solvency_inr / 10000000):.2f} Cr)",
            "",
            "2. STATUTORY AUDITOR / CHARTERED ACCOUNTANT CERTIFICATE:",
            "We have audited the books of accounts of M/s " + company_name + " and verify that the financial",
            "turnover and net worth stated above are true, complete, and derived from audited balance sheets.",
            "",
            "Signature & Seal of Chartered Accountant:",
            "Name of CA: [[ACTION REQUIRED: Enter CA Name]]",
            "Membership No: [[ACTION REQUIRED: Enter ICAI Membership No]]",
            "Firm Registration No (FRN): [[ACTION REQUIRED: Enter FRN]]",
            "Unique Document Identification Number (UDIN): [[ACTION REQUIRED: Mandatory CA UDIN Number]]",
            f"Date: {datetime.now().strftime('%d-%B-%Y')}",
        ])
        return "\n".join(lines)

    def generate_form_c_past_works(
        self,
        company_name: str,
        project_name: str,
        client_name: str,
        actual_value_inr: float,
        stipulated_date: str = "As per Agreement",
        actual_completion_date: str = "Actual Date",
    ) -> str:
        """CPWD Form C: Performance Report of Works Referred to in Form A & B."""
        return f"""
FORM - C: PERFORMANCE REPORT OF WORKS REFERRED TO IN FORM A & B
(To be issued by the Employer / Officer not below the rank of Executive Engineer or Project Director)

1. Name of Work / Project: {project_name}
2. Agreement / Work Order No: [[ACTION REQUIRED: Enter Agreement No]]
3. Client / Employer Organization: {client_name}
4. Tendered / Estimated Cost: [[ACTION REQUIRED: Enter Tendered Cost]]
5. Value of Work Actually Completed: ₹{actual_value_inr / 1_00_00_000:.2f} Crores (₹{actual_value_inr:,.2f})
6. Stipulated Date of Commencement: [[ACTION REQUIRED: Date of Start]]
7. Stipulated Date of Completion: {stipulated_date}
8. Actual Date of Physical Completion: {actual_completion_date}
9. Amount of Compensation / Liquidated Damages Levied (if any): NIL
10. Performance Quality Rating: [x] Outstanding  [ ] Very Good  [ ] Good
11. Declaration: The work was completed satisfactorily without any arbitration, pending litigation, or debarment.

Dated: {datetime.now().strftime('%d-%B-%Y')}
Place: [[ACTION REQUIRED: Place]]

_______________________________________________
Signature of Executive Engineer / Officer-in-Charge
(With Official Seal, Designation, and Phone/Email)
""".strip()

    def generate_form_d_machinery(self, company_name: str, equipment_list: list[str]) -> str:
        """CPWD Form D: Details of Plant & Heavy Construction Equipment Proposed to be Deployed."""
        lines = [
            "FORM - D: PLANT & MACHINERY DEPLOYMENT SCHEDULE",
            f"Bidder: M/s {company_name} | Tender: {self.tender.title or 'NIT'}",
            "═" * 75,
            f"{'No.':<4} {'Equipment / Machine Description':<35} {'Qty':<6} {'Ownership (Owned/Leased)':<20} {'Condition':<10}",
            "─" * 75,
        ]
        if not equipment_list:
            lines.append("No verified machinery in vault. [[ACTION REQUIRED: Add deployed fleet in Company Vault]]")
        else:
            for idx, eq in enumerate(equipment_list, 1):
                lines.append(f"{idx:<4} {eq[:33]:<35} {'1 No':<6} {'Owned by Bidder':<20} {'Good / Working':<10}")
        lines.extend([
            "─" * 75,
            "We hereby commit that the above machinery shall be mobilized to site within 15 days of Letter of Acceptance (LoA).",
            f"For M/s {company_name}",
            "Authorized Signatory & Seal",
        ])
        return "\n".join(lines)

    def generate_form_e_ongoing_works(self, company_name: str, commitments: list[dict[str, Any]]) -> str:
        """CPWD Form E: Existing Commitments and Ongoing Works (Formula Parameter B in 2xAxN - B)."""
        lines = [
            "FORM - E: EXISTING COMMITMENTS & ONGOING WORKS",
            f"Bidder: M/s {company_name} | Assessed Available Bid Capacity Parameter B",
            "═" * 80,
            f"{'No.':<4} {'Description of Work':<30} {'Employer':<16} {'Value (₹ Cr)':<12} {'Balance Value':<14}",
            "─" * 80,
        ]
        total_balance = 0.0
        if not commitments:
            lines.append("1    Ongoing Civil & Road Works      Govt / PWD       ₹ 0.00 Cr    ₹ 0.00 Cr (NIL)")
        else:
            for idx, c in enumerate(commitments, 1):
                desc = (c.get("description") or "Ongoing Work")[:28]
                emp = (c.get("employer") or "Govt")[:14]
                val = c.get("value_inr", 0.0) / 1e7
                bal = c.get("balance_inr", 0.0) / 1e7
                total_balance += c.get("balance_inr", 0.0)
                lines.append(f"{idx:<4} {desc:<30} {emp:<16} ₹{val:>6.2f} Cr   ₹{bal:>6.2f} Cr")
        lines.extend([
            "─" * 80,
            f"Total Value of Remaining Commitments to be executed (Factor B): ₹{total_balance / 1e7:.2f} Crores",
            "Certified that the above list of ongoing commitments is complete and true to the best of my knowledge.",
            f"For M/s {company_name}",
            "Authorized Signatory",
        ])
        return "\n".join(lines)

    def generate_form_f_jv_agreement(
        self,
        lead_partner_name: str,
        lead_equity_pct: float,
        other_partner_name: str,
        other_equity_pct: float,
    ) -> str:
        """CPWD Form F: Joint Venture (JV) / Consortium Agreement & Equity Proforma."""
        ref_no = self.tender.reference_no or "the NIT"
        return f"""
FORM - F: MEMORANDUM OF UNDERSTANDING / JOINT VENTURE (JV) AGREEMENT
(To be executed on Non-Judicial Stamp Paper of ₹100/- and duly notarized)

This Joint Venture Agreement is entered into on this {datetime.now().strftime('%d day of %B, %Y')} between:
1. M/s {lead_partner_name} (having {lead_equity_pct}% share and designated as the "LEAD PARTNER")
   AND
2. M/s {other_partner_name} (having {other_equity_pct}% share and designated as the "JV PARTNER")

WHEREAS the Tender Inviting Authority ({self.tender.authority or 'Employer'}) has invited bids for:
"{self.tender.title or 'Tender'}" (Ref No: {ref_no}).

NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:
1. The Parties have formed a Joint Venture named "M/s {lead_partner_name} - {other_partner_name} JV" strictly for participating in this tender.
2. M/s {lead_partner_name} shall be the LEAD PARTNER and is authorized to sign all documents, incur liabilities, and receive payments and instructions for and on behalf of the JV.
3. The financial and work responsibility share of the JV shall strictly be:
   - Lead Partner ({lead_partner_name}): {lead_equity_pct}%
   - JV Partner ({other_partner_name}): {other_equity_pct}%
4. Both Parties shall be jointly and severally liable to the Employer for the execution of the contract in accordance with the contract terms.
5. Neither party shall withdraw from the JV during the bid validity period or during execution of the contract if awarded.

IN WITNESS WHEREOF, the authorized representatives have executed this Agreement:

For M/s {lead_partner_name} (Lead Partner)          For M/s {other_partner_name} (JV Partner)
________________________________________            ________________________________________
Authorized Signatory                                Authorized Signatory
Name: [[ACTION REQUIRED: Lead Signatory]]          Name: [[ACTION REQUIRED: Partner Signatory]]
Designation: Managing Director                      Designation: Partner / Director
Official Seal                                       Official Seal
""".strip()

    # ── 2. Narrative Section Generation with LLM Router ──────────────

    async def generate_technical_methodology(
        self,
        company_name: str,
        corrigenda_notes: list[str],
        verified_equipment: list[str],
    ) -> str:
        """
        Generate Technical Methodology prose using Tier 3 Reasoning / Tier 1 Fast Text.
        Injects active corrigendum requirements (e.g. revised testing hours).
        Uses [[ACTION REQUIRED: ...]] placeholders for unverified details.
        """
        router = get_llm_router()

        corrigendum_context = "\n".join(f"- {c}" for c in corrigenda_notes) if corrigenda_notes else "No active corrigenda."
        equip_context = ", ".join(verified_equipment) if verified_equipment else "None verified yet."

        prompt = f"""You are the Chief Technical Bid Writer & Principal Procurement Engineer for an Indian EPC/infrastructure contractor.
Write a comprehensive, exhaustive, submission-ready 'Technical Methodology and Work Execution Plan' for the following government tender:

Tender Title: {self.tender.title}
Tender Reference: {self.tender.reference_no}
Authority: {self.tender.authority}
Contract Period: {self.tender.contract_period_years or 1.0} Years
Estimated Value: ₹{(self.tender.estimated_value_inr or 0) / 1_00_00_000:.2f} Crores

Active Corrigendum Rules (MUST BE STRICTLY INCORPORATED):
{corrigendum_context}

Bidder Company: {company_name}
Verified Equipment in Fleet: {equip_context}

MANDATORY STRUCTURAL REQUIREMENTS:
1. Divide into detailed numbered sections with technical depth:
   1.0 Executive Overview, Understanding of Scope & Site Conditions
   2.0 Mobilization Schedule, Topographical Survey & Site Layout Plan
   3.0 Detailed Construction & Execution Methodology (Sequenced engineering steps with plant deployment)
   4.0 Resource Deployment Plan (Matching verified fleet machinery, key project manager & technical staff)
   5.0 Milestone CPM/PERT Work Schedule & Real-Time Monitoring Mechanism
   6.0 Traffic Diversion, Utility Relocation & Public Safety Protocols (if urban/linear work)
   7.0 Environmental Management, Dust Mitigation & Noise Abatement
2. Explicitly cite relevant Indian Standards (IS), Indian Roads Congress (IRC), or MoRTH specifications.
3. Incorporate all Corrigendum provisions explicitly with clause citations.
4. ZERO HALLUCINATION POLICY: If an essential machine (e.g. 50T Batching Plant, Piling Rig) or key certified personnel is not in the verified fleet list, insert a strict placeholder formatted exactly as: [[ACTION REQUIRED: Provide equipment/personnel details for XYZ]]. NEVER invent fictitious machine registration numbers or fake employee credentials.
5. Tone: Highly technical, authoritative, professional prose conforming to CPWD/NHAI/MES/State PWD tender evaluation committee expectations."""

        response = await router.generate(
            tier=LLMTier.TIER_3_REASONING,
            prompt=prompt,
            system_prompt="You are an expert Indian infrastructure Chief Bid Engineer drafting winning technical tender proposals.",
            operation_type="methodology",
            max_tokens=4000,
            temperature=0.2,
        )

        return response.text

    async def generate_qc_and_hse_plan(self, company_name: str, standard_codes: list[str]) -> str:
        """Generate Quality Control & Health, Safety, Environment Plan."""
        router = get_llm_router()
        codes_str = ", ".join(standard_codes) if standard_codes else "IS 456, IS 383, IRC:SP:84, MoRTH Section 900, ISO 9001:2015, ISO 45001:2018"

        prompt = f"""Write a comprehensive, professional 'Quality Assurance, Quality Control (QA/QC) and HSE Plan' for tender '{self.tender.title}'.
Bidder: {company_name}
Applicable Indian Standards / Technical Specifications: {codes_str}

Include the following structured sections:
1.0 QA/QC Management Architecture & Roles (Project Quality Manager, Lab In-charge, Site QA Engineers)
2.0 Inspection & Test Plan (ITP) Matrix:
   - Provide a structured table covering: Material/Work Item | Test Required | Frequency of Testing | Relevant IS/IRC Code | Acceptance Criteria
   - Include Concrete (slump, compressive cube strength at 7 & 28 days), Steel/Rebar (tensile, yield, bend/re-bend), Soil/Aggregate (CBR, gradation, moisture-density relation)
3.0 Non-Conformance Reporting (NCR) Procedure, Root Cause Analysis & Rectification Protocol
4.0 Health, Safety & Environmental Management System (HSE):
   - Zero Accident Vision & Tool-Box Talk (TBT) mandatory schedule
   - PPE Compliance Matrix & Site Barricading Guidelines
   - Emergency Response Plan, On-site First Aid, and Tie-up with Nearest Trauma Centers
5.0 Strict Verification: Use [[ACTION REQUIRED: Provide NABL laboratory accreditation number / safety officer qualification]] for unconfirmed items."""

        response = await router.generate(
            tier=LLMTier.TIER_3_REASONING,
            prompt=prompt,
            system_prompt="You are an Indian infrastructure QA/QC and HSE director drafting tender compliance plans conforming to CPWD and MoRTH standards.",
            max_tokens=3000,
            temperature=0.2,
        )

        return response.text

    # ── 3. DOCX Compilation ──────────────────────────────────────────

    def compile_to_docx(self, sections: dict[str, str], company_name: str) -> bytes:
        """
        Compile all bid sections into a formatted Word (.docx) document.
        Uses python-docx if installed, otherwise produces a structured text buffer.
        """
        try:
            import docx
            from docx.shared import Inches, Pt, RGBColor
            from docx.enum.text import WD_ALIGN_PARAGRAPH

            doc = docx.Document()

            # Set standard margins (1 inch)
            for section in doc.sections:
                section.top_margin = Inches(1)
                section.bottom_margin = Inches(1)
                section.left_margin = Inches(1)
                section.right_margin = Inches(1)

            # Header / Title
            p_title = doc.add_paragraph()
            p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run_title = p_title.add_run("BID SUBMISSION PACKAGE\n")
            run_title.bold = True
            run_title.font.size = Pt(18)
            run_title.font.name = "Arial"
            run_title.font.color.rgb = RGBColor(11, 31, 51)  # Primary Navy

            run_sub = p_title.add_run(f"Tender: {self.tender.title}\nRef No: {self.tender.reference_no or 'N/A'}\n")
            run_sub.font.size = Pt(12)
            run_sub.font.color.rgb = RGBColor(37, 99, 235)  # Primary Blue

            run_comp = p_title.add_run(f"Submitted by: {company_name}\nDate: {datetime.now().strftime('%d %B %Y')}")
            run_comp.font.size = Pt(11)
            run_comp.font.color.rgb = RGBColor(100, 116, 139)

            doc.add_page_break()

            # Sections
            for sec_title, sec_content in sections.items():
                # Section heading
                h = doc.add_heading(sec_title.replace("_", " ").title(), level=1)
                h.paragraph_format.space_before = Pt(14)
                h.paragraph_format.space_after = Pt(6)

                # Paragraphs
                for para in sec_content.split("\n\n"):
                    para_clean = para.strip()
                    if not para_clean:
                        continue
                    p = doc.add_paragraph()
                    p.paragraph_format.line_spacing = 1.15
                    p.paragraph_format.space_after = Pt(6)

                    # Highlight [[ACTION REQUIRED]] placeholders in red/bold
                    parts = re.split(r"(\[\[ACTION REQUIRED:.*?\]\])", para_clean)
                    for part in parts:
                        if part.startswith("[[ACTION REQUIRED"):
                            r = p.add_run(part)
                            r.bold = True
                            r.font.color.rgb = RGBColor(200, 58, 58)  # Critical Red
                        else:
                            p.add_run(part)

            buf = io.BytesIO()
            doc.save(buf)
            buf.seek(0)
            return buf.getvalue()

        except ImportError:
            # Fallback if python-docx is not installed in the lightweight environment
            logger.warning("python-docx not installed, using plain text document export")
            text_output = []
            text_output.append(f"BID SUBMISSION PACKAGE: {self.tender.title}")
            text_output.append(f"Reference: {self.tender.reference_no}")
            text_output.append(f"Bidder: {company_name}")
            text_output.append("=" * 80 + "\n")
            for title, content in sections.items():
                text_output.append(f"=== {title.upper()} ===")
                text_output.append(content)
                text_output.append("\n" + "-" * 80 + "\n")
            return "\n".join(text_output).encode("utf-8")

    # ── 4. Two-Layer Final Audit ──────────────────────────────────────

    async def run_two_layer_audit(
        self,
        sections: dict[str, str],
        requirements: list[TenderRequirement],
        company_facts: list[CompanyFact],
        corrigenda_count: int,
    ) -> list[AuditFindingItem]:
        """
        Two-Layer Pre-Submission Audit:
        Layer A: Deterministic programmatic checks (₹0.00 cost)
        Layer B: Semantic LLM audit for consistency and omissions
        """
        findings: list[AuditFindingItem] = []

        # ── Layer A: Deterministic Checks ─────────────────────────────
        full_text = " ".join(sections.values())

        # Check 1: Action Required Placeholders
        placeholders = re.findall(r"\[\[ACTION REQUIRED:(.*?)\]\]", full_text)
        if placeholders:
            findings.append(AuditFindingItem(
                clause_ref="General Bid Package",
                issue=f"Found {len(placeholders)} unresolved [[ACTION REQUIRED]] placeholder(s) in the bid documents.",
                severity="critical",
                resolution="Fill in all highlighted action tags before generating the final signed submission.",
            ))

        # Check 2: Mandatory Undertakings Present
        required_undertakings = ["cover_letter", "non_blacklisting", "bid_validity"]
        for u in required_undertakings:
            if u not in sections or len(sections[u].strip()) < 50:
                findings.append(AuditFindingItem(
                    clause_ref="Submission Checklist",
                    issue=f"Mandatory section '{u.replace('_', ' ').title()}' is missing or incomplete.",
                    severity="critical",
                    resolution=f"Compile and include the '{u}' section.",
                ))

        # Check 3: Certificate Expiry vs Tender Closing Date
        closing_dt = self.tender.closing_at or datetime.now()
        for fact in company_facts:
            if fact.fact_category == "certification" and fact.valid_until:
                if fact.valid_until < closing_dt:
                    findings.append(AuditFindingItem(
                        clause_ref=fact.fact_key,
                        issue=f"Certificate '{fact.fact_key}' expires on {fact.valid_until.strftime('%d-%b-%Y')}, which is before tender closing date ({closing_dt.strftime('%d-%b-%Y')}).",
                        severity="critical",
                        resolution="Renew certificate or obtain official extension letter before bid opening.",
                    ))

        # Check 4: Corrigendum Acknowledgment
        if corrigenda_count > 0:
            acknowledged = "corrigend" in full_text.lower() or "addend" in full_text.lower()
            if not acknowledged:
                findings.append(AuditFindingItem(
                    clause_ref="Corrigendum Compliance",
                    issue=f"Tender has {corrigenda_count} Corrigendum/Addendum published, but no explicit Corrigendum acknowledgment was found in the text.",
                    severity="warning",
                    resolution="Ensure all corrigenda are signed, stamped, and referenced in the cover letter.",
                ))

        # Check 5: Two-Envelope Commercial Leak Protection (Cover 1 Disqualification Shield)
        from app.services.procurement_math import audit_cover1_commercial_leak, check_bank_guarantee_and_emd
        leak_res = audit_cover1_commercial_leak(full_text)
        if leak_res.has_leak:
            findings.append(AuditFindingItem(
                clause_ref="Two-Envelope Commercial Leak",
                issue=f"CRITICAL DISQUALIFICATION RISK: {leak_res.leak_count} commercial rate/price references detected in Cover 1 technical documents: {' '.join(leak_res.flagged_snippets[:2])}",
                severity="critical",
                resolution="Indian public tenders (CPWD/GeM/NHAI) immediately disqualify bidders who mention rates or prices in Cover 1. Remove all financial quotes from technical narrative.",
            ))

        # Check 6: Civil Works MSME EMD Exemption Audit
        tender_cat = getattr(self.tender, "category", "works") or "works"
        raw_emd = getattr(self.tender, "emd_inr", 0.0) or getattr(self.tender, "emd_amount_inr", 0.0) or 0.0
        bg_check = check_bank_guarantee_and_emd(
            tender_category=tender_cat,
            emd_amount_inr=float(raw_emd),
            is_msme=True,  # Test worst case if company has MSME tag
        )
        if bg_check.is_civil_works_trap and "msme" in full_text.lower() and "exemption" in full_text.lower():
            findings.append(AuditFindingItem(
                clause_ref="EMD MSME Compliance",
                issue="Civil Works MSME Disqualification Trap: Text references MSME EMD waiver for a Works contract.",
                severity="critical",
                resolution="Per GFR Rule 170 and CPWD Works Manual Section 18.2, MSME EMD waivers do NOT apply to Works contracts. You must deposit full EMD/BG.",
            ))

        # ── Layer B: Semantic Audit (Tier 3 Deep Reasoning) ───────────
        if requirements:
            try:
                router = get_llm_router()
                # Audit up to 40 mandatory and technical requirements across all disciplines
                req_sample = [
                    f"- [{r.category.upper() if r.category else 'GENERAL'}] Clause {r.clause_ref or 'N/A'}: {r.title} ({r.exact_snippet[:250]})"
                    for r in requirements[:40]
                ]
                audit_prompt = f"""You are the Lead Procurement Quality & Legal Auditor reviewing an EPC contractor's bid submission before tender portal upload.
Tender: {self.tender.title}
Reference: {self.tender.reference_no}

Perform an exhaustive compliance audit comparing the drafted Technical Methodology against these mandatory tender requirements:
{chr(10).join(req_sample)}

Drafted Methodology Text:
{sections.get('tech_methodology', 'No methodology provided')[:8000]}

Drafted QA/QC & HSE Plan Excerpt:
{sections.get('qc_plan', '')[:3000]}

AUDIT OBJECTIVES:
1. Identify any direct conflicts with mandatory technical specifications, IS codes, or testing frequencies.
2. Flag any omitted mandatory work items or equipment mobilization commitments.
3. Check for unaddressed active corrigenda provisions.
4. If all specifications are fully satisfied without technical contradiction, reply 'ALL CRITERIA VERIFIED'.
Otherwise, provide a concise, actionable bullet list of potential disqualifiers and exact remediation instructions."""

                resp = await router.generate(
                    tier=LLMTier.TIER_3_REASONING,
                    prompt=audit_prompt,
                    system_prompt="You are a strict Indian procurement auditor. Flag technical discrepancies and non-compliance that could cause bid rejection.",
                    operation_type="audit",
                    max_tokens=1500,
                    temperature=0.1,
                )

                if "ALL CRITERIA VERIFIED" not in resp.text:
                    findings.append(AuditFindingItem(
                        clause_ref="Technical Scope & Specs",
                        issue="Semantic Audit Warning: Potential scope or testing requirement discrepancies detected.",
                        severity="warning",
                        resolution=resp.text.strip(),
                    ))

            except Exception as e:
                logger.warning("layer_b_semantic_audit_failed", error=str(e))

        return findings
