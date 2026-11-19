import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ChevronRight, Bot, Eye, X } from 'lucide-react';
import { REQUIREMENTS } from '../data/mockData';

const STATUS_CONFIG = {
  Compliant: { class: 'status-compliant', badge: 'badge-success' },
  'Needs Review': { class: 'status-review', badge: 'badge-warning' },
  Missing: { class: 'status-missing', badge: 'badge-critical' },
  Blocked: { class: 'status-blocked', badge: 'badge-critical' },
};

const CATEGORIES = ['All', 'Eligibility', 'Technical', 'Financial', 'Experience', 'Documents', 'Submission'];

function RequirementDrawer({ req, onClose, navigate }) {
  if (!req) return null;
  const statusConf = STATUS_CONFIG[req.status];
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer drawer-lg">
        <div className="drawer-header">
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{req.category} Requirement</div>
            <div className="drawer-title">{req.title}</div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '10px 14px', background: req.status === 'Compliant' ? 'var(--color-success-subtle)' : req.status === 'Missing' ? 'var(--color-critical-subtle)' : 'var(--color-warning-subtle)', borderRadius: 8 }}>
            <span className={`status-badge ${statusConf.class}`}>{req.status}</span>
            {req.status === 'Compliant' && <span style={{ fontSize: 13, color: 'var(--color-success)' }}>This requirement is met based on available evidence.</span>}
            {req.status === 'Missing' && <span style={{ fontSize: 13, color: 'var(--color-critical)' }}>No supporting evidence found. Action required.</span>}
            {req.status === 'Needs Review' && <span style={{ fontSize: 13, color: 'var(--color-warning)' }}>Evidence found but requires manual verification.</span>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Requirement</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-primary)', padding: '12px 14px', background: 'var(--color-bg)', borderRadius: 8, borderLeft: '3px solid var(--color-navy)' }}>
              {req.detail}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Interpretation</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{req.interpretation}</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Source</div>
            <div className="source-citation">
              <div className="source-citation-icon blue"><FileText size={14} /></div>
              <div>
                <div className="source-citation-doc">{req.source.doc}</div>
                <div className="source-citation-meta">Clause {req.source.clause} · Page {req.source.page}</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Company Assessment</div>
            <div style={{ padding: '12px 14px', background: 'var(--color-bg)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Current status</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{req.companyValue}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 10, marginBottom: 6 }}>Required</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{req.required}</div>
            </div>
          </div>

          {req.evidence.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 8 }}>Supporting Evidence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {req.evidence.map((ev, i) => (
                  <div key={i} className="source-citation">
                    <div className="source-citation-icon teal"><FileText size={14} /></div>
                    <div className="source-citation-doc">{ev}</div>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>View</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="drawer-footer">
          <button className="btn btn-secondary" onClick={() => navigate('/tenders/mjp-water-pipeline/evidence')}>Find Evidence</button>
          <button className="btn btn-teal" onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}>
            <Bot size={14} /> Ask Copilot
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}>Generate Response</button>
        </div>
      </div>
    </>
  );
}

export function Requirements({ showToast }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);

  const filtered = REQUIREMENTS.filter(r => {
    const matchCat = category === 'All' || r.category === category;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.required.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Requirements</h1>
          <p className="page-subtitle">{REQUIREMENTS.length} requirements extracted from tender documents</p>
        </div>
        <button className="btn btn-teal btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}>
          <Bot size={14} /> Ask Copilot
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="filter-bar">
          {CATEGORIES.map(c => (
            <button key={c} className={`filter-pill ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="search-input-wrapper" style={{ marginLeft: 'auto', width: 260 }}>
          <Search className="search-icon" />
          <input className="search-input" placeholder="Search requirements..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrapper">
        {/* Header row */}
        <div style={{ display: 'flex', padding: '10px 20px', background: '#FAFBFC', borderBottom: '1px solid var(--color-border)' }}>
          {[['Requirement', 1.2], ['Required', 1], ['Source', 1], ['Company', 0.8], ['Status', 0.7], ['', 0.5]].map(([label, flex], i) => (
            <div key={i} style={{ flex, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>{label}</div>
          ))}
        </div>
        {filtered.map((req, i) => {
          const statusConf = STATUS_CONFIG[req.status];
          return (
            <div key={req.id} className="req-row" onClick={() => setSelectedReq(req)}>
              <div style={{ flex: 1.2, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{req.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{req.category}</div>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)' }}>{req.required}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--color-blue)', fontWeight: 500 }}>{req.source.doc}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Clause {req.source.clause} · Pg {req.source.page}</div>
              </div>
              <div style={{ flex: 0.8, fontSize: 13, color: req.companyMeets ? 'var(--color-success)' : 'var(--color-critical)', fontWeight: 500 }}>
                {req.companyValue}
              </div>
              <div style={{ flex: 0.7 }}>
                <span className={`status-badge ${statusConf.class}`}>{req.status}</span>
              </div>
              <div style={{ flex: 0.5, textAlign: 'right' }}>
                <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setSelectedReq(req); }}>
                  <Eye size={12} /> View
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={24} /></div>
            <div className="empty-state-title">No requirements found</div>
            <div className="empty-state-desc">Try adjusting your filters</div>
          </div>
        )}
      </div>

      {selectedReq && (
        <RequirementDrawer req={selectedReq} onClose={() => setSelectedReq(null)} navigate={navigate} />
      )}
    </div>
  );
}
