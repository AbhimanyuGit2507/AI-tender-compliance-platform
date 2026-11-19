import React from 'react';
import {
  Sparkles,
  UploadCloud,
  ArrowRight,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { CreditTopUpModal } from '../modals/CreditTopUpModal';
import { VaultQuickModal } from '../modals/VaultQuickModal';

export function WorkspaceEmptyState({
  fileInputRef,
  handleFileUpload,
  isUploading,
  uploadStep,
  uploadPercent,
  tenders,
  dailyFreeAvailable,
  creditModalOpen,
  setCreditModalOpen,
  vaultModalOpen,
  setVaultModalOpen,
  navigate,
}) {
  return (
    <div
      className="animate-in"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 740, width: '100%', margin: '0 auto' }}>
        {/* Centered Glowing AI Orb Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 6,
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent-primary)',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          <Sparkles size={14} />
          <span>STATUTORY PROCUREMENT AUDIT SUITE · CPWD & PUBLIC PROCUREMENT MATRIX</span>
        </div>

        {/* Clean Display Title */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            fontWeight: 550,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            marginBottom: 14,
            color: 'var(--text-primary)',
          }}
        >
          Upload Tender Package to{' '}
          <span
            style={{
              fontFamily: 'var(--font-roman)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--accent-primary-light, #c7d2fe)',
            }}
          >
            Initiate
          </span>{' '}
          Audit
        </h1>

        <p
          style={{
            fontSize: 14.5,
            color: 'var(--text-secondary)',
            maxWidth: 580,
            margin: '0 auto 28px auto',
            lineHeight: 1.6,
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
          }}
        >
          Upload your government tender package (NIT, RFP, or BOQ) to audit statutory qualification
          criteria, verify average 3-year turnover capacity, and compile verified bid packages.
        </p>

        {/* Unified Enterprise Intake Dock */}
        <div
          className="floating-command-dock"
          style={{
            padding: '24px 28px',
            textAlign: 'center',
            position: 'relative',
            marginBottom: 24,
            border: '1.5px dashed var(--accent-border)',
            borderRadius: 14,
            cursor: 'pointer',
            background: 'var(--bg-elevated)',
            transition: 'all 0.2s ease',
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.xlsx,.zip"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          {!isUploading ? (
            <div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: 'var(--accent-subtle)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                  margin: '0 auto 14px',
                }}
              >
                <UploadCloud size={24} />
              </div>

              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                Drop your tender package here, or click to browse
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Supports scanned/digital PDF, Excel BOQ & ZIP packages (
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>MAX 500 PAGES / 50MB</span>)
              </div>

              <button
                type="button"
                className="btn-agent btn-agent-primary"
                style={{ padding: '8px 22px', fontSize: 13, fontWeight: 700 }}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Start Tender Audit <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ padding: '10px 0', textAlign: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <RefreshCw size={16} className="spin" color="var(--accent-primary)" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{uploadStep}</span>
              </div>
              <div className="telemetry-bar-track" style={{ height: 6, maxWidth: 420, margin: '0 auto' }}>
                <div
                  className="telemetry-bar-fill"
                  style={{ width: `${uploadPercent}%`, background: 'var(--accent-gradient)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Active Tenders or Clean Empty Guidance Card */}
        <div style={{ marginBottom: 28 }}>
          {tenders && tenders.length > 0 ? (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 10,
                  textAlign: 'left',
                }}
              >
                Your Active Tender Workspaces:
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                {tenders.map((item) => (
                  <div
                    key={item.id}
                    className="glass-pod glass-pod-interactive"
                    onClick={() => navigate(`/workspace/${item.id}`)}
                    style={{
                      padding: 14,
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}
                      >
                        <span className={`badge-status ${item.readinessScore >= 70 ? 'pass' : 'warn'}`}>
                          {item.readinessScore > 0 ? `${item.readinessScore}% Match` : 'Screening'}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {item.estimatedValueCr > 0 ? `₹${item.estimatedValueCr} Cr` : 'Pending Extr.'}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          lineHeight: 1.35,
                          marginBottom: 4,
                        }}
                      >
                        {item.title}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{item.authority}</div>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 10.5,
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                      }}
                    >
                      <span>Stage {item.pipelineStage || 0} of 3</span>
                      <ChevronRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="glass-pod"
              style={{
                padding: '18px 22px',
                textAlign: 'center',
                background: 'var(--bg-elevated)',
                border: '1px dashed var(--border-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                Tender Intelligence Workspace Ready
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  maxWidth: 520,
                  margin: '0 auto',
                  lineHeight: 1.55,
                }}
              >
                Upload your tender document (NIT, RFP, or BOQ) above. BidKaro's Procurement AI will
                instantly audit your eligibility, detect hidden contract risks, and compile
                submission-ready bid documents.
              </div>
              <div className="signature-stamp" style={{ marginTop: 10, justifyContent: 'center', fontSize: 14 }}>
                ✓ Standardized for Central & State PWD, NHAI, CPWD, MES and Railway Portals
              </div>
            </div>
          )}
        </div>

        {/* 3-Stage Modular Pipeline Indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 999,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            fontSize: 11.5,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--status-pass-text)' }}>
            ● Stage 1: NIT Screening {dailyFreeAvailable ? '[FREE Today]' : '[15 Cr]'}
          </span>
          <span style={{ opacity: 0.4 }}>→</span>
          <span style={{ fontWeight: 600 }}>Stage 2: Eligibility Audit [+25 Cr]</span>
          <span style={{ opacity: 0.4 }}>→</span>
          <span style={{ fontWeight: 600 }}>Stage 3: Bid Package Assembly [+60 Cr]</span>
        </div>
      </div>

      <CreditTopUpModal isOpen={creditModalOpen} onClose={() => setCreditModalOpen(false)} />
      <VaultQuickModal isOpen={vaultModalOpen} onClose={() => setVaultModalOpen(false)} />
    </div>
  );
}

