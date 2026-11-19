import { useState, useEffect } from 'react';
import { Check, X, FileText, Shield, TrendingUp, Zap, Bot, Activity, Award, Sparkles, CreditCard } from 'lucide-react';
import api from '../services/api';
import { useBidKaroStore } from '../context/BidKaroStoreContext';
import { useAuth } from '../context/AuthContext';
import { startRazorpayCheckout } from '../services/razorpay';
import { PaymentSuccessModal } from '../components/modals/PaymentSuccessModal';

const DEFAULT_PLANS = [
  {
    tier_id: 'single_pack',
    name: '1 Tender Pack',
    price_inr: 199,
    tender_credits: 1,
    sub: 'Single Tender Submission',
    desc: 'Perfect for bidding on a high-value tender',
    features: [
      '1 Complete Tender Analysis & Verification',
      'Full 10-State Compliance Matrix',
      'BOQ Line Item Extraction & Excel Export',
      'Corrigendum Diff & Supersession Checker',
      'Standard Undertakings .DOCX Generation',
      'Pre-Bid Clarification Request Table',
    ],
    badge: null,
    featured: false,
  },
  {
    tier_id: 'growth_pack',
    name: '5 Tenders Growth Pack',
    price_inr: 499,
    tender_credits: 5,
    sub: 'Best Value for Active Contractors',
    desc: '₹99.80 per complete tender bid',
    features: [
      '5 Complete Tender Analyses & Bid Packages',
      'All 1 Tender Pack Features Included',
      'Automated Technical Methodology Prose Writer',
      'Two-Layer Pre-Submission Audit & Red Flag Trap',
      'Historical Corrigendum Delta Tracking',
      'Email & WhatsApp Priority Bid Support',
    ],
    badge: 'MOST POPULAR',
    featured: true,
  },
  {
    tier_id: 'pro_contractor',
    name: '15 Tenders Enterprise Pack',
    price_inr: 999,
    tender_credits: 15,
    sub: 'For EPC & Infrastructure Firms',
    desc: '₹66.60 per complete tender bid',
    features: [
      '15 Complete Tender Analyses & Compilations',
      'All Growth Pack Features Included',
      'Unlimited Pre-Bid Query Auto-Drafting',
      'Custom QA/QC and HSE Plan Narrative Compiler',
      'Multi-User Contractor Team Workspace',
      'Dedicated Indian Procurement Specialist Support',
    ],
    badge: 'HIGHEST SAVINGS (66%)',
    featured: false,
  },
];

const FAQ = [
  { q: 'What is included in each tender pack?', a: 'Every tender credit gives you unlimited AI queries, full 10-state compliance checking, complete BOQ table with Excel download, and formatted Word (.docx) document compilation.' },
  { q: 'Do credits expire?', a: 'No, your tender credits never expire and carry over until used.' },
  { q: 'What payment modes are accepted?', a: 'We accept UPI (Google Pay, PhonePe, Paytm), NetBanking (all Indian banks), and Corporate Credit/Debit Cards with automated GST invoices.' },
];

