import { POLICIES } from '../data/mockData';
import { BookOpen, ExternalLink, CheckCircle, AlertTriangle, X } from 'lucide-react';

const APPLICABILITY_CONFIG = {
  'Applicable': { class: 'badge-teal', color: 'var(--color-teal)' },
  'Potentially Applicable': { class: 'badge-blue', color: 'var(--color-blue)' },
  'Not Applicable': { class: 'badge-neutral', color: 'var(--color-text-tertiary)' },
};

export function PolicyIntelligence() {
  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Policy Intelligence</h1>
        <p className="page-subtitle">Government procurement policies and regulations applicable to this tender.</p>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {POLICIES.map((policy, i) => {
          const conf = APPLICABILITY_CONFIG[policy.applicability];
          return (
            <div key={policy.id} className="card" style={{ opacity: policy.applicability === 'Not Applicable' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{policy.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Effective: {policy.effectiveDate}</div>
                </div>
                <span className={`badge ${conf.class}`}>{policy.applicability}</span>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', marginBottom: 14 }}>{policy.impact}</div>

              {policy.company && (
                <div style={{ padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 14, display: 'flex', gap: 6 }}>
                  <CheckCircle size={13} color="var(--color-teal)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{policy.company}</span>
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>Source: {policy.source}</div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm"><BookOpen size={12} /> View Source</button>
                {policy.applicability !== 'Not Applicable' && (
                  <button className="btn btn-teal btn-sm">Check Applicability</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
