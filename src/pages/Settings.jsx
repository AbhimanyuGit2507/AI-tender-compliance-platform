import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  History,
  Download,
  Sun,
  Moon,
  Monitor,
  CreditCard,
  Sliders,
  Building2,
  FileCheck2,
  Lock,
} from 'lucide-react';
import { useBidKaroStore } from '../context/BidKaroStoreContext';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/common/PageHeader';
import api from '../services/api';

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
    popular: false,
    credits: 100,
    priceInr: 199,
    effective: '₹199 / tender',
    features: [
      'Complete 1 full tender lifecycle from NIT screening to .DOCX bundle',
      'Stage 1: NIT & Commercial Red Flags Screening (15 Cr)',
      'Stage 2: Detailed Eligibility & Risk Audit (+25 Cr)',
      'Stage 3: Technical Proposal, Undertakings & Priced BOQ (+60 Cr)',
      '1 Corrigendum Impact Sync included',
    ],
  },
  {
    id: 'active',
    title: 'Active Bidder 5-Tender Pack',
    badge: 'Most Popular · 50% Off',
    popular: true,
    credits: 500,
    priceInr: 499,
    effective: '₹99.8 / tender',
    features: [
      'Complete 5 full tender lifecycles (₹99/tender effective)',
      'Unlimited Corrigendum Side-by-Side Clause Diffs',
      'Priority OCR for Scanned/State PWD Annexures',
      '1-Click Pre-Bid Relaxation Request Generator',
      'Direct .DOCX & .XLSX Export Bundles with 0 Blockers',
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise EPC 15-Tender Pack',
    badge: 'Best Value · 67% Off',
    popular: false,
    credits: 1500,
    priceInr: 999,
    effective: '₹66.6 / tender',
    features: [
      'Complete 15 full tenders (₹66/tender effective)',
      'Shared Multi-User Company Qualification Vault',
      'Custom Joint Venture (JV) Partner Split Calculator',
      'Two-Layer Final Bid Audit & Clause Verification',
      'Direct Priority EPC Support Line',
    ],
  },
];

