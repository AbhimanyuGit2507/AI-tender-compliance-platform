import React, { useState } from 'react';
import {
  FileDiff,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  X,
  Calendar,
  DollarSign,
  Clock,
  Layers,
} from 'lucide-react';

export function CorrigendumDiffModal({ isOpen, onClose, tender, companyVault }) {
  if (!isOpen) return null;

  const tenderValueCr = tender?.estimated_value_inr ? tender.estimated_value_inr / 1e7 : 25.0;
  const userTurnoverCr = companyVault?.quickMetrics?.turnover3YrAvgCr || 15.0;
  const userCommitmentsCr = 4.0;

  // Corrigendum modifications
  const originalMonths = 24.0;
  const revisedMonths = 14.0; // Cut by 10 months

  // Original Capacity: 2 * A * N - B
  const k = 2.0;
  const origN = originalMonths / 12.0;
  const revisedN = revisedMonths / 12.0;

  const origCapacityCr = Math.max(0, k * userTurnoverCr * origN - userCommitmentsCr);
  const revisedCapacityCr = Math.max(0, k * userTurnoverCr * revisedN - userCommitmentsCr);
  const deltaCapacityCr = revisedCapacityCr - origCapacityCr;

  const origPasses = origCapacityCr >= tenderValueCr;
  const revisedPasses = revisedCapacityCr >= tenderValueCr;
  const hasDisqualificationImpact = origPasses && !revisedPasses;

  const diffItems = [
    {
      clause: 'Section 1 — NIT Schedule & Deadlines',
      field: 'Completion Period (Months)',
      original: '24 Months (2.0 Years)',
      revised: '14 Months (1.17 Years)',
      type: 'critical',
      note: 'Completion period reduced by 10 months. Directly impacts Bid Capacity formula (Parameter N).',
    },
    {
      clause: 'Section 2 — Commercial Terms & EMD',
      field: 'Earnest Money Deposit (EMD)',
      original: '₹ 50,00,000/- (Fifty Lakhs)',
      revised: '₹ 35,00,000/- (Thirty-Five Lakhs)',
      type: 'favorable',
      note: 'EMD reduced by ₹15 Lakhs for all bidders.',
    },
    {
      clause: 'Section 3 — Technical Specifications',
      field: 'Batching Plant Capacity',
      original: 'Minimum 30 TPH Wet Mix Plant',
      revised: 'Minimum 60 TPH Fully Automated Wet Mix Plant with SCADA',
      type: 'warning',
      note: 'Increased equipment specification requirement.',
    },
    {
      clause: 'Schedule B — BOQ Item 4.02',
      field: 'Dense Bituminous Macadam (DBM)',
      original: '8,400 MT',
      revised: '11,200 MT (+33.3% Quantity Revision)',
      type: 'warning',
      note: 'BOQ item quantity amended.',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
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
          maxWidth: 820,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 28,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(249, 115, 22, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <FileDiff size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Corrigendum & Addendum Impact Diff Engine</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Comparing Original NIT vs Corrigendum No. 1 & 2 with automated Bid Capacity cascade.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cascade Impact Callout */}
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: hasDisqualificationImpact ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${hasDisqualificationImpact ? '#ef4444' : '#f59e0b'}`,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color={hasDisqualificationImpact ? '#ef4444' : '#f59e0b'} />
              <span style={{ fontSize: 14, fontWeight: 800, color: hasDisqualificationImpact ? '#ef4444' : '#f59e0b' }}>
                {hasDisqualificationImpact
                  ? 'CRITICAL DISQUALIFICATION ALERT: BID CAPACITY DROPPED BELOW TENDER VALUE'
                  : 'CORRIGENDUM IMPACT: COMPLETION PERIOD SLASHED BY 10 MONTHS'}
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: '#ef4444' }}>
              Capacity Delta: {deltaCapacityCr.toFixed(2)} Cr
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 10,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Original Capacity (24 Mo): </span>
              <strong style={{ color: '#10b981' }}>₹{origCapacityCr.toFixed(2)} Cr</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Revised Capacity (14 Mo): </span>
              <strong style={{ color: hasDisqualificationImpact ? '#ef4444' : 'var(--text-primary)' }}>
                ₹{revisedCapacityCr.toFixed(2)} Cr
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Tender Threshold: </span>
              <strong>₹{tenderValueCr.toFixed(2)} Cr</strong>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            {hasDisqualificationImpact
              ? `Under original 24-month schedule, your company qualified with ₹${origCapacityCr.toFixed(2)} Cr capacity. Because the authority reduced period N to 14 months, your available capacity is now ₹${revisedCapacityCr.toFixed(2)} Cr, which is below the ₹${tenderValueCr.toFixed(2)} Cr threshold! Bidding alone will cause rejection — you must bid via Joint Venture (JV).`
              : `Your Available Bid Capacity decreased by ₹${Math.abs(deltaCapacityCr).toFixed(2)} Cr due to shorter contract duration N, but remains above the tender value.`}
          </p>
        </div>

        {/* Clause by Clause Diff Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700 }}>Clause-by-Clause Amendment Comparison</h4>
          {diffItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                fontSize: 12.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.clause}</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: item.type === 'favorable' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                    color: item.type === 'favorable' ? '#10b981' : 'var(--accent-primary)',
                  }}
                >
                  {item.field}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                    Original NIT Text
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>{item.original}</div>
                </div>

                <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                    Corrigendum Amendment
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.revised}</div>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{item.note}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 12 }}>
            Acknowledge Corrigenda
          </button>
        </div>
      </div>
    </div>
  );
}
export default CorrigendumDiffModal;

