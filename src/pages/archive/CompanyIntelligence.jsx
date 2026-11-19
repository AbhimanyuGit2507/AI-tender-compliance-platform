import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { Building2, FileText, FolderOpen, Award, DollarSign, ChevronRight } from 'lucide-react';
import { COMPANY } from '../data/mockData';

const COMPANY_NAV = [
  { path: '/company', label: 'Overview', exact: true },
  { path: '/company/documents', label: 'Documents' },
  { path: '/company/projects', label: 'Projects' },
  { path: '/company/certifications', label: 'Certifications' },
  { path: '/company/financials', label: 'Financials' },
];

export function CompanyLayout({ children }) {
  return (
    <div>
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ padding: '20px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Building2 size={24} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800 }}>{COMPANY.name}</h2>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 1 }}>GSTIN {COMPANY.gstin} · {COMPANY.businessType} · {COMPANY.location}</div>
            </div>
          </div>
        </div>
        <div className="tabs" style={{ padding: '0 24px' }}>
          {COMPANY_NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

export function CompanyOverview() {
  const navigate = useNavigate();
  const stats = [
    { label: 'Years in Business', value: `${COMPANY.yearsInBusiness}+` },
    { label: 'Average Turnover (3yr)', value: '₹6.03 Cr' },
    { label: 'Net Worth', value: COMPANY.netWorth },
    { label: 'Active Tenders', value: '3' },
  ];

  const knowledgeItems = [
    { label: 'Verified Documents', value: COMPANY.stats.documents, icon: FileText, route: '/company/documents' },
    { label: 'Projects', value: COMPANY.stats.projects, icon: FolderOpen, route: '/company/projects' },
    { label: 'Certifications', value: COMPANY.stats.certifications, icon: Award, route: '/company/certifications' },
    { label: 'Financial Records', value: COMPANY.stats.financialRecords, icon: DollarSign, route: '/company/financials' },
    { label: 'Previous Responses', value: COMPANY.stats.previousResponses, icon: FileText, route: '/company/documents' },
  ];

  return (
    <div className="page-content">
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Company Intelligence</h1>
        <p className="page-subtitle">Your reusable business knowledge base for every tender.</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {stats.map((s, i) => (
          <div key={i} className="card card-sm" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Knowledge layer */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--color-teal)', animation: 'pulse 2s infinite' }} />
          <div style={{ fontWeight: 700, fontSize: 14 }}>BidKaro knows about your company</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {knowledgeItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{ textAlign: 'center', padding: '16px 12px', background: 'var(--color-bg)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => navigate(item.route)}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-blue-subtle)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg)'; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-teal-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--color-teal)' }}>
                  <Icon size={16} />
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company details */}
      <div className="grid-2">
        <div>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Company Details</h2>
          <div className="card">
            {[
              ['Company Name', COMPANY.name],
              ['Business Type', COMPANY.businessType],
              ['GSTIN', COMPANY.gstin],
              ['Location', COMPANY.location],
              ['Years in Business', `${COMPANY.yearsInBusiness}+ years`],
              ['Contact Person', COMPANY.contactPerson],
              ['Email', COMPANY.email],
            ].map(([label, val], i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Upload New Document', route: '/company/documents' },
              { label: 'Add Project Evidence', route: '/company/projects' },
              { label: 'Update Financial Records', route: '/company/financials' },
              { label: 'Renew Certifications', route: '/company/certifications' },
            ].map((a, i) => (
              <button key={i} className="card card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '14px 16px', border: '1px solid var(--color-border)', background: 'white', textAlign: 'left' }}
                onClick={() => navigate(a.route)}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</span>
                <ChevronRight size={15} style={{ color: 'var(--color-text-tertiary)' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
