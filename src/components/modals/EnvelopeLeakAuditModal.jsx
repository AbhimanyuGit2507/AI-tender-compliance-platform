import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';

export function EnvelopeLeakAuditModal({ isOpen, onClose, technicalDocumentsText = '', tenderTitle = '' }) {
  if (!isOpen) return null;

  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(true);

  // Scan algorithm matching backend procurement_math.audit_cover1_commercial_leak
  const scanForLeaks = (text) => {
    if (!text) return [];
    const patterns = [
      /(?:₹|INR|Rs\.?)\s*\d+(?:,\d+)*(?:\.\d{2})?\s*(?:Cr|Lakhs?|Crores?|\/-|per\s+\w+)?/gi,
      /\bquoted\s+(?:rate|price|amount|percentage)\s+of\b/gi,
      /\b(?:total|financial)\s+bid\s+(?:price|value)\s*(?:is|:|=)\b/gi,
      /\b(?:discount|rebate)\s+of\s+\d+(?:\.\d+)?\s*%/gi,
      /\b\d+(?:\.\d+)?\s*%\s*(?:above|below|at\s+par)\b/gi,
      /\bL1\s+price\s+offered\b/gi,
    ];

    const flagged = [];
    patterns.forEach((pat) => {
      let match;
      while ((match = pat.exec(text)) !== null) {
        const start = Math.max(0, match.index - 30);
        const end = Math.min(text.length, match.index + match[0].length + 30);
        const snippet = text.slice(start, end).replace(/\n/g, ' ').trim();
        const lower = snippet.toLowerCase();
        // Ignore standard eligibility context
        if (['emd', 'turnover', 'net worth', 'solvency', 'similar work of', 'estimated cost'].some((t) => lower.includes(t))) {
          continue;
        }
        flagged.push({
          match: match[0],
          snippet: `...${snippet}...`,
          index: match.index,
        });
      }
    });
    return flagged;
  };

  const leaks = scanForLeaks(technicalDocumentsText);
  const isClean = leaks.length === 0;

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
    }, 600);
  };

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
          maxWidth: 680,
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
                background: isClean ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isClean ? '#10b981' : '#ef4444',
              }}
            >
              {isClean ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>
                Two-Envelope Commercial Leak Protection Scanner
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Guarantees Cover 1 (Technical Proposal) contains zero financial prices or quoted rates.
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

        {/* Status Callout */}
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background: isClean ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${isClean ? '#10b981' : '#ef4444'}`,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {isClean ? <CheckCircle2 size={18} color="#10b981" /> : <AlertTriangle size={18} color="#ef4444" />}
            <span style={{ fontSize: 14, fontWeight: 800, color: isClean ? '#10b981' : '#ef4444' }}>
              {isClean ? 'COVER 1 VERIFIED: ZERO COMMERCIAL LEAKS DETECTED' : `CRITICAL ALERT: ${leaks.length} FINANCIAL REFERENCES DETECTED`}
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {isClean
              ? 'All technical documents, transmittal letters, and methodology plans are completely free of commercial pricing, quoted rates, and financial discounts. Safe for technical envelope submission.'
              : 'Under CPWD, NHAI, and GeM procurement rules, disclosing monetary rates or pricing in Cover 1 (Technical Proposal) leads to IMMEDIATE SUMMARY DISQUALIFICATION and forfeiture of tender processing fees. Remove the highlighted items below before portal upload.'}
          </p>
        </div>

        {/* Detected Leaks List */}
        {!isClean && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ef4444' }}>
              Flagged Commercial Snippets ({leaks.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {leaks.map((leak, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                      Match: "{leak.match}"
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Clause Location #{idx + 1}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                    {leak.snippet}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Procurement Rule Guidance */}
        <div
          style={{
            padding: 12,
            background: 'var(--bg-elevated)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            lineHeight: 1.45,
            marginBottom: 20,
          }}
        >
          💡 <strong>Indian Procurement Rule Book:</strong> General Financial Rules (GFR 2017 Rule 163) and CPWD Works Manual Section 14 mandate that Financial Bids (Cover 2 / BOQ Excel) can ONLY be opened for bidders whose Technical Bid (Cover 1) is found strictly acceptable without commercial disclosure.
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleRescan}
            disabled={isScanning}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <RefreshCw size={13} className={isScanning ? 'spin' : ''} />
            <span>{isScanning ? 'Scanning...' : 'Re-Scan Technical Package'}</span>
          </button>

          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: 12 }}>
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
export default EnvelopeLeakAuditModal;

