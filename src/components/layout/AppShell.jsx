import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  LayoutGrid,
  Building2,
  Zap,
  Sun,
  Moon,
  ShieldCheck,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Bot,
  Activity,
  Layers,
  CheckCircle2,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBidKaroStore } from '../../context/BidKaroStoreContext';
import { useTheme } from '../../context/ThemeContext';
import { CreditTopUpModal } from '../modals/CreditTopUpModal';
import { VaultQuickModal } from '../modals/VaultQuickModal';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';

export function AppShell({ children }) {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const { user, logout, showOnboarding, markOnboardingComplete } = useAuth();
  const { credits, planTier, dailyFreeAvailable, dailyFreePass, companyVault, tenders } = useBidKaroStore();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const getPlanName = (tier) => {
    if (tier === 'single_pack') return 'Single Pack';
    if (tier === 'pro_contractor') return 'Enterprise Pack';
    return 'Growth Pack';
  };

  // Find active tender if on /workspace/:tenderId
  const activeTenderId = location.pathname.startsWith('/workspace/')
    ? location.pathname.replace('/workspace/', '')
    : null;
  const activeTender = tenders?.find(
    (t) => t.id === activeTenderId || t.backendId === activeTenderId
  );

  const hasVaultIssues = companyVault?.certificates?.some((c) => c.status !== 'Valid');
  const islandBodyRef = useRef(null);

  // Reset scroll container position on route changes to prevent viewport displacement
  useEffect(() => {
    if (islandBodyRef.current) {
      islandBodyRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const ADMIN_EMAILS = [
    'biddingplatformai@gmail.com',
    'admin@bidkaro.com',
    'director@shivalikinfra.in',
    'director@larsen-infra.in',
  ];
  const isAdmin = Boolean(
    user &&
      (user.role === 'admin' ||
        user.role === 'superadmin' ||
        (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())))
  );

  // Breadcrumb text determination
  let currentBreadcrumb = 'Workspace / Tender Intake';
  if (location.pathname === '/dashboard') {
    currentBreadcrumb = 'Tenders Pipeline';
  } else if (location.pathname === '/vault') {
    currentBreadcrumb = 'Company Qualification Vault';
  } else if (location.pathname === '/settings') {
    currentBreadcrumb = 'Plans, Credits & Settings';
  } else if (location.pathname.startsWith('/admin')) {
    currentBreadcrumb = 'Executive Admin Control Center';
  } else if (activeTender) {
    currentBreadcrumb = `Workspace / ${activeTender.title}`;
  }

  const navItems = [
    {
      to: '/workspace',
      label: 'Tender Workspace',
      icon: Sparkles,
      active: location.pathname.startsWith('/workspace'),
    },
    {
      to: '/dashboard',
      label: 'Tenders Pipeline',
      icon: LayoutGrid,
      active: location.pathname === '/dashboard',
      badge: tenders?.length ? `${tenders.length}` : null,
    },
    {
      to: '/vault',
      label: 'Company Vault',
      icon: Building2,
      active: location.pathname === '/vault',
      hasAlert: hasVaultIssues,
    },
    {
      to: '/settings',
      label: 'Plans & Credits',
      icon: Zap,
      active: location.pathname === '/settings',
      badge: `${credits} Cr`,
    },
    ...(isAdmin
      ? [
          {
            to: '/admin',
            label: 'Admin Control',
            icon: ShieldAlert,
            active: location.pathname.startsWith('/admin'),
            badge: 'OPS',
            badgeColor: '#8b5cf6',
          },
        ]
      : []),
  ];

  return (
    <div className="agent-shell">
      {/* ── ONBOARDING WIZARD OVERLAY (new users only) ── */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={(opts) => {
            markOnboardingComplete();
            if (opts?.navigateTo) navigate(opts.navigateTo);
          }}
        />
      )}
      {/* ── LEFT SLEEK STRUCTURAL RAIL (248px) ── */}
      <aside className="agent-rail">
        {/* Brand Header */}
        <div
          onClick={() => navigate('/workspace')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: '10px 8px 20px',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(249,115,22,0.14) 100%)',
              border: '1px solid rgba(99,102,241,0.32)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 14px rgba(99,102,241,0.24)',
              flexShrink: 0,
            }}
          >
            <img src="/bidkaro-lightning-logo.png" alt="BidKaro Logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              BidKaro
            </span>
            <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontFamily: 'var(--font-sans)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tender Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isLight = resolvedTheme === 'light';
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: item.active ? 600 : 500,
                  color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: item.active
                    ? 'var(--bg-active)'
                    : 'transparent',
                  border: item.active
                    ? '1px solid var(--accent-border)'
                    : '1px solid transparent',
                  transition: 'all 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Icon size={17} color={item.active ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.hasAlert && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--status-warn)',
                      boxShadow: '0 0 6px var(--status-warn)',
                    }}
                  />
                )}
                {item.badge && !item.hasAlert && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: item.active
                        ? 'var(--accent-primary)'
                        : (isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)'),
                      color: item.active
                        ? '#FFFFFF'
                        : 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Active Tenders Quick Switcher */}
        <div style={{ marginTop: 22, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0 8px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Active Tenders</span>
            <button
              onClick={() => navigate('/workspace')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 3,
                display: 'flex',
                borderRadius: 4,
              }}
              title="New Tender"
            >
              <Plus size={14} />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              overflowY: 'auto',
              maxHeight: 180,
            }}
          >
            {tenders && tenders.length > 0 ? (
              tenders.map((t) => {
                const isSelected = activeTenderId === t.id || activeTenderId === t.backendId;
                const isLight = resolvedTheme === 'light';
                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/workspace/${t.id}`)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: isSelected
                        ? (isLight ? 'rgba(37, 99, 235, 0.12)' : 'rgba(59, 130, 246, 0.16)')
                        : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: t.verdict === 'Qualified' ? 'var(--status-pass-text)' : 'var(--status-warn-text)',
                        flexShrink: 0,
                      }}
                    >
                      {t.readinessScore > 0 ? `${t.readinessScore}%` : 'New'}
                    </span>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '8px 8px',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}
              >
                No active tenders
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/workspace')}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: 12,
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <Plus size={15} />
            <span>Upload NIT Document</span>
          </button>
        </div>

        {/* Rail Footer: Theme Toggle & Company Profile */}
        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          {/* Theme Quick Toggle */}
          <div
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 12.5,
              background: resolvedTheme === 'light' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 10,
              transition: 'all 140ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {resolvedTheme === 'dark' ? <Moon size={15} color="var(--accent-primary)" /> : <Sun size={15} color="#D97706" />}
              <span style={{ fontWeight: 600 }}>{resolvedTheme === 'dark' ? 'Obsidian Dark' : 'Alabaster Light'}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Switch</span>
          </div>

          {/* Company Entity Card */}
          {(() => {
            const orgName = user?.company_name || companyVault?.companyName || 'My Organization';
            const userSub = user?.email || (companyVault?.isInitialized ? 'Profile Active' : 'Vault Incomplete');
            const initials = orgName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'MO';
            const isLight = resolvedTheme === 'light';

            return (
              <div
                onClick={() => navigate('/vault')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  background: isLight ? 'rgba(255, 255, 255, 0.90)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: isLight ? '0 2px 8px rgba(15, 23, 42, 0.04)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--status-pass-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={orgName}
                  >
                    {orgName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={userSub}
                    >
                      {userSub}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: '#10B981',
                        background: 'rgba(16, 185, 129, 0.14)',
                        padding: '1px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getPlanName(planTier)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                    navigate('/login');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'color 120ms ease',
                    flexShrink: 0,
                  }}
                  title="Sign Out"
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <LogOut size={15} />
                </button>
              </div>
            );
          })()}
        </div>
      </aside>

      {/* ── FLOATING INSET WORKSPACE CANVAS ISLAND ── */}
      <main className="agent-canvas-island">
        {/* Top Minimalist Glass Bar */}
        <header className="island-topbar" style={{ minHeight: 56, padding: '0 24px' }}>
          {/* Left: Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentBreadcrumb}
            </div>
          </div>

          {/* Right: Daily Pass + Credit Pill + Vault Health */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {dailyFreeAvailable ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.15)',
                  whiteSpace: 'nowrap',
                }}
                title="Daily Free Screening is active: First NIT screening today costs 0 Credits"
              >
                <Zap size={13} fill="#10B981" />
                <span>Daily Free Screening: Ready</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap',
                }}
                title={`Daily Free Pass claimed today for "${dailyFreePass?.tenderTitle || 'Notice Inviting Tender'}". Resets at midnight IST.`}
              >
                <CheckCircle2 size={13} color="#10B981" />
                <span>Daily Pass: Claimed Today</span>
              </div>
            )}

            {/* Quick Vault Health Indicator */}
            <button
              onClick={() => navigate('/vault')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: 999,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: hasVaultIssues ? 'var(--status-warn-text)' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
              title="Inspect Company Qualification Vault"
            >
              <ShieldCheck size={14} color={hasVaultIssues ? 'var(--status-warn)' : 'var(--status-pass)'} />
              <span>Vault: {hasVaultIssues ? 'Warning' : '92% Match'}</span>
            </button>

            {/* Active Subscription Plan Pill */}
            <div
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                color: '#10B981',
                cursor: 'pointer',
                transition: 'all 140ms ease',
              }}
              title="Active Subscription Plan: Click to manage in Settings"
            >
              <Sparkles size={13} color="#10B981" />
              <span>{getPlanName(planTier)}</span>
            </div>

            {/* Credit Telemetry Pill */}
            <div
              onClick={() => setTopUpOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 13px',
                borderRadius: 999,
                background: 'var(--accent-gradient)',
                color: '#FFFFFF',
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                boxShadow: '0 2px 10px var(--accent-glow)',
                transition: 'all 140ms ease',
              }}
              title="Click to Top Up Credits"
            >
              <Zap size={13} fill="#FFFFFF" />
              <span>{credits} Cr</span>
              <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 500 }}>· Top Up</span>
            </div>
          </div>
        </header>

        {/* Floating Island Body */}
        <div
          ref={islandBodyRef}
          className={`island-body ${location.pathname.startsWith('/workspace') ? 'island-body-workspace' : ''}`}
        >
          {children}
        </div>
      </main>

      {/* Credit Top Up Modal */}
      {topUpOpen && <CreditTopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} />}

      {/* Vault Quick Edit Modal */}
      {vaultModalOpen && <VaultQuickModal isOpen={vaultModalOpen} onClose={() => setVaultModalOpen(false)} />}
    </div>
  );
}

export default AppShell;
