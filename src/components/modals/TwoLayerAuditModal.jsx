import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export function TwoLayerAuditModal({ isOpen, onClose, auditResult, onResolveFinding }) {
  if (!isOpen || !auditResult) return null;

  const {
    total_findings = 0,
    critical_blockers = 0,
    warnings = 0,
    is_submission_ready = false,
    findings = [],
  } = auditResult;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 20, 0.78)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="glass-pod animate-in"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-glass)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: is_submission_ready ? 'var(--status-pass-bg)' : 'var(--status-warn-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${is_submission_ready ? 'var(--status-pass-border)' : 'var(--status-warn-border)'}`,
              }}
            >
              <ShieldCheck size={20} color={is_submission_ready ? 'var(--status-pass)' : 'var(--status-warn)'} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Pre-Submission Disqualification Audit</span>
                <span className="signature-stamp" style={{ fontSize: 10.5 }}>
                  {is_submission_ready ? '✓ 100% Submission Ready' : 'Review Required'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Comprehensive Dual Verification · Structural Integrity & Technical Specification Audit
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Banner */}
        <div
          style={{
            padding: '14px 24px',
            background: is_submission_ready
              ? 'rgba(16, 185, 129, 0.08)'
              : 'rgba(239, 68, 68, 0.08)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {is_submission_ready ? (
              <CheckCircle2 size={18} color="var(--status-pass)" />
            ) : (
              <AlertTriangle size={18} color="var(--status-fail)" />
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {is_submission_ready
                  ? 'Zero Disqualification Blockers Detected'
                  : `${critical_blockers} Critical Blocker(s) Found Before Portal Submission`}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {is_submission_ready
                  ? 'All mandatory affidavits, BG validity dates, and mathematical criteria are compliant.'
                  : 'Resolve the highlighted blockers below to avoid technical portal rejection.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <span
              className={`badge-status ${critical_blockers === 0 ? 'pass' : 'fail'}`}
              style={{ fontSize: 11 }}
            >
              {critical_blockers} Blockers
            </span>
            <span
              className={`badge-status ${warnings === 0 ? 'pass' : 'warn'}`}
              style={{ fontSize: 11 }}
            >
              {warnings} Warnings
            </span>
          </div>
        </div>

        {/* Findings List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {findings.length === 0 ? (
            <div style={{ padding: '36px 12px', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="var(--status-pass)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Clean Bill of Audit
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                No unresolved [[ACTION REQUIRED]] tags, certificate expirations, or missing undertakings.
              </div>
            </div>
          ) : (
            findings.map((finding, idx) => {
              const isCrit = finding.severity === 'critical';
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: isCrit ? 'var(--status-fail-bg)' : 'var(--status-warn-bg)',
                    border: `1px solid ${isCrit ? 'var(--status-fail-border)' : 'var(--status-warn-border)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isCrit ? (
                        <AlertCircle size={14} color="var(--status-fail)" />
                      ) : (
                        <AlertTriangle size={14} color="var(--status-warn)" />
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: isCrit ? 'var(--status-fail-text)' : 'var(--status-warn-text)',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-heading)',
                        }}
                      >
                        {finding.clause_ref || 'Audit Finding'}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: isCrit ? 'var(--status-fail)' : 'var(--status-warn)',
                        color: '#FFFFFF',
                      }}
                    >
                      {finding.severity?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {finding.issue}
                  </div>

                  {finding.resolution && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-secondary)',
                        paddingTop: 4,
                        borderTop: '1px dashed var(--border-subtle)',
                      }}
                    >
                      <strong style={{ color: 'var(--accent-primary)' }}>Recommended Action: </strong>
                      {finding.resolution}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-glass)',
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            BidKaro Audit Engine v2.4 · CPWD Manual & Indian Procurement Standards
          </span>
          <button
            onClick={onClose}
            className="btn-agent btn-agent-primary"
            style={{ padding: '7px 18px', fontSize: 12.5 }}
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default TwoLayerAuditModal;
