import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Calculator,
  Layers,
  Zap,
  TrendingUp,
  Building2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Lock,
  FileCheck,
  Scale,
  Award,
  Users,
  UploadCloud,
  Clock,
  Check,
  Sun,
  Moon,
  ExternalLink,
  Search,
  Play,
  Mail,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from '../components/common/GlassCard';
import { GlassBadge } from '../components/common/GlassBadge';

// ── Framer Motion Variants ──────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const SAMPLE_TENDERS = [
  {
    id: 'nhai-highway',
    title: 'NHAI 4-Lane Greenfield Highway EPC Package-3',
    authority: 'National Highways Authority of India (NHAI)',
    refNo: 'NHAI/TECH/2026/HW-409',
    badge: '₹142.8 Cr · Highway EPC',
    pages: 312,
    scanTime: '4.2s',
    estimatedValueCr: 142.8,
    emdCr: 2.86,
    verdict: 'Pass with Conditions',
    readinessScore: 88,
    redFlags: [
      {
        clause: 'Clause 4.3(a) · Joint Venture Trap',
        severity: 'high',
        text: 'Lead JV partner must independently fulfill ≥ 50% of the single work threshold (₹71.4 Cr) and hold ≥ 51% equity. Sub-contracting experience is rejected.',
      },
      {
        clause: 'Clause 8.1 · Extended Defect Liability',
        severity: 'medium',
        text: '5-year defect liability requires a 5% performance bank guarantee valid for 66 months.',
      },
    ],
    similarWorks: {
      formula: 'CPWD Works Experience Criteria',
      tier3: '3 completed highway works ≥ ₹57.1 Cr (40%)',
      tier2: '2 completed highway works ≥ ₹85.7 Cr (60%)',
      tier1: '1 completed highway work ≥ ₹114.2 Cr (80%)',
      timeline: 'Completed within last 7 financial years with standard 7% annual statutory escalation',
    },
    statutoryRelief: [
      'MSME / Udyam GFR 170: 100% waiver on ₹2.86 Cr EMD',
      'Price Variation (PVC): Monthly RBI wholesale index compensation active',
      'MII Purchase Preference: 20% margin for Class-I Local Suppliers',
    ],
  },
  {
    id: 'cpwd-hospital',
    title: 'CPWD 500-Bed Super Specialty Hospital & Academic Block',
    authority: 'Central Public Works Department (CPWD)',
    refNo: 'CPWD/DLI/EE-II/2026/89',
    badge: '₹68.5 Cr · Institutional EPC',
    pages: 248,
    scanTime: '3.8s',
    estimatedValueCr: 68.5,
    emdCr: 1.37,
    verdict: 'Fully Qualified',
    readinessScore: 94,
    redFlags: [
      {
        clause: 'Clause 3.1 · Specialist Undertaking',
        severity: 'medium',
        text: 'HVAC & Medical Gas Pipeline (MGPS) sub-works require specialized PESO-approved technology partners.',
      },
    ],
    similarWorks: {
      formula: 'CPWD Works Manual (Institutional Building)',
      tier3: '3 completed hospital works ≥ ₹27.4 Cr (40%)',
      tier2: '2 completed hospital works ≥ ₹41.1 Cr (60%)',
      tier1: '1 completed hospital work ≥ ₹54.8 Cr (80%)',
      timeline: 'Completed within last 7 financial years with standard 7% annual statutory escalation',
    },
    statutoryRelief: [
      'GRIHA 4-Star Experience: Relaxation allowed in pre-bid submission',
      'GST Reimbursement: Statutory reimbursement on 18% GST delta',
    ],
  },
  {
    id: 'pwd-bridge',
    title: 'State PWD Multi-Span Pre-Stressed Concrete River Bridge',
    authority: 'Maharashtra PWD (Infrastructure Wing)',
    refNo: 'MH-PWD/PUN/2026/W-112',
    badge: '₹34.2 Cr · Bridge & Marine',
    pages: 186,
    scanTime: '2.9s',
    estimatedValueCr: 34.2,
    emdCr: 0.68,
    verdict: 'Disqualification Warning',
    readinessScore: 72,
    redFlags: [
      {
        clause: 'Clause 2.4 · Compulsory Pier Sinking Experience',
        severity: 'high',
        text: 'Bidder must have completed at least one well foundation/pier sinking of depth ≥ 18 meters in flowing river. General bridge experience not accepted.',
      },
      {
        clause: 'Clause 5.2 · Machinery Ownership Condition',
        severity: 'high',
        text: 'Must own (not lease) automatic concrete batching plant (60 cum/hr) within 40km of site.',
      },
    ],
    similarWorks: {
      formula: 'State PWD Bridge Manual Rule 14',
      tier3: '3 river bridge works ≥ ₹13.7 Cr (40%)',
      tier2: '2 river bridge works ≥ ₹20.5 Cr (60%)',
      tier1: '1 river bridge work ≥ ₹27.4 Cr (80%)',
      timeline: 'Completed within last 5 financial years',
    },
    statutoryRelief: [
      'Bank Solvency: Nationalized Bank Solvency ₹13.68 Cr required',
      'Joint Venture Permitted: Up to 2 partners (minimum 26% share)',
    ],
  },
];

