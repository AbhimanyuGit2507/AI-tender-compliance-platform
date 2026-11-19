import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

export function AdminLogsTab({
  logSubTab,
  setLogSubTab,
  logSearch,
  setLogSearch,
  fetchLogs,
  logsLoading,
  auditLogs,
  emailLogs,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub-Tabs & Filter */}
      <div
        className="surface-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setLogSubTab('audit')}
            className={`btn ${logSubTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            Platform Audit Trail
          </button>
          <button
            onClick={() => setLogSubTab('email')}
            className={`btn ${logSubTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            Brevo Email Logs
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={14} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search actions, emails, or IP..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchLogs();
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 12.5,
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
        {logSubTab === 'audit' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp (UTC)</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Actor</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>IP Address</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Event Details</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={16} className="spin" style={{ margin: '0 auto 6px' }} />
                    <div>Loading audit entries...</div>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No audit events recorded.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {log.user_email || log.user_id?.slice(0, 8) || 'System / Anonymous'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {log.details_jsonb ? JSON.stringify(log.details_jsonb).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Recipient</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Template / Subject</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Message ID</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={16} className="spin" style={{ margin: '0 auto 6px' }} />
                    <div>Loading email delivery records...</div>
                  </td>
                </tr>
              ) : emailLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No email delivery records found.
                  </td>
                </tr>
              ) : (
                emailLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.recipient_email}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                      {log.subject || log.template_name || 'Transactional Alert'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: log.status === 'sent' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: log.status === 'sent' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {log.brevo_message_id || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

