import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users,
  Info,
  Check,
  Building2,
  Clock,
  HelpCircle,
} from 'lucide-react';

export function EligibilityTelemetryTab({
  currentTender,
  companyVault,
  liveCompliance,
  setJvModalOpen,
  navigate,
  transferTenderToVault,
}) {
  if (!currentTender) return null;

  // Document Ineligibility / Non-Tender Triage View
  if (currentTender.isInvalidDoc) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Non-Tender Ineligibility Header */}
        <div
          className="glass-pod"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #ef4444',
            background: 'rgba(239, 68, 68, 0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>
              Document Ineligibility Assessment
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                color: '#ef4444',
                margin: '2px 0',
              }}
            >
              0% Score · Non-Tender File
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              Personal identity document identified. No procurement criteria extracted.
            </div>
          </div>

          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px dashed #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 800,
              color: '#ef4444',
              fontFamily: 'var(--font-display)',
            }}
          >
            0%
          </div>
        </div>

        {/* Deficiencies Breakdown */}
        <div className="glass-pod" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Tender Requirement Deficiencies
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                borderRadius: 6,
              }}
            >
              <span>Notice Inviting Tender (NIT) Ref No.</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>MISSING (Personal ID)</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                borderRadius: 6,
              }}
            >
              <span>Estimated Contract Value & EMD</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>NOT APPLICABLE</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'var(--bg-surface)',
                borderRadius: 6,
              }}
            >
              <span>Technical & Project Experience Criteria</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>NOT DETECTED</span>
            </div>
          </div>
        </div>

        {/* Vault Integration Action Card */}
        <div className="glass-pod" style={{ padding: 16, border: '1px solid var(--accent-border)' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--accent-primary)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Recommended Action: Company Vault Integration
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
            In Indian public procurement, Director and Authorized Signatory identity credentials (Aadhaar/PAN) are mandatory attachments during digital bid signing. Transferring this document records{' '}
            <strong>{currentTender.identifiedSubject || 'Authorized Signatory'}</strong> in your evidence vault.
          </p>
          <button
            className="btn-agent btn-agent-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '9px 16px',
              fontSize: 12.5,
              background: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
              color: '#fff',
            }}
            onClick={async () => {
              if (transferTenderToVault) await transferTenderToVault(currentTender.id);
              navigate('/vault');
            }}
          >
            <ShieldCheck size={14} /> One-Click Transfer to Company Vault
          </button>
        </div>
      </div>
    );
  }

  // Procurement Math & Qualification Calculations
  const tenderVal = currentTender.estimatedValueCr || 0;
  const userTurnover = companyVault?.turnover3YrAvgCr || 0;
  const turnoverReq = tenderVal > 0 ? Number((tenderVal * 0.5).toFixed(2)) : 0;
  const turnoverRatio = turnoverReq > 0 ? Math.round((userTurnover / turnoverReq) * 100) : 100;
  const turnoverPassed = turnoverReq > 0 ? userTurnover >= turnoverReq : true;

  const N = currentTender.contractPeriodYears || 1.0;
  const maxTurnoverA = companyVault?.maxTurnoverACr || companyVault?.turnover3YrAvgCr || 0;
  const existingCommitmentsB = companyVault?.existingCommitmentsBCr || 0;
  const availableBidCapacity = Math.max(0, 2 * maxTurnoverA * N - existingCommitmentsB);
  const capacityRatio = tenderVal > 0 && maxTurnoverA > 0 ? Math.round((availableBidCapacity / tenderVal) * 100) : 100;
  const capacityPassed = tenderVal > 0 && maxTurnoverA > 0 ? availableBidCapacity >= tenderVal : true;
  const capacitySurplus = (availableBidCapacity - tenderVal).toFixed(2);

  const readiness =
    liveCompliance?.readiness_score !== undefined
      ? liveCompliance.readiness_score
      : currentTender.readinessScore || 0;

  const isFullyQualified = readiness >= 70 && turnoverPassed && capacityPassed;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Executive Verdict Banner */}
      <div
        className="glass-pod"
        style={{
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: isFullyQualified ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-strong)',
          background: isFullyQualified ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-surface)',
        }}
      >
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span
              className={`badge-status ${isFullyQualified ? 'pass' : readiness > 40 ? 'warn' : 'fail'}`}
              style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              {isFullyQualified ? 'Bid Qualification: Cleared' : 'Qualification Audit in Progress'}
            </span>
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              margin: '2px 0 4px',
            }}
          >
            {readiness > 0 ? `${readiness}% Procurement Readiness` : 'Awaiting Audit'}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {isFullyQualified ? (
              <span style={{ color: 'var(--status-pass-text)', fontWeight: 600 }}>
                ✓ Contractor satisfies all CPWD financial turnover, available bid capacity, and experience norms.
              </span>
            ) : !capacityPassed && tenderVal > 0 ? (
              <span style={{ color: 'var(--status-warn-text)', fontWeight: 600 }}>
                ⚠️ Bidding Capacity shortfall: Assessed capacity is ₹{Math.abs(Number(capacitySurplus))} Cr below tender value. Consider a Joint Venture (JV) partnership.
              </span>
            ) : (
              'Advance through Stage 1 & Stage 2 to verify technical clauses against your Company Vault.'
            )}
          </div>
        </div>

        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: isFullyQualified ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-elevated)',
            border: isFullyQualified ? '3px solid #10b981' : '2px dashed var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: isFullyQualified ? '#10b981' : 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}
        >
          {readiness > 0 ? `${readiness}%` : '—'}
        </div>
      </div>

      {/* Core Procurement Math Telemetry */}
      <div className="glass-pod" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Statutory Procurement Math (CPWD / GFR Rules)
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Evaluated dynamically against your verified Company Vault
            </div>
          </div>
          <button
            onClick={() => navigate('/vault')}
            className="btn-agent btn-agent-secondary"
            style={{ fontSize: 10.5, padding: '3px 8px' }}
          >
            Edit Vault <ExternalLink size={11} />
          </button>
        </div>

        {/* 1. 3-Year Average Turnover */}
        <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              1. 3-Yr Financial Turnover (CPWD Cl. 4.2)
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11.5,
                fontWeight: 700,
                color: turnoverPassed ? 'var(--status-pass-text)' : 'var(--status-warn-text)',
              }}
            >
              {turnoverReq > 0 && userTurnover > 0
                ? `₹${userTurnover.toFixed(2)} Cr vs Req. ₹${turnoverReq.toFixed(2)} Cr (${turnoverRatio}%)`
                : turnoverReq > 0
                ? `Req. Threshold: ₹${turnoverReq.toFixed(2)} Cr`
                : `Vault Average: ₹${userTurnover.toFixed(2)} Cr`}
            </span>
          </div>

          <div className="telemetry-bar-track" style={{ height: 6, margin: '6px 0' }}>
            <div
              className="telemetry-bar-fill"
              style={{
                width: `${Math.min(100, turnoverRatio)}%`,
                background: turnoverPassed ? '#10b981' : '#f59e0b',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-tertiary)' }}>
            <span>Statutory Requirement: 50% of annual tender value</span>
            <span style={{ fontWeight: 600, color: turnoverPassed ? '#10b981' : '#f59e0b' }}>
              {turnoverPassed ? `✓ QUALIFIED (Surplus: +₹${(userTurnover - turnoverReq).toFixed(2)} Cr)` : '⚠️ Shortfall in turnover'}
            </span>
          </div>
        </div>

        {/* 2. Assessed Available Bid Capacity */}
        <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              2. Available Bid Capacity: 2 × A × N - B
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11.5,
                fontWeight: 700,
                color: capacityPassed ? 'var(--status-pass-text)' : 'var(--status-warn-text)',
              }}
            >
              {tenderVal > 0 && maxTurnoverA > 0
                ? `₹${availableBidCapacity.toFixed(2)} Cr vs Tender ₹${tenderVal.toFixed(2)} Cr`
                : tenderVal > 0
                ? `Tender Value: ₹${tenderVal.toFixed(2)} Cr`
                : `Assessed Capacity: ₹${availableBidCapacity.toFixed(2)} Cr`}
            </span>
          </div>

          <div className="telemetry-bar-track" style={{ height: 6, margin: '6px 0' }}>
            <div
              className="telemetry-bar-fill"
              style={{
                width: `${Math.min(100, capacityRatio)}%`,
                background: capacityPassed ? '#10b981' : '#ef4444',
              }}
            />
          </div>

          {/* Formula Parameter Details */}
          <div
            style={{
              padding: '6px 8px',
              background: 'var(--bg-elevated)',
              borderRadius: 6,
              fontSize: 10.5,
              color: 'var(--text-secondary)',
              marginTop: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                <strong>A</strong> (Peak turnover compounded @ 10%/yr): <strong>₹{maxTurnoverA.toFixed(2)} Cr</strong>
              </span>
              <span>
                <strong>N</strong> (Completion Period): <strong>{N} Years</strong>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                <strong>B</strong> (Existing commitments on hand): <strong>₹{existingCommitmentsB.toFixed(2)} Cr</strong>
              </span>
              <span style={{ fontWeight: 700, color: capacityPassed ? '#10b981' : '#ef4444' }}>
                {capacityPassed ? `Headroom: +₹${capacitySurplus} Cr` : `Shortfall: -₹${Math.abs(Number(capacitySurplus))} Cr`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => setJvModalOpen(true)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#a78bfa',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Users size={12} /> Test Joint Venture (JV) Split Solver
            </button>
          </div>
        </div>

        {/* 3. Bank Guarantee & EMD Rule Audit Card */}
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              3. Bank Guarantee & EMD Mandate
            </span>
            <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              Req. Validity: 165 Days (120+45)
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.45, fontSize: 11 }}>
            ⚠️ <strong>GFR 170 / CPWD Manual Sec 18.2 Warning:</strong> MSME EMD exemption is strictly disallowed for Works/Civil contracts. BGs must be issued via SFMS to designated nodal branch IFSC.
          </div>
        </div>

        {/* 4. Past Experience (CPWD 3/2/1 Rule) */}
        <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              4. Similar Experience (CPWD 3/2/1 Rule)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontSize: 11 }}>
              {companyVault?.projects?.length || 0} Projects Recorded
            </span>
          </div>

          <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Threshold: 1 work $\ge$ 80% (₹{(tenderVal * 0.8).toFixed(2)} Cr) OR 2 works $\ge$ 60% (₹{(tenderVal * 0.6).toFixed(2)} Cr) OR 3 works $\ge$ 40% (₹{(tenderVal * 0.4).toFixed(2)} Cr)
          </div>

          {companyVault?.projects && companyVault.projects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {companyVault.projects.map((proj, pIdx) => {
                const meetsThreshold = tenderVal > 0 ? proj.valueCr >= tenderVal * 0.4 : true;
                return (
                  <div key={pIdx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span>{proj.name} ({proj.year || 'Completed'})</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: meetsThreshold ? '#10b981' : 'var(--text-primary)' }}>
                        ₹{proj.valueCr} Cr {meetsThreshold ? '· QUALIFIED' : ''}
                      </span>
                    </div>
                    <div className="telemetry-bar-track" style={{ height: 4, marginTop: 2 }}>
                      <div
                        className="telemetry-bar-fill"
                        style={{
                          width: `${Math.min(100, tenderVal > 0 ? Math.round((proj.valueCr / (tenderVal * 0.5)) * 100) : 100)}%`,
                          background: meetsThreshold ? '#10b981' : 'var(--text-tertiary)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
              No past project completion certificates linked in Vault. Add them to automatically satisfy experience checks.
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Statutory Checklist */}
      <div className="glass-pod" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: 10 }}>
          Mandatory Statutory Submission Checklist
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'Company Incorporation Certificate & Memorandum of Association (MoA)',
            'Valid GST Registration & Up-to-Date GSTR-3B Returns',
            'Permanent Account Number (PAN) Card of Company',
            '3-Year Audited Balance Sheets and P&L Statements with CA UDIN',
            'Bankers Solvency Certificate / Working Capital Limit Certificate',
            'Non-Blacklisting / Debarment Undertaking on Non-Judicial Stamp Paper',
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontSize: 12,
                padding: '6px 8px',
                background: 'var(--bg-surface)',
                borderRadius: 6,
              }}
            >
              <CheckCircle2 size={14} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

