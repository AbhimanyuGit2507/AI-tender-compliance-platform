import { useNavigate } from 'react-router-dom';
import { CORRIGENDUM } from '../data/mockData';
import { AlertTriangle, CheckCircle, RefreshCw, FileText } from 'lucide-react';

export function Corrigendum({ showToast }) {
  const navigate = useNavigate();

  const impactIcon = { info: { icon: CheckCircle, color: 'var(--color-blue)' }, warning: { icon: AlertTriangle, color: 'var(--color-warning)' }, critical: { icon: AlertTriangle, color: 'var(--color-critical)' } };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Corrigendum</h1>
          <p className="page-subtitle">Review all amendments and their impact on your bid preparation.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { showToast && showToast('Re-running compliance check...', 'info'); setTimeout(() => navigate('/tenders/mjp-water-pipeline/compliance'), 1000); }}>
          <RefreshCw size={14} /> Re-run Compliance
        </button>
      </div>

      {/* Corrigendum banner */}
      <div style={{ padding: '16px 20px', background: 'var(--color-warning-subtle)', border: '1px solid #FDE68A', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <AlertTriangle size={18} color="var(--color-warning)" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Corrigendum 01 — Issued {CORRIGENDUM.date}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {CORRIGENDUM.changes.length} changes detected. Review each change and update your bid accordingly.
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}><FileText size={12} /> View PDF</button>
      </div>

      {/* Changes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {CORRIGENDUM.changes.map((c, i) => {
          const Icon = impactIcon[c.impactType]?.icon || CheckCircle;
          const color = impactIcon[c.impactType]?.color || 'var(--color-blue)';
          return (
            <div key={i} className="card" style={{ padding: 0, borderLeft: `3px solid ${color}` }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={14} color={color} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.field}</span>
                <span className={`badge ${c.impactType === 'critical' ? 'badge-critical' : c.impactType === 'warning' ? 'badge-warning' : 'badge-blue'}`}>
                  {c.impactType === 'critical' ? 'Critical Change' : c.impactType === 'warning' ? 'Important' : 'Updated'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div style={{ padding: '16px 20px', borderRight: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Original</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, textDecoration: 'line-through' }}>{c.original}</div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Updated</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, lineHeight: 1.5 }}>{c.updated}</div>
                </div>
              </div>
              <div style={{ padding: '10px 20px', background: c.impactType === 'critical' ? 'var(--color-critical-subtle)' : c.impactType === 'warning' ? 'var(--color-warning-subtle)' : 'var(--color-blue-subtle)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={12} color={color} />
                <div style={{ fontSize: 12, fontWeight: 500, color: color, flex: 1 }}>Impact on your bid: {c.impact}</div>
                {c.impactType !== 'info' && (
                  <button className="btn btn-sm btn-secondary" onClick={() => { if (c.field.includes('Technical')) navigate('/tenders/mjp-water-pipeline/generate'); else if (c.field.includes('BOQ')) navigate('/tenders/mjp-water-pipeline/boq'); }}>
                    Update Bid
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
