import React from 'react';
import {
  Zap,
  X,
  Building2,
  FileText,
  Activity,
} from 'lucide-react';

export function AdminModals({
  creditModalTenant,
  setCreditModalTenant,
  creditDelta,
  setCreditDelta,
  creditReason,
  setCreditReason,
  handleGrantCredits,
  creditSubmitting,
  selectedTenantDossier,
  setSelectedTenantDossier,
}) {
  return (
    <>
      {/* ── MODAL: GRANT / DEDUCT CREDITS ─────────────────────────────────── */}
      {creditModalTenant && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="surface-card animate-in"
            style={{ maxWidth: 440, width: '100%', padding: 26, position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>Adjust Contractor Credits</h3>
              </div>
              <button
                onClick={() => setCreditModalTenant(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Organization: <strong>{creditModalTenant.name}</strong>
              <br />
              Current Balance: <strong>{creditModalTenant.credit_balance} Credits</strong>
            </p>

            <form onSubmit={handleGrantCredits} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Credit Delta (Positive to add, Negative to deduct) *
                </label>
                <input
                  type="number"
                  value={creditDelta}
                  onChange={(e) => setCreditDelta(parseInt(e.target.value, 10) || 0)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: creditDelta >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Operational Reason (Audited) *
                </label>
                <textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  required
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontSize: 12.5,
                    color: 'var(--text-primary)',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreditModalTenant(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creditSubmitting || creditDelta === 0}
                  className="btn btn-primary"
                  style={{ minWidth: 120 }}
                >
                  {creditSubmitting ? 'Applying...' : 'Apply Delta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TENANT DOSSIER INSPECTOR ───────────────────────────────── */}
      {selectedTenantDossier && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="surface-card animate-in"
            style={{
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Contractor Dossier: {selectedTenantDossier.tenant?.name}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  UUID: {selectedTenantDossier.tenant?.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedTenantDossier(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profile & Wallet summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 10,
                  padding: 14,
                  background: 'var(--bg-elevated)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Plan Tier</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTenantDossier.tenant?.plan_tier}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Credit Balance</div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {selectedTenantDossier.tenant?.credit_balance} Cr
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Status</div>
                  <div style={{ fontWeight: 700, color: selectedTenantDossier.tenant?.is_active ? '#10b981' : '#ef4444' }}>
                    {selectedTenantDossier.tenant?.is_active ? 'Active' : 'Suspended'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Created</div>
                  <div style={{ fontWeight: 600 }}>{new Date(selectedTenantDossier.tenant?.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Company Vault Facts */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} color="#06b6d4" />
                  <span>Company Vault Facts ({selectedTenantDossier.vault_facts?.length || 0})</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11.5 }}>
                  {(selectedTenantDossier.vault_facts || []).map((fact) => (
                    <div key={fact.id} style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{fact.fact_key}: </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fact.raw_value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tenders list */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="var(--accent-primary)" />
                  <span>Analyzed Tenders ({selectedTenantDossier.tenders?.length || 0})</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(selectedTenantDossier.tenders || []).map((tender) => (
                    <div
                      key={tender.id}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tender.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tender.authority || 'Tender Authority'}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--bg-surface)', fontSize: 11, fontWeight: 600 }}>
                        {tender.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Credit Ledger Runs */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={14} color="#10b981" />
                  <span>Recent Credit Runs & Purchases ({selectedTenantDossier.credit_ledger?.length || 0})</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {(selectedTenantDossier.credit_ledger || []).map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 11.5,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span>{entry.operation_type}</span>
                      <span style={{ color: entry.credits_delta >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {entry.credits_delta >= 0 ? `+${entry.credits_delta}` : entry.credits_delta} Cr
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
