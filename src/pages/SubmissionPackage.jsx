import { useState } from 'react';
import { Download, Eye, ChevronRight, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUBMISSION_PACKAGE = [
  {
    section: 'Technical Bid',
    icon: '📄',
    files: 3,
    status: 'ready',
    items: [
      { name: 'Technical Proposal v2', status: 'Ready', pages: 18 },
      { name: 'Technical Methodology Statement', status: 'Draft', pages: 14 },
      { name: 'Project Experience Summary', status: 'Ready', pages: 5 },
    ],
  },
  {
    section: 'Eligibility Documents',
    icon: '✅',
    files: 4,
    status: 'ready',
    items: [
      { name: 'Certificate of Incorporation', status: 'Ready' },
      { name: 'GST Registration', status: 'Ready' },
      { name: 'PAN Card', status: 'Ready' },
      { name: 'Board Resolution', status: 'Needs Update' },
    ],
  },
  {
    section: 'Company Documents',
    icon: '🏢',
    files: 3,
    status: 'ready',
    items: [{ name: 'Company Profile', status: 'Ready' }, { name: 'Project Manager CV', status: 'Ready' }, { name: 'Org Chart', status: 'Ready' }],
  },
  {
    section: 'Certifications',
    icon: '🏅',
    files: 4,
    status: 'ready',
    items: [{ name: 'ISO 9001:2015', status: 'Ready' }, { name: 'ISO 14001:2015', status: 'Ready' }, { name: 'Electrical License', status: 'Ready' }, { name: 'Udyam Certificate', status: 'Ready' }],
  },
  {
    section: 'Declarations & Undertakings',
    icon: '📝',
    files: 3,
    status: 'ready',
    items: [{ name: 'Blacklisting Undertaking', status: 'Ready' }, { name: 'Anti-Corruption Declaration', status: 'Ready' }, { name: 'OEM Authorization', status: 'Missing' }],
  },
  {
    section: 'Compliance Matrix',
    icon: '📊',
    files: 1,
    status: 'ready',
    items: [{ name: 'Compliance Matrix v1', status: 'Ready' }],
  },
  {
    section: 'Supporting Evidence',
    icon: '📂',
    files: 6,
    status: 'ready',
    items: [{ name: 'Nagpur — Work Order + Completion', status: 'Ready' }, { name: 'Pune — Contract + Completion', status: 'Ready' }, { name: 'Nashik — Work Order + Completion', status: 'Ready' }],
  },
];

export function SubmissionPackage({ showToast }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const hasBlocker = SUBMISSION_PACKAGE.some(s => s.items.some(it => it.status === 'Missing'));

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Submission Package</h1>
          <p className="page-subtitle">Complete bid submission package for MJP Municipal Water Pipeline Phase-II.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary">View Portal Checklist</button>
          <button className="btn btn-primary" onClick={() => showToast && showToast('Package download started', 'success')}>
            <Download size={14} /> Download Package
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{ padding: '14px 20px', borderRadius: 10, marginBottom: 24, background: 'var(--color-warning-subtle)', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={16} color="var(--color-warning)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-warning)' }}>1 blocker remaining — OEM Authorization missing</span>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}>Resolve</button>
      </div>

      {/* Package structure */}
      <div className="card" style={{ padding: 0 }}>
        {SUBMISSION_PACKAGE.map((section, i) => {
          const open = expanded[i];
          const hasMissing = section.items.some(it => it.status === 'Missing');
          return (
            <div key={i} style={{ borderBottom: i < SUBMISSION_PACKAGE.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer', background: hasMissing ? '#FFF8F8' : 'white' }}
                onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))}
              >
                <span style={{ fontSize: 18 }}>{section.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{section.section}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{section.files} files · {hasMissing ? 'Incomplete' : 'Complete'}</div>
                </div>
                {hasMissing ? (
                  <span className="badge badge-critical">Missing Item</span>
                ) : (
                  <span className="badge badge-success">Complete</span>
                )}
                <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              {open && (
                <div style={{ paddingLeft: 52, paddingRight: 20, paddingBottom: 12, background: '#FAFBFC', borderTop: '1px solid var(--color-border)' }}>
                  {section.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: j < section.items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      {item.status === 'Missing' ? <AlertTriangle size={13} color="var(--color-critical)" /> : <CheckCircle size={13} color="var(--color-success)" />}
                      <div style={{ flex: 1, fontSize: 13, color: item.status === 'Missing' ? 'var(--color-critical)' : 'var(--color-text-primary)' }}>
                        {item.name}
                        {item.pages && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>{item.pages} pages</span>}
                      </div>
                      <span className={`badge ${item.status === 'Missing' ? 'badge-critical' : item.status === 'Needs Update' ? 'badge-warning' : 'badge-success'}`}>{item.status}</span>
                      <button className="btn btn-ghost btn-sm"><Eye size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
