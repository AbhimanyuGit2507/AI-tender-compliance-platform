import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, FileText, Clock, Bot, Shield, ChevronRight, X, Eye } from 'lucide-react';
import { MAIN_TENDER, COMPLIANCE_SUMMARY } from '../data/mockData';

function ReadinessRing({ score }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 85 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning)' : 'var(--color-critical)';
  return (
    <div style={{ position: 'relative', width: 120, height: 120, filter: 'drop-shadow(0 0 16px rgba(6, 182, 212, 0.2))' }}>
      <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease', filter: 'drop-shadow(0 0 8px currentColor)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, lineHeight: 1, color: 'var(--color-text-primary)' }}>{score}</div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)', marginTop: 2 }}>/ 100</div>
      </div>
    </div>
  );
}

const ISSUES = [
  {
    id: 'iss-1',
    type: 'blocked',
    title: 'OEM Authorization Letter',
    badge: 'MISSING',
    desc: 'The tender requires a valid manufacturer authorization letter for HDPE and DI pipe equipment (Clause 12.1). No document was found in your company vault.',
    actions: ['Find Evidence', 'Prepare Document'],
    routes: ['/tenders/mjp-water-pipeline/evidence', '/tenders/mjp-water-pipeline/generate'],
  },
  {
    id: 'iss-2',
    type: 'review',
    title: 'Turnover Evidence — 3-Year Average',
    badge: 'NEEDS REVIEW',
    desc: 'Current linked evidence covers FY2025 only. The tender requires audited financial statements for FY2023, FY2024, and FY2025 to calculate the 3-year average.',
    actions: ['Review Financials'],
    routes: ['/tenders/mjp-water-pipeline/compliance'],
  },
  {
    id: 'iss-3',
    type: 'review',
    title: 'Technical Methodology',
    badge: 'NEEDS REVIEW',
    desc: 'The current technical response draft does not yet address pipeline pressure testing requirements per Corrigendum 01 (24-hour test per IS:3114).',
    actions: ['Review Response'],
    routes: ['/tenders/mjp-water-pipeline/generate'],
  },
];

const KEY_REQUIREMENTS = [
  { label: 'Min. Average Annual Turnover', value: '₹5 Crore', status: 'Compliant', company: '₹7.2 Cr' },
  { label: 'Similar Works (Last 5 Years)', value: '3 Projects (≥₹3 Cr each)', status: 'Compliant', company: '3 Projects found' },
  { label: 'ISO 9001:2015', value: 'Valid Certificate', status: 'Compliant', company: 'Valid till Feb 2027' },
  { label: 'OEM Authorization', value: 'Valid Letter', status: 'Missing', company: 'Not found' },
  { label: 'EMD / Bid Security', value: '₹48,60,000', status: 'Needs Review', company: 'To be arranged' },
  { label: 'Technical Methodology', value: 'Detailed Document', status: 'Needs Review', company: 'Draft — incomplete' },
];

const RECENT_CHANGES = [
  { type: 'warning', date: '02 Oct 2026', title: 'Corrigendum 01 issued', desc: 'Deadline extended by 7 days. BOQ quantity and testing duration updated.' },
  { type: 'info', date: '28 Sep 2026', title: 'Pre-bid clarifications published', desc: 'Authority issued clarifications on soil conditions and pipe specifications.' },
  { type: 'info', date: '20 Sep 2026', title: 'Tender uploaded', desc: 'NIT, Technical Specifications, BOQ and Annexures processed.' },
];

export function TenderOverview({ showToast }) {
  const navigate = useNavigate();

  return (
    <div className="page-content">
      {/* Hero metrics */}
      <div className="card" style={{ marginBottom: 28, padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {/* Key numbers */}
          <div style={{ display: 'flex', gap: 0, flex: 1 }}>
            {[
              { label: 'Tender Value', value: '₹48.60 Cr', sub: 'Estimated' },
              { label: 'Bid Closing', value: '24 Oct 2026', sub: '15:00 IST' },
              { label: 'EMD', value: '₹48.60 L', sub: 'Bank Guarantee / DD' },
              { label: 'Performance BG', value: '5%', sub: 'of Contract Value' },
            ].map((m, i, arr) => (
              <div key={i} style={{ flex: 1, padding: '0 24px', borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>{m.value}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Readiness */}
          <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 32, display: 'flex', alignItems: 'center', gap: 24 }}>
            <ReadinessRing score={COMPLIANCE_SUMMARY.score} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>Bid Readiness <span className="ai-indicator" style={{marginLeft: 8}}><span className="ai-indicator-dot" />AI Score</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--color-success)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>{COMPLIANCE_SUMMARY.compliant}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Compliant</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--color-warning)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>{COMPLIANCE_SUMMARY.needsReview}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Needs Review</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--color-critical)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>{COMPLIANCE_SUMMARY.missing}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Missing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: '#991B1B', display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>{COMPLIANCE_SUMMARY.blocked}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Blocked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, marginBottom: 28 }}>
        {/* Blockers */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 className="section-title">What needs your attention</h2>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => navigate('/tenders/mjp-water-pipeline/compliance')}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ISSUES.map(issue => (
              <div key={issue.id} className="card card-sm" style={{ borderLeft: `3px solid ${issue.type === 'blocked' ? 'var(--color-critical)' : 'var(--color-warning)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{issue.title}</span>
                  <span className={`badge ${issue.type === 'blocked' ? 'badge-critical' : 'badge-warning'}`}>{issue.badge}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{issue.desc}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {issue.actions.map((a, i) => (
                    <button key={i} className={`btn btn-sm ${i === 0 ? (issue.type === 'blocked' ? 'btn-danger' : 'btn-secondary') : 'btn-ghost'}`}
                      onClick={() => navigate(issue.routes[i])}>
                      {a}
                    </button>
                  ))}
                  <button className="btn btn-teal btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}>
                    <Bot size={13} /> Ask Copilot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Requirements + Changes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="section-title">Key Requirements</h2>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => navigate('/tenders/mjp-water-pipeline/requirements')}>
                All requirements <ChevronRight size={13} />
              </button>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {KEY_REQUIREMENTS.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < KEY_REQUIREMENTS.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ flex: 1.2, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{r.label}</div>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.value}</div>
                  <div style={{ flex: 0.8 }}>
                    <span className={`status-badge ${r.status === 'Compliant' ? 'status-compliant' : r.status === 'Missing' ? 'status-missing' : 'status-review'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="section-title">Recent Tender Changes</h2>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => navigate('/tenders/mjp-water-pipeline/corrigendum')}>
                View corrigendum <ChevronRight size={13} />
              </button>
            </div>
            <div className="timeline">
              {RECENT_CHANGES.map((c, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${c.type === 'warning' ? 'warning' : 'success'}`} />
                  <div className="timeline-content">
                    <div className="timeline-date">{c.date}</div>
                    <div className="timeline-title">{c.title}</div>
                    <div className="timeline-desc">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
