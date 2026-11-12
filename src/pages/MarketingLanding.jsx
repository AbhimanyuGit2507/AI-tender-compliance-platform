import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Bot, Shield, FileText, Zap, ChevronRight, Activity, TrendingUp, Sparkles } from 'lucide-react';
import api from '../services/api';
import '../styles/marketing.css';

const MOCKUP_MSG = "Based on Section 4.2 (Eligibility), the bidder must have a minimum average annual turnover of ₹15.00 Cr in the last 3 financial years. Your profile meets this criteria. ✅";

export function MarketingLanding() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const isAuth = api.isAuthenticated();

  useEffect(() => {
    // Smooth scroll mouse move effect for bento cards
    const cards = document.querySelectorAll('.bento-card');
    const handleMouseMove = (e) => {
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="marketing-page" ref={containerRef}>
      
      {/* Background Orbs */}
      <motion.div style={{ y: yBg, position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </motion.div>

      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100, x: "-50%", opacity: 0 }}
        animate={{ y: 0, x: "-50%", opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-nav"
      >
        <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563EB, #0891B2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Zap size={18} fill="white" />
          </div>
          BidKaro
        </div>
        <div style={{ display: 'flex', gap: 32, fontWeight: 500, fontSize: 15, color: '#475569' }}>
          {/* <span style={{ cursor: 'pointer' }} onClick={() => navigate('/discovery')}>Tender Discovery</span> */}
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/plans')}>Pricing</span>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>Demo Login</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isAuth ? (
            <button className="btn-glass" style={{ padding: '8px 20px', fontSize: 14 }} onClick={() => navigate('/dashboard')}>
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button className="btn-outline-glass" style={{ padding: '8px 20px', fontSize: 14 }} onClick={() => navigate('/login')}>
                Sign In
              </button>
              <button className="btn-glass" style={{ padding: '8px 24px', fontSize: 14 }} onClick={() => navigate('/register')}>
                Start Free
              </button>
            </>
          )}
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: 180, paddingBottom: 100, textAlign: 'center', paddingLeft: 24, paddingRight: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.1)', padding: '6px 16px', borderRadius: 99, color: '#2563EB', fontWeight: 600, fontSize: 14, marginBottom: 24, border: '1px solid rgba(37,99,235,0.2)' }}>
            <Bot size={14} /> BidKaro AI 2.0 is now live for GeM & CPPP
          </div>
        </motion.div>
        
        <motion.h1 
          className="hero-title"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Win More Tenders.<br/>
          <span className="hero-gradient">With Zero Guesswork.</span>
        </motion.h1>

        <motion.p 
          style={{ fontSize: 20, color: '#475569', maxWidth: 640, margin: '0 auto 40px', lineHeight: 1.6 }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          The ultimate AI workspace for Indian infrastructure and enterprise businesses. Upload a 500-page tender and get instant compliance checks, technical writing, and final audits.
        </motion.p>

        <motion.div 
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {isAuth ? (
            <button className="btn-glass" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, padding: '16px 40px' }} onClick={() => navigate('/dashboard')}>
              Open Dashboard <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <button className="btn-glass" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, padding: '16px 36px' }} onClick={() => navigate('/register')}>
                Register Your Firm <ArrowRight size={18} />
              </button>
              <button className="btn-outline-glass" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, padding: '16px 36px' }} onClick={() => navigate('/login')}>
                Sign In / Demo Login
              </button>
            </>
          )}
        </motion.div>
      </div>

      {/* Abstract Mockup UI */}
      <motion.div 
        className="ui-mockup-wrapper"
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="ui-mockup">
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ width: 240, borderRight: '1px solid #E2E8F0', paddingRight: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: '100%', height: 40, background: '#F1F5F9', borderRadius: 8 }} />
              <div style={{ width: '80%', height: 24, background: '#EFF6FF', borderRadius: 6 }} />
              <div style={{ width: '60%', height: 24, background: '#F1F5F9', borderRadius: 6 }} />
              <div style={{ width: '70%', height: 24, background: '#F1F5F9', borderRadius: 6 }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }} />
                <div style={{ width: '60%', height: 24, background: '#F1F5F9', borderRadius: 6 }} />
              </div>
              <div style={{ padding: 16, background: '#EFF6FF', borderRadius: 16, border: '1px solid #BFDBFE' }}>
                <p style={{ fontSize: 15, color: '#1E3A8A', lineHeight: 1.6, fontWeight: 500 }}>
                  {MOCKUP_MSG}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <span style={{ fontSize: 12, background: 'white', padding: '4px 10px', borderRadius: 99, color: '#2563EB', fontWeight: 600 }}>RFP_Vol_1.pdf</span>
                  <span style={{ fontSize: 12, background: 'white', padding: '4px 10px', borderRadius: 99, color: '#16A34A', fontWeight: 600 }}>Audited_Financials.pdf</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bento Grid Features */}
      <div style={{ maxWidth: 1200, margin: '160px auto', padding: '0 24px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 60 }}
        >
          <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>Everything you need. <br/> Nothing you don't.</h2>
          <p style={{ fontSize: 20, color: '#64748B' }}>A complete AI workspace designed exclusively for high-stakes bids.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          
          <motion.div 
            className="bento-card" style={{ gridColumn: 'span 2' }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Bot size={32} color="#2563EB" />
            </div>
            <h3 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>Instant AI Analysis</h3>
            <p style={{ fontSize: 18, color: '#64748B', lineHeight: 1.6, maxWidth: 400 }}>Upload hundreds of pages of complex tender documents and get immediate summaries, key dates, and EMD requirements.</p>
          </motion.div>

          <motion.div 
            className="bento-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div style={{ width: 64, height: 64, background: '#F0FDF4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Shield size={32} color="#16A34A" />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>Compliance Check</h3>
            <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.6 }}>Automatically match your company's profile and documents against the tender's strict eligibility criteria.</p>
          </motion.div>

          <motion.div 
            className="bento-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div style={{ width: 64, height: 64, background: '#F5F3FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <FileText size={32} color="#7C3AED" />
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>Auto-Draft Documents</h3>
            <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.6 }}>Generate technical methodologies and cover letters instantly.</p>
          </motion.div>

          <motion.div 
            className="bento-card" style={{ gridColumn: 'span 2' }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div style={{ width: 64, height: 64, background: '#FFFBEB', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <TrendingUp size={32} color="#D97706" />
            </div>
            <h3 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>Win Rate Optimization</h3>
            <p style={{ fontSize: 18, color: '#64748B', lineHeight: 1.6, maxWidth: 400 }}>BidKaro doesn't just read documents; it acts as a strategic advisor to maximize your chances of winning the bid.</p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer-marketing">
        <h2 style={{ fontSize: 48, fontWeight: 800, marginBottom: 32, letterSpacing: '-0.02em' }}>Ready to transform your bidding process?</h2>
        <button className="btn-glass" style={{ fontSize: 18, padding: '16px 40px' }} onClick={() => navigate(isAuth ? '/dashboard' : '/register')}>
          {isAuth ? 'Go to Dashboard' : 'Start for free today'} <ArrowRight size={18} style={{ display: 'inline', marginLeft: 8 }} />
        </button>
        <div style={{ marginTop: 80, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 40, display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 14 }}>
          <span>© 2026 BidKaro AI. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
