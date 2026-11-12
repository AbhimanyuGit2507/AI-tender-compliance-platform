import React, { useState } from 'react';
import {
  Download,
  Eye,
  Shield,
  FileText,
  RefreshCw,
  Check,
  Scale,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import { DocumentPreviewModal } from '../modals/DocumentPreviewModal';

export function BidPackageCompilerTab({
  currentTender,
  companyVault,
  liveGeneratedDocs,
  compilingDoc,
  copiedKey,
  handleCompileDoc,
  setLeakModalOpen,
  setFormsModalOpen,
}) {
  if (!currentTender) return null;

  const [previewDoc, setPreviewDoc] = useState(null); // { code, name }

  const documents = [
    {
      name: 'Complete Bid Package Bundle (.DOCX Master)',
      code: 'all',
      desc: 'All statutory forms, financial undertakings, and technical proposals compiled into a single comprehensive Word bundle.',
      isMaster: true,
      category: 'Cover 1: Master Pack',
    },
    {
      name: 'Tender Submission Cover Letter (Form 1)',
      code: 'cover_letter',
      desc: `Formal submission letter addressed to ${currentTender.authority || 'Issuing Authority'} with 120-day bid validity and EMD undertaking.`,
      category: 'Cover 1: Statutory Letter',
    },
    {
      name: 'Non-Blacklisting & Integrity Undertaking (Form 2)',
      code: 'non_blacklisting',
      desc: 'Statutory affidavit confirming no debarment across any central or state procurement body, suitable for Stamp Paper.',
      category: 'Cover 1: Legal Affidavit',
    },
    {
      name: 'Bid Validity & Solvency Undertaking (Form 3)',
      code: 'bid_validity',
      desc: `Statement of 3-year turnover and available bid capacity for this tender with CA UDIN certification format.`,
      category: 'Cover 1: Financial Undertaking',
    },
    {
      name: 'Technical Methodology & Construction Workplan',
      code: 'methodology',
      desc: `Full EPC construction methodology, machinery deployment, and quality control workplan tailored for ${currentTender.title}.`,
      category: 'Cover 1: Technical Proposal',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Executive Disqualification Shield & Envelope Architecture Banner */}
      <div
        className="glass-pod"
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'rgba(16, 185, 129, 0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                Cover 1 Disqualification Shield Active
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Two-Envelope e-Procurement Compliance (CPWD / GeM / CPPP)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setLeakModalOpen(true)}
              className="btn-agent btn-agent-secondary"
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              title="Scan technical submittal to ensure zero commercial price leaks"
            >
              <Shield size={12} color="#10b981" />
              <span>Leak Scan</span>
            </button>
            <button
              onClick={() => setFormsModalOpen(true)}
              className="btn-agent btn-agent-primary"
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              title="Inspect official CPWD Forms A through G"
            >
              <Scale size={12} />
              <span>Forms A–G</span>
            </button>
          </div>
        </div>

        <div
          style={{
            padding: '8px 10px',
            background: 'var(--bg-elevated)',
            borderRadius: 6,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <strong>Procurement Rule:</strong> In Indian public tenders, revealing any financial/rate figures in Cover 1 results in instant technical disqualification. BidKaro drafts verified technical and statutory packages with <strong>0% commercial price leakage</strong>.
        </div>
      </div>

      {/* Document Library */}
      <div className="glass-pod" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              Statutory Bid Submittal Documents
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Auto-populated with company parameters, CA UDIN, and tender criteria
            </div>
          </div>
          <span className="signature-stamp" style={{ fontSize: 10 }}>
            Microsoft Word (.docx)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {documents.map((doc, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 14px',
                background: doc.isMaster ? 'var(--accent-glow)' : 'var(--bg-surface)',
                borderRadius: 8,
                border: doc.isMaster ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'all 120ms ease',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--text-primary)' }}>
                    {doc.name}
                  </span>
                  <span className="signature-stamp" style={{ fontSize: 9.5 }}>
                    {doc.category}
                  </span>
                  {doc.isMaster && (
                    <span className="citation-pill" style={{ fontSize: 9.5, background: 'rgba(249, 115, 22, 0.12)', color: 'var(--accent-cta)' }}>
                      ⚡ 1-Click Master Pack
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                  {doc.desc}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  className="btn-agent btn-agent-secondary"
                  style={{ fontSize: 11, padding: '4px 9px' }}
                  onClick={() => setPreviewDoc(doc)}
                  title="Preview document in browser"
                >
                  <Eye size={12} />
                  <span>Preview</span>
                </button>

                <button
                  className={`btn-agent ${doc.isMaster ? 'btn-agent-primary' : 'btn-agent-secondary'}`}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  disabled={compilingDoc === doc.code}
                  onClick={() => handleCompileDoc(doc.code, doc.name)}
                >
                  {compilingDoc === doc.code ? (
                    <>
                      <RefreshCw size={12} className="spin" />
                      <span>Compiling...</span>
                    </>
                  ) : copiedKey === doc.code ? (
                    <>
                      <Check size={12} color="var(--status-pass)" />
                      <span>Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download size={12} />
                      <span>.DOCX</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Previously Generated Compilations */}
      {liveGeneratedDocs && liveGeneratedDocs.length > 0 && (
        <div className="glass-pod" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, color: 'var(--text-secondary)' }}>
            Saved Document Compilations ({liveGeneratedDocs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {liveGeneratedDocs.map((genDoc) => (
              <div
                key={genDoc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'var(--bg-surface)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {genDoc.doc_type?.replace(/_/g, ' ').toUpperCase()} v{genDoc.version_num || 1}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                    Compiled {new Date(genDoc.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  className="btn-agent btn-agent-ghost"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => api.downloadDocxFile(currentTender.backendId, genDoc.id, `${genDoc.doc_type}.docx`)}
                >
                  <Download size={12} /> Re-download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-App Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          docType={previewDoc.code}
          docName={previewDoc.name}
          tender={currentTender}
          companyVault={companyVault}
          onDownloadDocx={(code, name) => {
            handleCompileDoc(code, name);
          }}
        />
      )}
    </div>
  );
}

