import { useNavigate } from 'react-router-dom';
import { AUDIT_ITEMS } from '../data/mockData';
import { CheckCircle, AlertTriangle, X, Bot, Eye, ChevronRight } from 'lucide-react';

const STATUS_ICON = {
  ready: { icon: CheckCircle, color: 'var(--color-success)', bg: 'var(--color-success-subtle)', label: 'Ready' },
  review: { icon: AlertTriangle, color: 'var(--color-warning)', bg: 'var(--color-warning-subtle)', label: 'Needs Review' },
  missing: { icon: X, color: 'var(--color-critical)', bg: 'var(--color-critical-subtle)', label: 'Missing' },
  updated: { icon: CheckCircle, color: 'var(--color-teal)', bg: 'var(--color-teal-subtle)', label: 'Updated' },
};

export function FinalAudit({ showToast }) {
  const navigate = useNavigate();
  const hasBlockers = AUDIT_ITEMS.some(a => a.status === 'missing');
  const hasReview = AUDIT_ITEMS.some(a => a.status === 'review');

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Final Submission Audit</h1>
          <p className="page-subtitle">Complete pre-submission checklist for MJP Municipal Water Pipeline Phase-II.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tenders/mjp-water-pipeline/submission')}>
          View Submission Package <ChevronRight size={14} />
        </button>
      </div>

      {/* Status banner */}
      <div style={{ padding: '20px 24px', borderRadius: 12, marginBottom: 28, background: hasBlockers ? 'var(--color-critical-subtle)' : 'var(--color-warning-subtle)', border: `1px solid ${hasBlockers ? '#FECACA' : '#FDE68A'}`, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: hasBlockers ? 'var(--color-critical)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasBlockers ? <X size={22} color="white" /> : <AlertTriangle size={22} color="white" />}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: hasBlockers ? 'var(--color-critical)' : 'var(--color-warning)' }}>
            {hasBlockers ? 'NOT READY' : 'ALMOST READY'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {hasBlockers ? '1 hard blocker and 2 items require attention before submission.' : '2 items need your review before submission.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/tenders/mjp-water-pipeline/copilot')}>
            <Bot size={14} /> Resolve with Copilot
          </button>
        </div>
      </div>

      {/* Checklist */}
      <div className="card" style={{ padding: 0 }}>
        {AUDIT_ITEMS.map((item, i) => {
          const conf = STATUS_ICON[item.status];
          const Icon = conf.icon;
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'stretch', borderBottom: i < AUDIT_ITEMS.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              {/* Status indicator */}
              <div style={{ width: 4, background: conf.color, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: conf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={conf.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{item.section}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: conf.color, background: conf.bg, padding: '1px 7px', borderRadius: 99 }}>{conf.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {item.items.map((it, j) => (
                      <div key={j} style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: conf.color, fontSize: 10 }}>●</span> {it}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', gap: 8 }}>
                  {item.status === 'missing' && (
                    <button className="btn btn-danger btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/generate')}>Resolve</button>
                  )}
                  {item.status === 'review' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tenders/mjp-water-pipeline/compliance')}>Review</button>
                  )}
                  {item.status === 'ready' && (
                    <button className="btn btn-secondary btn-sm"><Eye size={12} /> View</button>
                  )}
                  {item.status === 'updated' && (
                    <button className="btn btn-secondary btn-sm"><Eye size={12} /> View</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
