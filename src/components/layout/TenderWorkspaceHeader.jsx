import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ExternalLink, Activity, Info, FileText, CheckCircle, Bot, BookOpen } from 'lucide-react';

const TABS = [
  { path: 'overview', label: 'Tender Overview', icon: Info },
  { path: 'copilot', label: 'Tender Copilot', icon: Bot },
  { path: 'compliance', label: 'Compliance & Eligibility', icon: CheckCircle },
  { path: 'generated', label: 'Generated Bids', icon: FileText },
  { path: 'policies', label: 'Policy Research', icon: BookOpen },
];

export function TenderWorkspaceHeader({ showToast }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="workspace-wrapper full-height" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* ── BREADCRUMBS & TOP BAR ── */}
      <div style={{ background: 'var(--color-bg)', padding: '16px 20px 0' }}>
        <div className="breadcrumb" style={{ marginBottom: 12 }}>
          <span className="breadcrumb-item" onClick={() => navigate('/tenders')}>Tenders</span>
          <ChevronRight className="breadcrumb-sep" />
          <span className="breadcrumb-item current">MJP Water Pipeline Phase-II</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                Municipal Water Pipeline Phase-II
              </h1>
              <span className="badge badge-critical">Needs Attention</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Maharashtra Jeevan Pradhikaran (MJP)</span>
              <span style={{ color: 'var(--color-border-strong)' }}>•</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>₹48.60 Cr</span>
              <span style={{ color: 'var(--color-border-strong)' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Activity size={12} color="var(--color-warning)" /> Deadline: 24 Oct 2026
              </span>
            </div>
          </div>
          
          <button className="btn btn-secondary btn-sm" onClick={() => window.open('#', '_blank')}>
            Original Tender <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="workspace-header">
        <div className="workspace-header-tabs">
          {TABS.map(t => {
            const isActive = location.pathname.includes(t.path);
            const Icon = t.icon;
            return (
              <NavLink
                key={t.path}
                to={t.path}
                className={`workspace-tab${isActive ? ' active' : ''}`}
                style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
              >
                <Icon size={14} />
                {t.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* ── ROUTE CONTENT ── */}
      <Outlet context={{ showToast }} />

    </div>
  );
}
