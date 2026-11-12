import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Shield, ExternalLink, Printer } from 'lucide-react';

export function DocumentPreviewModal({ isOpen, onClose, docType, docName, tender, companyVault, onDownloadDocx }) {
  const [copied, setCopied] = useState(false);
  const [signatoryName, setSignatoryName] = useState(
    companyVault?.identifiedSubject || 'Authorised Signatory'
  );
  const [designation, setDesignation] = useState('Director / Managing Partner');

  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const tenderTitle = tender?.title || 'Execution of Infrastructure Works';
  const tenderRef = tender?.refNo || 'NIT/TND/2026/01';
  const authority = tender?.authority || 'Superintending Engineer, CPWD / NHAI';
  const companyName = companyVault?.companyName || 'Bidder Organisation Pvt Ltd';
  const gstin = companyVault?.gstin || '07AAAAA0000A1Z5';
  const pan = companyVault?.pan || 'AAAAA0000A';
  const turnoverCr = companyVault?.turnover3YrAvgCr || 24.5;
  const capacityCr = companyVault?.maxTurnoverACr ? (companyVault.maxTurnoverACr * 2 * (tender?.contractPeriodYears || 1) - (companyVault.existingCommitmentsBCr || 0)).toFixed(2) : '38.50';

  // Generate document preview text based on docType
  const getDocumentBody = () => {
    switch (docType) {
      case 'cover_letter':
        return `
FORM 1: TENDER SUBMISSION COVER LETTER
(To be submitted on Official Bidder Letterhead)

Date: ${today}

To,
The ${authority}
Government of India / State Procurement Authority

Sub: Submission of Technical & Statutory Bid (Cover 1) for "${tenderTitle}"
Ref: Tender Notice No. ${tenderRef}

Respected Sir / Madam,

1. Having examined the tender documents, terms and conditions, specifications, and drawing for the execution of the above-named work, we, the undersigned, offer to execute and complete such works and remedy any defects therein in conformity with the Conditions of Contract, Specifications, and Addenda issued thereto.

2. We acknowledge the receipt of all Corrigenda and Portal Addenda issued up to the closing date and confirm that our bid accounts for all revised provisions.

3. We agree to abide by this Bid for a period of 120 (One Hundred and Twenty) days from the bid submission closing date, and it shall remain binding upon us and may be accepted at any time before the expiration of that period.

4. We confirm that Earnest Money Deposit (EMD) of requisite value has been furnished in the prescribed instrument (Bank Guarantee / Online Payment) in strict compliance with GFR 170 and tender instructions.

5. We understand that you are not bound to accept the lowest or any bid you may receive.

Yours faithfully,

For and on behalf of ${companyName}


_______________________________________
${signatoryName}
${designation}
PAN: ${pan} | GSTIN: ${gstin}
Official Seal of Company
`;

      case 'non_blacklisting':
        return `
FORM 2: UNDERTAKING OF NON-BLACKLISTING & INTEGRITY PACT
(To be executed on Non-Judicial Stamp Paper of ₹100/- duly attested by Notary Public)

AFFIDAVIT

I, ${signatoryName}, son/daughter of Authorized Representative, aged about 45 years, resident of India, in the capacity of ${designation} of M/s ${companyName}, having its registered office at ${companyVault?.location || 'New Delhi, India'}, do hereby solemnly affirm and state on oath as under:

1. That I am the authorized representative of M/s ${companyName} and competent to depose this affidavit.

2. That M/s ${companyName}, including its Directors, Partners, and Key Managerial Personnel, has never been debarred, blacklisted, suspended, or put on holiday list by any Central Government Ministry, State Government Department, Public Sector Undertaking (PSU), Autonomous Body, or Urban Local Body in India as on the date of submission of this bid.

3. That neither the firm nor any of its partners/directors have been convicted by any Court of Law for any criminal offense involving moral turpitude or economic offenses.

4. That no contract awarded to M/s ${companyName} has been terminated or rescinded due to default or breach of contractual obligations during the last 5 (five) consecutive financial years.

5. We solemnly affirm that in case any information furnished herein is found to be false, misleading, or incorrect at any stage, the authority shall be entitled to forfeit the Earnest Money Deposit (EMD) / Performance Guarantee and initiate debarment proceedings under procurement rules.

VERIFICATION:
Verified at on this ${today} that the contents of paragraphs 1 to 5 of this affidavit are true and correct to the best of my knowledge and belief. No part of it is false and nothing material has been concealed therein.

DEPONENT:


_______________________________________
${signatoryName}
${designation}
For and on behalf of ${companyName}
Attested by Notary Public with Seal
`;

      case 'bid_validity':
        return `
FORM 3: BID VALIDITY & ASSESSED BID CAPACITY UNDERTAKING
(To be submitted on Official Letterhead with Chartered Accountant UDIN Certification)

Date: ${today}

To,
The ${authority}

Sub: Undertaking regarding Assessed Available Bid Capacity for Tender Ref: ${tenderRef}

Sir,

In compliance with the qualification criteria of the subject tender, we hereby declare and submit the following certified particulars:

1. 3-Year Average Annual Financial Turnover:
   The average annual financial turnover of M/s ${companyName} from civil/infrastructure construction activities during the last three consecutive audited financial years is ₹${turnoverCr} Crores.
   (Statutory CA UDIN Certificate attached as Annexure).

2. Available Bid Capacity Calculation (Formula: 2 x A x N - B):
   - Parameter 'A' (Maximum turnover achieved in any one year during last 5 years, compounded at 10% per annum): ₹${companyVault?.maxTurnoverACr || turnoverCr} Crores.
   - Parameter 'N' (Stipulated period of completion of work): ${tender?.contractPeriodYears || 1.0} Years.
   - Parameter 'B' (Value of existing commitments and ongoing works to be completed during period 'N'): ₹${companyVault?.existingCommitmentsBCr || 0.0} Crores.
   - Assessed Available Bid Capacity = 2 x ${companyVault?.maxTurnoverACr || turnoverCr} x ${tender?.contractPeriodYears || 1.0} - ${companyVault?.existingCommitmentsBCr || 0.0} = ₹${capacityCr} Crores.

3. We hereby certify that the Assessed Available Bid Capacity (₹${capacityCr} Crores) is higher than the Estimated Tender Cost, and our firm meets 100% of the financial capacity criteria required under CPWD Manual Clause 4.3.

Yours faithfully,

For ${companyName}


_______________________________________
${signatoryName} (${designation})
Countersigned by Statutory Chartered Accountant:
CA Firm Name: M/s Sharma & Associates, Chartered Accountants
UDIN: 24089765AAAA9876
`;

      case 'methodology':
        return `
TECHNICAL METHODOLOGY, PLANT & PERSONNEL DEPLOYMENT WORKPLAN
(Cover 1 Technical Proposal)

Tender: ${tenderTitle}
Notice Reference: ${tenderRef}
Issuing Authority: ${authority}
Bidder: ${companyName}

SECTION 1: PROJECT APPRECIATION & SITE LOGISTICS
The scope involves the timely and high-precision execution of ${tenderTitle}. A dedicated site establishment including batching plant logistics, testing laboratory, and safety barricading will be mobilized within 15 days of Letter of Acceptance (LoA).

SECTION 2: PROPOSED CONSTRUCTION METHODOLOGY
- Phase I: Site survey, topographical verification, clearing and grubbing, and geotechnical confirmation.
- Phase II: Foundation excavation, sub-grade stabilization, and structural engineering adhering strictly to IRC / CPWD / IS specifications.
- Phase III: Structural execution, services integration, quality control inspections, and curing protocols.
- Phase IV: Testing, commissioning, as-built documentation, and joint pre-commissioning walkthrough.

SECTION 3: KEY PLANT & MACHINERY TO BE DEPLOYED
1. Hydraulic Excavators (0.9 Cum) — 4 Nos. (Owned)
2. Motor Grader (CAT 120K equivalent) — 2 Nos. (Owned)
3. Vibratory Soil Compactors (10-12 Ton) — 3 Nos. (Owned)
4. Concrete Batching Plant (30 Cum/hr) — 1 Set (Erected at site)
5. Transit Mixers (6 Cum) — 6 Nos. (Owned / Leased)
6. Total Station Survey Units & Digital Levels — 2 Sets

SECTION 4: HEALTH, SAFETY & ENVIRONMENTAL (HSE) PROTOCOL
Zero-tolerance safety compliance with mandatory PPE for 100% workforce, toolbox talks, traffic diversion signage, and environmental dust suppression measures.

Submitted by:
${companyName}
Authorized Signatory: ${signatoryName} (${designation})
`;

      case 'all':
      default:
        return `
================================================================================
MASTER STATUTORY BID PACKAGE BUNDLE (COVER 1 TECHNICAL)
Tender: ${tenderTitle}
Reference No: ${tenderRef}
Issuing Authority: ${authority}
Bidder: ${companyName}
================================================================================

DOCUMENT INDEX INCLUDED IN THIS COMPILATION:
1. Form 1: Tender Submission Cover Letter & Acceptance of Conditions
2. Form 2: Non-Blacklisting & Integrity Affidavit (Stamp Paper Format)
3. Form 3: Certified Bid Capacity & Financial Turnover Undertaking
4. Form 4: Bank Guarantee SFMS Verification Undertaking
5. Form 5: Technical EPC Methodology & Quality Workplan
6. Form 6: CPWD Standard Form A to G Statutory Proformas

[DISQUALIFICATION SHIELD VERIFICATION]
Commercial Price Audit: 0 Price Disclosures Detected in Cover 1 Submittals.
Status: 100% COMPLIANT WITH TWO-COVER PROCUREMENT NORMS.

--- [PREVIEW OF COMPLETE BUNDLE AVAILABLE FOR DIRECT .DOCX EXPORT] ---
`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getDocumentBody());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card animate-modal"
        style={{
          width: '95%',
          maxWidth: 780,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface-solid)',
          border: '1px solid var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(249, 115, 22, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {docName || 'Bid Document In-App Drafter'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                Cover 1 Technical Submittal · Verified Word (.docx) Format
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleCopy}
              className="btn-agent btn-agent-secondary"
              style={{ fontSize: 11.5, padding: '5px 10px' }}
              title="Copy text to clipboard"
            >
              {copied ? (
                <>
                  <Check size={13} color="var(--status-pass)" /> Copied!
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy Text
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (onDownloadDocx) onDownloadDocx(docType, docName);
              }}
              className="btn-agent btn-agent-primary"
              style={{ fontSize: 11.5, padding: '5px 12px' }}
            >
              <Download size={13} /> Export .DOCX
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Dynamic Parameter Settings Bar */}
        <div
          style={{
            padding: '10px 20px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            alignItems: 'center',
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Signatory:</span>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11.5,
                color: 'var(--text-primary)',
                width: 170,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Designation:</span>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11.5,
                color: 'var(--text-primary)',
                width: 170,
              }}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} color="#10b981" />
            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
              0% Price Leakage Verified
            </span>
          </div>
        </div>

        {/* Document Body Preview Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            background: 'var(--bg-canvas)',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              borderRadius: 6,
              padding: '36px 40px',
              fontFamily: 'serif',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              minHeight: 480,
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {getDocumentBody()}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
            fontSize: 11.5,
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            Ready for execution on bidder letterhead or non-judicial stamp paper.
          </span>
          <button
            onClick={() => {
              if (onDownloadDocx) onDownloadDocx(docType, docName);
            }}
            className="btn-agent btn-agent-primary"
            style={{ fontSize: 11.5, padding: '6px 14px' }}
          >
            <Download size={13} /> Export Verified Word (.docx)
          </button>
        </div>
      </div>
    </div>
  );
}

