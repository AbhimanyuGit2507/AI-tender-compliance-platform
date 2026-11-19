import React from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Wrench,
} from 'lucide-react';

export function WorkspaceTopBar({
  currentTender,
  navigate,
  transferTenderToVault,
  deltaCostToStage2,
  deltaCostToStage3,
  handleAdvanceStage,
  toolsMenuOpen,
  setToolsMenuOpen,
  setJvModalOpen,
  setFormsModalOpen,
  setLeakModalOpen,
  handleRunFinalAudit,
  isRunningAudit,
}) {
  return (
    <div
      style={{
        height: 52,
        minHeight: 52,
        maxHeight: 52,
        padding: '0 14px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 12,
      }}
    >
      {/* Left: Back button + Title & Ref + Authority */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 auto' }}>
        <button
          onClick={() => navigate('/workspace')}
          className="btn-agent btn-agent-ghost"
          style={{ padding: '6px 8px', borderRadius: 6, flexShrink: 0 }}
          title="Back to All Tenders"
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span
              title={currentTender.title}
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.01em',
              }}
            >
              {currentTender.title}
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
                background: 'rgba(59, 130, 246, 0.18)',
                color: '#93c5fd',
                border: '1px solid rgba(96, 165, 250, 0.4)',
              }}
              title={`Official Tender Reference: ${currentTender.refNo}`}
            >
              {currentTender.refNo}
            </span>
          </div>
          {currentTender.authority && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
                marginTop: 1,
              }}
              title={currentTender.authority}
            >
              {currentTender.authority}
            </span>
          )}
        </div>
      </div>

      {/* Right: Stage CTA + Consolidated Tools Dropdown */}
      {currentTender.isInvalidDoc ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              fontWeight: 700,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            Ineligible Document
          </span>
          <button
            className="btn-agent btn-agent-primary"
            style={{
              fontSize: 12,
              padding: '5px 12px',
              background: 'var(--accent-cta)',
              borderColor: 'var(--accent-cta)',
              color: '#fff',
            }}
            onClick={async () => {
              await transferTenderToVault(currentTender.id);
              navigate('/vault');
            }}
          >
            <ShieldCheck size={14} /> Transfer to Vault
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, position: 'relative' }}>
          {/* Current Stage Badge */}
          <span
            className="badge-status pass"
            style={{
              fontSize: 11,
              padding: '3px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            Stage {currentTender.pipelineStage || 1}:{' '}
            {currentTender.pipelineStage >= 3
              ? 'Full Package'
              : currentTender.pipelineStage === 2
              ? 'Audit'
              : 'Screened'}
          </span>

          {/* Primary Action Next-Stage Button */}
          {(currentTender.pipelineStage || 1) < 3 ? (
            <button
              className="btn-agent btn-agent-primary"
              style={{
                fontSize: 12,
                padding: '5px 11px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                borderColor: '#f97316',
                color: '#FFFFFF',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 10px rgba(249, 115, 22, 0.35)',
                whiteSpace: 'nowrap',
              }}
              onClick={() => handleAdvanceStage((currentTender.pipelineStage || 1) === 1 ? 2 : 3)}
              title={
                (currentTender.pipelineStage || 1) === 1
                  ? `Advance to Stage 2: Detailed Qualification Audit (+${deltaCostToStage2} Cr)`
                  : `Generate Complete .DOCX Bid Package (+${deltaCostToStage3} Cr)`
              }
            >
              <Zap size={13} />
              <span>
                {(currentTender.pipelineStage || 1) === 1
                  ? `Stage 2 (+${deltaCostToStage2} Cr)`
                  : `Stage 3: Bid (+${deltaCostToStage3} Cr)`}
              </span>
            </button>
          ) : (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle2 size={13} /> Bid Dossier Ready (.DOCX)
            </span>
          )}

          {/* Consolidated Tools Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-agent btn-agent-secondary"
              style={{
                fontSize: 12,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: toolsMenuOpen ? 'var(--bg-elevated)' : undefined,
              }}
              onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
              title="Procurement Utilities & Solvers"
            >
              <Wrench size={13} />
              <span>Tools</span>
              <ChevronDown size={12} style={{ opacity: 0.8 }} />
            </button>

            {/* Tools Dropdown Menu */}
            {toolsMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: 230,
                  background: 'var(--bg-surface, #0E131F)',
                  border: '1px solid var(--border-strong, rgba(255,255,255,0.15))',
                  borderRadius: 8,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  zIndex: 100,
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <button
                  onClick={() => {
                    setToolsMenuOpen(false);
                    setJvModalOpen(true);
                  }}
                  className="btn-agent btn-agent-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    fontSize: 11.5,
                    padding: '7px 10px',
                    borderRadius: 5,
                  }}
                >
                  <span style={{ fontSize: 13, marginRight: 6 }}>👥</span>
                  <span>JV & Consortium Solver</span>
                </button>
                <button
                  onClick={() => {
                    setToolsMenuOpen(false);
                    setFormsModalOpen(true);
                  }}
                  className="btn-agent btn-agent-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    fontSize: 11.5,
                    padding: '7px 10px',
                    borderRadius: 5,
                  }}
                >
                  <span style={{ fontSize: 13, marginRight: 6 }}>⚖️</span>
                  <span>CPWD Forms A to G</span>
                </button>
                <button
                  onClick={() => {
                    setToolsMenuOpen(false);
                    setLeakModalOpen(true);
                  }}
                  className="btn-agent btn-agent-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    fontSize: 11.5,
                    padding: '7px 10px',
                    borderRadius: 5,
                  }}
                >
                  <span style={{ fontSize: 13, marginRight: 6 }}>🛡️</span>
                  <span>Cover 1 Price Leak Scan</span>
                </button>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />
                <button
                  onClick={() => {
                    setToolsMenuOpen(false);
                    handleRunFinalAudit();
                  }}
                  disabled={isRunningAudit || !currentTender.backendId}
                  className="btn-agent btn-agent-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    fontSize: 11.5,
                    padding: '7px 10px',
                    borderRadius: 5,
                    color: 'var(--accent-primary)',
                  }}
                >
                  <ShieldCheck size={13} style={{ marginRight: 6 }} />
                  <span>{isRunningAudit ? 'Auditing 40+ Clauses...' : 'Disqualification Audit'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

