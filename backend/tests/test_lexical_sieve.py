"""
BidKaro — Tests for Lexical Sieve and Keyword Density Engine
Run: pytest backend/tests/test_lexical_sieve.py -v
"""
import pytest

from app.services.lexical_sieve import (
    PageScore,
    extract_cross_refs,
    identify_scanned_pages,
    score_page,
    sieve_pages,
)


class TestLexicalSieve:
    def test_high_density_procurement_page(self):
        """Page with heavy eligibility keywords receives high score."""
        sample_text = """
        SECTION 3: ELIGIBILITY CRITERIA AND QUALIFICATION REQUIREMENTS
        1. Average Annual Turnover: The bidder must have an average annual turnover
           of not less than INR 15 Crores during the last 3 financial years.
           Audited balance sheet and CA certificate must be submitted.
        2. Solvency Certificate: Bank solvency certificate of at least INR 5 Crores.
        3. Earnest Money Deposit (EMD): EMD of INR 10,00,000 to be paid via FDR or BG.
        4. Performance Bank Guarantee (PBG): 5% of the tender value.
        5. Similar Work Experience: Bidders must have completed similar nature projects.
        6. MSME Certificate / Udyam registration is required for exemption.
        """
        score = score_page(page_number=4, text=sample_text)
        assert score.page_number == 4
        assert score.is_scanned is False
        assert score.score > 20.0
        assert "average annual turnover" in score.matched_terms or "turnover" in score.matched_terms
        assert "emd" in score.matched_terms or "earnest money deposit" in score.matched_terms

    def test_low_signal_boilerplate_page(self):
        """Boilerplate text page receives a very low score."""
        boilerplate = """
        General Instructions:
        All rights reserved. This document is confidential and proprietary.
        Please keep the office clean and maintain standard work protocols.
        Printed on recycled paper. Page 42.
        """
        score = score_page(page_number=42, text=boilerplate)
        assert score.page_number == 42
        assert score.is_scanned is False
        assert score.score < 5.0

    def test_scanned_page_detection(self):
        """Pages with < 100 characters are flagged as scanned (need OCR)."""
        scanned_stamped_page = "STAMP & SIGNATURE [ILLEGIBLE]"
        score = score_page(page_number=12, text=scanned_stamped_page)
        assert score.is_scanned is True
        assert score.score == 0.0

    def test_sieve_pages_selection(self):
        """Sieve selects always_include_first_n plus top scoring pages."""
        pages = [
            "Tender Notice Page 1: General Information and Notice Inviting Tender for Civil Construction Works 2026.",
            "Tender Notice Page 2: Detailed Scope of Work, Project Location, Timeline and Pre-bid Conference Details.",
            "Tender Notice Page 3: Submission instructions, earnest money deposit mode, and technical bid guidelines.",
            "Legal Boilerplate text without any procurement terms. General definitions, headers, footers and notices.",
            "Section 3 Technical Eligibility: Average Annual Turnover of Rs 10 Crore, Net Worth, Solvency Certificate, EMD and Similar Work experience required.",
            "Section 4 Commercial Conditions: Liquidated damages clause, Defect Liability Period (DLP), Warranty, Penalty and Maintenance period.",
            "More generic filler text for testing purposes without any specific terms or requirements for bidders.",
            "STAMP",                                                      # P8 (scanned: < 100 chars)
        ]

        selected, scores = sieve_pages(pages, top_n=5, always_include_first_n=3)

        # Forced pages 1, 2, 3 must be present
        assert 1 in selected
        assert 2 in selected
        assert 3 in selected

        # Highest scoring pages P5 and P6 should be selected
        assert 5 in selected
        assert 6 in selected

        # Scanned page P8 should be identified
        scanned = identify_scanned_pages(scores)
        assert 8 in scanned


class TestCrossReferenceExtraction:
    def test_extract_cross_refs(self):
        text = """
        As per Clause 4.2 and Clause 12.1 of the GCC, the contractor shall comply
        with standard safety norms. Refer to Annexure IV for the Undertaking Form,
        Schedule B for the price schedule, and Form F-1 for the EMD submission.
        """
        refs = extract_cross_refs(text)
        assert any("Clause 4.2" in r for r in refs)
        assert any("Clause 12.1" in r for r in refs)
        assert any("Annexure IV" in r for r in refs)
        assert any("Schedule B" in r for r in refs)
        assert any("Form F-1" in r for r in refs)
