import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Eye, Plus, Bot, FolderOpen, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { MAIN_TENDER, GENERATED_DOCUMENTS } from '../data/mockData';

const SOURCE_DOCS = [
  { name: 'NIT.pdf', size: '2.4 MB', type: 'pdf', status: 'Indexed' },
  { name: 'Technical_Specifications.pdf', size: '12.8 MB', type: 'pdf', status: 'Indexed' },
  { name: 'Financial_Requirements.pdf', size: '3.1 MB', type: 'pdf', status: 'Indexed' },
  { name: 'BOQ.xlsx', size: '1.8 MB', type: 'xlsx', status: 'Indexed' },
  { name: 'Annexures.pdf', size: '9.2 MB', type: 'pdf', status: 'Indexed' },
  { name: 'Corrigendum_01.pdf', size: '0.8 MB', type: 'pdf', status: 'Indexed', badge: 'Updated' },
  { name: 'PreBid_Clarifications.pdf', size: '1.2 MB', type: 'pdf', status: 'Indexed' },
];

const REQUIRED_DOCS = [
  { name: 'OEM Authorization Letter', source: 'Clause 12.1', status: 'Missing', type: 'Declaration' },
  { name: 'Tender Declaration / Undertaking', source: 'Clause 9.1', status: 'Ready', type: 'Declaration' },
  { name: 'Technical Methodology Statement', source: 'Section 7.0', status: 'Draft', type: 'Technical' },
  { name: 'Compliance Matrix', source: 'Annexure F', status: 'Ready', type: 'Compliance' },
  { name: 'Bid Security (EMD)', source: 'Clause 8.1', status: 'Needs Action', type: 'Financial' },
  { name: 'Company Profile', source: 'Standard', status: 'Ready', type: 'Company' },
];

const STATUS_MAP = {
  'Indexed': { class: 'badge-teal', label: 'Indexed' },
  'Missing': { class: 'badge-critical', label: 'Missing' },
  'Ready': { class: 'badge-success', label: 'Ready' },
  'Draft': { class: 'badge-warning', label: 'Draft' },
  'Needs Action': { class: 'badge-critical', label: 'Needs Action' },
  'Final': { class: 'badge-success', label: 'Final' },
  'Ready for Review': { class: 'badge-blue', label: 'Ready for Review' },
};

