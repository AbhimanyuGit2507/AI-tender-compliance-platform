"""
Unit tests for Document Classification & Ingestion Triage Service.
Ensures non-tender documents (Aadhaar, PAN, KYC, resumes) are rejected before tender analysis.
"""
from app.services.document_classifier import classify_document


def test_aadhaar_card_classification():
    text = (
        "नामांकन क्रम/ Enrolment No.: 0000/00448/81661 "
        "To అభిమన్యు నెగి Abhimanyu Negi C/O Bhupendra Singh Negi, "
        "E-706, 7th Floor Tower E, Antriksh Golf View "
        "494 VID : 9173 2274 9116 1064 "
        "Digitally signed by DS Unique Identification Authority of India 06 "
        "Date: 2026.02.22 23:08:48 IST Signature Not Verified"
    )
    result = classify_document(text, filename="Avi-Aadhaar_e706.pdf")
    assert not result.is_tender
    assert result.doc_type == "identity_aadhaar"
    assert "Aadhaar" in result.human_readable_type
    assert result.issuing_entity == "Unique Identification Authority of India (UIDAI)"
    assert result.identified_subject == "Abhimanyu Negi"
    assert result.suggested_action == "transfer_to_vault"


def test_pan_card_classification():
    text = (
        "INCOME TAX DEPARTMENT GOVT. OF INDIA "
        "Permanent Account Number Card "
        "ABCDE1234F "
        "Name: Contractor Infrastructure Private Limited "
        "Father's Name: Not Applicable "
        "Date of Incorporation: 15/04/2018"
    )
    result = classify_document(text, filename="Company_PAN.pdf")
    assert not result.is_tender
    assert result.doc_type == "identity_pan"
    assert "PAN" in result.human_readable_type
    assert result.suggested_action == "transfer_to_vault"


def test_gst_certificate_classification():
    text = (
        "Government of India Form GST REG-06 "
        "Registration Certificate "
        "Registration Number: 27AABCC1234F1Z5 "
        "Legal Name: Apex Builders Private Limited "
        "Goods and Services Tax Act 2017"
    )
    result = classify_document(text, filename="GST_Certificate.pdf")
    assert not result.is_tender
    assert result.doc_type == "company_statutory"
    assert result.suggested_action == "transfer_to_vault"


def test_valid_nit_classification():
    text = (
        "Central Public Works Department (CPWD) "
        "NOTICE INVITING TENDER "
        "NIT No: 42/EE/CD-I/2026-27 "
        "Name of Work: Construction of 100 Bedded Hospital Block "
        "Estimated Cost: Rs. 45.50 Crore "
        "Earnest Money Deposit (EMD): Rs. 91,00,000 "
        "Defect Liability Period: 24 Months "
        "Eligibility Criteria: 3/2/1 similar completed works"
    )
    result = classify_document(text, filename="NIT_Hospital_Block.pdf")
    assert result.is_tender
    assert result.doc_type == "tender_nit"
    assert result.suggested_action == "none"


def test_corrigendum_classification():
    text = (
        "National Highways Authority of India (NHAI) "
        "CORRIGENDUM NO. 1 "
        "Tender Ref: NHAI/Tech/2026/04 "
        "The date of online bid submission has been extended up to 25.12.2026"
    )
    result = classify_document(text, filename="Corrigendum_1.pdf")
    assert result.is_tender
    assert result.doc_type == "tender_corrigendum"

