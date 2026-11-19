import { useNavigate } from 'react-router-dom';
import { Download, Eye, ArrowLeftRight, Edit, Plus, FileText } from 'lucide-react';
import { GENERATED_DOCUMENTS } from '../data/mockData';

const STATUS_MAP = {
  'Draft': { class: 'badge-warning' },
  'Ready for Review': { class: 'badge-blue' },
  'Final': { class: 'badge-success' },
};

export function GeneratedDocuments({ showToast }) {
  const navigate = useNavigate();
  const grouped = {};
  GENERATED_DOCUMENTS.forEach(d => {
    if (!grouped[d.name]) grouped[d.name] = [];
    grouped[d.name].push(d);
  });

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Generated Documents</h1>
          <p className="page-subtitle">All AI-generated documents for this tender. Compare versions and download when ready.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}>
          <Plus size={14} /> Generate New
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(grouped).map(([name, versions]) => (
          <div key={name} className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', background: '#FAFBFC', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{versions.length} version{versions.length > 1 ? 's' : ''}</div>
              </div>
              {versions.length > 1 && (
                <button className="btn btn-secondary btn-sm"><ArrowLeftRight size={12} /> Compare Versions</button>
              )}
            </div>
            {versions.sort((a, b) => b.version - a.version).map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < versions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                  <FileText size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name} — Version {d.version}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>{d.type} · {d.pages} pages · {d.wordCount.toLocaleString()} words · {d.lastModified}</div>
                </div>
                <span className={`badge ${STATUS_MAP[d.status]?.class}`}>{d.status}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm"><Eye size={12} /> Preview</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}><Edit size={12} /> Edit</button>
                  <button className="btn btn-ghost btn-sm"><Download size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