export function Documents({ showToast }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('source');
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fileIcon = (type) => type === 'xlsx' 
    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 5px', borderRadius: 4 }}>XLS</span>
    : <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 5px', borderRadius: 4 }}>PDF</span>;

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Tender source documents, required submissions, and generated documents.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}>
            <Plus size={14} /> Generate Document
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 24, minHeight: 0 }}>
        {/* Left Pane: Document List */}
        <div style={{ flex: selectedDoc ? '0 0 320px' : 1, transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 0, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[['source', 'Source', SOURCE_DOCS.length], ['required', 'Required', REQUIRED_DOCS.length], ['generated', 'Generated', GENERATED_DOCUMENTS.length]].map(([key, label, count]) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '10px 12px', fontSize: 13, fontWeight: tab === key ? 600 : 500, color: tab === key ? 'var(--color-blue)' : 'var(--color-text-secondary)', background: 'none', border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--color-blue)' : 'transparent'}`, cursor: 'pointer', marginBottom: -1, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                {label}
                <span style={{ fontSize: 11, background: tab === key ? 'var(--color-blue-subtle)' : 'var(--color-bg)', color: tab === key ? 'var(--color-blue)' : 'var(--color-text-tertiary)', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>{count}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tab === 'source' && (
              <div className="table-wrapper">
                <table className="data-table">
                  {!selectedDoc && <thead><tr><th>Document</th><th>Size</th><th>Status</th><th>Actions</th></tr></thead>}
                  <tbody>
                    {SOURCE_DOCS.map((d, i) => (
                      <tr key={i} onClick={() => setSelectedDoc(d)} style={{ cursor: 'pointer', background: selectedDoc?.name === d.name ? 'var(--color-blue-subtle)' : 'transparent' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {fileIcon(d.type)}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                              {d.badge && <span className="badge badge-warning" style={{ marginTop: 3 }}>{d.badge}</span>}
                            </div>
                          </div>
                        </td>
                        {!selectedDoc && <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.size}</td>}
                        {!selectedDoc && <td><span className={`badge ${STATUS_MAP[d.status]?.class}`}>{d.status}</span></td>}
                        {!selectedDoc && (
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); }}><Eye size={12} /> View</button>
                              <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate('/tenders/mjp-water-pipeline/copilot'); }}><Bot size={12} /> Ask</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Keeping other tabs simple for now */}
            {tab === 'required' && (
              <div className="table-wrapper">
                <table className="data-table">
                  {!selectedDoc && <thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>}
                  <tbody>
                    {REQUIRED_DOCS.map((d, i) => (
                      <tr key={i} onClick={() => setSelectedDoc(d)} style={{ cursor: 'pointer', background: selectedDoc?.name === d.name ? 'var(--color-blue-subtle)' : 'transparent' }}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{d.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-blue)' }}>{d.source}</div>
                        </td>
                        {!selectedDoc && <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{d.type}</td>}
                        {!selectedDoc && <td><span className={`badge ${STATUS_MAP[d.status]?.class}`}>{d.status}</span></td>}
                        {!selectedDoc && <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {d.status === 'Missing' ? (
                              <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); navigate('/tenders/mjp-water-pipeline/generate'); }}>Prepare</button>
                            ) : (
                              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); }}><Eye size={12} /> View</button>
                            )}
                          </div>
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'generated' && (
              <div className="table-wrapper">
                <table className="data-table">
                  {!selectedDoc && <thead><tr><th>Document</th><th>Version</th><th>Status</th></tr></thead>}
                  <tbody>
                    {GENERATED_DOCUMENTS.map((d, i) => (
                      <tr key={i} onClick={() => setSelectedDoc(d)} style={{ cursor: 'pointer', background: selectedDoc?.name === d.name ? 'var(--color-blue-subtle)' : 'transparent' }}>
                        <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{d.name}</td>
                        {!selectedDoc && <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>v{d.version}</td>}
                        {!selectedDoc && <td><span className={`badge ${STATUS_MAP[d.status]?.class}`}>{d.status}</span></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Split Viewer & Analysis */}
        {selectedDoc && (
          <div style={{ flex: 1, display: 'flex', gap: 16, minWidth: 0, animation: 'fadeIn 0.3s' }}>
            {/* PDF Viewer Mock */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--grad-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="header-icon-btn" onClick={() => setSelectedDoc(null)}><X size={16} /></button>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedDoc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{selectedDoc.size || 'Auto-generated'} · Page 1 of 48</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm"><Download size={14} /></button>
                </div>
              </div>
              
              <div style={{ flex: 1, padding: 32, overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)' }}>
                {/* Mock PDF Page */}
                <div style={{ background: 'white', width: '100%', maxWidth: 700, margin: '0 auto', aspectRatio: '1 / 1.414', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 48, borderRadius: 4 }}>
                  <div style={{ height: 24, width: '40%', background: '#E2E8F0', marginBottom: 32, borderRadius: 4 }} />
                  <div style={{ height: 16, width: '100%', background: '#F1F5F9', marginBottom: 16, borderRadius: 4 }} />
                  <div style={{ height: 16, width: '90%', background: '#F1F5F9', marginBottom: 16, borderRadius: 4 }} />
                  <div style={{ height: 16, width: '95%', background: '#F1F5F9', marginBottom: 16, borderRadius: 4 }} />
                  <div style={{ height: 16, width: '80%', background: '#F1F5F9', marginBottom: 32, borderRadius: 4 }} />
                  
                  {/* Highlighted section */}
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px dashed var(--color-blue)', padding: 12, borderRadius: 4, marginBottom: 32 }}>
                    <div style={{ height: 16, width: '100%', background: '#E0E7FF', marginBottom: 16, borderRadius: 4 }} />
                    <div style={{ height: 16, width: '85%', background: '#E0E7FF', borderRadius: 4 }} />
                  </div>

                  <div style={{ height: 16, width: '100%', background: '#F1F5F9', marginBottom: 16, borderRadius: 4 }} />
                  <div style={{ height: 16, width: '70%', background: '#F1F5F9', marginBottom: 16, borderRadius: 4 }} />
                </div>
              </div>
            </div>

            {/* AI Analysis Pane */}
            <div style={{ width: 360, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--grad-surface)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--grad-ai)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Bot size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>AI Document Analysis</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Extracting insights and requirements</div>
                </div>
              </div>

              <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Summary</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', padding: '12px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    This document outlines the technical specifications for the HDPE pipeline installation. Key requirements include <strong>Clause 12.1</strong> regarding OEM authorization for pipe supplies.
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Extracted Requirements</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="card card-sm" style={{ borderLeft: '3px solid var(--color-critical)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="badge badge-critical">MISSING</span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>OEM Authorization</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Required as per Clause 12.1. No evidence found.</div>
                    </div>
                    <div className="card card-sm" style={{ borderLeft: '3px solid var(--color-success)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="badge badge-success">COMPLIANT</span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>Similar Work Experience</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>3 matching projects found in company vault.</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Quick Actions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}><FileText size={14} /> Draft OEM Letter</button>
                    <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}><CheckCircle size={14} /> Check all compliance</button>
                    <button className="btn btn-teal btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}><Bot size={14} /> Discuss with Copilot</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
