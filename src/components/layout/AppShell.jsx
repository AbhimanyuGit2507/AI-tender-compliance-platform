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
  const { credits, planTier, dailyFreeAvailable, companyVault, tenders } = useBidKaroStore();
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
      {/* ── LEFT SLEEK STRUCTURAL RAIL (228px) ── */}
      <aside className="agent-rail">
        {/* Brand Header */}
        <div
          onClick={() => navigate('/workspace')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '8px 6px 18px',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(249,115,22,0.10) 100%)',
              border: '1px solid rgba(99,102,241,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(99,102,241,0.20)',
              flexShrink: 0,
            }}
          >
            <img src="/bidkaro-lightning-logo.png" alt="BidKaro Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              BidKaro
            </span>
            <span style={{ fontSize: 9.5, color: 'var(--accent-primary)', fontFamily: 'var(--font-sans)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tender Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
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
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 9,
                  textDecoration: 'none',
                  fontSize: 12.5,
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
                <Icon size={15} color={item.active ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.hasAlert && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--status-warn)',
                      boxShadow: '0 0 6px var(--status-warn)',
                    }}
                  />
                )}
                {item.badge && !item.hasAlert && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 999,
                      background: item.active
                        ? 'var(--accent-primary)'
                        : (isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.06)'),
                      color: item.active
                        ? '#FFFFFF'
                        : 'var(--text-secondary)',
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
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0 6px 8px',
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
                padding: 2,
                display: 'flex',
              }}
              title="New Tender"
            >
              <Plus size={12} />
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
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
                      padding: '6px 8px',
                      borderRadius: 7,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: isSelected
                        ? (isLight ? 'rgba(37, 99, 235, 0.10)' : 'rgba(59, 130, 246, 0.15)')
                        : 'transparent',
                      borderLeft: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
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
                        fontSize: 10,
                        fontWeight: 600,
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
                  padding: '8px 6px',
                  fontSize: 11,
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
              marginTop: 10,
              padding: '7px 10px',
              fontSize: 12,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Plus size={13} />
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
              padding: '6px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 11.5,
              background: resolvedTheme === 'light' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 10,
              transition: 'all 140ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {resolvedTheme === 'dark' ? <Moon size={13} color="var(--accent-primary)" /> : <Sun size={13} color="#D97706" />}
              <span style={{ fontWeight: 500 }}>{resolvedTheme === 'dark' ? 'Obsidian Dark' : 'Alabaster Light'}</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Switch</span>
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
                  gap: 9,
                  padding: '8px 10px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  background: isLight ? 'rgba(255, 255, 255, 0.90)' : 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: isLight ? '0 2px 8px rgba(15, 23, 42, 0.04)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--status-pass-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
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
                      fontSize: 12,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <span
                      style={{
                        fontSize: 10,
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
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: '#10B981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        padding: '1px 5px',
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
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'color 120ms ease',
                    flexShrink: 0,
                  }}
                  title="Sign Out"
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                >
                  <LogOut size={13} />
                </button>
              </div>
            );
          })()}
        </div>
      </aside>

      {/* ── FLOATING INSET WORKSPACE CANVAS ISLAND ── */}
      <main className="agent-canvas-island">
        {/* Top Minimalist Glass Bar */}
        <header className="island-topbar">
          {/* Left: Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>

            <div
              style={{
                fontSize: 12.5,
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentBreadcrumb}
            </div>
          </div>

          {/* Right: Daily Pass + Credit Pill + Vault Health */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {dailyFreeAvailable && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-border)',
                }}
              >
                <Zap size={11} />
                <span>Daily Free Screening: Ready</span>
              </div>
            )}

            {/* Quick Vault Health Indicator */}
            <button
              onClick={() => navigate('/vault')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: hasVaultIssues ? 'var(--status-warn-text)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              title="Inspect Company Qualification Vault"
            >
              <ShieldCheck size={13} color={hasVaultIssues ? 'var(--status-warn)' : 'var(--status-pass)'} />
              <span>Vault: {hasVaultIssues ? 'Warning' : '92% Match'}</span>
            </button>

            {/* Active Subscription Plan Pill */}
            <div
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                padding: '4px 11px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                color: '#10B981',
                cursor: 'pointer',
                transition: 'all 140ms ease',
              }}
              title="Active Subscription Plan: Click to manage in Settings"
            >
              <Sparkles size={11} color="#10B981" />
              <span>{getPlanName(planTier)}</span>
            </div>

            {/* Credit Telemetry Pill */}
            <div
              onClick={() => setTopUpOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '4px 11px',
                borderRadius: 999,
                background: 'var(--accent-gradient)',
                color: '#FFFFFF',
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                boxShadow: '0 2px 10px var(--accent-glow)',
                transition: 'all 140ms ease',
              }}
              title="Click to Top Up Credits"
            >
              <Zap size={12} fill="#FFFFFF" />
              <span>{credits} Cr</span>
              <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 500 }}>· Top Up</span>
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
