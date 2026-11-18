import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Clock, History, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBidKaroStore } from '../context/BidKaroStoreContext';
import { useAuth } from '../context/AuthContext';
import { startRazorpayCheckout } from '../services/razorpay';
import { PaymentSuccessModal } from '../components/modals/PaymentSuccessModal';

const USAGE_HISTORY = [
  { action: 'NIT Package Audit (400 Pages)', cost: 15, date: 'Today, 03:14 PM', tender: 'NHAI 4-Lane Greenfield Highway EPC', status: 'Completed' },
  { action: 'Clause Eligibility Deep Scan', cost: 10, date: 'Yesterday, 11:42 AM', tender: 'CPWD 500-Bed Super Specialty Hospital', status: 'Completed' },
  { action: 'Turnkey Bid Package Compiler', cost: 20, date: '11 Nov 2026', tender: 'State PWD Multi-Span River Bridge', status: 'Completed' },
  { action: 'Interactive Pre-Bid Copilot', cost: 5, date: '10 Nov 2026', tender: 'NHAI 4-Lane Greenfield Highway EPC', status: 'Completed' },
  { action: 'BOQ Rate Analysis & Schedule C', cost: 10, date: '08 Nov 2026', tender: 'MJP Mega Lift Irrigation Scheme', status: 'Completed' },
  { action: 'Corrigenda Variance Audit', cost: 5, date: '06 Nov 2026', tender: 'Railways Double Line Doubling Package', status: 'Completed' },
];

const PLANS = [
  {
    id: 'single_pack',
    name: 'Single Tender Pass',
    credits: 100,
    priceInr: 199,
    price: '₹199',
    unitPrice: '₹1.99/credit',
    desc: 'Complete clause audit, eligibility matrix & bid package compiler for 1 tender NIT.',
    features: [
      'Stage 1: Complete NIT & Risk Screening',
      'Stage 2: Detailed Eligibility & Risk Audit',
      'Stage 3: Submission-Ready Bid Package (.DOCX)',
      '1 Corrigendum Impact Sync included',
    ],
  },
  {
    id: 'growth_pack',
    name: 'Active Bidder 5-Tender Pack',
    credits: 500,
    priceInr: 499,
    price: '₹499',
    unitPrice: '₹0.99/credit',
    desc: 'Best for active EPC and civil contractors bidding 5–8 government tenders per month.',
    popular: true,
    features: [
      '5 Complete Tender Lifecycles',
      'Unlimited Corrigendum Clause Diffs',
      'Priority OCR & Annexure Extraction',
      'Pre-Bid Relaxation Letter Generator',
      'Direct .DOCX & .XLSX Export Bundles',
    ],
  },
  {
    id: 'pro_contractor',
    name: 'Enterprise EPC 15-Tender Pack',
    credits: 1500,
    priceInr: 999,
    price: '₹999',
    unitPrice: '₹0.66/credit',
    desc: 'Dedicated enterprise capacity for infrastructure conglomerates and tender consulting firms.',
    features: [
      '15 Complete Tender Lifecycles',
      'Multi-User Shared Company Vault',
      'Custom JV Partner Split Solver',
      'Dedicated EPC Compliance Support',
      'Two-Layer Final Bid Red-Flag Audit',
    ],
  },
];

