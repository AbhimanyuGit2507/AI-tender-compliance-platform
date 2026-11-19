import React from 'react';
import { Info } from 'lucide-react';
import { EligibilityTelemetryTab } from './EligibilityTelemetryTab';
import { DocumentProofTab } from './DocumentProofTab';
import { BOQCorrigendaTab } from './BOQCorrigendaTab';
import { BidPackageCompilerTab } from './BidPackageCompilerTab';

export function WorkspaceRightCanvas({
  canvasTab,
  setCanvasTab,
  currentTender,
  companyVault,
  liveCompliance,
  liveBOQ,
  liveCorrigenda,
  liveGeneratedDocs,
  compilingDoc,
  copiedKey,
  setJvModalOpen,
  navigate,
  transferTenderToVault,
  focusedClause,
  setFocusedClause,
  setInputPrompt,
  handleExportBOQ,
  setCorrigendumDiffOpen,
  handleCompileDoc,
  setLeakModalOpen,
  setFormsModalOpen,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'relative',
      }}
    >
      {/* Segmented Top Switcher with Live Indicators */}
      <div
        style={{
          height: 52,
          padding: '0 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', padding: 3, borderRadius: 8, border: '1px solid var(--border-subtle)', minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            {
              id: 'telemetry',
              label: '📋 Eligibility',
              badge: currentTender.readinessScore > 0 ? `${currentTender.readinessScore}%` : null,
            },
            {
              id: 'pdf',
              label: '📄 Tender Proof',
              badge: `${liveCompliance?.items?.length || currentTender.requirements?.length || 5} Cl.`,
            },
            {
              id: 'boq',
              label: '📊 BOQ & Diff',
              badge: `${liveBOQ?.items?.length || currentTender.boqItems?.length || 5} Items`,
            },
            {
              id: 'compiler',
              label: '📦 Bid Drafter',
              badge: '.DOCX',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCanvasTab(tab.id)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: canvasTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                background: canvasTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                color: canvasTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 120ms ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: canvasTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-elevated)',
                    color: canvasTab === tab.id ? '#fff' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <span
          className={`badge-status ${currentTender.verdict === 'Qualified' ? 'pass' : 'warn'}`}
          style={{
            fontSize: 11.5,
            padding: '4px 10px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {currentTender.verdict || 'In Review'}
        </span>
      </div>

      {/* Contextual Executive Subtitle Bar */}
      <div
        style={{
          padding: '8px 16px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-secondary)',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden' }}>
          <Info size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {canvasTab === 'telemetry' && 'Contractor Eligibility Audit · CPWD Formula (2AN - B), Turnover Thresholds & Past Experience.'}
            {canvasTab === 'pdf' && 'Tender Proof & Clause Scrutiny · Official Scanned Pages with Verified Clause Citations.'}
            {canvasTab === 'boq' && 'BOQ Schedule & Corrigenda · Itemized Rates, Quantities & Official Amendments.'}
            {canvasTab === 'compiler' && 'Submission Package Compiler · Automated CPWD Forms A–G & Editable Word (.docx) Bids.'}
          </span>
        </div>
        <span
          style={{
            fontSize: 10.5,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-tertiary)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {canvasTab === 'telemetry' && 'CPWD Cl. 4.2 · GFR 170'}
          {canvasTab === 'pdf' && 'Two-Cover Verification'}
          {canvasTab === 'boq' && 'CPWD Schedule B'}
          {canvasTab === 'compiler' && 'Forms A–G Proformas'}
        </span>
      </div>

      {/* Canvas Body Viewports */}
      <div style={{ flex: '1 1 0%', height: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 16, overscrollBehavior: 'contain' }}>
        
        {/* TAB 1: LIVE MATH & TELEMETRY */}
        {canvasTab === 'telemetry' && (
          <EligibilityTelemetryTab
            currentTender={currentTender}
            companyVault={companyVault}
            liveCompliance={liveCompliance}
            setJvModalOpen={setJvModalOpen}
            navigate={navigate}
            transferTenderToVault={transferTenderToVault}
          />
        )}

        {/* TAB 2: DOCUMENT PROOF CANVAS */}
        {canvasTab === 'pdf' && (
          <DocumentProofTab
            currentTender={currentTender}
            focusedClause={focusedClause}
            setFocusedClause={setFocusedClause}
            liveCompliance={liveCompliance}
            setInputPrompt={setInputPrompt}
          />
        )}

        {/* TAB 3: BOQ & CORRIGENDUM */}
        {canvasTab === 'boq' && (
          <BOQCorrigendaTab
            currentTender={currentTender}
            liveBOQ={liveBOQ}
            liveCorrigenda={liveCorrigenda}
            handleExportBOQ={handleExportBOQ}
            setCorrigendumDiffOpen={setCorrigendumDiffOpen}
          />
        )}

        {/* TAB 4: BID COMPILER (.DOCX) */}
        {canvasTab === 'compiler' && (
          <BidPackageCompilerTab
            currentTender={currentTender}
            companyVault={companyVault}
            liveGeneratedDocs={liveGeneratedDocs}
            compilingDoc={compilingDoc}
            copiedKey={copiedKey}
            handleCompileDoc={handleCompileDoc}
            setLeakModalOpen={setLeakModalOpen}
            setFormsModalOpen={setFormsModalOpen}
          />
        )}

      </div>
    </div>
  );
}
