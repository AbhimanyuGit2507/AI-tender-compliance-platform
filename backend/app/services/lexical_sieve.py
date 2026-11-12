"""
BidKaro — Lexical Sieve
Scores PDF pages by Indian procurement keyword density BEFORE calling any LLM.
Goal: Reduce an 200-page tender to 15–25 high-signal pages, slashing token cost.

Scoring is deterministic (Tier 0 — zero AI cost).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


# ── Keyword dictionary with weights ─────────────────────────────────
#
# Weight 3 → Extremely high signal (usually in eligibility/financial clauses)
# Weight 2 → High signal (common eligibility terms)
# Weight 1 → Moderate signal (tender context terms)
#
PROCUREMENT_TERMS: dict[str, int] = {
    # Financial eligibility
    "average annual turnover": 3,
    "annual turnover": 3,
    "turnover": 2,
    "net worth": 3,
    "solvency certificate": 3,
    "bank solvency": 3,
    "audited balance sheet": 3,
    "ca certificate": 3,
    "chartered accountant": 2,
    "financial statements": 2,
    "bid capacity": 3,
    "assessed available bid capacity": 3,
    "balance sheet": 2,

    # EMD / Security Deposit
    "earnest money": 3,
    "earnest money deposit": 3,
    "emd": 3,
    "bid security": 3,
    "performance bank guarantee": 3,
    "pbg": 3,
    "security deposit": 2,
    "bank guarantee": 2,
    "fdr": 2,

    # Eligibility / Experience
    "similar work": 3,
    "similar nature": 3,
    "similar project": 3,
    "experience certificate": 3,
    "completion certificate": 3,
    "work order": 2,
    "letter of award": 2,
    "work completion": 2,
    "three financial years": 2,
    "last three years": 2,
    "last 3 years": 2,
    "last 5 years": 2,
    "past experience": 2,

    # Legal / Registration
    "gstin": 3,
    "gst registration": 3,
    "pan": 2,
    "registration certificate": 2,
    "cin": 2,
    "udyam": 3,
    "msme": 3,
    "msme certificate": 3,
    "startup india": 3,
    "dpiit": 3,
    "blacklisting": 3,
    "non-blacklisting": 3,
    "debarment": 3,
    "litigation": 2,

    # Certifications
    "iso 9001": 3,
    "iso 14001": 3,
    "iso 45001": 3,
    "ohsas": 2,
    "bis": 2,
    "is:": 2,
    "bureau of indian standards": 2,
    "oem authorisation": 3,
    "oem certificate": 3,
    "manufacturer authorization": 3,
    "maf": 3,
    "dealer authorization": 2,

    # Corrigendum / Addendum
    "corrigendum": 3,
    "addendum": 3,
    "erratum": 3,
    "amendment": 2,
    "revision": 2,
    "modification": 2,
    "pre-bid": 2,
    "pre bid": 2,
    "pre-bid meeting": 2,

    # Indian procurement portals / bodies
    "gem": 2,
    "government e-marketplace": 2,
    "cppp": 2,
    "ireps": 2,
    "njp": 2,
    "mjp": 2,
    "nit": 2,
    "notice inviting tender": 2,
    "rfp": 2,
    "request for proposal": 2,
    "epc": 2,
    "liquidated damages": 3,
    "ld clause": 3,
    "penalty": 2,
    "defect liability": 2,
    "dlp": 2,
    "warranty": 2,
    "maintenance period": 2,

    # Arithmetic qualifiers
    "minimum": 2,
    "at least": 2,
    "not less than": 3,
    "shall have": 2,
    "must have": 2,
    "should have": 2,
    "mandatory": 3,
    "essential": 2,
    "qualifying": 2,
    "eligibility criteria": 3,
    "qualification criteria": 3,
    "pre-qualification": 3,
    "pq": 2,
}

# Compile all terms into a single combined regex for efficiency
_TERM_RE: re.Pattern | None = None


def _get_term_regex() -> re.Pattern:
    global _TERM_RE
    if _TERM_RE is None:
        # Sort by length descending to match longer phrases first
        sorted_terms = sorted(PROCUREMENT_TERMS.keys(), key=len, reverse=True)
        pattern = "|".join(re.escape(t) for t in sorted_terms)
        _TERM_RE = re.compile(pattern, re.IGNORECASE)
    return _TERM_RE


@dataclass
class PageScore:
    page_number: int
    score: float
    matched_terms: list[str] = field(default_factory=list)
    char_count: int = 0
    is_scanned: bool = False  # True if char_count < 100 after extraction


def score_page(page_number: int, text: str) -> PageScore:
    """
    Score a single page. Returns a PageScore with the weighted sum.
    Pages with < 100 characters after extraction are flagged as likely scanned.
    """
    char_count = len(text.strip())
    is_scanned = char_count < 100

    if is_scanned:
        return PageScore(
            page_number=page_number,
            score=0.0,
            matched_terms=[],
            char_count=char_count,
            is_scanned=True,
        )

    regex = _get_term_regex()
    matches = regex.findall(text.lower())
    matched_terms = list(set(m.lower() for m in matches))

    score = sum(PROCUREMENT_TERMS.get(term, 1) for term in matched_terms)

    # Density bonus: normalize score by text length (rewards dense pages)
    density = score / max(char_count / 1000, 0.1)
    final_score = score + density * 0.5

    return PageScore(
        page_number=page_number,
        score=round(final_score, 3),
        matched_terms=matched_terms,
        char_count=char_count,
        is_scanned=False,
    )


def sieve_pages(
    page_texts: list[str],
    top_n: int = 20,
    always_include_first_n: int = 3,
) -> tuple[list[int], list[PageScore]]:
    """
    Given a list of page texts (0-indexed), return:
    - List of selected page numbers (1-indexed) to pass to the LLM
    - Full list of PageScore objects for caching

    First `always_include_first_n` pages are always included (NIT header pages).
    Scanned pages are returned separately (will be queued for Tier 2 OCR).
    """
    all_scores: list[PageScore] = []
    for i, text in enumerate(page_texts):
        all_scores.append(score_page(i + 1, text))

    # Always include first N pages (typically NIT, title, key dates)
    forced = list(range(1, min(always_include_first_n + 1, len(page_texts) + 1)))

    # Sort remaining pages by score descending
    scored_pages = [s for s in all_scores if s.page_number not in forced]
    scored_pages.sort(key=lambda s: s.score, reverse=True)

    # Select top_n - forced pages from scored list
    remaining_budget = max(top_n - len(forced), 0)
    selected_scored = [s.page_number for s in scored_pages[:remaining_budget] if s.score > 0]

    selected = sorted(set(forced + selected_scored))
    return selected, all_scores


def identify_scanned_pages(scores: list[PageScore]) -> list[int]:
    """Return page numbers identified as scanned (need Tier 2 OCR)."""
    return [s.page_number for s in scores if s.is_scanned]


# ── Cross-reference extractor ────────────────────────────────────────
_CROSS_REF_RE = re.compile(
    r"""
    (?:
        [Cc]lause\s+[\d.]+[\d]       |  # Clause 4.2
        [Aa]nnexure\s+[IVX]+\b       |  # Annexure IV
        [Aa]ppendix\s+[A-Z\d]+\b     |  # Appendix A
        [Ss]chedule\s+[A-Z\d]+\b     |  # Schedule B
        [Ss]ection\s+[\d.]+[\d]\b    |  # Section 7.4
        [Pp]art\s+[IVX\d]+\b         |  # Part III
        [Ff]orm\s+[A-Z\d\-]+\b          # Form F-3
    )
    """,
    re.VERBOSE,
)


def extract_cross_refs(text: str) -> list[str]:
    """Extract outgoing cross-references (Clause X, Annexure Y, etc.) from chunk text."""
    return list(set(_CROSS_REF_RE.findall(text)))
