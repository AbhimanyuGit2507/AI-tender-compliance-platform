import React from 'react';
import { TrendingUp, Cpu } from 'lucide-react';

export function AdminOverviewTab({ metrics }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {/* KPI 1: Gross Revenue */}
        <div className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Gross Platform Revenue</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 11, fontWeight: 700 }}>
              Live INR
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
            ₹{(metrics?.financials?.gross_revenue_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            MRR Est: ₹{(metrics?.financials?.mrr_estimated_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} · {metrics?.financials?.total_paid_orders || 0} Orders
          </div>
        </div>

        {/* KPI 2: Customer Accounts */}
        <div className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Customer Contractors</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: 11, fontWeight: 700 }}>
              {metrics?.customer_stats?.conversion_rate_pct || 0}% Conversion
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
            {metrics?.customer_stats?.active_tenants || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {metrics?.customer_stats?.paying_tenants || 0} Paying · {metrics?.customer_stats?.free_trial_users || 0} Free Trial
          </div>
        </div>

        {/* KPI 3: Pipeline Value */}
        <div className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Pipeline Under Analysis</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700 }}>
              CPWD/NHAI
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
            ₹{(metrics?.pipeline_stats?.active_pipeline_value_cr || 0).toLocaleString('en-IN')} Cr
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {metrics?.pipeline_stats?.total_tenders_analyzed || 0} Total NIT Packages Ingested
          </div>
        </div>

        {/* KPI 4: Credit Liability & Supply */}
        <div className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>System Credit Liability</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>
              Outstanding
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
            {(metrics?.credit_velocity?.current_system_liability || 0).toLocaleString()} Cr
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Minted: {(metrics?.credit_velocity?.total_credits_minted || 0).toLocaleString()} · Burned: {(metrics?.credit_velocity?.total_credits_burned || 0).toLocaleString()}
          </div>
        </div>

        {/* KPI 5: AI Unit Economics & Margins */}
        <div className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>AI Compute Gross Margin</span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 11, fontWeight: 700 }}>
              Profitable
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#10b981', marginBottom: 6 }}>
            {metrics?.ai_compute_economics?.gross_software_margin_pct || 0}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            LLM Cost: ₹{(metrics?.ai_compute_economics?.estimated_llm_cost_inr || 0).toFixed(2)} · ₹{(metrics?.ai_compute_economics?.cost_per_tender_inr || 0).toFixed(2)} / tender
          </div>
        </div>
      </div>

      {/* Secondary Telemetry Grid: Funnel & AI Cost Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {/* Tender Pipeline Funnel */}
        <div className="surface-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color="var(--accent-primary)" />
            <span>Multi-Stage Tender Pipeline Conversion</span>
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Progressive customer progression across Stage 1 Screening, Stage 2 Risk Audit, and Stage 3 Package Compilation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              {
                stage: 'Stage 1: NIT Intake & Qualification Screening',
                count: metrics?.pipeline_stats?.stage1_screenings || 0,
                percent: 100,
                color: '#3b82f6',
                cost: '15 Credits',
              },
              {
                stage: 'Stage 2: Technical Compliance & Disqualification Radar',
                count: metrics?.pipeline_stats?.stage2_audits || 0,
                percent: Math.round(((metrics?.pipeline_stats?.stage2_audits || 0) / Math.max(metrics?.pipeline_stats?.stage1_screenings || 1, 1)) * 100),
                color: 'var(--accent-primary)',
                cost: '+25 Credits Delta',
              },
              {
                stage: 'Stage 3: Full Bid Package & Word/Excel Drafter',
                count: metrics?.pipeline_stats?.stage3_compiled_bids || 0,
                percent: Math.round(((metrics?.pipeline_stats?.stage3_compiled_bids || 0) / Math.max(metrics?.pipeline_stats?.stage1_screenings || 1, 1)) * 100),
                color: '#10b981',
                cost: '+60 Credits Delta',
              },
            ].map((item) => (
              <div key={item.stage} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.stage}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.color }}>
                    {item.count} tenders ({item.percent}%) · {item.cost}
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.percent}%`,
                      height: '100%',
                      background: item.color,
                      borderRadius: 999,
                      transition: 'width 400ms ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Compute Economics Card */}
        <div className="surface-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={16} color="#8b5cf6" />
            <span>AI Infrastructure & Inference Telemetry</span>
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Real-time tracking of token throughput, inference costs, and model efficiency.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Tokens Processed</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {(metrics?.ai_compute_economics?.estimated_tokens_processed || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Inference Cost (INR)</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-warn-text)' }}>
                ₹{(metrics?.ai_compute_economics?.estimated_llm_cost_inr || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Primary Model</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                Llama 3.3 70B (Groq)
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Avg Cost / Full Tender</div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                ₹{(metrics?.ai_compute_economics?.cost_per_tender_inr || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            💡 <strong>Margin Protection Architecture:</strong> At ₹66 to ₹199 per tender revenue versus ~₹3.40 LLM compute cost, gross software margins exceed <strong>85%+</strong> across all active tiers.
          </div>
        </div>
      </div>
    </div>
  );
}

