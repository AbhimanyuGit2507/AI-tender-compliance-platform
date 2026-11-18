import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  ChevronRight,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useBidKaroStore } from '../context/BidKaroStoreContext';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { GlassCard } from '../components/common/GlassCard';
import { GlassBadge } from '../components/common/GlassBadge';

// Glass card style + hover handlers shared across metric cards
const metricCardStyle = {
  background: 'var(--bg-surface)',
  backdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '14px',
  padding: '20px 24px',
  boxShadow: 'var(--shadow-card)',
  transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 160ms ease',
};

const metricCardEnter = (e) => {
  e.currentTarget.style.borderColor = 'var(--border-default)';
  e.currentTarget.style.transform = 'translateY(-2px)';
};
const metricCardLeave = (e) => {
  e.currentTarget.style.borderColor = 'var(--border-subtle)';
  e.currentTarget.style.transform = 'translateY(0)';
};

// Monospaced metric number typography
const metricNumStyle = {
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.02em',
};

// Stage badge semantic colors
function getStageBadgeStyle(stage) {
  if (stage === 3) {
    return {
      background: 'var(--status-pass-bg)',
      color: 'var(--status-pass-text)',
      border: '1px solid var(--status-pass-border)',
    };
  }
  if (stage === 2) {
    return {
      background: 'var(--accent-subtle)',
      color: 'var(--accent-primary-light)',
      border: '1px solid var(--accent-border)',
    };
  }
  // stage 1
  return {
    background: 'var(--status-warn-bg)',
    color: 'var(--status-warn-text)',
    border: '1px solid var(--status-warn-border)',
  };
}

function getStageName(stage) {
  if (stage === 3) return 'Bid Ready';
  if (stage === 2) return 'Audited';
  return 'Screened';
}