export function Wallet({ showToast }) {
  const navigate = useNavigate();
  const { credits, planTier, purchaseCreditPack, companyVault } = useBidKaroStore();
  const { user } = useAuth();
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const handlePurchasePlan = async (plan) => {
    setIsProcessing(true);
    await startRazorpayCheckout({
      planId: plan.id,
      planTitle: plan.name,
      priceInr: plan.priceInr,
      credits: plan.credits,
      user: user || {},
      companyVault: companyVault || {},
      onStart: () => setIsProcessing(true),
      onSuccess: (res) => {
        setIsProcessing(false);
        purchaseCreditPack(plan.name, res.creditsAdded || plan.credits, res.amountInr || plan.priceInr);
        setPaymentResult({
          ...res,
          planTitle: plan.name,
          amountInr: plan.priceInr,
          creditsAdded: res.creditsAdded || plan.credits,
        });
        setSuccessModalOpen(true);
        if (showToast) {
          showToast(`Successfully credited ${plan.credits} credits to wallet!`, 'success');
        }
      },
      onError: (err) => {
        setIsProcessing(false);
        if (showToast) {
          showToast(`Payment error: ${err}`, 'error');
        }
      },
      onDismiss: () => {
        setIsProcessing(false);
      },
    });
  };

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px 64px' }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <CreditCard size={17} />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Procurement Credits & Usage
          </h1>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            margin: 0,
            maxWidth: 620,
          }}
        >
          High-precision NIT parsing and clause-by-clause intelligence consume compute credits dynamically.
          Credits never expire on active accounts.
        </p>
      </div>

      {/* ── BALANCE HERO GLASS POD ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: 'radial-gradient(ellipse 900px 300px at 0% 0%, rgba(99, 102, 241, 0.16) 0%, transparent 70%), var(--bg-surface)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid var(--border-default)',
          borderRadius: 18,
          padding: '32px 36px',
          boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          marginBottom: 36,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 32,
            alignItems: 'center',
          }}
        >
          {/* Left: Big Live Balance */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent-primary-light, #a5b4fc)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={14} color="var(--accent-primary)" />
              Active Credit Balance
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-numeric)',
                  fontSize: 64,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {credits ?? 340}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                Credits
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--status-pass)',
                  boxShadow: '0 0 8px var(--status-pass)',
                }}
              />
              <span>{totalSpent} credits utilized across audited tenders this billing cycle</span>
            </div>
          </div>

          {/* Right: Consumption Formula Telemetry */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '18px 22px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 12,
              }}
            >
              Compute Deduction Rates
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Full NIT Parsing & Criteria Extraction', cost: '15 cr / tender' },
                { label: 'Sub-Clause Risk & Disqualification Audit', cost: '10 cr / tender' },
                { label: 'Turnkey Bid Proposal Compiler (DOCX)', cost: '20 cr / package' },
                { label: 'Interactive Pre-Bid Copilot Sessions', cost: '5 cr / query batch' },
              ].map((rate, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>{rate.label}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-numeric)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {rate.cost}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── PLANS & USAGE GRID ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 32,
        }}
      >
        {/* Left Column: Purchase Credit Packs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Instant Credit Top-Up
            </h2>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--status-pass-text)',
                background: 'var(--status-pass-bg)',
                border: '1px solid var(--status-pass-border)',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              GST Invoicing Supported
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PLANS.map((plan, i) => {
              const isSelected = selectedPlanIndex === i;
              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedPlanIndex(i)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: isSelected
                      ? '1px solid var(--accent-primary)'
                      : plan.popular
                      ? '1px solid var(--border-default)'
                      : '1px solid var(--border-subtle)',
                    borderRadius: 14,
                    padding: '20px 22px',
                    position: 'relative',
                    boxShadow: isSelected ? 'var(--shadow-glow-indigo)' : 'var(--shadow-card)',
                    transition: 'border-color 160ms ease, box-shadow 160ms ease',
                  }}
                >
                  {plan.popular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: 20,
                        background: 'var(--accent-gradient)',
                        color: '#FFFFFF',
                        fontSize: 10.5,
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '2px 10px',
                        borderRadius: 999,
                        boxShadow: '0 2px 8px var(--accent-glow)',
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {plan.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--text-secondary)',
                          marginTop: 3,
                          maxWidth: 280,
                          lineHeight: 1.45,
                        }}
                      >
                        {plan.desc}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 24,
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.03em',
                        }}
                      >
                        {plan.price}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-numeric)',
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: 'var(--accent-primary-light, #a5b4fc)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 3,
                          marginTop: 2,
                        }}
                      >
                        <Zap size={11} /> {plan.credits} Credits ({plan.unitPrice})
                      </div>
                    </div>
                  </div>

                  {/* Features list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                    {plan.features.map((feat, j) => (
                      <div
                        key={j}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <CheckCircle2 size={13} color="var(--status-pass)" style={{ flexShrink: 0 }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            className="btn btn-primary"
            disabled={isProcessing}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '13px 0',
              fontSize: 14,
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              borderRadius: 10,
              boxShadow: '0 4px 20px rgba(249, 115, 22, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onClick={() => handlePurchasePlan(PLANS[selectedPlanIndex])}
          >
            <Zap size={15} />
            <span>{isProcessing ? 'Processing Secure Payment...' : `Purchase ${PLANS[selectedPlanIndex].name} (${PLANS[selectedPlanIndex].price})`}</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Right Column: Verified Audit Trail */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Audited Compute History
            </h2>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <History size={13} /> Real-time log
            </span>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {USAGE_HISTORY.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderBottom: i < USAGE_HISTORY.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--accent-subtle)',
                    border: '1px solid var(--accent-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-primary)',
                    flexShrink: 0,
                  }}
                >
                  <Zap size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.action}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-tertiary)',
                      marginTop: 2,
                      fontFamily: 'var(--font-sans)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.tender} · {item.date}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--status-warn-text)',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}
                >
                  −{item.cost} cr
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verified Razorpay Payment Success & GST Invoice Modal */}
      <PaymentSuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        paymentResult={paymentResult}
      />
    </div>
  );
}
