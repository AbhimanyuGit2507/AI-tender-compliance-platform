import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, X, Eye, Bot, Search, ChevronRight } from 'lucide-react';
import { REQUIREMENTS, COMPLIANCE_SUMMARY } from '../data/mockData';

const STATUS_FILTERS = ['All', 'Compliant', 'Needs Review', 'Missing', 'Blocked'];

const STATUS_CONFIG = {
  Compliant: { icon: '✓', iconColor: 'var(--color-success)', bg: 'var(--color-success-subtle)', border: '#BBF7D0', class: 'status-compliant' },
  'Needs Review': { icon: '!', iconColor: 'var(--color-warning)', bg: 'var(--color-warning-subtle)', border: '#FDE68A', class: 'status-review' },
  Missing: { icon: '✕', iconColor: 'var(--color-critical)', bg: 'var(--color-critical-subtle)', border: '#FECACA', class: 'status-missing' },
  Blocked: { icon: '✕', iconColor: '#991B1B', bg: '#FEF2F2', border: '#FECACA', class: 'status-blocked' },
};

export function Compliance({ showToast }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = REQUIREMENTS.filter(r => {
    const matchFilter = filter === 'All' || r.status === filter;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Compliance</h1>
          <p className="page-subtitle">See exactly what your company meets, what is missing, and what needs attention.</p>
        </div>
        <button className="btn btn-teal btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}>
          <Bot size={14} /> Run Full Check
        </button>
      </div>

      {/* Summary strip */}
      <div className="card" style={{ padding: '20px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Bid Readiness</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 36, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{COMPLIANCE_SUMMARY.score}<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)' }}>/100</span></div>
          </div>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          {[
            { val: COMPLIANCE_SUMMARY.compliant, label: 'Compliant', color: 'var(--color-success)', filter: 'Compliant' },
            { val: COMPLIANCE_SUMMARY.needsReview, label: 'Needs Review', color: 'var(--color-warning)', filter: 'Needs Review' },
            { val: COMPLIANCE_SUMMARY.missing, label: 'Missing', color: 'var(--color-critical)', filter: 'Missing' },
            { val: COMPLIANCE_SUMMARY.blocked, label: 'Blocked', color: '#991B1B', filter: 'Blocked' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setFilter(s.filter)}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="filter-bar">
          {STATUS_FILTERS.map(f => (
            <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="search-input-wrapper" style={{ marginLeft: 'auto', width: 240 }}>
          <Search className="search-icon" />
          <input className="search-input" placeholder="Filter requirements..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Compliance rows — header */}
      <div style={{ marginBottom: 2, display: 'flex', gap: 0 }}>
        {[['Requirement', 1.4], ['Tender Requirement', 1], ['Company Record', 0.9], ['Evidence', 1.2], ['Result', 0.7], ['Actions', 0.7]].map(([label, flex]) => (
          <div key={label} style={{ flex, padding: '6px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)' }}>{label}</div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(req => {
          const conf = STATUS_CONFIG[req.status];
          return (
            <div key={req.id} className="compliance-row" style={{ cursor: 'default' }}>
              <div style={{ flex: 1.4, padding: '14px 12px', borderRight: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{req.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{req.category}</div>
              </div>
              <div style={{ flex: 1, padding: '14px 12px', borderRight: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{req.required}</div>
                <div style={{ fontSize: 11, color: 'var(--color-blue)', marginTop: 3 }}>{req.source.doc} · Cl. {req.source.clause}</div>
              </div>
              <div style={{ flex: 0.9, padding: '14px 12px', borderRight: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: req.companyMeets ? 'var(--color-success)' : req.status === 'Missing' ? 'var(--color-critical)' : 'var(--color-warning)' }}>
                  {req.companyValue}
                </div>
              </div>
              <div style={{ flex: 1.2, padding: '14px 12px', borderRight: '1px solid var(--color-border)' }}>
                {req.evidence.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {req.evidence.slice(0, 2).map((ev, i) => (
                      <div key={i} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
                        <span style={{ width: 4, height: 4, borderRadius: 99, background: 'var(--color-border-strong)', display: 'inline-block' }} />
                        {ev}
                      </div>
                    ))}
                    {req.evidence.length > 2 && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>+{req.evidence.length - 2} more</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--color-critical)', fontStyle: 'italic' }}>No evidence found</div>
                )}
              </div>
              <div style={{ flex: 0.7, padding: '14px 12px', borderRight: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
                <span className={`status-badge ${conf.class}`}>{req.status}</span>
              </div>
              <div style={{ flex: 0.7, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                {req.status === 'Compliant' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/evidence')}>View Evidence</button>
                )}
                {req.status === 'Missing' && (
                  <>
                    <button className="btn btn-danger btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/evidence')}>Find Evidence</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}>Prepare Letter</button>
                  </>
                )}
                {req.status === 'Needs Review' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/evidence')}>Review</button>
                )}
                {req.status === 'Blocked' && (
                  <button className="btn btn-danger btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}>
                    <Bot size={12} /> Resolve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No items found</div>
          <div className="empty-state-desc">Adjust your filter to see requirements</div>
        </div>
      )}
    </div>
  );
}
