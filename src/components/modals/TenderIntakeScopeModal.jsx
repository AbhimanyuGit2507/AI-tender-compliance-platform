import React, { useState } from 'react';
import {
  FileText,
  Zap,
  CheckCircle2,
  Shield,
  Layers,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  X,
  Sparkles,
  Info,
  Scale,
  DownloadCloud,
  Check,
} from 'lucide-react';

export function TenderIntakeScopeModal({
  isOpen,
  onClose,
  files = [],
  credits = 0,
  dailyFreeAvailable = true,
  onConfirmLaunch,
}) {
  const [scopeMode, setScopeMode] = useState('stages'); // 'stages' | 'modular'
  const [selectedScope, setSelectedScope] = useState('stage1');
  const [customTitle, setCustomTitle] = useState('');

  if (!isOpen) return null;

  // Inferred default title from first file
  const firstFileName = files[0]?.name ? files[0].name.replace(/\.[^/.]+$/, '') : 'Tender Package';
  const effectiveTitle = customTitle.trim() || firstFileName;

  // File category inference
  const categorizeFile = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('boq') || lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
      return { label: 'BOQ Financial Schedule', color: '#10B981', icon: Layers };
    }
    if (lower.includes('corrigend') || lower.includes('addendum')) {
      return { label: 'Corrigendum / Amendment', color: '#F59E0B', icon: AlertTriangle };
    }
    if (lower.includes('drawing') || lower.endsWith('.dwg') || lower.endsWith('.zip')) {
      return { label: 'Technical Drawings / Specs', color: '#8B5CF6', icon: FileCheck };
    }
    return { label: 'Notice Inviting Tender (NIT)', color: '#38BDF8', icon: FileText };
  };

  // Cost calculation
  const getCost = (scopeKey) => {
    if (scopeKey === 'stage1') {
      return dailyFreeAvailable ? 0 : 15;
    }
    if (scopeKey === 'stage2') {
      return dailyFreeAvailable ? 25 : 40;
    }
    if (scopeKey === 'stage3') {
      return dailyFreeAvailable ? 85 : 100;
    }
    if (scopeKey === 'boq_only') return 10;
    if (scopeKey === 'corrigendum_only') return 5;
    if (scopeKey === 'forms_only') return 15;
    if (scopeKey === 'emd_audit_only') return 5;
    return 0;
  };

  const selectedCost = getCost(selectedScope);
  const hasEnoughCredits = credits >= selectedCost;

  const handleLaunch = () => {
    if (!hasEnoughCredits) return;
    if (onConfirmLaunch) {
      onConfirmLaunch(selectedScope, files, effectiveTitle);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 5, 8, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="surface-card"
        style={{
          width: '100%',
          maxWidth: 720,
          background: 'var(--bg-surface, #0E131F)',
          border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.15))',
          borderRadius: 14,
          padding: 0,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated, rgba(255, 255, 255, 0.02))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(249, 115, 22, 0.35)',
              }}
            >
              <FileCheck size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                Tender Intake & Objective Scope
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                Select what operations BidKaro AI should execute on this tender dossier
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Uploaded Documents List */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Uploaded Dossier ({files.length} {files.length === 1 ? 'Document' : 'Documents'})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from(files).map((file, idx) => {
                const cat = categorizeFile(file.name);
                const IconComponent = cat.icon;
                const sizeKB = (file.size / 1024).toFixed(0);
                const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                const sizeStr = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'var(--bg-elevated, rgba(255, 255, 255, 0.03))',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <IconComponent size={15} color={cat.color} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 380,
                        }}
                      >
                        {file.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: `${cat.color}15`,
                          color: cat.color,
                          border: `1px solid ${cat.color}35`,
                        }}
                      >
                        {cat.label}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {sizeStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div>
            <div style={{ display: 'flex', gap: 6, background: 'var(--bg-elevated)', padding: 3, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setScopeMode('stages');
                  setSelectedScope('stage1');
                }}
                style={{
                  flex: 1,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: scopeMode === 'stages' ? 700 : 500,
                  cursor: 'pointer',
                  background: scopeMode === 'stages' ? 'var(--accent-primary)' : 'transparent',
                  color: scopeMode === 'stages' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 120ms ease',
                }}
              >
                <Zap size={14} />
                <span>Full Progressive Stages</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScopeMode('modular');
                  setSelectedScope('boq_only');
                }}
                style={{
                  flex: 1,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: scopeMode === 'modular' ? 700 : 500,
                  cursor: 'pointer',
                  background: scopeMode === 'modular' ? 'var(--accent-primary)' : 'transparent',
                  color: scopeMode === 'modular' ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 120ms ease',
                }}
              >
                <Layers size={14} />
                <span>Modular Single-Task Utilities (Pay Only For Needed Output)</span>
              </button>
            </div>

            {/* Daily Pass Notification Banner */}
            {dailyFreeAvailable ? (
              <div
                style={{
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#10B981',
                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Daily Free Screening Active:</strong> Your 1st NIT screening today is completely <strong>FREE (0 Credits)</strong>!
                </span>
              </div>
            ) : (
              <div
                style={{
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 12,
                }}
              >
                <Info size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Daily Pass Used Today:</strong> Standard modular credit pricing applies below (resets at midnight IST).
                </span>
              </div>
            )}

            {/* MODE 1: Full Progressive Stages */}
            {scopeMode === 'stages' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Option 1: Stage 1 Quick Screening */}
                <div
                  onClick={() => setSelectedScope('stage1')}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: selectedScope === 'stage1' ? '2px solid #F97316' : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                    background: selectedScope === 'stage1' ? 'rgba(249, 115, 22, 0.08)' : 'var(--bg-elevated, rgba(255,255,255,0.02))',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selectedScope === 'stage1' ? '5px solid #F97316' : '2px solid var(--text-tertiary)',
                          background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: 13.5, fontWeight: 750, color: 'var(--text-primary)' }}>
                        ⚡ Stage 1: Quick NIT Screening & Red-Flag Audit
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                        Recommended First Step
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: dailyFreeAvailable ? '#10B981' : 'var(--accent-primary)' }}>
                        {dailyFreeAvailable ? '0 Credits (FREE Pass)' : '15 Credits'}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Instant audit: extracts issuing entity, tender ref, EMD/PBG terms, critical disqualification blockers, and prepares interactive Copilot Q&A.
                  </p>
                </div>

                {/* Option 2: Stage 2 Deep Multi-Clause Audit */}
                <div
                  onClick={() => setSelectedScope('stage2')}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: selectedScope === 'stage2' ? '2px solid #F97316' : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                    background: selectedScope === 'stage2' ? 'rgba(249, 115, 22, 0.08)' : 'var(--bg-elevated, rgba(255,255,255,0.02))',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selectedScope === 'stage2' ? '5px solid #F97316' : '2px solid var(--text-tertiary)',
                          background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: 13.5, fontWeight: 750, color: 'var(--text-primary)' }}>
                        🎯 Stage 2: Deep Qualification & Mathematical Capacity Matrix
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {dailyFreeAvailable ? '+25 Credits' : '40 Credits'}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    40+ clause OCR audit cross-referenced with your Company Vault: CPWD formula math (2AN - B), 3/2/1 similar experience verification, and pre-bid query drafts.
                  </p>
                </div>

                {/* Option 3: Stage 3 Complete Bid Package */}
                <div
                  onClick={() => setSelectedScope('stage3')}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: selectedScope === 'stage3' ? '2px solid #F97316' : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                    background: selectedScope === 'stage3' ? 'rgba(249, 115, 22, 0.08)' : 'var(--bg-elevated, rgba(255,255,255,0.02))',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selectedScope === 'stage3' ? '5px solid #F97316' : '2px solid var(--text-tertiary)',
                          background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: 13.5, fontWeight: 750, color: 'var(--text-primary)' }}>
                        🚀 Stage 3: Full Bid Package Dossier (.DOCX)
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {dailyFreeAvailable ? '+85 Credits' : '100 Credits'}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Complete turnkey bid submittal: generates CPWD Form A–G statutory declarations, CA proformas, priced BOQ schedules, and editable Word (.docx) technical bid.
                  </p>
                </div>
              </div>
            )}

            {/* MODE 2: Modular Single-Task Utilities */}
            {scopeMode === 'modular' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Modular 1: BOQ Rate Analysis */}
                <div
                  onClick={() => setSelectedScope('boq_only')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: selectedScope === 'boq_only' ? '2px solid #10B981' : '1px solid var(--border-subtle)',
                    background: selectedScope === 'boq_only' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selectedScope === 'boq_only' ? '5px solid #10B981' : '2px solid var(--text-tertiary)',
                          background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        📊 BOQ Schedule Rate Analysis & Excel Export Only
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>10 Credits</span>
                  </div>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Parses all line-items, quantities, and rates from BOQ schedule. Outputs clean Excel (.xlsx) file. Skips legal qualification checks.
                  </p>
                </div>

                {/* Modular 2: Corrigendum Diff */}
                <div
                  onClick={() => setSelectedScope('corrigendum_only')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: selectedScope === 'corrigendum_only' ? '2px solid #F59E0B' : '1px solid var(--border-subtle)',
                    background: selectedScope === 'corrigendum_only' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selectedScope === 'corrigendum_only' ? '5px solid #F59E0B' : '2px solid var(--text-tertiary)',
                          background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        ⚖️ Corrigendum Impact & Side-by-Side Clause Diff
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B' }}>5 Credits</span>
                  </div>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Compares uploaded addendum/corrigendum against base NIT. Flags date extensions, EMD relaxations, and altered technical specifications.
                  </p>
                </div>

                {/* Modular 3: CPWD Forms A-G Only */}
                <div
                  onClick={() => setSelectedScope('forms_only')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: selectedScope === 'forms_only' ? '2px solid #38BDF8' : '1px solid var(--border-subtle)',
                    background: selectedScope === 'forms_only' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selectedScope === 'forms_only' ? '5px solid #38BDF8' : '2px solid var(--text-tertiary)',
                          background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        📦 CPWD Form A–G Statutory Undertakings Only
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#38BDF8' }}>15 Credits</span>
                  </div>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Auto-populates standard CPWD proformas (Non-Blacklisting, Site Visit, Litigation History) with Company Vault credentials.
                  </p>
                </div>

                {/* Modular 4: EMD & MSME Audit Only */}
                <div
                  onClick={() => setSelectedScope('emd_audit_only')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: selectedScope === 'emd_audit_only' ? '2px solid #A855F7' : '1px solid var(--border-subtle)',
                    background: selectedScope === 'emd_audit_only' ? 'rgba(168, 85, 247, 0.08)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: selectedScope === 'emd_audit_only' ? '5px solid #A855F7' : '2px solid var(--text-tertiary)',
                          background: '#fff',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                        🛡️ EMD Mandate, Bank Guarantee & MSME Exemption Check
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#A855F7' }}>5 Credits</span>
                  </div>
                  <p style={{ margin: '4px 0 0 26px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Verifies whether MSME/Udyam exemption applies under GFR 170 / CPWD manual, bank guarantee validity dates, and nodal branch SFMS rules.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Credit Transparency Footer Bar */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={15} color="#38BDF8" />
              <span style={{ color: 'var(--text-secondary)' }}>
                Workspace Balance: <strong style={{ color: 'var(--text-primary)' }}>{credits} Credits</strong>
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Deducting for this run: </span>
              <strong style={{ color: selectedCost === 0 ? '#10B981' : 'var(--accent-primary)', fontSize: 13 }}>
                {selectedCost === 0 ? '0 Credits (FREE)' : `${selectedCost} Credits`}
              </strong>
            </div>
          </div>

        </div>

        {/* Action Controls */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated, rgba(255, 255, 255, 0.02))',
          }}
        >
          <button
            onClick={onClose}
            className="btn-agent btn-agent-secondary"
            style={{ padding: '8px 16px', fontSize: 12.5 }}
          >
            Cancel
          </button>

          <button
            onClick={handleLaunch}
            disabled={!hasEnoughCredits}
            className="btn-agent btn-agent-primary"
            style={{
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 750,
              background: hasEnoughCredits ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#475569',
              borderColor: hasEnoughCredits ? '#f97316' : '#475569',
              color: '#FFFFFF',
              boxShadow: hasEnoughCredits ? '0 4px 15px rgba(249, 115, 22, 0.35)' : 'none',
              cursor: hasEnoughCredits ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>
              Execute Selected Operations ({selectedCost === 0 ? 'FREE' : `${selectedCost} Cr`})
            </span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}

export default TenderIntakeScopeModal;