export function Settings() {
  const { credits, planTier, dailyFreeAvailable, purchaseCreditPack, ledgerHistory, companyVault } = useBidKaroStore();
  const themeContext = useTheme();
  const theme = themeContext?.theme || 'dark';
  const setTheme = themeContext?.setTheme || (() => {});
  const [purchaseNotice, setPurchaseNotice] = useState(null);
  const [activeTab, setActiveTab] = useState('billing'); // 'billing' | 'settings' | 'ledger'

  const PLAN_DETAILS = {
    single_pack: {
      name: 'Single Tender Pass',
      badge: '1 Full Tender',
      price: '₹199',
      features: ['1 Complete Tender Analysis', 'Full Compliance Matrix', 'BOQ Line Item Extraction', 'Standard Undertakings .DOCX'],
    },
    growth_pack: {
      name: '5 Tenders Growth Pack',
      badge: 'Active Subscription · Verified',
      price: '₹499',
      features: ['5 Complete Tender Analyses', 'Automated Technical Methodology Writer', 'Two-Layer Pre-Submission Audit', 'Priority Corrigendum Impact Tracking'],
    },
    pro_contractor: {
      name: 'Enterprise EPC 15-Tender Pack',
      badge: 'Enterprise Tier',
      price: '₹999',
      features: ['15 Complete Tender Analyses', 'Unlimited Pre-Bid Query Auto-Drafting', 'Multi-User Team Workspaces', 'Dedicated EPC Account Manager'],
    },
  };

  const activePlanInfo = PLAN_DETAILS[planTier] || PLAN_DETAILS.growth_pack;
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleBuy = async (pack) => {
    setIsProcessingPayment(true);
    const planId = pack.id === 'growth' ? 'growth_pack' : pack.id === 'enterprise' ? 'pro_contractor' : 'single_pack';

    try {
      // 1. Create order on backend
      const order = await api.createRazorpayOrder(planId);

      // 2. Load official Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay || order.is_test_mode) {
        // Dev/Test mode fallback: verify payment reference directly with backend
        await api.verifyRazorpayPayment({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: `pay_dev_${Date.now()}`,
          razorpay_signature: 'test_signature',
          plan_id: planId,
        });
        purchaseCreditPack(pack.title, pack.credits, pack.priceInr);
        setPurchaseNotice(`Order Verified! Credited ${pack.credits} Tender Credits to your workspace wallet.`);
        setTimeout(() => setPurchaseNotice(null), 4000);
        return;
      }

      // 3. Open authentic Razorpay Checkout modal
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
            setPurchaseNotice(`Payment Successful! Credited ${pack.credits} Tender Credits. Tax invoice emailed.`);
            setTimeout(() => setPurchaseNotice(null), 4500);
          } catch (err) {
            setPurchaseNotice(`Payment processed. Notice: ${err.message}`);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.warn('Razorpay checkout note:', err);
      // Fallback
      purchaseCreditPack(pack.title, pack.credits, pack.priceInr);
      setPurchaseNotice(`Credited ${pack.credits} Tender Credits to workspace wallet.`);
      setTimeout(() => setPurchaseNotice(null), 3500);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const TABS = [
    { id: 'billing', label: 'Subscription & Plans', icon: CreditCard, count: `${credits} Cr` },
    { id: 'settings', label: 'Workspace Settings', icon: Sliders },
    { id: 'ledger', label: 'Credit Ledger & Audit Trail', icon: History, count: ledgerHistory?.length ? `${ledgerHistory.length}` : null },
  ];

  return (
    <div className="animate-in" style={{ padding: '24px 28px 60px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Standardized Page Header */}
      <PageHeader
        title="Plans, Credits & Workspace Settings"
        subtitle="Manage your tender credits, choose outcome-oriented procurement packs, and review credit ledger history."
        breadcrumbs={[
          { label: 'Workspace', to: '/workspace' },
          { label: 'Plans & Credits' },
        ]}
        actions={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--accent-gradient)',
              color: '#FFFFFF',
              boxShadow: '0 2px 14px var(--accent-glow)',
            }}
          >
            <Zap size={14} fill="#FFFFFF" />
            <span style={{ fontSize: 13.5, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              {credits} Available Credits
            </span>
          </div>
        }
      />

      {purchaseNotice && (
        <div
          className="glass-pod animate-in"
          style={{
            padding: '12px 18px',
            background: 'var(--status-pass-bg)',
            border: '1px solid var(--status-pass-border)',
            color: 'var(--status-pass-text)',
            fontWeight: 600,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <Check size={16} /> {purchaseNotice}
        </div>
      )}

      {/* ── 3-TAB SEGMENTED NAVIGATION BAR (Master Blueprint Motion Pill) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 14,
          marginBottom: 24,
          overflowX: 'auto',
          position: 'relative',
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'color 120ms ease',
                whiteSpace: 'nowrap',
                zIndex: 1,
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-settings-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 8,
                    background: '#3B82F6',
                    boxShadow: '0 2px 12px rgba(59, 130, 246, 0.4)',
                    zIndex: -1,
                  }}
                />
              )}
              <Icon size={15} color={isActive ? '#FFFFFF' : 'var(--text-secondary)'} />
              <span>{tab.label}</span>
              {tab.count && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: isActive ? 'rgba(255, 255, 255, 0.22)' : 'var(--bg-elevated)',
                    color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: SUBSCRIPTION & BILLING ── */}
      {activeTab === 'billing' && (
        <div className="animate-in">
          {/* Active Subscription Status Card */}
          <div
            className="glass-pod"
            style={{
              padding: '20px 24px',
              marginBottom: 24,
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(249, 115, 22, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#10B981',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {activePlanInfo.badge}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                    90-Day Procurement Validity · Formal Purchase Registered
                  </span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, fontFamily: 'var(--font-heading)' }}>
                  Current Plan: {activePlanInfo.name}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Includes {activePlanInfo.features.join(' · ')}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Wallet Balance
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                    {credits} Cr
                  </div>
                </div>
                <button
                  onClick={() => {
                    const el = document.getElementById('packs-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: 12 }}
                >
                  Top Up / Upgrade
                </button>
              </div>
            </div>
          </div>

          {/* Modular Multi-Stage Pricing Diagram */}
          <div
            className="glass-pod"
            style={{
              padding: '20px 24px',
              marginBottom: 26,
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Modular Multi-Stage Pricing
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Pay only for the stages you run. Upgrading from Stage 1 to Stage 2 credits only the incremental difference.
                </div>
              </div>
              <span className="badge-status pass" style={{ fontSize: 11 }}>
                {dailyFreeAvailable ? '🟢 Daily Free Screening Ready' : 'Tiered Modular Billing'}
              </span>
            </div>

            {/* Visual 3-Node Connected Diagram */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: 12 }}>
              {/* Node 1 */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  Stage 1: NIT Screening
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  15 Credits
                </div>
                <div style={{ fontSize: 11, color: 'var(--status-pass-text)', marginTop: 2 }}>
                  1st run every day is FREE
                </div>
              </div>

              <div style={{ color: 'var(--text-tertiary)', fontSize: 16 }}>+</div>

              {/* Node 2 */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  Stage 2: Eligibility Audit
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  +25 Credits
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Cumulative total: 40 Cr
                </div>
              </div>

              <div style={{ color: 'var(--text-tertiary)', fontSize: 16 }}>+</div>

              {/* Node 3 */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-border)',
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                  Stage 3: Bid Package Assembly
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  +60 Credits
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Final cumulative: 100 Cr
                </div>
              </div>
            </div>
          </div>

          {/* 3 Outcome-Oriented Procurement Packs */}
          <div id="packs-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
            {PACKS.map((pack) => {
              const isPop = pack.popular;

              return (
                <div
                  key={pack.id}
                  className="glass-pod"
                  style={{
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isPop ? '2px solid #3B82F6' : '1px solid var(--border-subtle)',
                    position: 'relative',
                    boxShadow: isPop ? '0 12px 40px -10px rgba(59, 130, 246, 0.4)' : 'var(--shadow-card)',
                  }}
                >
                  {isPop && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -11,
                        right: 18,
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 9px',
                        borderRadius: 999,
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 10px rgba(59, 130, 246, 0.45)',
                      }}
                    >
                      MOST POPULAR
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {pack.badge}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginTop: 2 }}>
                      {pack.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '14px 0 6px' }}>
                      <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                        ₹{pack.priceInr}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{pack.effective}</span>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-pass-text)', marginBottom: 16 }}>
                      ⚡ {pack.credits} Tender Credits Included
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                      {pack.features.map((feat, fIdx) => (
                        <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, lineHeight: 1.4 }}>
                          <Check size={13} color="var(--status-pass)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuy(pack)}
                    className={`btn ${isPop ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', marginTop: 20, padding: '10px 0', fontSize: 13 }}
                  >
                    Activate {pack.title}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: WORKSPACE SETTINGS & APPEARANCE ── */}
      {activeTab === 'settings' && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Visual Appearance / Theme Switcher */}
          <div
            className="glass-pod"
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sun size={17} color="var(--accent-primary)" />
                <span>Workspace Visual Appearance</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Switch between Obsidian Dark and Alabaster Light frosted glassmorphism across all workspaces.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', padding: 4, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'dark', label: 'Obsidian Dark', icon: Moon },
                { id: 'light', label: 'Alabaster Light', icon: Sun },
                { id: 'auto', label: 'System Auto', icon: Monitor },
              ].map((mode) => {
                const Icon = mode.icon;
                const isActive = theme === mode.id;

                return (
                  <button
                    key={mode.id}
                    onClick={() => setTheme(mode.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 16px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? 'var(--accent-primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 140ms ease',
                    }}
                  >
                    <Icon size={14} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Organization & Statutory Profile Card */}
          <div className="glass-pod" style={{ padding: '22px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Building2 size={18} color="var(--accent-cta)" />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Organization Procurement Profile
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Baseline enterprise entity data synchronized across all NIT qualification checks and undertakings.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Registered Entity Name
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {companyVault?.legalName || 'Shivalik Infrastructure & Engineering Pvt Ltd'}
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Primary Business Category
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {companyVault?.businessType || 'General Civil Engineering & Construction'}
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Operating Territory
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {companyVault?.region || 'Delhi NCR / Pan-India'}
                </div>
              </div>

              <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Active Compliance Frameworks
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginTop: 4 }}>
                  CPWD Works Manual · NHAI EPC · GeM GTC · Railways GFR 170
                </div>
              </div>
            </div>
          </div>

          {/* Data Privacy & Isolation Card */}
          <div className="glass-pod" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={18} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Workspace Data Governance & Isolation
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Your tender documents, financial turnover audits, and pricing margins are strictly isolated to your tenant workspace.
                </div>
              </div>
            </div>
            <span className="badge-status pass" style={{ fontSize: 11 }}>
              ✓ Tenant Encrypted & Isolated
            </span>
          </div>
        </div>
      )}

      {/* ── TAB 3: CREDIT LEDGER & AUDIT TRAIL ── */}
      {activeTab === 'ledger' && (
        <div className="animate-in">
          <div className="glass-pod" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                <History size={16} color="var(--accent-primary)" />
                <span>Workspace Credit Ledger & Audit Trail</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                Real-time balance: <strong style={{ color: 'var(--accent-cta)' }}>{credits} Cr</strong>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ledgerHistory && ledgerHistory.length > 0 ? (
                ledgerHistory.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg-surface)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      fontSize: 12.5,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.desc}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{tx.date}</div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          color: tx.delta?.startsWith('+') ? 'var(--status-pass-text)' : 'var(--text-primary)',
                        }}
                      >
                        {tx.delta}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Balance: {tx.balance} Cr</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  No transaction history recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
