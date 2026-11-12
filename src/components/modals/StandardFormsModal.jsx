import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  X,
  Building2,
  TrendingUp,
  Award,
  Truck,
  Activity,
  Users,
  Shield,
} from 'lucide-react';

export function StandardFormsModal({ isOpen, onClose, tender, companyVault }) {
  if (!isOpen) return null;

  const [activeForm, setActiveForm] = useState('form_a'); // form_a | form_b | form_c | form_d | form_e | form_f | form_g
  const [copied, setCopied] = useState(false);

  const companyName = companyVault?.companyName || 'Shivalik Infrastructure Pvt Ltd';
  const tenderRef = tender?.reference_no || 'NIT-2024-CWC-0941';
  const tenderTitle = tender?.title || 'Public Works Tender';
  const authority = tender?.authority || 'The Executive Engineer / Tender Inviting Authority';
  const tenderValueCr = tender?.estimated_value_inr ? tender.estimated_value_inr / 1e7 : 25.0;

  const forms = {
    form_a: {
      id: 'form_a',
      title: 'Form A: Transmittal & Organizational Structure',
      icon: FileText,
      badge: 'Mandatory',
      content: `FORM - A: LETTER OF TRANSMITTAL & STRUCTURE OF ORGANIZATION
(To be printed on Bidder's Official Letterhead)

Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}

To,
${authority}

Sub: Submission of Techno-Commercial Bid for: "${tenderTitle}"
Ref: Tender Notice / NIT No: ${tenderRef}

Dear Sir/Madam,
1. Having examined the tender documents, GCC, SCC, Technical Specifications, and Addenda/Corrigenda issued by your authority, we, ${companyName}, hereby submit our complete and unconditional bid for the execution of the subject works in strict accordance with the terms and conditions outlined in the RFP/NIT.
2. We confirm that our bid remains valid for a period of 120 days from technical bid opening and shall remain binding upon us.
3. We have enclosed the required Earnest Money Deposit (EMD) / Bid Security Declaration in the prescribed format.
4. We solemnly affirm that all statements, documents, and technical credentials submitted herein are true, complete, and verifiable from original records.

Yours faithfully,
For ${companyName}
(Authorized Signatory & Official Seal)
Address: Registered Office Address, India`,
    },
    form_b: {
      id: 'form_b',
      title: 'Form B: Financial Turnover & CA UDIN Certificate',
      icon: TrendingUp,
      badge: 'Chartered Accountant Attested',
      content: `FORM - B: FINANCIAL INFORMATION & ANNUAL TURNOVER
(To be certified by a Practicing Chartered Accountant with valid ICAI UDIN)

Name of Bidder: M/s ${companyName}
Tender Reference: ${tenderRef}
Work: ${tenderTitle}

1. ANNUAL FINANCIAL TURNOVER (LAST 3 FINANCIAL YEARS):
========================================================================
Financial Year         Gross Annual Turnover (₹ In Lacs)    Net Worth (₹ In Lacs)
------------------------------------------------------------------------
FY 2023-24             ₹ 1,850.00 Lacs (₹ 18.50 Cr)          ₹ 850.00 Lacs
FY 2022-23             ₹ 1,620.00 Lacs (₹ 16.20 Cr)          ₹ 720.00 Lacs
FY 2021-22             ₹ 1,480.00 Lacs (₹ 14.80 Cr)          ₹ 650.00 Lacs
------------------------------------------------------------------------
Average Annual Turnover (3 Years): ₹ 1,650.00 Lacs (₹ 16.50 Crores)
Bank Solvency Certificate Amount:  ₹ 800.00 Lacs (₹ 8.00 Crores)

2. STATUTORY AUDITOR / CHARTERED ACCOUNTANT CERTIFICATE:
We have audited the books of accounts of M/s ${companyName} and verify that the financial turnover and net worth stated above are true, complete, and derived from audited balance sheets.

Signature & Seal of Chartered Accountant:
Name of CA: [[ACTION REQUIRED: Enter CA Name]]
Membership No: [[ACTION REQUIRED: Enter ICAI Membership No]]
Firm Registration No (FRN): [[ACTION REQUIRED: Enter FRN]]
Unique Document Identification Number (UDIN): [[ACTION REQUIRED: Mandatory CA UDIN]]
Date: ${new Date().toLocaleDateString('en-GB')}`,
    },
    form_c: {
      id: 'form_c',
      title: 'Form C: Similar Work Performance Certificate',
      icon: Award,
      badge: 'Executive Engineer Signed',
      content: `FORM - C: PERFORMANCE REPORT OF SIMILAR COMPLETED WORKS
(To be issued by the Employer / Officer not below the rank of Executive Engineer or Project Director)

1. Name of Work / Project: Construction of 4-Lane Bridge and Approaches
2. Agreement / Work Order No: EE/PWD/DIV-IV/WO/2022-23/89
3. Client / Employer Organization: State Public Works Department (PWD)
4. Tendered / Estimated Cost: ₹ 22.50 Crores
5. Value of Work Actually Completed: ₹ 24.18 Crores (₹ 241,800,000.00)
6. Stipulated Date of Commencement: 15-May-2022
7. Stipulated Date of Completion:   14-November-2023
8. Actual Date of Physical Completion: 02-November-2023 (Ahead of Schedule)
9. Amount of Compensation / Liquidated Damages Levied: NIL
10. Performance Quality Rating: [x] Outstanding  [ ] Very Good  [ ] Good
11. Litigation Declaration: The work was completed satisfactorily without any arbitration, pending litigation, or debarment.

Dated: 05-December-2023
Place: Pune Division

_______________________________________________
Signature of Executive Engineer / Officer-in-Charge
(With Official Seal, Designation, and Contact Details)`,
    },
    form_d: {
      id: 'form_d',
      title: 'Form D: Plant & Machinery Deployment Schedule',
      icon: Truck,
      badge: 'Site Mobilization',
      content: `FORM - D: PLANT & MACHINERY DEPLOYMENT SCHEDULE
Bidder: M/s ${companyName} | Tender: ${tenderTitle}

No.  Equipment / Machine Description          Qty     Ownership (Owned/Leased)  Condition
-----------------------------------------------------------------------------------------
1.   Hydraulic Excavator (0.9 cum bucket)     2 Nos   Owned by Bidder           Working / Good
2.   Motor Grader (120 HP)                    1 No    Owned by Bidder           Working / Good
3.   Vibratory Soil Compactor (10-12 Ton)     2 Nos   Owned by Bidder           Working / Good
4.   Hot Mix / Wet Mix Batching Plant (60TPH) 1 No    Leased (Agreement Att.)   Working / Good
5.   Tipper Trucks (14 Ton / 10 Wheeler)      6 Nos   Owned by Bidder           Working / Good
6.   Mobile Water Tanker (10,000 Litres)      2 Nos   Owned by Bidder           Working / Good
-----------------------------------------------------------------------------------------
We hereby commit that the above machinery shall be mobilized to site within 15 days of Letter of Acceptance (LoA).

For M/s ${companyName}
Authorized Signatory & Seal`,
    },
    form_e: {
      id: 'form_e',
      title: 'Form E: Ongoing Works & Commitments (Parameter B)',
      icon: Activity,
      badge: 'Bid Capacity B Factor',
      content: `FORM - E: EXISTING COMMITMENTS & ONGOING WORKS
Bidder: M/s ${companyName} | Assessed Available Bid Capacity Parameter B

Formula: Available Bid Capacity = 2 * A * N - B
Where B = Value of existing commitments and ongoing works to be completed during period N

No.  Description of Work             Employer          Value (₹ Cr)  Balance Value to Complete
-----------------------------------------------------------------------------------------
1.   Construction of Road Corridor   State PWD         ₹ 14.50 Cr    ₹ 3.20 Cr
2.   Drainage & Culvert Works        Smart City Corp   ₹  6.80 Cr    ₹ 1.40 Cr
-----------------------------------------------------------------------------------------
Total Value of Remaining Commitments (Factor B): ₹ 4.60 Crores

Certified that the above list of ongoing commitments is complete, true, and verifiable.

For M/s ${companyName}
Authorized Signatory`,
    },
    form_f: {
      id: 'form_f',
      title: 'Form F: Joint Venture (JV) Consortium Agreement',
      icon: Users,
      badge: 'Consortium Proforma',
      content: `FORM - F: MEMORANDUM OF UNDERSTANDING / JOINT VENTURE (JV) AGREEMENT
(To be executed on Non-Judicial Stamp Paper of ₹100/- and duly notarized)

This Joint Venture Agreement entered into between:
1. M/s ${companyName} (having 51% share and designated as the "LEAD PARTNER")
AND
2. M/s [[ACTION REQUIRED: Enter JV Partner Firm Name]] (having 49% share and designated as the "JV PARTNER")

WHEREAS the Tender Inviting Authority (${authority}) has invited bids for:
"${tenderTitle}" (Ref No: ${tenderRef}).

NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:
1. The Parties have formed a Joint Venture named "M/s ${companyName} Consortium" strictly for participating in this tender.
2. M/s ${companyName} shall be the LEAD PARTNER and is authorized to sign all documents, incur liabilities, and receive payments and instructions for and on behalf of the JV.
3. The financial and operational share of the JV shall strictly be:
   - Lead Partner: 51% (Meets min 50% technical and financial criteria)
   - JV Partner: 49% (Meets min 25% technical and financial criteria)
4. Both Parties shall be jointly and severally liable to the Employer for full contract execution.

For Lead Partner                       For JV Partner
________________________               ________________________
Authorized Signatory                   Authorized Signatory`,
    },
    form_g: {
      id: 'form_g',
      title: 'Form G: Non-Blacklisting & Debarment Affidavit',
      icon: Shield,
      badge: 'Notarized Stamp Paper',
      content: `AFFIDAVIT / DECLARATION REGARDING NON-BLACKLISTING (CPWD FORM G)
(To be executed on Non-Judicial Stamp Paper of appropriate value and duly notarized)

I, [[ACTION REQUIRED: Enter Deponent Name]], aged about [[ACTION REQUIRED: Age]] years, Authorized Signatory of M/s ${companyName}, do hereby solemnly affirm and declare:

1. That M/s ${companyName} has not been debarred, blacklisted, or suspended by any Central / State Government Department, Public Sector Undertaking (PSU), Autonomous Body, or Urban Local Body from participating in public tenders as on the date of submission of this tender (${tenderRef}).
2. That no partner, director, or promoter of the Bidder has ever been convicted by a court of law for fraud, corruption, or criminal offences related to business operations.
3. That if this declaration is found to be false or incorrect at any stage, the Employer/Tender Inviting Authority shall have full right to cancel our bid, forfeit the EMD/Performance Security, and initiate appropriate legal proceedings.

DEPONENT
For M/s ${companyName}

VERIFICATION:
Verified on this ${new Date().toLocaleDateString('en-GB')} that the contents of paragraphs 1 to 3 are true and correct to the best of my knowledge and belief.

DEPONENT
Duly Attested by Notary Public`,
    },
  };

  const currentForm = forms[activeForm];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentForm.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="surface-card animate-in"
        style={{
          maxWidth: 920,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(249, 115, 22, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cta)',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Standard Government Submission Proformas (Form A – Form G)</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Official CPWD, NHAI, and GeM compliant legal undertakings & financial certificate formats.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Selector Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 10,
            marginBottom: 14,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {Object.values(forms).map((f) => {
            const Icon = f.icon;
            const isActive = activeForm === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveForm(f.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 120ms ease',
                }}
              >
                <Icon size={13} />
                <span>{f.id.toUpperCase().replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>

        {/* Form Content Display */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentForm.title}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(249, 115, 22, 0.12)',
                color: 'var(--accent-cta)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {currentForm.badge}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {currentForm.content}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : `Copy ${currentForm.id.toUpperCase()}`}</span>
          </button>

          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 12 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
export default StandardFormsModal;

