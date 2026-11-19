"""
BidKaro — Real-Time Pre-Bid Executive Voice Briefing Service
Generates concise, high-impact audio scripts and bidirectional session configurations
for the Gemini Live API / TTS pre-bid rehearsal copilot.
Cost target: ~₹3.10/min (5-min audio defense = ₹15.50 max).
"""
from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass
from typing import Any

from app.models import CorrigendumChange, Tender
from app.services.procurement_math import calculate_bid_capacity


@dataclass
class PreBidVoiceBriefingScript:
    tender_id: str
    tender_title: str
    estimated_cost_cr: float
    capacity_cleared: bool
    calculated_capacity_cr: float
    required_capacity_cr: float
    corrigenda_count: int
    audio_briefing_text: str
    duration_estimate_seconds: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class PreBidVoiceBriefingService:
    """Generates executive audio briefing summaries for contractor directors on the move."""

    def __init__(self, tender: Tender, corrigenda: list[CorrigendumChange]):
        self.tender = tender
        self.corrigenda = corrigenda

    def generate_briefing_script(
        self,
        max_turnover_cr: float = 25.0,
        commitments_cr: float = 12.0,
    ) -> PreBidVoiceBriefingScript:
        """Computes procurement math and drafts the 60-second executive voice transcript."""
        est_val = float(self.tender.estimated_value_inr or 50_00_00_000.0)
        est_cr = float(est_val / 10_000_000.0)
        years = float(self.tender.contract_period_years or 2.0)

        # Run statutory 2AN - B capacity
        cap_res = calculate_bid_capacity(
            max_annual_turnover_inr=max_turnover_cr * 10_000_000.0,
            contract_period_years=years,
            k_multiplier=2.0,
            ongoing_commitments_inr=commitments_cr * 10_000_000.0,
            tender_estimated_value_inr=est_val,
        )
        calculated_cr = cap_res.bid_capacity_inr / 10_000_000.0

        corr_count = len(self.corrigenda)
        corr_alert = f"Take note: {corr_count} corrigenda have been issued for this tender." if corr_count else "No corrigenda modifications detected."

        script = (
            f"Good day. Here is your executive pre-bid briefing for {self.tender.title or 'the tender'}. "
            f"The estimated contract value is ₹{est_cr:.2f} Crores with a completion period of {years:.1f} years. "
            f"Your calculated available bid capacity under the CPWD formula is ₹{calculated_cr:.2f} Crores, "
            f"which {'comfortably clears' if cap_res.passes else 'falls short of'} the required ₹{est_cr:.2f} Crores. "
            f"{corr_alert} "
            f"All standard statutory affidavits and technical methodologies are prepared. "
            f"Please verify that your physical bank guarantee for EMD is counter-signed before portal submission."
        )

        return PreBidVoiceBriefingScript(
            tender_id=str(self.tender.id),
            tender_title=self.tender.title or "Tender",
            estimated_cost_cr=round(est_cr, 2),
            capacity_cleared=cap_res.passes,
            calculated_capacity_cr=round(calculated_cr, 2),
            required_capacity_cr=round(est_cr, 2),
            corrigenda_count=corr_count,
            audio_briefing_text=script,
            duration_estimate_seconds=45,
        )
