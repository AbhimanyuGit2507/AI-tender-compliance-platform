import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  FileText,
  Download,
  Mail,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export function PaymentSuccessModal({ isOpen, onClose, paymentResult }) {
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  if (!isOpen || !paymentResult) return null;

  const {
    invoiceNo = 'INV-202611-000000',
    paymentId = 'pay_demo_success',
    creditsAdded = 500,
    planTitle = 'Active Bidder 5-Tender Pack',
    amountInr = 499,
    newBalance = 524,
    isDevMode = false,
  } = paymentResult;

  const baseTaxable = (amountInr / 1.18).toFixed(2);
  const totalGst = (amountInr - Number(baseTaxable)).toFixed(2);
  const halfGst = (Number(totalGst) / 2).toFixed(2);

  const handlePrintInvoice = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-pod"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 99, 235, 0.25)',
          overflow: 'hidden',
          animation: 'modalSlideUp 200ms ease-out',
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            padding: '24px 24px 18px 24px',
            textAlign: 'center',
            position: 'relative',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.15), transparent 70%)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary, #94a3b8)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>

          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              color: '#10B981',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Payment Successful & Verified
          </h2>

          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Your account has been instantly credited. Official tax invoice generated.
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24 }}>
          {/* Purchased Plan & Credit Summary */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Purchased Plan
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', marginTop: 2 }}>
                  {planTitle}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Amount Paid
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981', marginTop: 2 }}>
                  ₹{Number(amountInr).toFixed(2)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F8FAFC' }}>
                <Zap size={14} color="#F59E0B" fill="#F59E0B" />
                <span>Credits Added:</span>
                <strong style={{ color: '#F59E0B' }}>+{creditsAdded} Credits</strong>
              </div>
              <div style={{ color: '#94A3B8', fontSize: 12 }}>
                New Balance: <strong style={{ color: '#FFFFFF' }}>{newBalance} Credits</strong>
              </div>
            </div>
          </div>

          {/* Tax Invoice & Transaction Reference Badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <div style={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>
                Invoice Number
              </div>
              <div style={{ fontFamily: 'var(--font-mono, monospace)', color: '#38BDF8', fontWeight: 700, marginTop: 3 }}>
                {invoiceNo}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            >
              <div style={{ color: '#64748B', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' }}>
                Razorpay Payment ID
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#94A3B8',
                  marginTop: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={paymentId}
              >
                {paymentId}
              </div>
            </div>
          </div>

          {/* Brevo Email Delivery Notification Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 14px',
              background: 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 8,
              fontSize: 12,
              color: '#E0F2FE',
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            <Mail size={16} color="#38BDF8" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>GST Tax Invoice Dispatched</strong>
              <div style={{ color: '#93C5FD', fontSize: 11.5, marginTop: 2 }}>
                An official receipt with SAC Code <strong>998313</strong> has been dispatched via email.
              </div>
            </div>
          </div>

          {/* Toggleable GST Breakdown */}
          <div style={{ marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: 0,
              }}
            >
              <FileText size={12} />
              <span>{showTaxBreakdown ? 'Hide GST Breakdown' : 'Show 18% GST Tax Breakdown (SAC 998313)'}</span>
            </button>

            {showTaxBreakdown && (
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: 11.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  color: '#CBD5E1',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Taxable Base Amount:</span>
                  <strong>₹{baseTaxable}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST (9.0%):</span>
                  <span>₹{halfGst}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST (9.0%):</span>
                  <span>₹{halfGst}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed rgba(255, 255, 255, 0.1)', color: '#FFFFFF', fontWeight: 700 }}>
                  <span>Total (Inclusive of GST):</span>
                  <span>₹{Number(amountInr).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handlePrintInvoice}
              className="btn-agent btn-agent-secondary"
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Download size={14} /> Print Receipt
            </button>

            <button
              onClick={onClose}
              className="btn-agent btn-agent-primary"
              style={{
                flex: 1.5,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
              }}
            >
              <span>Continue to Workspace</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccessModal;

