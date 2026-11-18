import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  Mail,
  Building2,
  User,
  FileCheck2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  Send,
  ArrowLeft,
  ChevronLeft,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function Auth({ defaultMode = 'login' }) {
  const [authMethod, setAuthMethod] = useState('otp'); // 'otp' | 'password'
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP workflow states
  const [otpStep, setOtpStep] = useState('email'); // 'email' | 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  // Diagnostic error & recovery states
  const [errorCode, setErrorCode] = useState(null);
  const [suggestedMethod, setSuggestedMethod] = useState(null);
  const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'verify'
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [hasGuestTrial, setHasGuestTrial] = useState(false);

  const {
    login,
    register,
    sendOtp,
    verifyOtp,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    migrateGuestSession,
    isAuthenticated,
  } = useAuth();
  const themeContext = useTheme();
  const resolvedTheme = themeContext?.resolvedTheme || 'dark';
  const setTheme = themeContext?.setTheme || (() => {});
  const isLight = resolvedTheme === 'light';
  const inputBg = isLight ? '#FFFFFF' : 'var(--bg-elevated)';
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/workspace';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const trial = sessionStorage.getItem('bidkaro_guest_tender');
      const params = new URLSearchParams(location.search);
      if (trial || params.get('from') === 'trial') {
        setHasGuestTrial(true);
      }
    }
  }, [location.search]);

  const handlePostAuthSuccess = async () => {
    let target = redirectPath;
    if (typeof window !== 'undefined') {
      try {
        const savedTrial = sessionStorage.getItem('bidkaro_guest_tender');
        if (savedTrial) {
          const parsed = JSON.parse(savedTrial);
          if (parsed?.id) {
            const mig = await migrateGuestSession(parsed.id);
            if (mig?.primary_tender_id) {
              target = `/workspace/${mig.primary_tender_id}`;
            }
          }
          sessionStorage.removeItem('bidkaro_guest_tender');
        }
      } catch (err) {
        console.warn('Guest tender migration note:', err);
      }
    }
    navigate(target, { replace: true });
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  useEffect(() => {
    setIsLogin(defaultMode === 'login');
    setError('');
    setInfoMessage('');
  }, [defaultMode]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Initialize official Google Identity Services SDK
  useEffect(() => {
    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '726323238381-3l99pmukh4034pr50b5d17pnfj56157q.apps.googleusercontent.com';

    function initGoogle() {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              if (response?.credential) {
                setGoogleAuthLoading(true);
                setError('');
                setErrorCode(null);
                setSuggestedMethod(null);
                try {
                  await loginWithGoogle(response.credential, companyName.trim() || undefined, marketingOptIn);
                  await handlePostAuthSuccess();
                } catch (err) {
                  setError(err.message || 'Google Single Sign-On failed. Please try again.');
                  setErrorCode(err.code || null);
                  setSuggestedMethod(err.suggestedMethod || null);
                } finally {
                  setGoogleAuthLoading(false);
                }
              }
            },
            auto_select: false,
          });
        } catch (e) {
          console.warn('Google Identity initialization error:', e);
        }
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [companyName, navigate, redirectPath, loginWithGoogle]);

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setError('');
    setErrorCode(null);
    setSuggestedMethod(null);
    setInfoMessage('');

    if (!email.trim()) {
      setError('Please provide a valid work email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(email.trim());
      setOtpStep('verify');
      setCountdown(res.expires_in_seconds || 300);
      setInfoMessage(res.message || `A 6-digit code has been dispatched to ${email.trim()}`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification code via email. Please check your address.');
      setErrorCode(err.code || null);
      setSuggestedMethod(err.suggestedMethod || null);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setErrorCode(null);
    setSuggestedMethod(null);

    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), otpCode.trim(), companyName.trim() || undefined, marketingOptIn);
      await handlePostAuthSuccess();
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the passcode and try again.');
      setErrorCode(err.code || null);
      setSuggestedMethod(err.suggestedMethod || null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setErrorCode(null);
    setSuggestedMethod(null);
    setInfoMessage('');

    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '726323238381-3l99pmukh4034pr50b5d17pnfj56157q.apps.googleusercontent.com';

    // 1. Production Standard: Official Google OAuth 2.0 Token Client popup
    if (window.google?.accounts?.oauth2) {
      try {
        setGoogleAuthLoading(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setGoogleAuthLoading(false);
              if (tokenResponse.error !== 'access_denied') {
                setError(`Google Sign-In was cancelled or failed (${tokenResponse.error}).`);
              }
              return;
            }
            if (tokenResponse.access_token) {
              try {
                await loginWithGoogle(tokenResponse.access_token, companyName.trim() || undefined, marketingOptIn);
                await handlePostAuthSuccess();
              } catch (err) {
                setError(err.message || 'Google Single Sign-On failed. Please try again.');
                setErrorCode(err.code || null);
                setSuggestedMethod(err.suggestedMethod || null);
              } finally {
                setGoogleAuthLoading(false);
              }
            }
          },
          error_callback: (err) => {
            setGoogleAuthLoading(false);
            if (err?.type !== 'popup_closed') {
              setError('Google popup was closed or blocked. Please allow popups for this site.');
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        setGoogleAuthLoading(false);
        console.error('Google OAuth2 popup initialization failed:', err);
        setError('Failed to open Google authentication window. Please check your browser popup settings.');
        return;
      }
    }

    // 2. Fallback: Google One Tap prompt
    if (window.google?.accounts?.id) {
      try {
        setGoogleAuthLoading(true);
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setGoogleAuthLoading(false);
            setError('Google Sign-In prompt is unavailable. Please sign in using your work email address below.');
          }
        });
        return;
      } catch (err) {
        setGoogleAuthLoading(false);
      }
    }

    // 3. Google SDK blocked (e.g. ad-blocker)
    setError('Google Sign-In service is unavailable or blocked by browser extensions. Please allow accounts.google.com or use work email passcode below.');
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');
    setErrorCode(null);
    setSuggestedMethod(null);

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (!isLogin) {
      if (!companyName.trim()) {
        setError('Please enter your company or contractor entity name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters in length.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register({
          companyName: companyName.trim(),
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          gstin: gstin.trim() || undefined,
          marketingOptIn,
        });
      }
      await handlePostAuthSuccess();
    } catch (err) {
      setError(err.message || (isLogin ? 'Sign-in failed. Please check credentials.' : 'Registration failed.'));
      setErrorCode(err.code || null);
      setSuggestedMethod(err.suggestedMethod || null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResetCode(e) {
    if (e) e.preventDefault();
    setError('');
    setErrorCode(null);
    setSuggestedMethod(null);
    setInfoMessage('');

    if (!email.trim()) {
      setError('Please provide your work email address to receive reset instructions.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setForgotStep('verify');
      setInfoMessage(res.message || `A 6-digit password reset code has been sent to ${email.trim()}`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch password reset code.');
      setErrorCode(err.code || null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteResetPassword(e) {
    e.preventDefault();
    setError('');
    setErrorCode(null);
    setSuggestedMethod(null);
    setInfoMessage('');

    if (!resetOtp.trim() || resetOtp.trim().length < 4) {
      setError('Please enter the 6-digit reset code sent to your email.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters in length.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email.trim(), resetOtp.trim(), newPassword);
      setInfoMessage(res.message || 'Password successfully updated! Please sign in with your new password.');
      setAuthMethod('password');
      setIsLogin(true);
      setPassword(newPassword);
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check the code and try again.');
      setErrorCode(err.code || null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        background: 'var(--outer-shell-bg)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Floating Controls (Back & Theme) ────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 50,
          display: 'flex',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn btn-secondary"
          style={{
            padding: '6px 14px',
            fontSize: 12,
            borderRadius: 6,
          }}
        >
          <ArrowLeft size={13} />
          <span>Back to BidKaro</span>
        </button>
      </div>

      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={() => setTheme(isLight ? 'dark' : 'light')}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLight ? <Moon size={15} /> : <Sun size={15} />}
        </button>
      </div>

      {/* ── Left Side Panel: Enterprise Brand Value (42%) ─────── */}
      <div
        className="hide-mobile"
        style={{
          width: '42%',
          background:
            'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(37, 99, 235, 0.16), transparent 75%), radial-gradient(ellipse 70% 50% at 85% 25%, rgba(249, 115, 22, 0.10), transparent 70%), radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0) 0 0 / 28px 28px, #07090e',
          color: '#ffffff',
          padding: '80px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'rgba(249, 115, 22, 0.12)',
                border: '1px solid rgba(249, 115, 22, 0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(249, 115, 22, 0.25)',
                flexShrink: 0,
              }}
            >
              <img src="/bidkaro-lightning-logo.png" alt="BidKaro" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>BidKaro</div>
              <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AI Tender Platform
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 20 }}>
            Win High-Stakes Public Tenders with Confidence.
          </h2>
          <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.6, marginBottom: 36 }}>
            The autonomous bidding platform built specifically for Indian infrastructure, EPC contractors, and MSMEs.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(249, 115, 22, 0.2)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Check size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>NIT Analysis in 10 Minutes</div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
                  Extract EMD, key dates, PQ criteria, and BOQ tables automatically.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Check size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Eligibility & Experience Verification</div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
                  Verify past work eligibility with compound annual statutory escalation.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Check size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Pre-Bid Queries & Bid Documents</div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
                  Generate ready-to-submit .DOCX packages mapped to exact clause citations.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Contractor Quote */}
        <div
          style={{
            padding: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, margin: 0, fontStyle: 'normal' }}>
            "BidKaro flagged a critical JV disqualification clause on our ₹142 Cr NHAI highway bid in 15 seconds. Saved us weeks of effort."
          </p>
          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>
            Rajesh Kulkarni · VP Tendering, Infrastructure EPC Firm
          </div>
        </div>
      </div>

      {/* ── Right Side Panel: Crisp Auth Form (58%) ───────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          background: isLight ? '#ffffff' : 'var(--bg-canvas)',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: 420, width: '100%' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 6 }}>
              {isLogin ? 'Sign in to your account' : 'Create your contractor account'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
              {isLogin
                ? 'Welcome back. Enter your work credentials to open your workspace.'
                : '1 Free complete tender screening included daily. No credit card required.'}
            </p>
          </div>

          {/* Guest Trial Retention Banner */}
          {hasGuestTrial && (
            <div
              style={{
                background: 'rgba(249, 115, 22, 0.10)',
                border: '1px solid rgba(249, 115, 22, 0.28)',
                borderRadius: 8,
                padding: '11px 14px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Sparkles size={16} color="var(--accent-cta)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                <strong>Trial NIT Saved:</strong> Sign in or register to unlock your complete compliance audit report & pre-bid queries.
              </div>
            </div>
          )}

          {/* Smart Resolution Error Cards */}
          {error && errorCode === 'ACCOUNT_EXISTS' && (
            <div
              style={{
                padding: '14px',
                background: isLight ? 'rgba(59, 130, 246, 0.08)' : 'rgba(30, 58, 138, 0.25)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 8,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={18} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Account Already Exists
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                    An account for <strong>{email}</strong> already exists. Please sign in below.
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {suggestedMethod === 'google' ? (
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <span>Continue with Google SSO →</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setAuthMethod('password');
                          setError('');
                          setErrorCode(null);
                        }}
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6 }}
                      >
                        Sign In with Password →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setAuthMethod('otp');
                        setError('');
                        setErrorCode(null);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6 }}
                    >
                      Use Email Passcode
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && errorCode === 'ACCOUNT_USES_GOOGLE' && (
            <div
              style={{
                padding: '14px',
                background: isLight ? 'rgba(66, 133, 244, 0.08)' : 'rgba(30, 64, 175, 0.25)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                borderRadius: 8,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={18} color="#4285F4" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Google Single Sign-On Required
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                    This account was registered using Google and does not have a separate password.
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>Sign In with Google Now →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && errorCode === 'ACCOUNT_USES_OTP' && (
            <div
              style={{
                padding: '14px',
                background: isLight ? 'rgba(249, 115, 22, 0.08)' : 'rgba(154, 52, 18, 0.25)',
                border: '1px solid rgba(249, 115, 22, 0.35)',
                borderRadius: 8,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={18} color="#f97316" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Passwordless Account
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                    This account uses passwordless one-time passcodes sent to your corporate email.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('otp');
                      setError('');
                      setErrorCode(null);
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6 }}
                  >
                    Switch to Email Passcode (OTP) →
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && errorCode === 'ERR_NO_ACCOUNT' && (
            <div
              style={{
                padding: '14px',
                background: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(153, 27, 27, 0.25)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertCircle size={18} color="#ef4444" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    No Account Found
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                    We couldn't find an account for <strong>{email}</strong>. Would you like to create one with 15 free audit credits?
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                      setErrorCode(null);
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6 }}
                  >
                    Create Free Contractor Account →
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && !['ACCOUNT_EXISTS', 'ACCOUNT_USES_GOOGLE', 'ACCOUNT_USES_OTP', 'ERR_NO_ACCOUNT'].includes(errorCode) && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--status-fail-bg)',
                border: '1px solid var(--status-fail-border)',
                borderRadius: 6,
                color: 'var(--status-fail-text)',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 18,
              }}
            >
              <AlertCircle size={15} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--status-pass-bg)',
                border: '1px solid var(--status-pass-border)',
                borderRadius: 6,
                color: 'var(--status-pass-text)',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 18,
              }}
            >
              <CheckCircle2 size={15} flexShrink={0} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* 1-Click Google Workspace SSO */}
          <button
            type="button"
            id="google-sso-btn"
            disabled={loading || googleAuthLoading}
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: isLight ? '#FFFFFF' : 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 13.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: loading || googleAuthLoading ? 'not-allowed' : 'pointer',
              marginBottom: 20,
              transition: 'all 0.2s ease',
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.06)' : '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            {googleAuthLoading ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid var(--text-secondary)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            <span>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          {/* Auth Method Switcher (OTP vs Password) */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-elevated)',
              padding: 3,
              borderRadius: 6,
              marginBottom: 20,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMethod('otp');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: authMethod === 'otp' ? 700 : 500,
                borderRadius: 4,
                border: 'none',
                background: authMethod === 'otp' ? 'var(--bg-surface)' : 'transparent',
                color: authMethod === 'otp' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Email Passcode (OTP)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('password');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: authMethod === 'password' ? 700 : 500,
                borderRadius: 4,
                border: 'none',
                background: authMethod === 'password' ? 'var(--bg-surface)' : 'transparent',
                color: authMethod === 'password' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Password
            </button>
          </div>

          {/* Form: Forgot Password / Reset */}
          {authMethod === 'forgot' ? (
            forgotStep === 'email' ? (
              <form onSubmit={handleSendResetCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Enter your registered work email. We'll send you a 6-digit verification code to reset your password.
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Corporate Work Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tender.manager@contractor.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: 13,
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: inputBg,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px 16px', fontSize: 13.5, marginTop: 4 }}
                >
                  {loading ? 'Sending Code...' : 'Send Password Reset Code →'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('password');
                      setError('');
                      setErrorCode(null);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 12, cursor: 'pointer' }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Enter 6-Digit Reset Code sent to {email}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    autoFocus
                    placeholder="123456"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: 18,
                      fontWeight: 700,
                      textAlign: 'center',
                      letterSpacing: '0.2em',
                      borderRadius: 6,
                      border: '1px solid var(--border-strong)',
                      background: inputBg,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    New Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: 13,
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: inputBg,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px 16px', fontSize: 13.5, marginTop: 4 }}
                >
                  {loading ? 'Resetting Password...' : 'Save New Password & Sign In →'}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendResetCode}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )
          ) : authMethod === 'otp' ? (
            otpStep === 'email' ? (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!isLogin && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      Contractor Entity / Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Infra Projects Pvt Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: 13,
                        borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        background: inputBg,
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Corporate Work Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tender.manager@contractor.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: 13,
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: inputBg,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                {!isLogin && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      cursor: 'pointer',
                      margin: '8px 0 4px',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--accent-primary)', width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span>
                      Receive high-value tender opportunity alerts, CPWD/NHAI circulars, and weekly procurement intelligence digests via Brevo.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: 13.5,
                    marginTop: 6,
                  }}
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Enter 6-Digit Passcode sent to {email}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    autoFocus
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      fontSize: 18,
                      fontWeight: 700,
                      textAlign: 'center',
                      letterSpacing: '0.2em',
                      borderRadius: 6,
                      border: '1px solid var(--border-strong)',
                      background: inputBg,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                {!isLogin && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      cursor: 'pointer',
                      margin: '8px 0 4px',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--accent-primary)', width: 14, height: 14, flexShrink: 0 }}
                    />
                    <span>
                      Receive high-value tender opportunity alerts, CPWD/NHAI circulars, and weekly procurement intelligence digests via Brevo.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: 13.5,
                    marginTop: 4,
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify Code & Enter Workspace →'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <button
                    type="button"
                    onClick={() => setOtpStep('email')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0 }}
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    disabled={countdown > 0 || loading}
                    onClick={handleSendOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: countdown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                      cursor: countdown > 0 ? 'default' : 'pointer',
                      padding: 0,
                    }}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Form: Password Method */
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!isLogin && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      Contractor Entity / Company Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Larsen Infra EPC Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: 13,
                        borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        background: inputBg,
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      Contact Person Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: 13,
                        borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        background: inputBg,
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="tender.manager@contractor.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: 13,
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: inputBg,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Password</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('forgot');
                          setForgotStep('email');
                          setError('');
                          setErrorCode(null);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 11, cursor: 'pointer', padding: 0 }}
                      >
                        Forgot?
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: 13,
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: inputBg,
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 13.5,
                  marginTop: 6,
                }}
              >
                {loading ? 'Signing In...' : isLogin ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>
          )}

          {/* Toggle between Register & Login */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            {isLogin ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Create free account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            By signing in, you agree to our Terms of Service and Privacy Policy. All uploaded tender files are strictly confidential and protected.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
