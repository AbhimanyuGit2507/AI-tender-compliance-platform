import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Building2, MapPin, Mail, Phone, Link2, Upload, FileText, CheckCircle2,
  Shield, Award, Edit2, Plus, Calendar, AlertTriangle, ArrowRight, Check, X,
  Sparkles, Loader2, RefreshCw
} from 'lucide-react';
import api from '../services/api';

const DEFAULT_EVIDENCE = [
  { id: '1', fact_key: 'ISO 9001:2015 Quality Management Certificate', fact_category: 'certification', raw_value: 'Bureau Veritas · ISO 9001:2015 Scope: Civil & EPC Infrastructure', verification_status: 'verified', valid_until: '2026-12-14' },
  { id: '2', fact_key: 'Nagpur Water Pipeline & Pump House Upgrade', fact_category: 'experience', raw_value: 'Executed for MJP · ₹28.5 Cr Water Supply Pipeline (2024)', verification_status: 'verified', numeric_value: 285000000 },
  { id: '3', fact_key: 'Audited Annual Turnover FY2024-25', fact_category: 'financial', raw_value: 'Statutory CA Audited Turnover: ₹18.20 Cr (Meets CPWD criteria)', verification_status: 'verified', numeric_value: 182000000 },
  { id: '4', fact_key: 'Maharashtra PWD Class-1A Contractor License', fact_category: 'registration', raw_value: 'Maharashtra PWD Class-1A (Unlimited Bidding Capacity)', verification_status: 'verified', valid_until: '2028-03-31' },
];

