import React from 'react';

export function AdminEconomicsTab({
  stageCostsForm,
  setStageCostsForm,
  guestTrialForm,
  setGuestTrialForm,
  handleSaveStageCosts,
  settingsSaving,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div className="surface-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
          Progressive Stage Delta-Cost Architecture
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Control the credit burns for each analytical stage. Bidders are never charged twice for completed stages.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Stage 1: NIT Intake (Cr)
              </label>
              <input
                type="number"
                value={stageCostsForm.stage1}
                onChange={(e) => setStageCostsForm({ ...stageCostsForm, stage1: parseInt(e.target.value, 10) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                NIT OCR, EMD/MSME, Key Dates
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Stage 2 Delta Cost (Cr)
              </label>
              <input
                type="number"
                value={stageCostsForm.stage2_delta}
                onChange={(e) => setStageCostsForm({ ...stageCostsForm, stage2_delta: parseInt(e.target.value, 10) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                Compliance Matrix & Risk Radar
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Stage 3 Delta Cost (Cr)
              </label>
              <input
                type="number"
                value={stageCostsForm.stage3_delta}
                onChange={(e) => setStageCostsForm({ ...stageCostsForm, stage3_delta: parseInt(e.target.value, 10) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                DOCX Cover Letter, Affidavits & BOQ
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Free Trial Grant (Cr)
              </label>
              <input
                type="number"
                value={stageCostsForm.free_trial_credits}
                onChange={(e) => setStageCostsForm({ ...stageCostsForm, free_trial_credits: parseInt(e.target.value, 10) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                Credited upon contractor signup
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Trial Parameters */}
      <div className="surface-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
          Instant Public Free Analyzer Quota & Limits
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Control lead generation friction at <code>/try</code> without allowing scraping or LLM resource exhaustion.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Daily Free Passes / IP (24h)
            </label>
            <input
              type="number"
              value={guestTrialForm.daily_free_limit}
              onChange={(e) => setGuestTrialForm({ ...guestTrialForm, daily_free_limit: parseInt(e.target.value, 10) || 1 })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Sliding Reset Window (Hours)
            </label>
            <input
              type="number"
              value={guestTrialForm.window_hours}
              onChange={(e) => setGuestTrialForm({ ...guestTrialForm, window_hours: parseInt(e.target.value, 10) || 24 })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Max Document Pages (Trial)
            </label>
            <input
              type="number"
              value={guestTrialForm.max_pages}
              onChange={(e) => setGuestTrialForm({ ...guestTrialForm, max_pages: parseInt(e.target.value, 10) || 40 })}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={handleSaveStageCosts}
            disabled={settingsSaving}
            className="btn btn-primary"
            style={{ minWidth: 160 }}
          >
            {settingsSaving ? 'Saving...' : 'Save Economic Policies'}
          </button>
        </div>
      </div>
    </div>
  );
}