export function Dashboard() {
  const navigate = useNavigate();
  const { tenders, credits, dailyFreeAvailable, companyVault, createUploadedTender } = useBidKaroStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL'); // 'ALL' | 1 | 2 | 3

  // KPI Calculations
  const activePipelineValue = tenders.length
    ? tenders.reduce((acc, t) => acc + (t.estimatedValueCr || 0), 0).toFixed(1)
    : '0.0';
  const avgScore = tenders.length
    ? Math.round(tenders.reduce((acc, t) => acc + (t.readinessScore || 0), 0) / tenders.length)
    : 0;
  const maxBidCapacity = companyVault?.turnover3YrAvgCr
    ? Math.max(0, (companyVault.maxTurnoverACr || companyVault.turnover3YrAvgCr) * 2 * 2 - (companyVault.existingCommitmentsBCr || 0)).toFixed(1)
    : '0.0';

  const filteredTenders = tenders.filter((t) => {
    const matchesSearch =
      (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.authority || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.refNo || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage =
      stageFilter === 'ALL' ? true : t.pipelineStage === Number(stageFilter);

    return matchesSearch && matchesStage;
  });

  return (
    <div className="animate-in" style={{ padding: '24px 28px 60px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Standardized Page Header */}
      <PageHeader
        title="Tender Pipeline & Analytics"
        subtitle="Real-time qualification status, CPWD compliance scores, and submission package readiness."
        breadcrumbs={[
          { label: 'Workspace', to: '/workspace' },
          { label: 'Tenders Pipeline' },
        ]}
        actions={
          <button
            onClick={() => navigate('/workspace')}
            className="btn btn-primary"
            style={{ padding: '9px 18px', fontSize: 13 }}
          >
            <Plus size={15} />
            <span>Upload New Tender</span>
          </button>
        }
      />

      {/* 4 Premium Glass Telemetry Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Card 1: Pipeline Value */}
        <div
          style={metricCardStyle}
          onMouseEnter={metricCardEnter}
          onMouseLeave={metricCardLeave}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Pipeline Value
            </span>
            <TrendingUp size={15} color="var(--accent-cta)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', ...metricNumStyle }}>
            ₹{activePipelineValue} Cr
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            {tenders.length} Tracked Tenders
          </div>
        </div>

        {/* Card 2: Average Readiness */}
        <div
          style={metricCardStyle}
          onMouseEnter={metricCardEnter}
          onMouseLeave={metricCardLeave}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Average Qualification Score
            </span>
            <ShieldCheck size={15} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: tenders.length ? 'var(--accent-emerald)' : 'var(--text-muted)', ...metricNumStyle }}>
            {tenders.length ? `${avgScore}%` : '0%'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            {tenders.length ? 'Verified & Eligible' : 'No active tenders'}
          </div>
        </div>

        {/* Card 3: Bid Capacity Ceiling */}
        <div
          style={metricCardStyle}
          onMouseEnter={metricCardEnter}
          onMouseLeave={metricCardLeave}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available Bid Capacity
            </span>
            <Building2 size={15} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', ...metricNumStyle }}>
            ₹{maxBidCapacity} Cr
          </div>
          <div
            style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, cursor: 'help' }}
            title="Statutory CPWD Norms: 2 × A × N − B (A = Max turnover in last 5 years, N = Completion years, B = Existing commitments)"
          >
            <span>Net Worth & Turnover Norms</span>
            <span style={{ fontSize: 11, color: 'var(--accent-cta)' }}>ⓘ</span>
          </div>
        </div>

        {/* Card 4: Procurement Credits Balance */}
        <div
          style={{ ...metricCardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          onMouseEnter={metricCardEnter}
          onMouseLeave={metricCardLeave}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Procurement Credits Balance
              </span>
              <Zap size={15} color="var(--status-warn-text)" fill="var(--status-warn-text)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--status-warn-text)', ...metricNumStyle }}>
                {credits} Cr
              </div>
              <button
                onClick={() => navigate('/settings')}
                style={{
                  padding: '3px 9px',
                  borderRadius: 6,
                  border: '1px solid var(--accent-cta-border)',
                  background: 'var(--accent-cta-subtle)',
                  color: 'var(--accent-cta)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Top Up
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: dailyFreeAvailable ? 'var(--status-pass-text)' : 'var(--text-secondary)', marginTop: 6 }}>
            {dailyFreeAvailable ? '✓ Daily Free Screening Ready' : '✓ Daily Free Screening Claimed Today'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {/* Segmented Control Tab Bar */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}
        >
          {[
            { id: 'ALL', label: 'All Tenders' },
            { id: 3, label: 'Stage 3: Bid Ready' },
            { id: 2, label: 'Stage 2: Audited' },
            { id: 1, label: 'Stage 1: Screened' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStageFilter(tab.id)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: stageFilter === tab.id ? 700 : 500,
                borderRadius: 7,
                border: stageFilter === tab.id ? '1px solid var(--border-default)' : '1px solid transparent',
                background: stageFilter === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: stageFilter === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search by title, authority, or ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 44px 7px 32px',
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: 4,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              pointerEvents: 'none',
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* Table Header Strip */}
      <div
        className="hide-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 120px 170px 130px 150px',
          gap: 16,
          padding: '8px 20px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>Tender Details</div>
        <div>Estimated Value</div>
        <div>Pipeline Stage</div>
        <div>Readiness Score</div>
        <div style={{ textAlign: 'right' }}>Actions</div>
      </div>

      {/* Tender Rows List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {filteredTenders.map((tender, idx) => {
          const isQualified = tender.verdict === 'Qualified' || tender.verdict === 'Bid Ready';
          const stageBadgeStyle = getStageBadgeStyle(tender.pipelineStage);

          return (
            <motion.div
              key={tender.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.25 }}
              style={{
                background: 'var(--bg-surface)',
                backdropFilter: 'blur(20px) saturate(160%)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px 20px',
                cursor: 'pointer',
                transition: 'border-color 150ms ease, background 150ms ease',
                boxShadow: 'var(--shadow-card)',
              }}
              onClick={() => navigate(`/workspace/${tender.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.background = 'var(--bg-surface)';
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {/* Tender info */}
                <div style={{ minWidth: 0, gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {tender.authority?.split(' ')[0] || 'EPC'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Ref: {tender.refNo}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tender.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tender.location} · Deadline: {tender.closingDate} ({tender.daysLeft}d left)
                  </div>
                </div>

                {/* Estimated Value */}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-cta)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{tender.estimatedValueCr} Cr
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    EMD: ₹{tender.emdLakhs} L
                  </div>
                </div>

                {/* Pipeline Stage with semantic badge */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                    <span style={{ color: tender.pipelineStage >= 1 ? 'var(--status-pass)' : 'var(--text-muted)' }}>
                      ● S1
                    </span>
                    <span style={{ height: 1, width: 14, background: tender.pipelineStage >= 2 ? 'var(--status-pass)' : 'var(--border-subtle)' }} />
                    <span style={{ color: tender.pipelineStage >= 2 ? 'var(--status-pass)' : 'var(--text-muted)' }}>
                      ● S2
                    </span>
                    <span style={{ height: 1, width: 14, background: tender.pipelineStage >= 3 ? 'var(--status-pass)' : 'var(--border-subtle)' }} />
                    <span style={{ color: tender.pipelineStage >= 3 ? 'var(--status-pass)' : 'var(--text-muted)' }}>
                      ○ S3
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      letterSpacing: '0.02em',
                      ...stageBadgeStyle,
                    }}
                  >
                    {getStageName(tender.pipelineStage)}
                  </span>
                </div>

                {/* Readiness Score & Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 6,
                      background: isQualified ? 'var(--status-pass-bg)' : 'var(--status-warn-bg)',
                      border: `1px solid ${isQualified ? 'var(--status-pass-border)' : 'var(--status-warn-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: isQualified ? 'var(--status-pass-text)' : 'var(--status-warn-text)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {tender.readinessScore}%
                  </div>
                  <span className={`badge-status ${isQualified ? 'pass' : 'warn'}`}>
                    {tender.verdict}
                  </span>
                </div>

                {/* Action button */}
                <div style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/workspace/${tender.id}`)}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 14px' }}
                  >
                    <span>Open Workspace</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {tenders.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <EmptyState
              icon={Sparkles}
              title="No Active Tenders in Pipeline"
              description="Your pipeline is currently clean. Upload an NIT document (.PDF) to begin instant eligibility evaluation, risk analysis, and bid package drafting."
              stamp="✓ Verified for CPWD, NHAI, State PWD, GeM, and Indian Railways"
              actionText="Upload Your First Tender"
              actionIcon={Plus}
              onAction={() => navigate('/workspace')}
              secondaryActionText="Load Sample Tender"
              onSecondaryAction={() => {
                createUploadedTender({
                  name: 'CWC_Target_Pivot_Poles_NIT_09.pdf',
                  size: 4.8 * 1024 * 1024,
                });
              }}
            />
          </motion.div>
        ) : filteredTenders.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <EmptyState
              icon={Search}
              title="No Matching Tenders Found"
              description={`No tenders found matching "${searchTerm}". Try adjusting your keywords or clearing the stage filter.`}
              actionText="Clear Filter"
              onAction={() => {
                setSearchTerm('');
                setStageFilter('ALL');
              }}
            />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

export default Dashboard;
