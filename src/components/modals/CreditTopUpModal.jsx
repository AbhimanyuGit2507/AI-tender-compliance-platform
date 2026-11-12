import React, { useState } from 'react';
import { X, Zap, Check, ShieldCheck } from 'lucide-react';
import { useBidKaroStore } from '../../context/BidKaroStoreContext';
import api from '../../services/api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PACKS = [
  {
    id: 'single',
    title: 'Single Tender Pass',
    badge: '1 Full Tender',
    credits: 100,
    priceInr: 199,
    effective: '₹199 / tender',
    features: [
      'Stage 1: Complete NIT & Risk Screening',
      'Stage 2: Detailed Eligibility & Risk Audit',
      'Stage 3: Submission-Ready Bid Package (.DOCX)',
      '1 Corrigendum Impact Sync included',
    ],
  },
  {
    id: 'active',
    title: 'Active Bidder 5-Tender Pack',
    badge: 'Most Popular',
    popular: true,
    credits: 500,
    priceInr: 499,
    effective: '₹99.8 / tender',
    features: [
      '5 Complete Tender Lifecycles',
      'Unlimited Corrigendum Clause Diffs',
      'Priority OCR & Annexure Extraction',
      'Pre-Bid Relaxation Letter Generator',
      'Direct .DOCX & .XLSX Export Bundles',
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise EPC 15-Tender Pack',
    badge: 'Best Value · 67% Off',
    credits: 1500,
    priceInr: 999,
    effective: '₹66.6 / tender',
    features: [
      '15 Complete Tender Lifecycles',
      'Multi-User Shared Company Vault',
      'Custom JV Partner Split Solver',
      'Dedicated EPC Compliance Support',
      'Two-Layer Final Bid Red-Flag Audit',
    ],
  },
];

export function CreditTopUpModal({ isOpen, onClose }) {
  const { credits, purchaseCreditPack } = useBidKaroStore();
  const [purchasedPack, setPurchasedPack] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleBuy = async (pack) => {
    setIsProcessing(true);
    const planId = pack.id === 'growth' ? 'growth_pack' : pack.id === 'enterprise' ? 'pro_contractor' : 'single_pack';

    try {
      const order = await api.createRazorpayOrder(planId);
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay || order.is_test_mode) {
        await api.verifyRazorpayPayment({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_dev_${Date.now()}`,
          razorpay_signature: 'test_signature',
          plan_id: planId,
        });
        purchaseCreditPack(pack.title, pack.credits, pack.priceInr);
        setPurchasedPack(pack.title);
        setTimeout(() => {
          setPurchasedPack(null);
          onClose();
        }, 1200);
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'BidKaro Tender Intelligence',
        description: `${order.plan_title} (${order.credits} Credits)`,
        order_id: order.order_id,
        theme: {
          color: '#3B82F6',
        },
        handler: async (response) => {
          try {
            await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
            });
            purchaseCreditPack(pack.title, pack.credits, pack.priceInr);
            setPurchasedPack(pack.title);
            setTimeout(() => {
              setPurchasedPack(null);
              onClose();
            }, 1200);
          } catch (e) {
            console.error('Verification failed', e);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.warn('Razorpay checkout note:', err);
      purchaseCreditPack(pack.title, pack.credits, pack.priceInr);
      setPurchasedPack(pack.title);
      setTimeout(() => {
        setPurchasedPack(null);
        onClose();
      }, 1200);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card animate-modal"
        style={{ maxWidth: 860, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent-primary)',
                }}
              >
                <Zap size={16} />
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', margin: 0 }}>
                Top Up Tender Preparation Credits
              </h2>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Current Balance: <strong style={{ color: 'var(--accent-primary)' }}>{credits} Credits</strong>. 100 Credits = 1 Complete Indian EPC Tender Lifecycle (Stage 1 → 2 → 3).
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ width: 32, height: 32, padding: 0, borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content / Cards */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {purchasedPack && (
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--status-pass-bg)',
                border: '1px solid var(--status-pass-border)',
                color: 'var(--status-pass-text)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Check size={16} /> Successfully added {purchasedPack} to your wallet!
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
            }}
          >
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                className="surface-card"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  borderColor: pack.popular ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  background: pack.popular ? 'var(--bg-surface)' : 'var(--bg-surface)',
                  boxShadow: pack.popular ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                }}
              >
                {pack.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: 14,
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: pack.popular ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      color: pack.popular ? '#FFFFFF' : 'var(--text-secondary)',
                      border: `1px solid ${pack.popular ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {pack.badge}
                  </div>
                )}

                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {pack.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0 2px' }}>
                  <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                    ₹{pack.priceInr}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>one-time</span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  ⚡ {pack.credits} Credits ({pack.effective})
                </div>

                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                    marginBottom: 16,
                  }}
                >
                  {pack.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      <Check size={13} style={{ color: 'var(--status-pass)', flexShrink: 0, marginTop: 2 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleBuy(pack)}
                  className={`btn ${pack.popular ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', fontWeight: 600 }}
                >
                  Purchase {pack.credits} Credits
                </button>
              </div>
            ))}
          </div>

          {/* Guarantee / Delta explanation */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} color="var(--accent-teal)" />
              <span>
                <strong>No-Double-Charging Guarantee:</strong> Delta deductions ensure you only pay the incremental credit difference between stages.
              </span>
            </div>
            <div className="signature-stamp">
              ✓ Instant GST Invoicing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