const FAQS = [
  {
    q: 'How does BidKaro audit past project experience eligibility?',
    a: 'BidKaro parses the tender NIT criteria and automatically verifies your past completed works (3 works of 40%, 2 works of 60%, or 1 work of 80% of estimated tender value). It applies statutory annual escalation (7% or 10%) on your past project certificates from your company vault to give you an exact qualification determination.',
  },
  {
    q: 'Are my tender documents and company financials kept secure?',
    a: 'Yes. All documents uploaded to BidKaro are isolated by tenant ID and encrypted in transit and at rest. Your documents are never shared or used for public AI training.',
  },
  {
    q: 'Does BidKaro support GeM, CPPP, and State PWD tenders?',
    a: 'Yes. BidKaro accepts any standard PDF or scanned NIT document from GeM (Government e-Marketplace), CPPP (Central Public Procurement Portal), IREPS (Railways), NHAI, CPWD, and all state procurement portals.',
  },
  {
    q: 'Can I generate pre-bid clarification queries for ambiguous clauses?',
    a: 'Yes. When the AI detects ambiguous technical specifications, restrictive brand mandates, or contradictory GCC/SCC clauses, it generates formal pre-bid query letters cited with exact page and clause numbers ready for submission to the tendering authority.',
  },
  {
    q: 'How does the Daily Free Screening Pass work?',
    a: 'Every registered account gets 1 Daily Free Screening Pass every 24 hours. You can upload an entire NIT document and receive an executive qualification audit, EMD & MSME check, and key dates breakdown with zero credits deducted.',
  },
  {
    q: 'Can my engineering and estimation team collaborate on tenders?',
    a: 'Yes. With Workspace access, your technical leads, commercial estimators, and senior executives can review clause flags, comment on pre-bid queries, and download verified proposal packages together.',
  },
];