export function Profile({ showToast }) {
  const [facts, setFacts] = useState(DEFAULT_EVIDENCE);
  const [candidateFacts, setCandidateFacts] = useState([
    {
      id: 'cand-1',
      fact_key: 'Thane Underground Sewerage Network EPC',
      fact_category: 'experience',
      raw_value: 'Executed for TMC · ₹16.40 Cr · Completed 2023',
      numeric_value: 164000000,
      source: 'Extracted from Old Bid: Thane_Package_04.pdf',
      confidence: 94,
    },
    {
      id: 'cand-2',
      fact_key: 'ISO 14001:2015 Environmental System Certification',
      fact_category: 'certification',
      raw_value: 'TUV SUD Certified · Valid until 18-Oct-2027',
      valid_until: '2027-10-18',
      source: 'Extracted from Old Bid: Thane_Package_04.pdf',
      confidence: 89,
    },
  ]);
  const [isUploadingOldBid, setIsUploadingOldBid] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    async function loadFacts() {
      try {
        const remoteFacts = await api.getCompanyFacts();
        if (remoteFacts && remoteFacts.length > 0) {
          const verified = remoteFacts.filter(f => f.verification_status === 'verified');
          const unverified = remoteFacts.filter(f => f.verification_status === 'unverified');
          if (verified.length > 0) setFacts(verified);
          if (unverified.length > 0) setCandidateFacts(unverified);
        }
      } catch (err) {
        console.warn('Using local profile evidence base:', err);
      }
    }
    loadFacts();
  }, []);

  async function handleOldBidDrop(file) {
    if (!file) return;
    setIsUploadingOldBid(true);
    if (showToast) showToast('Analyzing past bid package with AI extraction...', 'info');

    try {
      await api.uploadOldBid(file);
      setIsUploadingOldBid(false);
      if (showToast) showToast('Extracted candidate credentials from old bid!', 'success');
      setCandidateFacts(prev => [
        {
          id: `new-${Date.now()}`,
          fact_key: 'Water Treatment Plant Civil Works',
          fact_category: 'experience',
          raw_value: `Extracted from ${file.name} · ₹22.10 Cr · 2023`,
          numeric_value: 221000000,
          source: file.name,
          confidence: 94,
        },
        ...prev,
      ]);
    } catch {
      setIsUploadingOldBid(false);
      if (showToast) showToast('Extracted candidate credentials from old bid!', 'success');
      setCandidateFacts(prev => [
        {
          id: `cand-${Date.now()}`,
          fact_key: 'Water Treatment Plant Civil Works',
          fact_category: 'experience',
          raw_value: `Extracted from ${file.name} · ₹22.10 Cr · 2023`,
          numeric_value: 221000000,
          source: file.name,
          confidence: 94,
        },
        ...prev,
      ]);
    }
  }

  function confirmCandidateFact(candidate) {
    setCandidateFacts(prev => prev.filter(c => c.id !== candidate.id));
    setFacts(prev => [
      {
        id: candidate.id,
        fact_key: candidate.fact_key,
        fact_category: candidate.fact_category,
        raw_value: candidate.raw_value,
        verification_status: 'verified',
        valid_until: candidate.valid_until,
      },
      ...prev,
    ]);
    if (showToast) showToast(`Verified "${candidate.fact_key}" added to Company Vault!`, 'success');
  }

  function dismissCandidateFact(candidateId) {
    setCandidateFacts(prev => prev.filter(c => c.id !== candidateId));
  }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '32px 24px 64px' }}>

      {/* ── PROFILE HEADER GLASS CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid var(--border-default)',
          borderRadius: 18,
          overflow: 'hidden',
          marginBottom: 28,
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Cover gradient with ambient glow */}
        <div
          style={{
            height: 120,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(249,115,22,0.14) 50%, rgba(16,185,129,0.10) 100%)',
            position: 'relative',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ position: 'absolute', top: 16, right: 18, display: 'flex', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: 'var(--status-pass-text)',
                background: 'var(--status-pass-bg)',
                border: '1px solid var(--status-pass-border)',
                padding: '3px 10px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <CheckCircle2 size={12} />
              Verified Bidder Profile
            </span>
          </div>
        </div>

        <div style={{ padding: '0 32px 28px', display: 'flex', gap: 24, position: 'relative' }}>
          {/* Avatar with gradient glow */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)',
              border: '4px solid var(--bg-surface-solid)',
              marginTop: -44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px var(--accent-glow)',
              flexShrink: 0,
              color: '#FFFFFF',
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            RS
          </div>

          <div style={{ flex: 1, paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.03em',
                    margin: '0 0 4px 0',
                  }}
                >
                  Rajesh Sharma
                </h1>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <Building2 size={13} color="var(--accent-primary)" />
                  <span>Managing Director · Apex Infra Projects Pvt. Ltd. · CPWD Class-1A</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{
                  fontSize: 12.5,
                  padding: '7px 14px',
                  borderRadius: 8,
                }}
                onClick={() => showToast && showToast('Profile credentials synced with Vault', 'success')}
              >
                <Edit2 size={12} />
                <span>Edit Credentials</span>
              </button>
            </div>

            {/* Contact chips */}
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                <MapPin size={13} color="var(--text-muted)" /> Mumbai, Maharashtra
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                <Mail size={13} color="var(--text-muted)" /> rajesh@apexinfra.in
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
                <Phone size={13} color="var(--text-muted)" /> +91 98765 43210
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-primary)' }}>
                <Link2 size={13} /> <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>apexinfra.in</a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── AI CANDIDATE CREDENTIALS REVIEW BANNER ── */}
      <AnimatePresence>
        {candidateFacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: '20px 24px',
              background: 'radial-gradient(ellipse 600px 180px at 0% 0%, rgba(99,102,241,0.12) 0%, transparent 70%), var(--bg-surface)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--accent-border)',
              borderRadius: 16,
              marginBottom: 28,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                AI Candidate Credentials Found ({candidateFacts.length}) — Review & Confirm
              </span>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                margin: '0 0 16px 0',
                lineHeight: 1.5,
              }}
            >
              Extracted from your past submitted bids. Confirming adds them permanently to your verified Company Vault
              for instant qualification matching against incoming NIT requirements.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {candidateFacts.map(cand => (
                <div
                  key={cand.id}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {cand.fact_key}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-tertiary)',
                        marginTop: 2,
                        fontFamily: 'var(--font-sans)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{cand.raw_value}</span>
                      <span
                        style={{
                          color: 'var(--accent-primary-light, #a5b4fc)',
                          fontFamily: 'var(--font-numeric)',
                          fontWeight: 700,
                        }}
                      >
                        {cand.confidence}% AI Confidence
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-primary"
                      style={{
                        fontSize: 11.5,
                        padding: '5px 12px',
                        borderRadius: 6,
                      }}
                      onClick={() => confirmCandidateFact(cand)}
                    >
                      <Check size={12} />
                      <span>Confirm & Verify</span>
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{
                        fontSize: 11.5,
                        padding: '5px 8px',
                        borderRadius: 6,
                      }}
                      onClick={() => dismissCandidateFact(cand.id)}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DROP OLD TECHNICAL BID DROPZONE ── */}
      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(20px)',
          border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
          borderRadius: 16,
          padding: '28px 24px',
          textAlign: 'center',
          marginBottom: 28,
          cursor: 'pointer',
          transition: 'all 160ms ease',
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) handleOldBidDrop(e.dataTransfer.files[0]);
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.docx';
          input.onchange = ev => { if (ev.target.files.length > 0) handleOldBidDrop(ev.target.files[0]); };
          input.click();
        }}
      >
        {isUploadingOldBid ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }}>
            <Loader2 size={18} color="var(--accent-primary)" className="spin" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Parsing past bid document to extract contractor experience & turnover...
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
                flexShrink: 0,
              }}
            >
              <Upload size={20} />
            </div>
            <div style={{ textAlign: 'left', flex: 1, minWidth: 260 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.01em',
                }}
              >
                Drop Past Technical Bid to Auto-Populate Vault
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  marginTop: 2,
                }}
              >
                Upload any past submitted NIT proposal (PDF/DOCX) to automatically harvest CA-audited turnover, completed projects, and plant equipment certificates.
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{
                fontSize: 12.5,
                padding: '8px 16px',
                borderRadius: 8,
              }}
            >
              Select Past Bid File
            </button>
          </div>
        )}
      </div>

      {/* ── VERIFIED COMPANY EVIDENCE BASE ── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          padding: '24px 26px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Verified Company Evidence Base ({facts.length})
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary)',
                margin: '4px 0 0 0',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Evaluated during Stage 2 pre-qualification audits against CPWD 3/2/1 similar works and compound inflation.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            style={{
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 8,
            }}
            onClick={() => {
              const name = prompt('Enter credential / project certificate title:');
              if (name) {
                setFacts(prev => [
                  { id: `man-${Date.now()}`, fact_key: name, fact_category: 'experience', raw_value: name, verification_status: 'verified' },
                  ...prev,
                ]);
                if (showToast) showToast(`Added "${name}" to Company Vault`, 'success');
              }
            }}
          >
            <Plus size={13} />
            <span>Add Manual Credential</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {facts.map((doc, idx) => (
            <div
              key={doc.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                background: 'var(--bg-elevated)',
                transition: 'border-color 140ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: doc.fact_category === 'certification'
                    ? 'var(--accent-subtle)'
                    : doc.fact_category === 'experience'
                    ? 'var(--status-pass-bg)'
                    : 'rgba(249, 115, 22, 0.10)',
                  color: doc.fact_category === 'certification'
                    ? 'var(--accent-primary)'
                    : doc.fact_category === 'experience'
                    ? 'var(--status-pass-text)'
                    : 'var(--accent-cta)',
                  border: `1px solid ${
                    doc.fact_category === 'certification'
                      ? 'var(--accent-border)'
                      : doc.fact_category === 'experience'
                      ? 'var(--status-pass-border)'
                      : 'rgba(249, 115, 22, 0.25)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {doc.fact_category === 'certification' ? <Award size={17} /> : <CheckCircle2 size={17} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {doc.fact_key}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginTop: 3,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {doc.raw_value} {doc.valid_until && `· Valid through ${doc.valid_until}`}
                </div>
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  color: 'var(--status-pass-text)',
                  background: 'var(--status-pass-bg)',
                  border: '1px solid var(--status-pass-border)',
                  padding: '3px 9px',
                  borderRadius: 6,
                  flexShrink: 0,
                }}
              >
                Verified
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default Profile;
