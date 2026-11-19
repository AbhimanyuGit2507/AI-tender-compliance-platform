"""
BidKaro — Unit & Integration Tests for Next-Gen Agentic Capabilities
Tests:
  1. 10,000-Run Monte Carlo Price-to-Win Simulator
  2. Selective Visual Drawing & Blueprint Detector
  3. Precedence-Aware Statutory Clause Graph (Corrigenda > SCC > GCC)
  4. Real-Time Pre-Bid Executive Voice Briefing Service
  5. Adversarial Mock Tender Committee Defense Room
  6. Advanced AI API Endpoints (/api/advanced/*)
"""
import io
import uuid
from datetime import datetime
import fitz  # PyMuPDF
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_session_factory
from app.core.security import create_access_token
from app.main import create_app
from app.models import CompanyFact, CorrigendumChange, Tenant, Tender, TenderRequirement, User
from app.services.clause_graph import StatutoryClauseGraphEngine
from app.services.mock_committee import MockTenderCommitteeDefenseRoom
from app.services.monte_carlo_ptw import MonteCarloPriceToWinSimulator
from app.services.visual_drawing_detector import VisualDrawingDetector
from app.services.voice_briefing import PreBidVoiceBriefingService

app = create_app()
db_session = get_session_factory()


@pytest.fixture
def test_tender():
    return Tender(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        title="Construction of Multi-Span Flyover on Ring Road",
        reference_no="PWD/FLY/2026/088",
        authority="Executive Engineer, PWD Central Division",
        estimated_value_inr=60_00_00_000.0,  # 60 Cr
        contract_period_years=2.0,
    )


class TestMonteCarloPTW:
    def test_simulation_convergence_and_alb_threshold(self):
        sim = MonteCarloPriceToWinSimulator(
            estimated_value_inr=50_00_00_000.0,
            contractor_base_cost_inr=42_00_00_000.0,
            authority_mean_discount=0.14,
            authority_std_dev=0.035,
            competitors=6,
            simulations=5_000,
        )
        res = sim.run_simulation()

        assert res.estimated_cost_inr == 50_00_00_000.0
        assert res.contractor_base_cost_inr == 42_00_00_000.0
        assert 0.0 <= res.optimal_rebate_percent <= 25.0
        assert res.optimal_bid_value_inr < 50_00_00_000.0
        assert res.win_probability_at_optimal > 0.0
        assert res.alb_threshold_rebate_percent == 15.0
        assert res.alb_threshold_inr == 50_00_00_000.0 * 0.85
        assert len(res.curve_points) > 10

        # Check ALB danger flag on points with rebate > 15%
        for p in res.curve_points:
            if p["rebate_percent"] > 15.0:
                assert p["is_alb_danger"] is True
            elif p["rebate_percent"] <= 15.0:
                assert p["is_alb_danger"] is False


class TestVisualDrawingDetector:
    def test_drawing_and_text_classification(self):
        # Create a 2-page in-memory PDF: page 1 is text, page 2 has CAD vector lines
        doc = fitz.open()

        # Page 1: Standard text
        p1 = doc.new_page(width=595, height=842)
        p1.insert_text((50, 50), "NOTICE INVITING TENDER\nDetailed terms and conditions for civil works.")

        # Page 2: Landscape engineering drawing with multiple vector paths
        p2 = doc.new_page(width=842, height=595)  # Landscape
        p2.insert_text((50, 50), "GENERAL ARRANGEMENT DRAWING: REINFORCED CONCRETE BRIDGE PIERS")
        # Draw 25 CAD-like lines and shapes
        for i in range(25):
            p2.draw_line((50, 100 + i * 15), (750, 100 + i * 15))

        pdf_bytes = doc.tobytes()
        detector = VisualDrawingDetector(pdf_bytes)
        scan = detector.scan_pages()

        assert len(scan) == 2
        assert scan[0].is_landscape is False
        assert scan[1].is_landscape is True
        assert scan[1].vector_path_count >= 25
        assert scan[1].is_visual_drawing is True


class TestPreBidVoiceBriefing:
    def test_briefing_math_and_transcript_generation(self, test_tender):
        service = PreBidVoiceBriefingService(tender=test_tender, corrigenda=[])
        briefing = service.generate_briefing_script(
            max_turnover_cr=35.0,
            commitments_cr=15.0,
        )

        assert briefing.tender_id == str(test_tender.id)
        assert briefing.estimated_cost_cr == 60.0
        assert briefing.capacity_cleared is True
        assert briefing.calculated_capacity_cr == 139.0
        assert "comfortably clears" in briefing.audio_briefing_text
        assert "60.00 Crores" in briefing.audio_briefing_text