// Glass pod style constant - True Futuristic Glassmorphism
const glassPodStyle = {
  background: 'var(--glass-pod-bg)',
  backdropFilter: 'blur(26px) saturate(200%) contrast(105%)',
  WebkitBackdropFilter: 'blur(26px) saturate(200%) contrast(105%)',
  border: '1px solid var(--glass-pod-border)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: 'var(--glass-pod-shadow)',
  transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
};

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const [selectedTenderId, setSelectedTenderId] = useState('nhai-highway');
  const [isScanning, setIsScanning] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const activeTender = SAMPLE_TENDERS.find((t) => t.id === selectedTenderId) || SAMPLE_TENDERS[0];

  const handleSelectTender = (id) => {
    setIsScanning(true);
    setSelectedTenderId(id);
    setTimeout(() => setIsScanning(false), 240);
  };

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('idle');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      setNewsletterMsg('Please enter a valid work email.');
      setNewsletterStatus('error');
      return;
    }
    setNewsletterStatus('loading');
    setNewsletterMsg('');
    try {
      await api.subscribeNewsletter(newsletterEmail, null, null, 'landing_page');
      setNewsletterStatus('success');
      setNewsletterMsg('Subscribed! Check your inbox for your confirmation briefing.');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus('error');
      setNewsletterMsg(err.message || 'Subscription failed. Please try again.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        background: 'var(--outer-shell-bg)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        overflowX: 'hidden',
      }}
    >
      {/* ── Glassmorphic Sticky Navigation Bar ──────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          background: isLight ? 'rgba(255, 255, 255, 0.90)' : 'rgba(6, 8, 16, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: isLight ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.07)',
          transition: 'all 150ms ease',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Brand */}
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.2)',
                flexShrink: 0,
              }}
            >
              <img src="/bidkaro-lightning-logo.png" alt="BidKaro" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                BidKaro
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                AI Tender Platform
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              fontSize: 13.5,
              fontFamily: 'var(--font-heading)',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
            className="hide-mobile"
          >
            <a
              href="#capabilities"
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-secondary)')}
            >
              Features
            </a>
            <a
              href="#live-audit"
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-secondary)')}
            >
              Live Audits
            </a>
            <a
              href="#pricing"
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-secondary)')}
            >
              Pricing
            </a>
            <a
              href="#faqs"
              style={{ color: 'inherit', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.target.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.target.style.color = 'var(--text-secondary)')}
            >
              FAQ
            </a>
          </nav>

          {/* Right Action Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              style={{
                background: 'transparent',
                border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 6,
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isLight ? 'var(--accent-primary)' : '#f8fafc',
              }}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/workspace')}
                className="btn btn-primary"
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                <span>Client Portal</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="btn btn-ghost"
                  style={{ fontSize: 13, padding: '7px 14px' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/workspace')}
                  style={{
                    padding: '8px 18px',
                    fontSize: 13,
                    fontWeight: 700,
                    background: 'var(--accent-cta)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 0 20px rgba(249,115,22,0.25)',
                  }}
                >
                  <span>Start Free</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section with Animated Mesh Background ──────── */}
      <section
        style={{
          position: 'relative',
          paddingTop: 72,
          paddingBottom: 64,
          overflow: 'hidden',
        }}
      >
        {/* Animated gradient mesh background */}
        <div
          className="hero-mesh-bg"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 900px 500px at 50% -60px, rgba(99,102,241,0.18) 0%, transparent 70%), ' +
              'radial-gradient(ellipse 600px 400px at 90% 40%, rgba(249,115,22,0.10) 0%, transparent 65%), ' +
              'radial-gradient(ellipse 500px 500px at 10% 80%, rgba(16,185,129,0.07) 0%, transparent 65%)',
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            paddingLeft: 24,
            paddingRight: 24,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 48,
              alignItems: 'center',
              marginBottom: 48,
            }}
          >
            {/* Left Column: Hero Copy with Stagger Animation */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Agency micro-badge */}
              <motion.div variants={itemVariants}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '5px 14px',
                    borderRadius: 999,
                    background: 'rgba(99, 102, 241, 0.10)',
                    border: '1px solid rgba(99, 102, 241, 0.28)',
                    color: 'var(--accent-primary-light, #a5b4fc)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      boxShadow: '0 0 8px var(--accent-primary)',
                      flexShrink: 0,
                    }}
                  />
                  CPWD · NHAI · GeM · Railways
                </div>
              </motion.div>

              {/* Headline — Google Gemini Clean Fluid Typography */}
              <motion.h1
                variants={itemVariants}
                style={{
                  fontSize: 'clamp(34px, 4.4vw, 54px)',
                  fontWeight: 550,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  margin: '0 0 22px 0',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Eliminate Disqualification Risks in{' '}
                <span
                  style={{
                    fontFamily: 'var(--font-roman)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: 'var(--accent-primary-light, #c7d2fe)',
                    paddingRight: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  High-Stakes
                </span>{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-cta) 0%, #fb923c 55%, var(--accent-primary) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Public Tenders.
                </span>
              </motion.h1>

              {/* Subtext — Perfectly Proportioned Gemini Lead */}
              <motion.p
                variants={itemVariants}
                style={{
                  fontSize: 'clamp(15.5px, 1.4vw, 17.5px)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.68,
                  margin: '0 0 32px 0',
                  maxWidth: 560,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 400,
                }}
              >
                Parse 400-page NIT packages in seconds. Run automated pre-bid compliance audits, EMD exemption checks, and clause-level technical eligibility validation — before your competition even opens the PDF.
              </motion.p>

              {/* Dual CTAs */}
              <motion.div
                variants={itemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 32,
                }}
              >
                <button
                  onClick={() => navigate('/try')}
                  style={{
                    padding: '13px 28px',
                    fontSize: 14.5,
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    background: 'var(--accent-cta)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 28px rgba(249,115,22,0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(249,115,22,0.35)';
                  }}
                >
                  <span>Run Free Tender Audit</span>
                  <ArrowRight size={15} />
                </button>

                <a
                  href="#live-audit"
                  style={{
                    padding: '13px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--accent-primary-light, #a5b4fc)',
                    border: '1px solid rgba(99,102,241,0.30)',
                    borderRadius: 10,
                    background: 'rgba(99,102,241,0.08)',
                    textDecoration: 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'background 150ms ease',
                  }}
                >
                  <Play size={14} fill="var(--accent-primary)" color="var(--accent-primary)" />
                  <span>Watch 2-Min Walkthrough</span>
                </a>
              </motion.div>

              {/* Floating badge strip */}
              <motion.div variants={itemVariants}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '8px 16px',
                    borderRadius: 999,
                    background: 'rgba(14,18,32,0.80)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    flexWrap: 'wrap',
                  }}
                >
                  {[
                    { val: '₹12,400 Cr+', label: 'Analyzed' },
                    { val: '99.4%', label: 'Accuracy' },
                    { val: '60s', label: 'Avg Scan' },
                  ].map((item, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>·</span>
                      )}
                      <span style={{ fontSize: 12 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {item.val}
                        </span>{' '}
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
                          {item.label}
                        </span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>

              {/* Institutional Framework Badges */}
              <motion.div
                variants={itemVariants}
                style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 16 }}
              >
                {[
                  { label: 'CPWD Works Manual 2024', icon: Scale },
                  { label: 'NHAI EPC & HAM Guidelines', icon: ShieldCheck },
                  { label: 'GeM GTC Statutory Terms', icon: Award },
                  { label: 'IREPS / GFR 170', icon: CheckCircle2 },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Icon size={12} color="var(--accent-primary)" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* Right Column: Live Interactive Scanning Widget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [-4, 4, -4] }}
              transition={{
                opacity: { duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
                y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <div className="holographic-scanner-card">
                {/* Top Animated Laser Scan Bar */}
                <div className="laser-scan-bar" />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="radar-beacon" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                      LIVE NIT SCANNER // 312 PAGES PARSED
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: 'rgba(16, 185, 129, 0.16)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34d399',
                      fontFamily: 'var(--font-mono)',
                      boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    ✓ 88% PASS
                  </span>
                </div>

                {/* Tender Details Header */}
                <div style={{ paddingBottom: 14, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-primary-hover)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                    NHAI / TECH / 2026 / HW-409
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'var(--font-heading)' }}>
                    4-Lane Greenfield Highway EPC Package-3
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    Est. Value: <strong style={{ color: 'var(--text-primary)' }}>₹142.8 Cr</strong> · EMD: <strong style={{ color: '#34d399' }}>₹2.86 Cr</strong> · Closing: 14 Days
                  </div>
                </div>

                {/* Compliance & Risk Clause Checks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="clause-hud-capsule pass">
                    <CheckCircle2 size={16} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, lineHeight: 1.48 }}>
                      <strong style={{ color: '#34d399' }}>EMD & MSME Exemption (GFR 170):</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>Full ₹2.86 Cr waiver verified via Udyam Registration.</span>
                    </div>
                  </div>

                  <div className="clause-hud-capsule pass">
                    <CheckCircle2 size={16} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, lineHeight: 1.48 }}>
                      <strong style={{ color: '#34d399' }}>Turnover Compliance:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>Company 3-yr avg ₹182.4 Cr surpasses required ₹142.8 Cr (127%).</span>
                    </div>
                  </div>

                  <div className="clause-hud-capsule fail">
                    <AlertTriangle size={16} color="#f43f5e" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, lineHeight: 1.48 }}>
                      <strong style={{ color: '#fb7185' }}>Clause 4.3(a) · JV Restriction:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>Lead partner must hold ≥ 51% equity and fulfill ≥ 50% single work.</span>
                    </div>
                  </div>

                  <div className="clause-hud-capsule warn">
                    <AlertTriangle size={16} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, lineHeight: 1.48 }}>
                      <strong style={{ color: '#fbbf24' }}>Clause 8.1 · Defect Liability PBG:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>5-year warranty requires 5% BG valid for 66 months.</span>
                    </div>
                  </div>
                </div>

                {/* Agentic Telemetry Footer */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} color="var(--accent-primary)" />
                    <span>Tender Copilot: 42 Clauses Cross-Checked</span>
                  </div>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>0 Disqualifiers</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Statistics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
              padding: '20px 24px',
              ...glassPodStyle,
              padding: '20px 28px',
            }}
          >
            {[
              { val: '₹12,400 Cr+', label: 'Tenders Analyzed' },
              { val: '99.4%', label: 'Clause Accuracy' },
              { val: '60s', label: 'Average Audit Time' },
              { val: '0%', label: 'Disqualification Margin' },
            ].map((stat, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--accent-primary)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {stat.val}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof / Trusted Authority Badges ─────────── */}
      <section
        style={{
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '24px 20px',
          background: isLight ? '#ffffff' : 'var(--bg-canvas)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginBottom: 16,
          }}
        >
          Trusted by Indian Infrastructure Contractors & Public Procurement Bidders
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            flexWrap: 'wrap',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <span>CPWD Registered Contractors</span>
          <span>·</span>
          <span>NHAI Concessionaires</span>
          <span>·</span>
          <span>State PWD Bidders</span>
          <span>·</span>
          <span>IREPS & Indian Railways EPC</span>
          <span>·</span>
          <span>GeM MSME Vendors</span>
          <span>·</span>
          <span>MES Defense Contractors</span>
        </div>
      </section>

      {/* ── Capabilities / Feature Deep Dives ───────────────── */}
      <section
        id="capabilities"
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <GlassBadge variant="subtle">ENTERPRISE CAPABILITIES</GlassBadge>
          <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 38px)', fontWeight: 550, margin: '14px 0 10px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            Built for <span style={{ fontFamily: 'var(--font-roman)', fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-primary-light, #c7d2fe)' }}>High-Stakes</span> Public Tenders
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto' }}>
            Replace days of manual PDF reading and risky spreadsheet estimations with autonomous, clause-verified procurement intelligence.
          </p>
        </div>

        {/* Feature 1 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
            alignItems: 'center',
            marginBottom: 70,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent-cta)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              01 · Rapid Document Intelligence
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14 }}>
              Read 400-Page NITs in 60 Seconds
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              Upload any complex government NIT or RFP. BidKaro reads through General Conditions of Contract (GCC), Special Conditions (SCC), and Technical Specifications to extract critical data instantly.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Automatic detection of EMD exemptions under GFR Rule 170 (Udyam/MSME)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Extract submission deadline, pre-bid conference date, and bid validity period</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Immediate alerts on joint venture constraints and lead partner equity thresholds</span>
              </li>
            </ul>
          </div>

          <div
            style={{
              ...glassPodStyle,
              borderLeft: '4px solid var(--accent-cta)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                EXTRACTED NIT SYNOPSIS
              </span>
              <span className="badge-status pass">Verified Active</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              NHAI/TECH/2026/HW-409
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              National Highways Authority of India · EPC Package-3
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Estimated Cost</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>₹142.80 Crores</div>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>EMD (2%)</div>
                <div style={{ fontWeight: 700, color: '#10b981', marginTop: 2 }}>₹2.86 Cr (Waived)</div>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Completion Period</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>24 Months</div>
              </div>
              <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Defect Liability</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>60 Months</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
            alignItems: 'center',
            marginBottom: 70,
          }}
        >
          <div
            style={{
              ...glassPodStyle,
              borderLeft: '4px solid #10b981',
              order: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                PAST WORK & CAPACITY QUALIFICATION
              </span>
              <span className="badge-status pass">Pass 100%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>1 Similar Work (≥ 80% · ₹114.2 Cr):</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>Qualified (₹126.4 Cr in 2024)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>2 Similar Works (≥ 60% · ₹85.7 Cr):</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>Qualified (2 Projects)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>3 Similar Works (≥ 40% · ₹57.1 Cr):</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>Qualified (3 Projects)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span>Maximum Available Bidding Capacity:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-cta)' }}>₹184.2 Cr &gt; ₹142.8 Cr</span>
              </div>
            </div>
          </div>

          <div style={{ order: 1 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              02 · Precise Mathematical Qualification
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14 }}>
              Zero Guesswork on Eligibility Rules
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              Never waste resources preparing a tender proposal only to be disqualified during technical evaluation. BidKaro verifies your qualifications against government formulas with mathematical precision.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Statutory escalation (7% or 10% per year) automatically computed</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Available bid capacity calculation factoring existing commitments</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>CA turnover and net worth requirements audited against 3-year averages</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature 3 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--accent-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              03 · Automated Proposal Generation
            </div>
            <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14 }}>
              Compile Ready-to-Submit Bid Packages
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              Generate complete, compliant, professional bid packages tailored to the tender format in standard editable Microsoft Word (.docx) format.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Formal Pre-Bid Query Letters citing exact page & clause references</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Technical compliance statement with clause-by-clause confirmation</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Bid covering letter and statutory declarations pre-populated with your credentials</span>
              </li>
            </ul>
          </div>

          <div
            style={{
              ...glassPodStyle,
              borderLeft: '4px solid var(--accent-primary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                GENERATED DOCUMENTS
              </span>
              <span className="badge-status pass">Ready for Download</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Pre-Bid Clarification Query Letter</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>.DOCX</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileCheck size={16} color="#10b981" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Technical Compliance Statement</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>.DOCX</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={16} color="var(--accent-cta)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Bid Covering Letter & Undertaking</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>.DOCX</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Live Tender Audit Demo ──────────────── */}
      <section
        id="live-audit"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          background: isLight ? '#f8fafc' : 'var(--bg-canvas)',
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <GlassBadge variant="accent">INTERACTIVE DEMONSTRATION</GlassBadge>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 38px)', fontWeight: 550, margin: '14px 0 10px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Explore Live NIT <span style={{ fontFamily: 'var(--font-roman)', fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-primary-light, #c7d2fe)' }}>Compliance</span> Audits
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto' }}>
              Select an active Indian government tender to see how BidKaro decomposes complex specifications into actionable compliance intelligence.
            </p>
          </div>

          {/* Tender Selector Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: 32,
            }}
          >
            {SAMPLE_TENDERS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTender(t.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 6,
                  border:
                    selectedTenderId === t.id
                      ? '1px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                  background:
                    selectedTenderId === t.id
                      ? 'rgba(99, 102, 241, 0.12)'
                      : 'var(--bg-surface)',
                  color: selectedTenderId === t.id ? 'var(--accent-primary-light, #a5b4fc)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 150ms ease',
                }}
              >
                <span>{t.authority.split('(')[0].trim()}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t.badge.split('·')[0].trim()}
                </span>
              </button>
            ))}
          </div>

          {/* Active Tender Card Preview */}
          <div
            style={{
              ...glassPodStyle,
              padding: 32,
              opacity: isScanning ? 0.6 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 24,
                paddingBottom: 20,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {activeTender.refNo}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {activeTender.pages} Pages Analyzed in {activeTender.scanTime}
                  </span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>{activeTender.title}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Authority: {activeTender.authority}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Readiness Score</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: activeTender.readinessScore >= 85 ? '#10b981' : '#f59e0b' }}>
                    {activeTender.readinessScore}%
                  </div>
                </div>
                <button
                  onClick={() => navigate('/try')}
                  className="btn btn-primary"
                  style={{ fontSize: 13, padding: '9px 18px' }}
                >
                  <span>Test Your NIT Free</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 24,
              }}
            >
              {/* Red Flags / Risks */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={15} />
                  <span>Identified Clause Risks</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeTender.redFlags.map((flag, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.08)',
                        border: isLight ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.20)',
                        borderRadius: 6,
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
                        {flag.clause}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {flag.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar Works Formula */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Scale size={15} color="var(--accent-primary)" />
                  <span>Past Project Experience Thresholds</span>
                </h4>
                <div
                  style={{
                    padding: 14,
                    background: 'var(--bg-elevated)',
                    borderRadius: 6,
                    fontSize: 12.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>Tier 3 (40%):</span> {activeTender.similarWorks.tier3}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Tier 2 (60%):</span> {activeTender.similarWorks.tier2}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600 }}>Tier 1 (80%):</span> {activeTender.similarWorks.tier1}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    {activeTender.similarWorks.timeline}
                  </div>
                </div>
              </div>

              {/* Statutory Relief */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={15} />
                  <span>Statutory Waivers & Exemptions</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeTender.statutoryRelief.map((relief, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.08)',
                        border: isLight ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.20)',
                        borderRadius: 6,
                        fontSize: 12.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <CheckCircle2 size={14} color="#10b981" flexShrink={0} />
                      <span style={{ color: 'var(--text-primary)' }}>{relief}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Clear Steps) ────────────────────── */}
      <section
        id="how-it-works"
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <GlassBadge variant="subtle">PROCESS SIMPLICITY</GlassBadge>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, margin: '14px 0 10px', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
          How BidKaro Works
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 50px' }}>
          From raw government tender PDF to verified, submission-ready bid documents in 3 straightforward steps.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            textAlign: 'left',
          }}
        >
          <div style={glassPodStyle}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: 'var(--accent-cta)',
                marginBottom: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              01
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Upload Tender Document
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Drag and drop any NIT, RFP, or BOQ file from CPPP, GeM, or state portals. No manual OCR or formatting cleanup required.
            </p>
          </div>

          <div style={glassPodStyle}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#10b981',
                marginBottom: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              02
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              AI Audits Eligibility & Traps
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The engine checks your past project values, 3-year turnover, and solvency against NIT thresholds, while scanning for severe penalty clauses.
            </p>
          </div>

          <div style={glassPodStyle}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: 'var(--accent-primary)',
                marginBottom: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              03
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
              Export Compliant Package
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Download pre-bid clarification letters, clause-by-clause compliance statements, and bid documents in editable Microsoft Word (.docx) format.
            </p>
          </div>
        </div>
      </section>

      {/* ── Transparent Pricing Packs ───────────────────────── */}
      <section
        id="pricing"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          background: isLight ? '#f8fafc' : 'var(--bg-canvas)',
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
          <GlassBadge variant="accent">TRANSPARENT VALUE PRICING</GlassBadge>
          <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 38px)', fontWeight: 550, margin: '14px 0 10px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            Outcome-Oriented <span style={{ fontFamily: 'var(--font-roman)', fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-primary-light, #c7d2fe)' }}>Pricing</span> Packs
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 620, margin: '0 auto 50px' }}>
            Pay per tender or unlock high-volume screening. Unused credits never expire.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
              textAlign: 'left',
            }}
          >
            {/* Starter */}
            <div style={glassPodStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Starter Single Pass
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, fontFamily: 'var(--font-display)' }}>
                ₹1,499
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                15 Credits · 1 Complete Tender Evaluation
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                Ideal for evaluating a single high-value tender or conducting emergency pre-bid compliance screening.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: 24 }}
              >
                Get Started
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>1 Full NIT Screening & Synopsis</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Detailed Eligibility Audit</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Pre-Bid Query Letter (.DOCX)</span>
                </li>
              </ul>
            </div>

            {/* Growth - Most Popular */}
            <div
              style={{
                ...glassPodStyle,
                border: '2px solid var(--accent-cta)',
                position: 'relative',
                boxShadow: '0 4px 32px -4px rgba(249,115,22,0.3), inset 0 1px 0 rgba(255,255,255,0.055)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -12,
                  right: 20,
                  background: 'var(--accent-cta)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Most Popular
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-cta)', marginBottom: 8 }}>
                Contractor 5-Pack
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, fontFamily: 'var(--font-display)' }}>
                ₹3,999
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                100 Credits · 5 Complete Tender Packages
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                The standard choice for active EPC contractors and MSME suppliers actively bidding each month.
              </p>
              <button
                onClick={() => navigate('/signup')}
                style={{
                  width: '100%',
                  marginBottom: 24,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'var(--accent-cta)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                }}
              >
                Choose 5-Pack
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>5 Complete Tender Preparations</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Full Technical Compliance Packages</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Company Qualification Vault</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Pre-Bid Clarification Letters (.DOCX)</span>
                </li>
              </ul>
            </div>

            {/* Enterprise */}
            <div style={glassPodStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Enterprise Unlimited
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, fontFamily: 'var(--font-display)' }}>
                Custom
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                Dedicated Multi-Seat Deployment
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                For large infrastructure conglomerates, concessionaires, and joint ventures needing dedicated team access.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: 24 }}
              >
                Contact Enterprise
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Unlimited Tender Document Analyses</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Custom Qualification Criteria</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Multi-User Role Permissions</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={15} color="#10b981" />
                  <span>Dedicated Procurement Specialist Support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials (Senior Contractors) ───────────────── */}
      <section
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: '80px 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <GlassBadge variant="subtle">TESTIMONIALS</GlassBadge>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, margin: '14px 0 10px', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
            Trusted by Seasoned Tender Managers
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          <div style={{ ...glassPodStyle, padding: 28 }}>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 20 }}>
              "In NHAI packages, a single missed joint venture condition can waste months of prep. BidKaro flagged Clause 4.3(a) within 15 seconds of upload. It saved us from a costly technical disqualification."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 6,
                  background: 'var(--accent-cta)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                RK
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Rajesh Kulkarni</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  VP Tendering, Infrastructure EPC Firm, Pune
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...glassPodStyle, padding: 28 }}>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 20 }}>
              "The automatic pre-bid query drafting is unmatched. It reads contradictory specs in the NIT and formats the exact queries with page citations that our engineers can submit immediately."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 6,
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                MS
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Manish Sharma</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Director, Institutional Building Works, New Delhi
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Accordion ───────────────────────────────────── */}
      <section
        id="faqs"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          background: isLight ? '#f8fafc' : 'var(--bg-canvas)',
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <GlassBadge variant="subtle">FREQUENTLY ASKED QUESTIONS</GlassBadge>
            <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 38px)', fontWeight: 550, margin: '14px 0 10px', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Clear Answers Before You <span style={{ fontFamily: 'var(--font-roman)', fontStyle: 'italic', fontWeight: 400, color: 'var(--accent-primary-light, #c7d2fe)' }}>Begin</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    ...glassPodStyle,
                    padding: '18px 24px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={18}
                      color="var(--text-muted)"
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 180ms ease',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  {isOpen && (
                    <p
                      style={{
                        fontSize: 13.5,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Conversion Bottom CTA Banner ─────────────────────── */}
      <section
        style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: isLight ? '#ffffff' : 'rgba(6,8,16,0.98)',
          borderTop: '1px solid var(--border-subtle)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 700px 300px at 50% 100%, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
        />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
            Ready to Win Your Next Big Tender?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 36 }}>
            Upload any 400-page NIT right now. Get full eligibility audit, clause risk analysis, and pre-bid queries in 60 seconds. No credit card required.
          </p>
          <button
            onClick={() => navigate('/try')}
            style={{
              padding: '14px 34px',
              fontSize: 16,
              fontWeight: 700,
              background: 'var(--accent-cta)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 8px 32px rgba(249,115,22,0.4)',
              transition: 'transform 150ms ease, box-shadow 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(249,115,22,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(249,115,22,0.4)';
            }}
          >
            <span>Analyze Your Tender Free Now</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Brevo Regulatory Briefs & Opportunity Alerts Newsletter ──── */}
      <section
        style={{
          padding: '60px 24px',
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            ...glassPodStyle,
            padding: '36px 32px',
            borderRadius: 20,
            background: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.65)',
            border: isLight ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-cta)',
              marginBottom: 16,
            }}
          >
            <Mail size={14} />
            <span>TENDER REGULATORY INTELLIGENCE</span>
          </div>

          <h3
            style={{
              fontSize: 'clamp(22px, 2.6vw, 28px)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 10px 0',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Weekly Statutory Circulars & High-Value Tender Alerts
          </h3>
          <p
            style={{
              fontSize: 14.5,
              color: 'var(--text-secondary)',
              maxWidth: 620,
              lineHeight: 1.6,
              margin: '0 0 24px 0',
            }}
          >
            Get curated CPWD Works Manual amendments, GeM statutory updates, and upcoming ₹10Cr+ EPC and MSME tender opportunities delivered straight to your inbox.
          </p>

          <form
            onSubmit={handleNewsletterSubmit}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              width: '100%',
              maxWidth: 500,
              justifyContent: 'center',
            }}
          >
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="contractor@infra-firm.com"
              disabled={newsletterStatus === 'loading'}
              style={{
                flex: '1 1 260px',
                padding: '12px 18px',
                borderRadius: 10,
                border: isLight ? '1px solid rgba(203, 213, 225, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
                background: isLight ? '#ffffff' : 'rgba(0, 0, 0, 0.4)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={newsletterStatus === 'loading'}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                background: 'var(--accent-cta)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(249, 115, 22, 0.35)',
              }}
            >
              {newsletterStatus === 'loading' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Subscribing...</span>
                </>
              ) : (
                <>
                  <span>Subscribe Free</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {newsletterMsg && (
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                color: newsletterStatus === 'success' ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {newsletterStatus === 'success' && <CheckCircle2 size={15} />}
              <span>{newsletterMsg}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Enterprise Footer ───────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '50px 24px 30px',
          background: isLight ? '#f8fafc' : 'var(--bg-canvas)',
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 32,
            marginBottom: 40,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 4,
                  background: 'var(--accent-cta)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                B
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                BidKaro
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Autonomous AI tender analysis & compliance platform for Indian infrastructure contractors and MSME vendors.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Platform
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <a href="#capabilities" style={{ color: 'inherit', textDecoration: 'none' }}>Capabilities</a>
              <a href="#live-audit" style={{ color: 'inherit', textDecoration: 'none' }}>Live NIT Audit</a>
              <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing Packs</a>
              <span onClick={() => navigate('/try')} style={{ cursor: 'pointer' }}>Guest Free Trial</span>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Compliance Standards
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <span>CPWD Works Manual 2024</span>
              <span>General Financial Rules (GFR 170)</span>
              <span>NHAI EPC Model Concession</span>
              <span>GeM General Terms & Conditions</span>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Account & Legal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <span onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>Contractor Sign In</span>
              <span onClick={() => navigate('/signup')} style={{ cursor: 'pointer' }}>Register Organization</span>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            paddingTop: 20,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <div>© {new Date().getFullYear()} BidKaro. All rights reserved. Indian Public Procurement Intelligence.</div>
          <div>Built with enterprise compliance standards for government contractors.</div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
