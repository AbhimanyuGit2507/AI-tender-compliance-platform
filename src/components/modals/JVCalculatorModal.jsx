import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  X,
  FileText,
  TrendingUp,
  Percent,
  Building2,
} from 'lucide-react';

export function JVCalculatorModal({ isOpen, onClose, tender, companyVault }) {
  if (!isOpen) return null;

  const tenderValueCr = tender?.estimated_value_inr
    ? tender.estimated_value_inr / 1e7
    : tender?.valueCr || 25.0;
  const contractYears = tender?.contract_period_years || 1.5;

  // Partner 1 (Lead Partner)
  const [leadName, setLeadName] = useState(companyVault?.companyName || 'Shivalik Infrastructure Pvt Ltd');
  const [leadEquity, setLeadEquity] = useState(51.0);
  const [leadTurnoverCr, setLeadTurnoverCr] = useState(companyVault?.quickMetrics?.turnover3YrAvgCr || 18.0);
  const [leadSolvencyCr, setLeadSolvencyCr] = useState(companyVault?.quickMetrics?.solvencyCr || 8.0);
  const [leadCommitmentsBCr, setLeadCommitmentsBCr] = useState(4.0);

  // Partner 2 (JV Associate Partner)
  const [partnerName, setPartnerName] = useState('Apex Road Builders LLP');
  const [partnerEquity, setPartnerEquity] = useState(49.0);
  const [partnerTurnoverCr, setPartnerTurnoverCr] = useState(12.0);
  const [partnerSolvencyCr, setPartnerSolvencyCr] = useState(5.0);
  const [partnerCommitmentsBCr, setPartnerCommitmentsBCr] = useState(2.0);

  const [copiedAgreement, setCopiedAgreement] = useState(false);

  // CPWD Works Manual 2019/2024 (Clause 4.3) Math:
  const equityTotal = Number(leadEquity) + Number(partnerEquity);
  const isEquityValid = leadEquity >= 50.0 && partnerEquity >= 20.0 && Math.abs(equityTotal - 100.0) < 0.1;

  // Turnover requirements (50% of tender value per year)
  const reqTotalTurnover = 0.5 * tenderValueCr;
  const reqLeadTurnover = 0.5 * reqTotalTurnover;
  const reqPartnerTurnover = 0.25 * reqTotalTurnover;

  const isLeadTurnoverPass = leadTurnoverCr >= reqLeadTurnover;
  const isPartnerTurnoverPass = partnerTurnoverCr >= reqPartnerTurnover;
  const combinedTurnoverCr = Number(leadTurnoverCr) + Number(partnerTurnoverCr);
  const isCombinedTurnoverPass = combinedTurnoverCr >= reqTotalTurnover;

  // Solvency requirements (40% of tender value)
  const reqTotalSolvency = 0.4 * tenderValueCr;
  const reqLeadSolvency = 0.5 * reqTotalSolvency;
  const reqPartnerSolvency = 0.25 * reqTotalSolvency;

  const isLeadSolvencyPass = leadSolvencyCr >= reqLeadSolvency;
  const isPartnerSolvencyPass = partnerSolvencyCr >= reqPartnerSolvency;

  // Bid Capacity: Capacity = 2 * A * N - B
  const k = 2.0;
  const capLead = Math.max(0, k * leadTurnoverCr * contractYears - leadCommitmentsBCr);
  const capPartner = Math.max(0, k * partnerTurnoverCr * contractYears - partnerCommitmentsBCr);
  const combinedCapacity = capLead + capPartner;
  const isCapacityPass = combinedCapacity >= tenderValueCr;

  const isOverallQualified =
    isEquityValid &&
    isLeadTurnoverPass &&
    isPartnerTurnoverPass &&
    isCombinedTurnoverPass &&
    isLeadSolvencyPass &&
    isPartnerSolvencyPass &&
    isCapacityPass;

  const generateAgreementText = () => {
    return `MEMORANDUM OF UNDERSTANDING / JOINT VENTURE (JV) AGREEMENT (CPWD FORM F)
(To be executed on Non-Judicial Stamp Paper of Rs 100/- and duly notarized)

This Joint Venture Agreement entered between:
1. M/s ${leadName} (Lead Partner - ${leadEquity}%)
AND
2. M/s ${partnerName} (JV Partner - ${partnerEquity}%)

For Tender: ${tender?.title || 'Public Works Tender'}
Ref: ${tender?.reference_no || 'NIT Reference'}
Tender Value: ₹${tenderValueCr.toFixed(2)} Crores | Period: ${contractYears} Years

1. The Parties have formed a Joint Venture named "M/s ${leadName} - ${partnerName} JV".
2. M/s ${leadName} shall be the Lead Partner with full authority to sign, execute, and bind the JV.
3. Financial & Operational Share:
   - Lead Partner (${leadName}): ${leadEquity}% (Turnover: ₹${leadTurnoverCr} Cr, Solvency: ₹${leadSolvencyCr} Cr)
   - JV Partner (${partnerName}): ${partnerEquity}% (Turnover: ₹${partnerTurnoverCr} Cr, Solvency: ₹${partnerSolvencyCr} Cr)
4. Combined Available Bid Capacity: ₹${combinedCapacity.toFixed(2)} Crores (Exceeds requirement ₹${tenderValueCr.toFixed(2)} Cr).
5. Both Parties agree to be jointly and severally responsible and liable to the Employer for full contract execution.

Signed & Sealed by Authorized Signatories of Both Partners.`;
  };

  const handleCopyAgreement = () => {
    navigator.clipboard.writeText(generateAgreementText());
    setCopiedAgreement(true);
    setTimeout(() => setCopiedAgreement(false), 2000);
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
          maxWidth: 780,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 28,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Joint Venture (JV) / Consortium Qualification Solver</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Evaluates combined financial & technical capacity per CPWD Works Manual Clause 4.3.
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

        {/* Tender context strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-elevated)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>Target Tender: </span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tender?.title || 'Tender Package'}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontFamily: 'var(--font-mono)' }}>
            <span>Est. Value: <strong>₹{tenderValueCr.toFixed(2)} Cr</strong></span>
            <span>Period: <strong>{contractYears} Yrs</strong></span>
            <span>Formula: <strong>2×A×N - B</strong></span>
          </div>
        </div>

        {/* Partners Input Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Partner 1: Lead Partner */}
          <div
            style={{
              padding: 16,
              background: 'var(--bg-elevated)',
              borderRadius: 10,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#a78bfa' }}>Partner 1: Lead Partner</span>
              <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(139, 92, 246, 0.15)', fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>
                Min 50% Equity
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Firm / Company Name
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Equity Share (%)
                  </label>
                  <input
                    type="number"
                    value={leadEquity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setLeadEquity(val);
                      setPartnerEquity(Math.max(0, 100 - val));
                    }}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Turnover (₹ Cr)
                  </label>
                  <input
                    type="number"
                    value={leadTurnoverCr}
                    onChange={(e) => setLeadTurnoverCr(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Solvency (₹ Cr)
                  </label>
                  <input
                    type="number"
                    value={leadSolvencyCr}
                    onChange={(e) => setLeadSolvencyCr(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Ongoing Work B (₹ Cr)
                  </label>
                  <input
                    type="number"
                    value={leadCommitmentsBCr}
                    onChange={(e) => setLeadCommitmentsBCr(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: isLeadTurnoverPass ? '#10b981' : '#ef4444', fontWeight: 600, marginTop: 4 }}>
                {isLeadTurnoverPass ? '✓ Meets min 50% Turnover threshold' : `✗ Below min 50% turnover (₹${reqLeadTurnover.toFixed(2)} Cr)`}
              </div>
            </div>
          </div>

          {/* Partner 2: JV Associate */}
          <div
            style={{
              padding: 16,
              background: 'var(--bg-elevated)',
              borderRadius: 10,
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#06b6d4' }}>Partner 2: JV Associate Partner</span>
              <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(6, 182, 212, 0.15)', fontSize: 11, fontWeight: 700, color: '#06b6d4' }}>
                Min 20% Equity
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Firm / Company Name
                </label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Equity Share (%)
                  </label>
                  <input
                    type="number"
                    value={partnerEquity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPartnerEquity(val);
                      setLeadEquity(Math.max(0, 100 - val));
                    }}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Turnover (₹ Cr)
                  </label>
                  <input
                    type="number"
                    value={partnerTurnoverCr}
                    onChange={(e) => setPartnerTurnoverCr(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Solvency (₹ Cr)
                  </label>
                  <input
                    type="number"
                    value={partnerSolvencyCr}
                    onChange={(e) => setPartnerSolvencyCr(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Ongoing Work B (₹ Cr)
                  </label>
                  <input
                    type="number"
                    value={partnerCommitmentsBCr}
                    onChange={(e) => setPartnerCommitmentsBCr(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: isPartnerTurnoverPass ? '#10b981' : '#ef4444', fontWeight: 600, marginTop: 4 }}>
                {isPartnerTurnoverPass ? '✓ Meets min 25% Turnover threshold' : `✗ Below min 25% turnover (₹${reqPartnerTurnover.toFixed(2)} Cr)`}
              </div>
            </div>
          </div>
        </div>

        {/* Combined JV Outcome Banner */}
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: isOverallQualified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${isOverallQualified ? '#10b981' : '#ef4444'}`,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isOverallQualified ? <CheckCircle2 size={18} color="#10b981" /> : <AlertTriangle size={18} color="#ef4444" />}
              <span style={{ fontSize: 15, fontWeight: 800, color: isOverallQualified ? '#10b981' : '#ef4444' }}>
                {isOverallQualified ? 'JOINT VENTURE ENTITY QUALIFIED' : 'JOINT VENTURE DISQUALIFIED'}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14 }}>
              Combined Capacity: ₹{combinedCapacity.toFixed(2)} Cr / ₹{tenderValueCr.toFixed(2)} Cr
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            {isOverallQualified
              ? `The proposed ${leadName} (${leadEquity}%) & ${partnerName} (${partnerEquity}%) consortium satisfies all CPWD Works Manual Clause 4.3 equity ratios, minimum partner qualification benchmarks, and combined Available Bid Capacity.`
              : 'The proposed consortium fails one or more mandatory eligibility thresholds. Review individual partner turnover, equity ratios, or ongoing commitments.'}
          </p>
        </div>

        {/* Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleCopyAgreement}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            {copiedAgreement ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copiedAgreement ? 'Agreement Copied!' : 'Copy CPWD Form F (JV Agreement)'}</span>
          </button>

          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 12 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
export default JVCalculatorModal;

