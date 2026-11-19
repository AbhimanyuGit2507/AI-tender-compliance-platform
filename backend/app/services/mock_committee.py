"""
BidKaro — Adversarial Mock Tender Committee Defense Room
Simulates an Indian Public Works Scrutiny Committee (Superintending Engineer & Chief Vigilance Officer)
interrogating the contractor on their weakest qualifications and potential disqualification grounds.
Cost target: ~₹0.60 per turn (Fast Text Tier 1 / Groq 70B).
"""
from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from typing import Any

import structlog

from app.models import CompanyFact, Tender
from app.services.llm_router import LLMTier, get_llm_router

logger = structlog.get_logger(__name__)


@dataclass
class CommitteeInterrogationTurn:
    committee_persona: str
    interrogation_question: str
    disqualification_risk_level: str  # "LOW" | "MODERATE" | "CRITICAL"
    scrutinized_vulnerability: str
    suggested_contractor_remediation: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class MockTenderCommitteeDefenseRoom:
    """Simulates adversarial tender scrutiny committee interrogation rounds."""

    def __init__(self, tenant_id: uuid.UUID, tender: Tender, company_facts: list[CompanyFact]):
        self.tenant_id = tenant_id
        self.tender = tender
        self.company_facts = company_facts

    async def conduct_interrogation(
        self,
        contractor_response: str = "",
        chat_history: list[dict[str, str]] | None = None,
    ) -> CommitteeInterrogationTurn:
        """Generates an aggressive committee challenge based on contractor's dossier and past turns."""
        router = get_llm_router()

        facts_summary = "\n".join([
            f"- [{f.fact_category}] {f.fact_key}: {f.raw_value}"
            for f in self.company_facts[:10]
        ]) or "Contractor general qualification profile."

        dialogue_history = ""
        if chat_history:
            dialogue_history = "\n".join([
                f"{turn.get('role', 'user').upper()}: {turn.get('content', '')}"
                for turn in chat_history[-4:]
            ])

        prompt = f"""You are the Chairman of the Technical Tender Scrutiny Committee (Superintending Engineer, CPWD/PWD).
You are evaluating a contractor bidding for:
Tender: "{self.tender.title}" (Ref: {self.tender.reference_no})
Estimated Cost: ₹{self.tender.estimated_value_inr or 0:,.0f}

Contractor's Verified Credentials in Dossier:
{facts_summary}

Previous Committee Dialogue:
{dialogue_history or 'Initial opening scrutiny round.'}

Contractor's Latest Defense / Response:
"{contractor_response or 'Contractor has submitted bid documents and is awaiting technical opening.'}"

YOUR MISSION AS SCRUTINY COMMITTEE:
1. Drill down into potential technical disqualifiers:
   - Does past similar work experience match 100% of required scope or only partial civil sub-items?
   - Is there any gap in financial turnover compound annual inflation calculation?
   - Are plant & machinery assets owned directly or hired on unverified lease agreements?
2. Challenge the contractor with a rigorous, formal Indian procurement question.
3. Suggest the exact documentary remediation (e.g., supplementary affidavit on stamp paper).

Reply in valid JSON:
{{
  "committee_persona": "Er. V. K. Sharma (Superintending Engineer & Member Secretary, Tender Evaluation Board)",
  "interrogation_question": "Formal, rigorous scrutiny question...",
  "disqualification_risk_level": "LOW" | "MODERATE" | "CRITICAL",
  "scrutinized_vulnerability": "Exact vulnerability being interrogated...",
  "suggested_contractor_remediation": "Concrete documentary fix..."
}}"""

        try:
            resp = await router.generate(
                tier=LLMTier.FAST_TEXT,
                prompt=prompt,
                system_prompt="You are a strict Indian Public Procurement Scrutiny Committee Chief. Return valid JSON only.",
                response_json=True,
                operation_type="mock_committee",
                tenant_id=self.tenant_id,
                tender_id=self.tender.id,
            )
            data = json.loads(resp.text)
            return CommitteeInterrogationTurn(
                committee_persona=data.get("committee_persona", "Er. V. K. Sharma (Superintending Engineer)"),
                interrogation_question=data.get("interrogation_question", "Please clarify if your similar work certificate includes testing and commissioning."),
                disqualification_risk_level=data.get("disqualification_risk_level", "MODERATE"),
                scrutinized_vulnerability=data.get("scrutinized_vulnerability", "Verification of past work completion certificate scope."),
                suggested_contractor_remediation=data.get("suggested_contractor_remediation", "Provide certified copy of final completion certificate from the client executive engineer."),
            )
        except Exception as e:
            logger.warning("mock_committee_fallback", error=str(e))
            return CommitteeInterrogationTurn(
                committee_persona="Er. V. K. Sharma (Superintending Engineer, Technical Scrutiny Committee)",
                interrogation_question="The committee notes your similar work certificate from 2023. Does the executed scope include the specified specialized piling works, or was that portion executed by another agency?",
                disqualification_risk_level="MODERATE",
                scrutinized_vulnerability="Scope alignment in similar works certificate.",
                suggested_contractor_remediation="Submit certified extract of the bill of quantities from the completed project showing specialized piling items.",
            )

