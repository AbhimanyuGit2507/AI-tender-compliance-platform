"""
BidKaro — Document Classification & Ingestion Triage Service
Prevents non-tender documents (Aadhaar cards, PAN cards, KYC, resumes, utility bills)
from entering the tender compliance pipeline, and provides automated routing to Company Vault.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class DocumentClassification:
    is_tender: bool
    doc_type: str                     # "tender_nit" | "tender_corrigendum" | "tender_boq" | "identity_aadhaar" | "identity_pan" | "company_statutory" | "invalid_other"
    human_readable_type: str         # e.g. "Personal Identity Document (Aadhaar Card)"
    issuing_entity: str              # e.g. "Unique Identification Authority of India (UIDAI)"
    identified_subject: Optional[str] # e.g. "Abhimanyu Negi"
    reason: str
    suggested_action: str            # "transfer_to_vault" | "upload_tender" | "none"


# ── Strict Regex Patterns ──────────────────────────────────────────

AADHAAR_PATTERNS = [
    re.compile(r"unique\s*identification\s*authority\s*of\s*india", re.IGNORECASE),
    re.compile(r"uidai", re.IGNORECASE),
    re.compile(r"mera\s*aadhaar", re.IGNORECASE),
    re.compile(r"aadhaar\s*number|aadhar\s*number", re.IGNORECASE),
    re.compile(r"enrolment\s*no|नामांकन\s*क्रम", re.IGNORECASE),
    re.compile(r"vid\s*:\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}", re.IGNORECASE),
    re.compile(r"\b\d{4}\s+\d{4}\s+\d{4}\b"),  # 12-digit Aadhaar number
]

PAN_PATTERNS = [
    re.compile(r"income\s*tax\s*department", re.IGNORECASE),
    re.compile(r"permanent\s*account\s*number", re.IGNORECASE),
    re.compile(r"govt\.\s*of\s*india\s*income\s*tax", re.IGNORECASE),
    re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),  # Standard 10-char PAN
]

PASSPORT_VOTER_PATTERNS = [
    re.compile(r"republic\s*of\s*india\s*passport", re.IGNORECASE),
    re.compile(r"election\s*commission\s*of\s*india", re.IGNORECASE),
    re.compile(r"elector\s*photo\s*identity\s*card", re.IGNORECASE),
    re.compile(r"driving\s*licen[sc]e", re.IGNORECASE),
]

COMPANY_STATUTORY_PATTERNS = [
    re.compile(r"goods\s*and\s*services\s*tax", re.IGNORECASE),
    re.compile(r"form\s*gst\s*reg-06", re.IGNORECASE),
    re.compile(r"certificate\s*of\s*incorporation", re.IGNORECASE),
    re.compile(r"ministry\s*of\s*corporate\s*affairs", re.IGNORECASE),
    re.compile(r"udyam\s*registration", re.IGNORECASE),
    re.compile(r"memorandum\s*of\s*association", re.IGNORECASE),
]

TENDER_NIT_PATTERNS = [
    re.compile(r"notice\s*inviting\s*tender", re.IGNORECASE),
    re.compile(r"\bnit\s*(?:no|ref|reference|details|notice)\b", re.IGNORECASE),
    re.compile(r"request\s*for\s*proposal|\brfp\b", re.IGNORECASE),
    re.compile(r"request\s*for\s*quotation|\brfq\b", re.IGNORECASE),
    re.compile(r"earnest\s*money\s*deposit|\bemd\b", re.IGNORECASE),
    re.compile(r"schedule\s*of\s*quantities|\bboq\b", re.IGNORECASE),
    re.compile(r"pre-?qualification\s*criteria", re.IGNORECASE),
    re.compile(r"eligibility\s*criteria", re.IGNORECASE),
    re.compile(r"name\s*of\s*work", re.IGNORECASE),
    re.compile(r"estimated\s*(?:cost|value|amount)", re.IGNORECASE),
    re.compile(r"bid\s*(?:submission|validity|security|capacity)", re.IGNORECASE),
    re.compile(r"defect\s*liability\s*period", re.IGNORECASE),
    re.compile(r"liquidated\s*damages", re.IGNORECASE),
    re.compile(r"performance\s*bank\s*guarantee|\bpbg\b", re.IGNORECASE),
]


def classify_document(text: str, filename: str = "") -> DocumentClassification:
    """
    Classify an uploaded document to ensure only legitimate procurement / tender
    documents enter the tender compliance pipeline.
    """
    sample = text[:8000].strip()
    sample_lower = sample.lower()
    fname_lower = filename.lower()

    # ── 1. Check for Aadhaar Card ────────────────────────────────────
    aadhaar_matches = sum(1 for p in AADHAAR_PATTERNS if p.search(sample))
    is_aadhaar_fname = "aadhaar" in fname_lower or "aadhar" in fname_lower

    if aadhaar_matches >= 2 or (is_aadhaar_fname and aadhaar_matches >= 1) or "uidai" in sample_lower:
        # Extract identified name if available
        identified_name = None
        name_match = re.search(r"To\s+(.+?)(?:\s+C/O|\s+S/O|\s+D/O|\s+W/O|\n)", sample)
        if name_match:
            ascii_parts = re.findall(r"[A-Za-z]+", name_match.group(1))
            if ascii_parts:
                identified_name = " ".join(ascii_parts)
        if not identified_name:
            m_en = re.search(r"\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b", sample)
            if m_en and "Unique" not in m_en.group(1) and "India" not in m_en.group(1):
                identified_name = m_en.group(1)

        return DocumentClassification(
            is_tender=False,
            doc_type="identity_aadhaar",
            human_readable_type="Personal Identity Document (Aadhaar Card)",
            issuing_entity="Unique Identification Authority of India (UIDAI)",
            identified_subject=identified_name or "Authorized Signatory",
            reason="Uploaded file is an Indian Resident Identity Document (Aadhaar Card), not an official Notice Inviting Tender (NIT), RFP, or Bid Document.",
            suggested_action="transfer_to_vault",
        )

    # ── 2. Check for PAN Card ─────────────────────────────────────────
    pan_matches = sum(1 for p in PAN_PATTERNS if p.search(sample))
    is_pan_fname = "pan" in fname_lower

    if pan_matches >= 2 or (is_pan_fname and pan_matches >= 1):
        pan_num_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", sample)
        return DocumentClassification(
            is_tender=False,
            doc_type="identity_pan",
            human_readable_type="Statutory Tax Document (PAN Card)",
            issuing_entity="Income Tax Department, Government of India",
            identified_subject=pan_num_match.group(1) if pan_num_match else None,
            reason="Uploaded file is a Permanent Account Number (PAN) Card, not a Notice Inviting Tender (NIT).",
            suggested_action="transfer_to_vault",
        )

    # ── 3. Check for Passport / Voter ID ──────────────────────────────
    if any(p.search(sample) for p in PASSPORT_VOTER_PATTERNS) or "passport" in fname_lower or "voter" in fname_lower:
        return DocumentClassification(
            is_tender=False,
            doc_type="identity_other",
            human_readable_type="Personal Identity Document (Passport / Voter ID)",
            issuing_entity="Government of India",
            identified_subject=None,
            reason="Uploaded file is a personal identification document, not a Notice Inviting Tender (NIT).",
            suggested_action="transfer_to_vault",
        )

    # ── 4. Check for Company Statutory Documents (GST, MoA, Udyam) ─────
    if sum(1 for p in COMPANY_STATUTORY_PATTERNS if p.search(sample)) >= 2:
        return DocumentClassification(
            is_tender=False,
            doc_type="company_statutory",
            human_readable_type="Company Statutory / Registration Certificate",
            issuing_entity="Government Authority / Registrar of Companies",
            identified_subject=None,
            reason="Uploaded file is a company statutory registration document (GST/MoA/Udyam), which belongs in your Company Vault.",
            suggested_action="transfer_to_vault",
        )

    # ── 5. Check for Corrigendum / Addendum ───────────────────────────
    if "corrigendum" in fname_lower or "addendum" in fname_lower or re.search(r"\bcorrigendum\b|\baddendum\b", sample_lower):
        return DocumentClassification(
            is_tender=True,
            doc_type="tender_corrigendum",
            human_readable_type="Tender Corrigendum / Amendment",
            issuing_entity="Procurement Authority",
            identified_subject=None,
            reason="Document is a tender amendment / corrigendum.",
            suggested_action="none",
        )

    # ── 6. Check for Tender NIT / RFP ─────────────────────────────────
    nit_score = sum(1 for p in TENDER_NIT_PATTERNS if p.search(sample))
    if nit_score >= 2 or "nit" in fname_lower or "tender" in fname_lower or "rfp" in fname_lower:
        return DocumentClassification(
            is_tender=True,
            doc_type="tender_nit",
            human_readable_type="Notice Inviting Tender (NIT) / RFP",
            issuing_entity="Procurement Authority",
            identified_subject=None,
            reason="Legitimate procurement document containing tender clauses and qualification criteria.",
            suggested_action="none",
        )

    # ── 7. Non-procurement / Unrecognized Document Fallback ────────────
    if len(sample.split()) < 40:
        return DocumentClassification(
            is_tender=False,
            doc_type="invalid_empty",
            human_readable_type="Empty or Low-Text Document",
            issuing_entity="Unknown",
            identified_subject=None,
            reason="Uploaded file contains almost no extractable text. Please upload a clear digital PDF.",
            suggested_action="upload_tender",
        )

    # If it has text but 0 tender keywords, classify as unverified / non-tender
    if nit_score == 0:
        return DocumentClassification(
            is_tender=False,
            doc_type="invalid_other",
            human_readable_type="Non-Procurement Document",
            issuing_entity="Unknown",
            identified_subject=None,
            reason="Document contains no tender, RFP, or procurement clauses. Notice Inviting Tender (NIT) analysis cannot be performed.",
            suggested_action="upload_tender",
        )

    # Default to tender if minor signals found
    return DocumentClassification(
        is_tender=True,
        doc_type="tender_nit",
        human_readable_type="Tender Document",
        issuing_entity="Procurement Authority",
        identified_subject=None,
        reason="Standard tender document.",
        suggested_action="none",
    )