export function Planners({ showToast }) {
  const { purchaseCreditPack, companyVault } = useBidKaroStore();
  const { user } = useAuth();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [creditBalance, setCreditBalance] = useState({ available_credits: 1, plan_tier: 'trial', total_ai_spend_inr: 0.0 });
  const [openFaq, setOpenFaq] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    async function fetchPlansAndCredits() {
      try {
        const fetchedPlans = await api.listPlans();
        if (fetchedPlans && fetchedPlans.length > 0) {
          setPlans(fetchedPlans.map((p, idx) => ({
            ...p,
            featured: p.tier_id === 'growth_pack',
            badge: p.tier_id === 'growth_pack' ? 'MOST POPULAR' : p.tier_id === 'pro_contractor' ? 'HIGHEST SAVINGS' : null,
            sub: p.tier_id === 'growth_pack' ? 'Best Value (₹99.80/tender)' : p.tier_id === 'pro_contractor' ? 'For EPC Firms (₹66.60/tender)' : 'Single Tender Submission',
          })));
        }
        const credits = await api.getCredits();
        if (credits) setCreditBalance(credits);
      } catch (err) {
        console.warn('Using local plans fallback:', err);
      }
    }
    fetchPlansAndCredits();
  }, []);

  async function handleSelectPlan(plan) {
    const creditsToGrant = plan.tier_id === 'pro_contractor' ? 1500 : plan.tier_id === 'growth_pack' ? 500 : 100;
    setIsProcessing(true);
    await startRazorpayCheckout({
      planId: plan.tier_id,
      planTitle: plan.name,
      priceInr: plan.price_inr,
      credits: creditsToGrant,
      user: user || {},
      companyVault: companyVault || {},
      onStart: () => setIsProcessing(true),
      onSuccess: (res) => {
        setIsProcessing(false);
        purchaseCreditPack(plan.name, res.creditsAdded || creditsToGrant, res.amountInr || plan.price_inr);
        setPaymentResult({
          ...res,
          planTitle: plan.name,
          amountInr: plan.price_inr,
          creditsAdded: res.creditsAdded || creditsToGrant,
        });
        setSuccessModalOpen(true);
        setCreditBalance((prev) => ({
          ...prev,
          available_credits: res.newBalance || (prev.available_credits + creditsToGrant),
        }));
        if (showToast) {
          showToast(`Successfully credited ${creditsToGrant} credits!`, 'success');
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
  }

  return (
    <div className="page-content" style={{ maxWidth: 1050, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-blue-subtle)', color: 'var(--color-blue)', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          <Zap size={13} />
          <span>Outcome-Oriented Tender Packs — Pay for Results, Not Subscriptions</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.03em', marginBottom: 10 }}>
          Simple, Transparent Indian Tender Packs
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
          Buy packs as you bid. Each pack includes complete tender document processing, detailed eligibility audit, state procurement compliance checks, and submission-ready Word files.
        </p>

        {/* Current Balance Bar */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 16,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '10px 20px',
          marginTop: 20,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={16} color="var(--color-blue)" />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Your Account Balance:</span>
            <strong style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
              {creditBalance.available_credits} Tender Credits
            </strong>
          </div>
          <span style={{ height: 16, width: 1, background: 'var(--color-border)' }} />
          <span className="badge badge-success" style={{ fontSize: 11 }}>Active</span>
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
        {plans.map(plan => (
          <div
            key={plan.tier_id}
            className={`card ${plan.featured ? 'card-featured' : ''}`}
            style={{
              padding: 28,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: plan.featured ? '2px solid var(--color-blue)' : '1px solid var(--color-border)',
              boxShadow: plan.featured ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            }}
          >
            {plan.badge && (
              <div style={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--color-blue)',
                color: 'white',
                padding: '3px 12px',
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                {plan.badge}
              </div>
            )}

            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                {plan.sub}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 20 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 36, fontWeight: 900, color: 'var(--color-text-primary)' }}>
                  ₹{plan.price_inr}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                  / {plan.tender_credits} {plan.tender_credits === 1 ? 'tender' : 'tenders'}
                </span>
              </div>

              <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 20 }} />

              {/* Features List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {plan.features.map((feat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--color-success-subtle)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Check size={11} />
                    </div>
                    <span style={{ color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className={`btn ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', padding: '11px 0', fontSize: 14, fontWeight: 600 }}
              onClick={() => handleSelectPlan(plan)}
            >
              Choose {plan.name}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: 20 }}>
          Frequently Asked Questions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FAQ.map((item, idx) => (
            <div
              key={idx}
              className="card"
              style={{ padding: 18, cursor: 'pointer' }}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
                <span>{item.q}</span>
                <span style={{ fontSize: 18, color: 'var(--color-text-tertiary)' }}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </div>
              {openFaq === idx && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 10, lineHeight: 1.6, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
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

export default Planners;
