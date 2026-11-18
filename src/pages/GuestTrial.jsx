import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  X,
  ChevronRight,
  Sparkles,
  Lock,
  Sun,
  Moon,
  ArrowLeft,
  Circle,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ANALYSIS_STEPS = [
  { key: 'uploading', label: 'Extracting NIT text & clause structure' },
  { key: 'extracting', label: 'Validating EMD & MSME statutory requirements' },
  { key: 'analyzing', label: 'Screening turnover criteria & similar works' },
  { key: 'scoring', label: 'Generating qualification & risk matrix' },
];

const READINESS_COLORS = {
  Strong: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  Conditional: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  Challenging: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export function GuestTrial() {
  const navigate = useNavigate();
  const themeContext = useTheme();
  const resolvedTheme = themeContext?.resolvedTheme || 'dark';
  const setTheme = themeContext?.setTheme || (() => {});
  const isLight = resolvedTheme === 'light';
  const [trialStatus, setTrialStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | uploading | extracting | analyzing | scoring | done | error | exhausted
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [animatedScore, setAnimatedScore] = useState(0);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    api.getTrialStatus().then(setTrialStatus).catch(() => {});
  }, []);

  // Animate score counter when result arrives
  useEffect(() => {
    if (!result) return;
    let start = 0;
    const end = result.compliance_score;
    const duration = 1200;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setAnimatedScore(Math.round(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [result]);

  const handleFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== 'application/pdf') {
      setErrorMsg('Only PDF files are accepted. Please upload an NIT or Tender PDF.');
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMsg('File exceeds 25MB limit. Please upload a smaller NIT package.');
      return;
    }
    setFile(selectedFile);
    setErrorMsg('');
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      handleFile(dropped);
    },
    [handleFile]
  );

  const runAnalysis = async () => {
    if (!file) return;

    setStage('uploading');
    setStageIndex(0);
    setResult(null);
    setErrorMsg('');

    const stages = ['uploading', 'extracting', 'analyzing', 'scoring'];
    let currentIdx = 0;
    const progressInterval = setInterval(() => {
      currentIdx = Math.min(currentIdx + 1, stages.length - 1);
      setStage(stages[currentIdx]);
      setStageIndex(currentIdx);
    }, 2000);

    try {
      const data = await api.submitGuestTrial(file);
      clearInterval(progressInterval);
      setStage('done');
      setResult(data);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('bidkaro_guest_tender', JSON.stringify({
            id: data.tender_id || data.id,
            title: data.tender_title || data.filename || file?.name || 'Guest Trial NIT',
            score: data.compliance_score,
          }));
        } catch (_) {}
      }
    } catch (err) {
      clearInterval(progressInterval);
      if (err.isTrialExhausted) {
        setStage('exhausted');
        setErrorMsg(err.message);
      } else {
        setStage('error');
        setErrorMsg(err.message || 'Analysis failed. Please try again.');
      }
    }
  };

  const resetTrial = () => {
    setFile(null);
    setStage('idle');
    setResult(null);
    setErrorMsg('');
    setAnimatedScore(0);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('bidkaro_guest_tender');
      } catch (_) {}
    }
  };

  const isLoading = ['uploading', 'extracting', 'analyzing', 'scoring'].includes(stage);
  const readinessStyle = result ? (READINESS_COLORS[result.readiness_label] || READINESS_COLORS.Conditional) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--outer-shell-bg)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        position: 'relative',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          background: isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(9, 10, 15, 0.90)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </button>
          <div style={{ height: 16, width: 1, background: 'var(--border-subtle)' }} />
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                background: 'var(--accent-cta)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              B
            </div>
            <span style={{ fontSize: 16, fontWeight: 800 }}>BidKaro</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
            title={isLight ? 'Switch to Dark' : 'Switch to Light'}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-secondary"
            style={{ fontSize: 12.5, padding: '6px 14px' }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="btn btn-primary"
            style={{ fontSize: 12.5, padding: '6px 14px' }}
          >
            Create Account
          </button>
        </div>
      </header>

      {/* Minimalist Focus Wrapper (max-w-2xl) */}
      <div
        style={{
          maxWidth: 672,
          margin: '0 auto',
          padding: '48px 20px 80px',
        }}
      >
        {/* Header & Micro-Banner */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.12)',
              border: isLight ? '1px solid rgba(37, 99, 235, 0.22)' : '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: isLight ? '#2563eb' : '#60a5fa',
              marginBottom: 16,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Zap size={11} /> 1 Free Complete Tender Screening Daily • No Signup Required
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 40px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: 12,
              color: 'var(--text-primary)',
            }}
          >
            Analyze Your Tender Free
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: 'var(--text-secondary)',
              maxWidth: 540,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Upload your NIT or tender document to get an immediate qualification audit, clause risk flags, and EMD requirements.
          </p>
        </div>

        {/* Main Card */}
        <div
          className="surface-card"
          style={{
            padding: 28,
            marginBottom: 24,
            background: isLight ? '#ffffff' : '#131B2E',
            border: isLight ? '1px solid rgba(15, 23, 42, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            boxShadow: isLight
              ? '0 20px 40px -15px rgba(37, 99, 235, 0.08)'
              : '0 20px 40px -15px rgba(59, 130, 246, 0.14)',
          }}
        >
          {/* === IDLE / UPLOAD STATE === */}
          {stage === 'idle' && !result && (
            <>
              {/* Drop zone box */}
              <div
                ref={dropZoneRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px ${dragOver ? 'solid #3B82F6' : 'dashed var(--border-strong)'}`,
                  borderRadius: 12,
                  padding: '40px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver
                    ? 'rgba(59, 130, 246, 0.06)'
                    : (isLight ? '#F8FAFC' : 'rgba(11, 15, 23, 0.6)'),
                  boxShadow: dragOver ? '0 0 24px rgba(59, 130, 246, 0.25)' : 'none',
                  transition: 'all 0.2s ease',
                  marginBottom: file ? 20 : 0,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.12)',
                    color: isLight ? '#2563eb' : '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  <Upload size={24} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                  Drop your tender document here, or click to browse
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Drag & drop your procurement documents directly into the intake engine
                </div>

                {/* Formats Accepted Badges */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    PDF
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    Excel BOQ
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    Max 25MB
                  </span>
                </div>
              </div>

              {/* Selected File Card */}
              {file && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={18} color="var(--accent-cta)" />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {(file.size / (1024 * 1024)).toFixed(1)} MB · Ready for analysis
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--status-fail-bg)',
                    border: '1px solid var(--status-fail-border)',
                    borderRadius: 6,
                    color: 'var(--status-fail-text)',
                    fontSize: 12.5,
                    marginBottom: 16,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* Action Button */}
              {file && (
                <button
                  onClick={runAnalysis}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span>Start Free NIT Compliance Audit</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </>
          )}

          {/* === LOADING / ANALYZING STATE (Master Blueprint Step-by-Step Progress Tracker) === */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, height: 'auto' }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ padding: '24px 12px' }}
            >
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.10)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}
                >
                  <Loader2 size={24} className="spin" color="#3B82F6" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Auditing Tender Package
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Extracting statutory clauses and computing compliance matrices...
                </div>
              </div>

              {/* 4-Step Checklist Progress Tracker */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxWidth: 480,
                  margin: '0 auto',
                  background: isLight ? '#F8FAFC' : 'rgba(11, 15, 23, 0.5)',
                  padding: '16px 20px',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {ANALYSIS_STEPS.map((step, idx) => {
                  const isDone = idx < stageIndex;
                  const isCurrent = idx === stageIndex;
                  const isPending = idx > stageIndex;

                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 13,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isDone || isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0 }} />
                      ) : isCurrent ? (
                        <Loader2 size={16} className="spin" color="#3B82F6" style={{ flexShrink: 0 }} />
                      ) : (
                        <Circle size={16} color="#64748B" style={{ flexShrink: 0 }} />
                      )}
                      <span style={{ color: isDone ? '#10B981' : isCurrent ? 'var(--text-primary)' : '#64748B' }}>
                        {step.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* === COMPLETED RESULTS VIEW === */}
          {stage === 'done' && result && (
            <div>
              {/* Score header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  marginBottom: 24,
                  padding: 20,
                  background: readinessStyle?.bg,
                  border: `1px solid ${readinessStyle?.color}40`,
                  borderRadius: 8,
                }}
              >
                <div style={{ textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: 40, fontWeight: 900, color: readinessStyle?.color, lineHeight: 1 }}>
                    {animatedScore}%
                  </div>
                  <div style={{ fontSize: 11, color: readinessStyle?.color, fontWeight: 700 }}>
                    Qualification
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                    {result.readiness_label} Match Verdict
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {result.summary}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ padding: '6px 12px', background: 'var(--bg-elevated)', borderRadius: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pages Analyzed: </span>
                  <span style={{ fontWeight: 700 }}>{result.page_count}</span>
                </div>
                <div style={{ padding: '6px 12px', background: 'var(--bg-elevated)', borderRadius: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>File: </span>
                  <span style={{ fontWeight: 700 }}>{result.filename}</span>
                </div>
              </div>

              {/* Key Requirements */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  Audited Key Criteria
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.key_requirements?.slice(0, 4).map((req, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                      <CheckCircle2 size={15} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identified Risks */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  Flagged Clause Risks
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.key_risks?.slice(0, 3).map((risk, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                      <AlertTriangle size={15} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gated Report Conversion Banner */}
              <div
                style={{
                  padding: 20,
                  background: 'var(--accent-subtle)',
                  border: '1px solid var(--accent-border)',
                  borderRadius: 8,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Lock size={20} color="var(--accent-cta)" />
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {result.cta_message || 'Create a free account to unlock full clause citations, download the pre-bid query letter (.DOCX), and export the complete compliance matrix.'}
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/signup?from=trial')}
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: 200, padding: '12px 20px', fontSize: 14 }}
                >
                  <span>Create Free Account to Download Full Report →</span>
                </button>
                <button
                  onClick={resetTrial}
                  className="btn btn-secondary"
                  style={{ padding: '12px 18px', fontSize: 13 }}
                >
                  Audit Another Tender
                </button>
              </div>
            </div>
          )}

          {/* === ERROR / EXHAUSTED STATE === */}
          {(stage === 'error' || stage === 'exhausted') && (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {stage === 'exhausted' ? 'Daily Free Limit Reached' : 'Analysis Encountered an Issue'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 20px' }}>
                {errorMsg}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button onClick={resetTrial} className="btn btn-secondary" style={{ fontSize: 12.5 }}>
                  Try Again
                </button>
                <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ fontSize: 12.5 }}>
                  Create Contractor Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuestTrial;
