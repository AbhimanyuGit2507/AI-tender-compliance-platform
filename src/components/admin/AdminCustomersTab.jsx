import React from 'react';
import {
  Search,
  RefreshCw,
  Check,
  Copy,
  Zap,
  Eye,
  Lock,
  Unlock,
} from 'lucide-react';

export function AdminCustomersTab({
  tenantsSearch,
  setTenantsSearch,
  setTenantsPage,
  fetchTenants,
  tenantsLoading,
  tenants,
  tenantsTotal,
  tenantsPage,
  copyToClipboard,
  copiedKey,
  handleChangeTenantTier,
  setCreditModalTenant,
  handleInspectDossier,
  handleToggleTenantStatus,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Search and Filters Bar */}
      <div
        className="surface-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 300px' }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search by company name, owner email, or tenant ID..."
            value={tenantsSearch}
            onChange={(e) => setTenantsSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setTenantsPage(1);
                fetchTenants();
              }
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              setTenantsPage(1);
              fetchTenants();
            }}
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            Apply Search
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contractor / Company</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Owner Contact</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Subscription Plan</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Credit Balance</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tenders</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenantsLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px' }} />
                    <div>Loading contractor directory...</div>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No contractors found matching criteria.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 100ms ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {t.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        <span>{t.id.slice(0, 8)}...</span>
                        <button
                          onClick={() => copyToClipboard(t.id, t.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)' }}
                          title="Copy Tenant UUID"
                        >
                          {copiedKey === t.id ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{t.owner_email || '—'}</div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={t.plan_tier || 'free'}
                        onChange={(e) => handleChangeTenantTier(t, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 6,
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="free">Free Trial (25 Cr)</option>
                        <option value="single_pack">Single Tender Pass</option>
                        <option value="growth_pack">Active Bidder 5-Pack</option>
                        <option value="pro_contractor">Enterprise EPC 15-Pack</option>
                      </select>
                    </td>

                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      <span style={{ color: t.credit_balance > 0 ? '#10b981' : 'var(--status-warn-text)' }}>
                        {t.credit_balance} Cr
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                      {t.tender_count || 0}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: t.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: t.is_active ? '#10b981' : '#ef4444',
                          border: `1px solid ${t.is_active ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                        }}
                      >
                        {t.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setCreditModalTenant(t)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Grant or deduct credits"
                        >
                          <Zap size={11} color="var(--accent-primary)" />
                          <span>Credits</span>
                        </button>

                        <button
                          onClick={() => handleInspectDossier(t.id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Inspect full customer profile & vault"
                        >
                          <Eye size={11} />
                          <span>Dossier</span>
                        </button>

                        <button
                          onClick={() => handleToggleTenantStatus(t)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            borderRadius: 6,
                            border: '1px solid var(--border-subtle)',
                            background: t.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            color: t.is_active ? '#ef4444' : '#10b981',
                            cursor: 'pointer',
                          }}
                          title={t.is_active ? 'Suspend Account' : 'Reactivate Account'}
                        >
                          {t.is_active ? <Lock size={11} /> : <Unlock size={11} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span>Showing {tenants.length} of {tenantsTotal} contractors</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={tenantsPage <= 1}
              onClick={() => setTenantsPage((p) => Math.max(p - 1, 1))}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11 }}
            >
              Previous
            </button>
            <span style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>Page {tenantsPage}</span>
            <button
              disabled={tenants.length < 20}
              onClick={() => setTenantsPage((p) => p + 1)}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

