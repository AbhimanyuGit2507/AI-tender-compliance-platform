import React from 'react';
import { Cpu, Sliders } from 'lucide-react';

export function AdminGovernanceTab({
  aiRoutingForm,
  setAiRoutingForm,
  governanceForm,
  setGovernanceForm,
  handleSaveGovernance,
  settingsSaving,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      {/* AI Model Routing */}
      <div className="surface-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={16} color="var(--accent-primary)" />
          <span>AI Provider & Model Routing</span>
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Manage active inference providers, model selection, and sampling temperature.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Primary Provider
            </label>
            <select
              value={aiRoutingForm.primary_provider}
              onChange={(e) => setAiRoutingForm({ ...aiRoutingForm, primary_provider: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            >
              <option value="groq">Groq (LPU Ultra-Fast Inference)</option>
              <option value="openrouter">OpenRouter (Multi-Model Unified Gateway)</option>
              <option value="deepseek">DeepSeek Direct API</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Active Model Name
            </label>
            <input
              type="text"
              value={aiRoutingForm.active_model}
              onChange={(e) => setAiRoutingForm({ ...aiRoutingForm, active_model: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Inference Temperature ({aiRoutingForm.temperature})
            </label>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={aiRoutingForm.temperature}
              onChange={(e) => setAiRoutingForm({ ...aiRoutingForm, temperature: parseFloat(e.target.value) })}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Operational Feature Toggles */}
      <div className="surface-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={16} color="#06b6d4" />
          <span>Platform Feature Switches</span>
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Live runtime feature flags with zero downtime deployment.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              key: 'allow_guest_trials',
              label: 'Allow Unauthenticated Guest Screenings (/try)',
              desc: 'When enabled, allows anonymous visitors to screen 1 NIT document per day.',
            },
            {
              key: 'brevo_live_email',
              label: 'Brevo Transactional Email Live Dispatch',
              desc: 'When enabled, sends real transactional emails (OTP, welcome, low credit) via Brevo API.',
            },
            {
              key: 'strict_gstin_check',
              label: 'Strict Indian GSTIN Format Verification',
              desc: 'Enforces checksum validation on 15-character GSTINs in Company Vault.',
            },
            {
              key: 'maintenance_mode',
              label: 'Global Maintenance Mode (Lock Platform)',
              desc: 'Blocks new tender runs and displays maintenance banner to non-admin users.',
              danger: true,
            },
          ].map((flag) => (
            <div
              key={flag.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-elevated)',
                borderRadius: 10,
                border: flag.danger ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: flag.danger ? '#ef4444' : 'var(--text-primary)' }}>
                  {flag.label}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{flag.desc}</div>
              </div>
              <label className="switch" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(governanceForm[flag.key])}
                  onChange={(e) => setGovernanceForm({ ...governanceForm, [flag.key]: e.target.checked })}
                />
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={handleSaveGovernance}
            disabled={settingsSaving}
            className="btn btn-primary"
            style={{ minWidth: 160 }}
          >
            {settingsSaving ? 'Updating...' : 'Update Governance Controls'}
          </button>
        </div>
      </div>
    </div>
  );
}