class TestMockCommitteeDefense:
    @pytest.mark.asyncio
    async def test_committee_interrogation_turn(self, test_tender):
        facts = [
            CompanyFact(
                id=uuid.uuid4(),
                tenant_id=test_tender.tenant_id,
                fact_category="experience",
                fact_key="Elevated Corridor NH-24",
                raw_value="Constructed 3.2km 4-lane elevated corridor in 2023",
            )
        ]
        room = MockTenderCommitteeDefenseRoom(
            tenant_id=test_tender.tenant_id,
            tender=test_tender,
            company_facts=facts,
        )
        turn = await room.conduct_interrogation(
            contractor_response="Our NH-24 project had similar span lengths.",
            chat_history=[],
        )

        assert turn.committee_persona != ""
        assert turn.interrogation_question != ""
        assert turn.disqualification_risk_level in ("LOW", "MODERATE", "CRITICAL")
        assert turn.suggested_contractor_remediation != ""


@pytest.mark.asyncio
async def test_advanced_ai_api_endpoints():
    """Integration test verifying /api/advanced/* endpoints."""
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    tender_id = uuid.uuid4()

    async with db_session() as session:
        t_tenant = Tenant(
            id=tenant_id,
            name="Apex Water Solutions Pvt Ltd",
            plan_tier="pro_contractor",
            credit_balance=500,
        )
        t_user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=f"apex_lead_{uuid.uuid4().hex[:6]}@apexinfra.in",
            password_hash="mock_hash",
            role="owner",
        )
        t_tender = Tender(
            id=tender_id,
            tenant_id=tenant_id,
            title="Water Treatment Plant and Pipeline EPC",
            reference_no="JJM/WTP/2026/099",
            authority="Jal Jeevan Mission, MP",
            estimated_value_inr=45_00_00_000.0,
            contract_period_years=2.0,
        )
        session.add_all([t_tenant, t_user, t_tender])
        await session.commit()

    token = create_access_token(user_id=user_id, tenant_id=tenant_id, role="owner")
    auth_headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test Monte Carlo PTW endpoint
        mc_res = await client.post(
            f"/api/advanced/{tender_id}/monte-carlo-ptw",
            headers=auth_headers,
            json={"competitor_count": 5, "simulations": 2_000},
        )
        assert mc_res.status_code == 200
        mc_data = mc_res.json()
        assert "optimal_bid_value_inr" in mc_data
        assert "win_probability_at_optimal" in mc_data
        assert "curve_points" in mc_data

        # 2. Test Voice Briefing endpoint
        voice_res = await client.get(
            f"/api/advanced/{tender_id}/voice-briefing?max_turnover_cr=30.0&commitments_cr=10.0",
            headers=auth_headers,
        )
        assert voice_res.status_code == 200
        voice_data = voice_res.json()
        assert "audio_briefing_text" in voice_data
        assert voice_data["capacity_cleared"] is True

        # 3. Test Statutory Precedence Graph endpoint
        prec_res = await client.get(
            f"/api/advanced/{tender_id}/precedence-graph?topic=defect%20liability",
            headers=auth_headers,
        )
        assert prec_res.status_code == 200
        prec_data = prec_res.json()
        assert "active_clause" in prec_data
        assert "statutory_rule" in prec_data

        # 4. Test Mock Committee interrogation endpoint
        mock_res = await client.post(
            f"/api/advanced/{tender_id}/mock-committee",
            headers=auth_headers,
            json={"contractor_response": "We have 15 years of pipeline experience."},
        )
        assert mock_res.status_code == 200
        mock_data = mock_res.json()
        assert "interrogation_question" in mock_data
        assert "committee_persona" in mock_data

        # 5. Test Parallel Swarm Review Board endpoint
        swarm_res = await client.post(
            f"/api/advanced/{tender_id}/swarm-review",
            headers=auth_headers,
        )
        assert swarm_res.status_code == 200
        swarm_data = swarm_res.json()
        assert "overall_score" in swarm_data
        assert "verdict" in swarm_data
        assert "specialist_audits" in swarm_data
        assert "legal" in swarm_data["specialist_audits"]
        assert "quantity_surveyor" in swarm_data["specialist_audits"]
        assert "technical_spec" in swarm_data["specialist_audits"]
        assert "adversarial_red_team" in swarm_data["specialist_audits"]
