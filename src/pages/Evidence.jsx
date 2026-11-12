import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Eye, ChevronRight, Plus, Bot, X } from 'lucide-react';
import { PROJECTS, REQUIREMENTS } from '../data/mockData';

const EVIDENCE_REQS = [
  { id: 'req-002', label: 'Similar Work Experience (3 projects)', projects: ['proj-001', 'proj-002', 'proj-003'] },
  { id: 'req-001', label: 'Minimum Average Annual Turnover', projects: [] },
  { id: 'req-006', label: 'ISO 9001:2015 Certification', projects: [] },
  { id: 'req-003', label: 'OEM Authorization Letter', projects: [] },
];

const RELEVANCE_CONFIG = {
  'Highly Relevant': { class: 'badge-teal', score: 95 },
  'Relevant': { class: 'badge-blue', score: 78 },
  'Partially Relevant': { class: 'badge-neutral', score: 52 },
  'Not Relevant': { class: 'badge-neutral', score: 20 },
};

export function Evidence({ showToast }) {
  const navigate = useNavigate();
  const [selectedReq, setSelectedReq] = useState(EVIDENCE_REQS[0]);
  const [previewProject, setPreviewProject] = useState(null);

  const matchedProjects = PROJECTS.filter(p => selectedReq.projects.includes(p.id));
  const allProjects = selectedReq.id === 'req-002' ? PROJECTS.filter(p => p.category === 'Water Infrastructure') : matchedProjects;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Evidence</h1>
          <p className="page-subtitle">Company knowledge retrieved and matched to tender requirements.</p>
        </div>
        <div className="ai-indicator">
          <span className="ai-indicator-dot" />
          BidKaro Intelligence Active
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 20, height: 'calc(100vh - 260px)', minHeight: 500 }}>
        {/* LEFT: Requirements list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: '#FAFBFC' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>Requirements</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {EVIDENCE_REQS.map(r => (
              <div key={r.id}
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', background: selectedReq.id === r.id ? 'var(--color-blue-subtle)' : 'transparent', borderLeft: selectedReq.id === r.id ? '3px solid var(--color-blue)' : '3px solid transparent', transition: 'all 0.15s' }}
                onClick={() => setSelectedReq(r)}>
                <div style={{ fontSize: 13, fontWeight: 600, color: selectedReq.id === r.id ? 'var(--color-blue)' : 'var(--color-text-primary)', lineHeight: 1.4 }}>{r.label}</div>
                {r.projects.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CheckCircle size={10} /> {r.projects.length} matches
                  </div>
                )}
                {r.projects.length === 0 && r.id !== 'req-001' && (
                  <div style={{ fontSize: 11, color: 'var(--color-critical)', marginTop: 4 }}>No evidence found</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Evidence cards */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{selectedReq.label}</div>
              {allProjects.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--color-success)', marginTop: 2 }}>
                  <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {allProjects.length} matching {allProjects.length === 1 ? 'record' : 'records'} found
                </div>
              )}
            </div>
            {allProjects.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={() => showToast && showToast('All evidence marked for use in bid', 'success')}>
                <Plus size={13} /> Use All in Bid
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedReq.id === 'req-001' && (
              <div className="card" style={{ borderLeft: '3px solid var(--color-success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Average Annual Turnover — FY2023–25</div>
                  <span className="badge badge-success">Compliant</span>
                </div>
                {[{ year: 'FY2023', val: '₹4.8 Cr' }, { year: 'FY2024', val: '₹6.1 Cr' }, { year: 'FY2025', val: '₹7.2 Cr' }].map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{f.year}</span>
                    <span style={{ fontWeight: 600 }}>{f.val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--color-success-subtle)', borderRadius: 6, fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>
                  Average: ₹6.03 Cr — Exceeds ₹5 Cr requirement
                </div>
                <div className="evidence-card-docs" style={{ marginTop: 12 }}>
                  {['Audited Financials FY2023', 'Audited Financials FY2024', 'Audited Financials FY2025'].map((d, i) => (
                    <div key={i} className="doc-chip"><FileText size={11} />{d}</div>
                  ))}
                </div>
              </div>
            )}

            {selectedReq.id === 'req-003' && (
              <div className="card" style={{ borderLeft: '3px solid var(--color-critical)', textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-critical-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--color-critical)' }}>
                  <X size={22} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-critical)', marginBottom: 6 }}>No OEM Authorization Found</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>No valid authorization letter from an OEM was found in your company vault. This is a hard blocker.</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn btn-danger" onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}>Prepare Letter</button>
                  <button className="btn btn-teal" onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}>
                    <Bot size={14} /> Ask Copilot
                  </button>
                </div>
              </div>
            )}

            {allProjects.map((project, i) => {
              const relConf = RELEVANCE_CONFIG[project.relevance];
              return (
                <div key={project.id} className="evidence-card" style={{ cursor: 'pointer' }} onClick={() => setPreviewProject(project)}>
                  <div className="evidence-card-header">
                    <div>
                      <div className="evidence-card-title">{project.name}</div>
                      <div className="evidence-card-meta">
                        <span>{project.client}</span>
                        <span>·</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{project.value}</span>
                        <span>·</span>
                        <span>Completed {project.year}</span>
                      </div>
                    </div>
                    <span className={`badge ${relConf.class}`}>{project.relevance}</span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Similarity score</div>
                    <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 99 }}>
                      <div style={{ width: `${relConf.score}%`, height: '100%', background: relConf.score > 80 ? 'var(--color-teal)' : 'var(--color-blue)', borderRadius: 99 }} />
                    </div>
                  </div>
                  <div className="evidence-card-docs">
                    {project.evidence.map((d, j) => (
                      <div key={j} className="doc-chip"><FileText size={11} />{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setPreviewProject(project); }}><Eye size={12} /> Preview</button>
                    <button className="btn btn-teal btn-sm" onClick={e => { e.stopPropagation(); showToast && showToast(`${project.name} added to bid`, 'success'); }}>+ Use in Bid</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Preview panel */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', background: '#FAFBFC' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>
              {previewProject ? 'Project Details' : 'Document Preview'}
            </div>
          </div>
          {previewProject ? (
            <div style={{ padding: '20px 16px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>{previewProject.name}</h3>
                <button className="modal-close" onClick={() => setPreviewProject(null)}><X size={16} /></button>
              </div>
              {[
                ['Client', previewProject.client],
                ['Contract Value', previewProject.value],
                ['Year Completed', previewProject.year],
                ['Category', previewProject.category],
                ['Location', previewProject.location],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Project Description</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>{previewProject.description}</div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Evidence Documents</div>
                {previewProject.evidence.map((d, i) => (
                  <div key={i} className="source-citation" style={{ marginBottom: 6 }}>
                    <div className="source-citation-icon blue"><FileText size={13} /></div>
                    <div className="source-citation-doc">{d}</div>
                    <button className="btn btn-ghost btn-sm">View</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }}
                onClick={() => showToast && showToast(`${previewProject.name} added to bid`, 'success')}>
                Use in Bid
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Eye size={22} /></div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                Click on an evidence card to preview project details and documents.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
