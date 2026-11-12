import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Sliders,
  ShieldAlert,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Zap,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Lock,
  Unlock,
  Edit3,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Activity,
  Cpu,
  Server,
  Mail,
  Terminal,
  ChevronDown,
  ChevronUp,
  Shield,
  X,
  Building2,
  DollarSign,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBidKaroStore } from '../context/BidKaroStoreContext';
import { PageHeader } from '../components/common/PageHeader';
import api from '../services/api';

const ADMIN_EMAILS = [
  'admin@bidkaro.com',
  'director@shivalikinfra.in',
  'director@larsen-infra.in',
];

export function Admin() {
  const { user } = useAuth();
  const { deductCredits } = useBidKaroStore();

  // Tab State
  const [activeTab, setActiveTab] = useState('overview'); // overview | customers | plans | economics | governance | logs

  // Data states
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  // Customers CRM State
  const [tenants, setTenants] = useState([]);
  const [tenantsTotal, setTenantsTotal] = useState(0);
  const [tenantsPage, setTenantsPage] = useState(1);
  const [tenantsSearch, setTenantsSearch] = useState('');
  const [tenantsFilter, setTenantsFilter] = useState('all'); // all | active | suspended | paid
  const [tenantsLoading, setTenantsLoading] = useState(false);

  // Selected Tenant Dossier & Modals
  const [selectedTenantDossier, setSelectedTenantDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [creditModalTenant, setCreditModalTenant] = useState(null);
  const [creditDelta, setCreditDelta] = useState(100);
  const [creditReason, setCreditReason] = useState('Manual administrative credit grant');
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  // Plan Edit / Create State
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState(null);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [planSaveSubmitting, setPlanSaveSubmitting] = useState(false);

  // System Settings State
  const [settingsData, setSettingsData] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [stageCostsForm, setStageCostsForm] = useState({
    stage1: 15,
    stage2_delta: 25,
    stage3_delta: 60,
    free_trial_credits: 25,
  });
  const [guestTrialForm, setGuestTrialForm] = useState({
    daily_free_limit: 1,
    window_hours: 24,
    max_pages: 40,
  });
  const [aiRoutingForm, setAiRoutingForm] = useState({
    primary_provider: 'groq',
    secondary_provider: 'openrouter',
    active_model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
  });
  const [governanceForm, setGovernanceForm] = useState({
    maintenance_mode: false,
    allow_guest_trials: true,
    brevo_live_email: true,
    strict_gstin_check: false,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Logs State
  const [logSubTab, setLogSubTab] = useState('audit'); // audit | email
  const [auditLogs, setAuditLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // UI notifications
  const [toast, setToast] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // RBAC Permission Check
  const isAdmin = Boolean(
    user &&
      (user.role === 'admin' ||
        user.role === 'superadmin' ||
        (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())))
  );

  // ── Loaders ──────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    if (!isAdmin) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const data = await api.getAdminMetrics();
      setMetrics(data);
    } catch (err) {
      setMetricsError(err.message || 'Failed to load executive metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, [isAdmin]);

  const fetchTenants = useCallback(async () => {
    if (!isAdmin) return;
    setTenantsLoading(true);
    try {
      const data = await api.getAdminTenants({
        page: tenantsPage,
        limit: 20,
        search: tenantsSearch,
      });
      setTenants(data.tenants || []);
      setTenantsTotal(data.total || 0);
    } catch (err) {
      showToast(err.message || 'Failed to fetch customer directory', 'error');
    } finally {
      setTenantsLoading(false);
    }
  }, [isAdmin, tenantsPage, tenantsSearch]);

  const fetchPlans = useCallback(async () => {
    if (!isAdmin) return;
    setPlansLoading(true);
    try {
      const data = await api.getAdminPlans();
      setPlans(data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load subscription plans', 'error');
    } finally {
      setPlansLoading(false);
    }
  }, [isAdmin]);

  const fetchSettings = useCallback(async () => {
    if (!isAdmin) return;
    setSettingsLoading(true);
    try {
      const data = await api.getAdminSettings();
      setSettingsData(data || {});
      if (data['economics.stage_costs']?.value) {
        setStageCostsForm((prev) => ({ ...prev, ...data['economics.stage_costs'].value }));
      }
      if (data['economics.guest_trial']?.value) {
        setGuestTrialForm((prev) => ({ ...prev, ...data['economics.guest_trial'].value }));
      }
      if (data['ai.routing']?.value) {
        setAiRoutingForm((prev) => ({ ...prev, ...data['ai.routing'].value }));
      }
      if (data['system.governance']?.value) {
        setGovernanceForm((prev) => ({ ...prev, ...data['system.governance'].value }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load platform settings', 'error');
    } finally {
      setSettingsLoading(false);
    }
  }, [isAdmin]);

  const fetchLogs = useCallback(async () => {
    if (!isAdmin) return;
    setLogsLoading(true);
    try {
      if (logSubTab === 'audit') {
        const data = await api.getAdminAuditLogs({ page: 1, limit: 50, search: logSearch });
        setAuditLogs(data.logs || []);
      } else {
        const data = await api.getAdminEmailLogs({ page: 1, limit: 50, search: logSearch });
        setEmailLogs(data.logs || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch system logs', 'error');
    } finally {
      setLogsLoading(false);
    }
  }, [isAdmin, logSubTab, logSearch]);

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
      fetchPlans();
      fetchSettings();
    }
  }, [isAdmin, fetchMetrics, fetchPlans, fetchSettings]);

  // Tab change triggers
  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'customers') fetchTenants();
    if (activeTab === 'plans') fetchPlans();
    if (activeTab === 'economics' || activeTab === 'governance') fetchSettings();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, isAdmin, fetchTenants, fetchPlans, fetchSettings, fetchLogs]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleGrantCredits = async (e) => {
    e.preventDefault();
    if (!creditModalTenant) return;
    setCreditSubmitting(true);
    try {
      const res = await api.grantAdminCredits(creditModalTenant.id, creditDelta, creditReason);
      showToast(`Successfully granted ${creditDelta > 0 ? '+' : ''}${creditDelta} credits to ${creditModalTenant.name}`);
      setCreditModalTenant(null);
      setCreditDelta(100);
      setCreditReason('Manual administrative credit grant');
      fetchTenants();
      fetchMetrics();
    } catch (err) {
      showToast(err.message || 'Credit grant failed', 'error');
    } finally {
      setCreditSubmitting(false);
    }
  };

  const handleToggleTenantStatus = async (t) => {
    const nextStatus = !t.is_active;
    const confirmMsg = nextStatus
      ? `Reactivate account for "${t.name}"?`
      : `Suspend account for "${t.name}"? This will block access to the platform.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateAdminTenantStatus(t.id, nextStatus, nextStatus ? 'Reactivated by admin' : 'Administrative suspension');
      showToast(`Account status updated for ${t.name}`);
      fetchTenants();
    } catch (err) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const handleChangeTenantTier = async (t, newTier) => {
    try {
      await api.updateAdminTenantPlan(t.id, newTier, `Adjusted tier to ${newTier} via Admin CRM`);
      showToast(`Subscription tier updated to ${newTier} for ${t.name}`);
      fetchTenants();
      fetchMetrics();
    } catch (err) {
      showToast(err.message || 'Plan update failed', 'error');
    }
  };

  const handleInspectDossier = async (tenantId) => {
    setDossierLoading(true);
    try {
      const dossier = await api.getAdminTenantDossier(tenantId);
      setSelectedTenantDossier(dossier);
    } catch (err) {
      showToast(err.message || 'Failed to inspect dossier', 'error');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm) return;
    setPlanSaveSubmitting(true);
    try {
      if (editingPlan) {
        await api.updateAdminPlan(editingPlan.id, planForm);
        showToast(`Plan "${planForm.name}" updated and live on public site!`);
      } else {
        await api.createAdminPlan(planForm);
        showToast(`New plan "${planForm.name}" published successfully!`);
      }
      setEditingPlan(null);
      setPlanForm(null);
      fetchPlans();
    } catch (err) {
      showToast(err.message || 'Failed to save plan', 'error');
    } finally {
      setPlanSaveSubmitting(false);
    }
  };

  const handleSaveStageCosts = async () => {
    setSettingsSaving(true);
    try {
      await api.updateAdminSetting('economics.stage_costs', stageCostsForm, 'Progressive stage credits burn policy');
      await api.updateAdminSetting('economics.guest_trial', guestTrialForm, 'Guest trial usage quota and window');
      showToast('Credit economics and delta rules updated successfully!');
      fetchSettings();
    } catch (err) {
      showToast(err.message || 'Failed to save economics', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveGovernance = async () => {
    setSettingsSaving(true);
    try {
      await api.updateAdminSetting('ai.routing', aiRoutingForm, 'Primary LLM inference routing & parameters');
      await api.updateAdminSetting('system.governance', governanceForm, 'System feature toggles and flags');
      showToast('System governance and AI router configuration updated!');
      fetchSettings();
    } catch (err) {
      showToast(err.message || 'Failed to update governance', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── Unauthorized Render Gate ─────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          className="surface-card"
          style={{
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            padding: '40px 32px',
            border: '1px solid var(--status-fail-border)',
            background: 'var(--status-fail-bg)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={28} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--status-fail-text)', marginBottom: 8 }}>
            403 — Administrative Credentials Required
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
            The <strong>Executive Admin Control Center</strong> is restricted to authorized platform operators.
            Your current account ({user?.email || 'Authenticated User'}) lacks administrative privileges.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="/workspace" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Return to Workspace
            </a>
            <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Switch Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Admin UI ────────────────────────────────────────────────────
  return (
    <div className="animate-in" style={{ padding: '24px 28px 80px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 28,
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: 10,
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Executive Admin Control Center"
        subtitle="360-degree operational command: real-time unit economics, customer CRM, dynamic pricing, and AI routing."
        badge="ENTERPRISE OPS"
        breadcrumbs={[
          { label: 'Workspace', to: '/workspace' },
          { label: 'Admin Operations' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                fetchMetrics();
                if (activeTab === 'customers') fetchTenants();
                if (activeTab === 'plans') fetchPlans();
                if (activeTab === 'economics' || activeTab === 'governance') fetchSettings();
                if (activeTab === 'logs') fetchLogs();
                showToast('Telemetry refreshed from live database');
              }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              disabled={metricsLoading}
            >
              <RefreshCw size={13} className={metricsLoading ? 'spin' : ''} />
              <span>Refresh Metrics</span>
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.28)',
                color: '#a78bfa',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Shield size={13} />
              <span>SUPERADMIN ACCESS</span>
            </div>
          </div>
        }
      />

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--bg-elevated)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          marginBottom: 24,
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Overview & Unit Economics', icon: LayoutDashboard },
          { id: 'customers', label: 'Customer CRM', icon: Users, badge: tenantsTotal ? `${tenantsTotal}` : null },
          { id: 'plans', label: 'Plans & Pricing Engine', icon: CreditCard },
          { id: 'economics', label: 'Credit Economics & Stages', icon: Sliders },
          { id: 'governance', label: 'Governance & AI Router', icon: Cpu },
          { id: 'logs', label: 'Audit Trail & Brevo Logs', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                borderRadius: 9,
                border: 'none',
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 120ms ease',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface)',
                    color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & UNIT ECONOMICS ─────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top KPI Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {/* KPI 1: Gross Revenue */}
            <div className="surface-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Gross Platform Revenue</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 11, fontWeight: 700 }}>
                  Live INR
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
                ₹{(metrics?.financials?.gross_revenue_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                MRR Est: ₹{(metrics?.financials?.mrr_estimated_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} · {metrics?.financials?.total_paid_orders || 0} Orders
              </div>
            </div>

            {/* KPI 2: Customer Accounts */}
            <div className="surface-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Customer Contractors</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: 11, fontWeight: 700 }}>
                  {metrics?.customer_stats?.conversion_rate_pct || 0}% Conversion
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
                {metrics?.customer_stats?.active_tenants || 0}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {metrics?.customer_stats?.paying_tenants || 0} Paying · {metrics?.customer_stats?.free_trial_users || 0} Free Trial
              </div>
            </div>

            {/* KPI 3: Pipeline Value */}
            <div className="surface-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Pipeline Under Analysis</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700 }}>
                  CPWD/NHAI
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
                ₹{(metrics?.pipeline_stats?.active_pipeline_value_cr || 0).toLocaleString('en-IN')} Cr
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {metrics?.pipeline_stats?.total_tenders_analyzed || 0} Total NIT Packages Ingested
              </div>
            </div>

            {/* KPI 4: Credit Liability & Supply */}
            <div className="surface-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>System Credit Liability</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>
                  Outstanding
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: 6 }}>
                {(metrics?.credit_velocity?.current_system_liability || 0).toLocaleString()} Cr
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Minted: {(metrics?.credit_velocity?.total_credits_minted || 0).toLocaleString()} · Burned: {(metrics?.credit_velocity?.total_credits_burned || 0).toLocaleString()}
              </div>
            </div>

            {/* KPI 5: AI Unit Economics & Margins */}
            <div className="surface-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>AI Compute Gross Margin</span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 11, fontWeight: 700 }}>
                  Profitable
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#10b981', marginBottom: 6 }}>
                {metrics?.ai_compute_economics?.gross_software_margin_pct || 0}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                LLM Cost: ₹{(metrics?.ai_compute_economics?.estimated_llm_cost_inr || 0).toFixed(2)} · ₹{(metrics?.ai_compute_economics?.cost_per_tender_inr || 0).toFixed(2)} / tender
              </div>
            </div>
          </div>

          {/* Secondary Telemetry Grid: Funnel & AI Cost Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            {/* Tender Pipeline Funnel */}
            <div className="surface-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="var(--accent-primary)" />
                <span>Multi-Stage Tender Pipeline Conversion</span>
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Progressive customer progression across Stage 1 Screening, Stage 2 Risk Audit, and Stage 3 Package Compilation.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    stage: 'Stage 1: NIT Intake & Qualification Screening',
                    count: metrics?.pipeline_stats?.stage1_screenings || 0,
                    percent: 100,
                    color: '#3b82f6',
                    cost: '15 Credits',
                  },
                  {
                    stage: 'Stage 2: Technical Compliance & Disqualification Radar',
                    count: metrics?.pipeline_stats?.stage2_audits || 0,
                    percent: Math.round(((metrics?.pipeline_stats?.stage2_audits || 0) / Math.max(metrics?.pipeline_stats?.stage1_screenings || 1, 1)) * 100),
                    color: 'var(--accent-primary)',
                    cost: '+25 Credits Delta',
                  },
                  {
                    stage: 'Stage 3: Full Bid Package & Word/Excel Drafter',
                    count: metrics?.pipeline_stats?.stage3_compiled_bids || 0,
                    percent: Math.round(((metrics?.pipeline_stats?.stage3_compiled_bids || 0) / Math.max(metrics?.pipeline_stats?.stage1_screenings || 1, 1)) * 100),
                    color: '#10b981',
                    cost: '+60 Credits Delta',
                  },
                ].map((item) => (
                  <div key={item.stage} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.stage}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.color }}>
                        {item.count} tenders ({item.percent}%) · {item.cost}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.percent}%`,
                          height: '100%',
                          background: item.color,
                          borderRadius: 999,
                          transition: 'width 400ms ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Compute Economics Card */}
            <div className="surface-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={16} color="#8b5cf6" />
                <span>AI Infrastructure & Inference Telemetry</span>
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Real-time tracking of token throughput, inference costs, and model efficiency.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Tokens Processed</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {(metrics?.ai_compute_economics?.estimated_tokens_processed || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Inference Cost (INR)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--status-warn-text)' }}>
                    ₹{(metrics?.ai_compute_economics?.estimated_llm_cost_inr || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Primary Model</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                    Llama 3.3 70B (Groq)
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Avg Cost / Full Tender</div>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                    ₹{(metrics?.ai_compute_economics?.cost_per_tender_inr || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                }}
              >
                💡 <strong>Margin Protection Architecture:</strong> At ₹66 to ₹199 per tender revenue versus ~₹3.40 LLM compute cost, gross software margins exceed <strong>85%+</strong> across all active tiers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CUSTOMER CRM & TENANTS ───────────────────────────────── */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Search and Filters Bar */}
          <div
            className="surface-card"
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 300px' }}>
              <Search size={16} color="var(--text-tertiary)" />
              <input
                type="text"
                placeholder="Search by company name, owner email, or tenant ID..."
                value={tenantsSearch}
                onChange={(e) => setTenantsSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setTenantsPage(1);
                    fetchTenants();
                  }
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => {
                  setTenantsPage(1);
                  fetchTenants();
                }}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                Apply Search
              </button>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contractor / Company</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Owner Contact</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Subscription Plan</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Credit Balance</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tenders</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantsLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px' }} />
                        <div>Loading contractor directory...</div>
                      </td>
                    </tr>
                  ) : tenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No contractors found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((t) => (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 100ms ease',
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {t.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                            <span>{t.id.slice(0, 8)}...</span>
                            <button
                              onClick={() => copyToClipboard(t.id, t.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)' }}
                              title="Copy Tenant UUID"
                            >
                              {copiedKey === t.id ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                            </button>
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: 'var(--text-primary)' }}>{t.owner_email || '—'}</div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <select
                            value={t.plan_tier || 'free'}
                            onChange={(e) => handleChangeTenantTier(t, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 6,
                              color: 'var(--text-primary)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <option value="free">Free Trial (25 Cr)</option>
                            <option value="single_pack">Single Tender Pass</option>
                            <option value="growth_pack">Active Bidder 5-Pack</option>
                            <option value="pro_contractor">Enterprise EPC 15-Pack</option>
                          </select>
                        </td>

                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          <span style={{ color: t.credit_balance > 0 ? '#10b981' : 'var(--status-warn-text)' }}>
                            {t.credit_balance} Cr
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)' }}>
                          {t.tender_count || 0}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: t.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: t.is_active ? '#10b981' : '#ef4444',
                              border: `1px solid ${t.is_active ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            }}
                          >
                            {t.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setCreditModalTenant(t)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Grant or deduct credits"
                            >
                              <Zap size={11} color="var(--accent-primary)" />
                              <span>Credits</span>
                            </button>

                            <button
                              onClick={() => handleInspectDossier(t.id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Inspect full customer profile & vault"
                            >
                              <Eye size={11} />
                              <span>Dossier</span>
                            </button>

                            <button
                              onClick={() => handleToggleTenantStatus(t)}
                              style={{
                                padding: '4px 8px',
                                fontSize: 11,
                                borderRadius: 6,
                                border: '1px solid var(--border-subtle)',
                                background: t.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                color: t.is_active ? '#ef4444' : '#10b981',
                                cursor: 'pointer',
                              }}
                              title={t.is_active ? 'Suspend Account' : 'Reactivate Account'}
                            >
                              {t.is_active ? <Lock size={11} /> : <Unlock size={11} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <span>Showing {tenants.length} of {tenantsTotal} contractors</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={tenantsPage <= 1}
                  onClick={() => setTenantsPage((p) => Math.max(p - 1, 1))}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  Previous
                </button>
                <span style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>Page {tenantsPage}</span>
                <button
                  disabled={tenants.length < 20}
                  onClick={() => setTenantsPage((p) => p + 1)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: DYNAMIC PLANS & PRICING ENGINE ────────────────────────── */}
      {activeTab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Subscription & Credit Packs Configuration</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                All changes made here update database records immediately and synchronize live across user settings and checkout.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({
                  id: `pack_${Date.now()}`,
                  name: 'Custom Contractor Pack',
                  badge: 'Special Offer',
                  price_inr: 799.0,
                  credits: 800,
                  effective_per_tender: '₹79 / tender',
                  features: ['Full Tender Lifecycle Analysis', 'Technical Compliance Matrix', 'DOCX Bid Bundles'],
                  is_popular: false,
                  is_active: true,
                  sort_order: plans.length + 1,
                });
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Plus size={14} />
              <span>Create New Plan</span>
            </button>
          </div>

          {/* Plans Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {plans.map((p) => (
              <div
                key={p.id}
                className="surface-card"
                style={{
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: p.is_popular ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  position: 'relative',
                }}
              >
                {p.is_popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'var(--accent-primary)',
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    POPULAR
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                    {p.badge || 'Tender Pack'}
                  </div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {p.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      ₹{p.price_inr}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      ({p.effective_per_tender || `${p.credits} Credits`})
                    </span>
                  </div>

                  <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 16 }}>
                    ⚡ {p.credits} Procurement Credits Included
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {(p.features || []).map((feat, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                  <button
                    onClick={() => {
                      setEditingPlan(p);
                      setPlanForm({ ...p, features: [...(p.features || [])] });
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Edit3 size={13} /> Edit Plan
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api.updateAdminPlan(p.id, { ...p, is_active: !p.is_active });
                        showToast(`Plan ${p.name} ${p.is_active ? 'deactivated' : 'activated'}`);
                        fetchPlans();
                      } catch (err) {
                        showToast('Failed to toggle status', 'error');
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: p.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                      color: p.is_active ? '#ef4444' : '#10b981',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Plan Editor Modal */}
          {planForm && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
              }}
            >
              <div
                className="surface-card animate-in"
                style={{
                  maxWidth: 580,
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: 28,
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800 }}>
                    {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
                  </h3>
                  <button
                    onClick={() => {
                      setPlanForm(null);
                      setEditingPlan(null);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Plan ID (Slug) *
                      </label>
                      <input
                        type="text"
                        disabled={Boolean(editingPlan)}
                        value={planForm.id}
                        onChange={(e) => setPlanForm({ ...planForm, id: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12.5,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontSize: 12.5,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Price in INR (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={planForm.price_inr}
                        onChange={(e) => setPlanForm({ ...planForm, price_inr: parseFloat(e.target.value) || 0 })}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Credits Allotment *
                      </label>
                      <input
                        type="number"
                        value={planForm.credits}
                        onChange={(e) => setPlanForm({ ...planForm, credits: parseInt(e.target.value, 10) || 0 })}
                        required
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Badge Label (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Best Value · 67% Off"
                        value={planForm.badge || ''}
                        onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontSize: 12.5,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Effective Per Tender Note
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ₹66.6 / tender"
                        value={planForm.effective_per_tender || ''}
                        onChange={(e) => setPlanForm({ ...planForm, effective_per_tender: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontSize: 12.5,
                        }}
                      />
                    </div>
                  </div>

                  {/* Features List Tags */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Plan Features (Bullet Points)
                    </label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input
                        type="text"
                        placeholder="Add feature description..."
                        value={newFeatureText}
                        onChange={(e) => setNewFeatureText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newFeatureText.trim()) {
                              setPlanForm({
                                ...planForm,
                                features: [...(planForm.features || []), newFeatureText.trim()],
                              });
                              setNewFeatureText('');
                            }
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 8,
                          color: 'var(--text-primary)',
                          fontSize: 12.5,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newFeatureText.trim()) {
                            setPlanForm({
                              ...planForm,
                              features: [...(planForm.features || []), newFeatureText.trim()],
                            });
                            setNewFeatureText('');
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: 12 }}
                      >
                        Add
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(planForm.features || []).map((feat, fIdx) => (
                        <div
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--bg-elevated)',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <span>{feat}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...planForm.features];
                              updated.splice(fIdx, 1);
                              setPlanForm({ ...planForm, features: updated });
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div style={{ display: 'flex', gap: 20, padding: '10px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={planForm.is_popular}
                        onChange={(e) => setPlanForm({ ...planForm, is_popular: e.target.checked })}
                      />
                      <span>Mark as "Most Popular"</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={planForm.is_active}
                        onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                      />
                      <span>Active & Available for Purchase</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanForm(null);
                        setEditingPlan(null);
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={planSaveSubmitting}
                      className="btn btn-primary"
                      style={{ minWidth: 140 }}
                    >
                      {planSaveSubmitting ? 'Publishing...' : 'Save & Publish Live'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: CREDIT ECONOMICS & STAGE COSTS ────────────────────────── */}
      {activeTab === 'economics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
          <div className="surface-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
              Progressive Stage Delta-Cost Architecture
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Control the credit burns for each analytical stage. Bidders are never charged twice for completed stages.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Stage 1: NIT Intake (Cr)
                  </label>
                  <input
                    type="number"
                    value={stageCostsForm.stage1}
                    onChange={(e) => setStageCostsForm({ ...stageCostsForm, stage1: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                    NIT OCR, EMD/MSME, Key Dates
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Stage 2 Delta Cost (Cr)
                  </label>
                  <input
                    type="number"
                    value={stageCostsForm.stage2_delta}
                    onChange={(e) => setStageCostsForm({ ...stageCostsForm, stage2_delta: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                    Compliance Matrix & Risk Radar
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Stage 3 Delta Cost (Cr)
                  </label>
                  <input
                    type="number"
                    value={stageCostsForm.stage3_delta}
                    onChange={(e) => setStageCostsForm({ ...stageCostsForm, stage3_delta: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                    DOCX Cover Letter, Affidavits & BOQ
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Free Trial Grant (Cr)
                  </label>
                  <input
                    type="number"
                    value={stageCostsForm.free_trial_credits}
                    onChange={(e) => setStageCostsForm({ ...stageCostsForm, free_trial_credits: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                    Credited upon contractor signup
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Trial Parameters */}
          <div className="surface-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
              Instant Public Free Analyzer Quota & Limits
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Control lead generation friction at <code>/try</code> without allowing scraping or LLM resource exhaustion.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Daily Free Passes / IP (24h)
                </label>
                <input
                  type="number"
                  value={guestTrialForm.daily_free_limit}
                  onChange={(e) => setGuestTrialForm({ ...guestTrialForm, daily_free_limit: parseInt(e.target.value, 10) || 1 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Sliding Reset Window (Hours)
                </label>
                <input
                  type="number"
                  value={guestTrialForm.window_hours}
                  onChange={(e) => setGuestTrialForm({ ...guestTrialForm, window_hours: parseInt(e.target.value, 10) || 24 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Max Document Pages (Trial)
                </label>
                <input
                  type="number"
                  value={guestTrialForm.max_pages}
                  onChange={(e) => setGuestTrialForm({ ...guestTrialForm, max_pages: parseInt(e.target.value, 10) || 40 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={handleSaveStageCosts}
                disabled={settingsSaving}
                className="btn btn-primary"
                style={{ minWidth: 160 }}
              >
                {settingsSaving ? 'Saving...' : 'Save Economic Policies'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: GOVERNANCE, FEATURE FLAGS & AI ROUTER ────────────────── */}
      {activeTab === 'governance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
          {/* AI Model Routing */}
          <div className="surface-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} color="var(--accent-primary)" />
              <span>AI Provider & Model Routing</span>
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Manage active inference providers, model selection, and sampling temperature.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Primary Provider
                </label>
                <select
                  value={aiRoutingForm.primary_provider}
                  onChange={(e) => setAiRoutingForm({ ...aiRoutingForm, primary_provider: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                >
                  <option value="groq">Groq (LPU Ultra-Fast Inference)</option>
                  <option value="openrouter">OpenRouter (Multi-Model Unified Gateway)</option>
                  <option value="deepseek">DeepSeek Direct API</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Active Model Name
                </label>
                <input
                  type="text"
                  value={aiRoutingForm.active_model}
                  onChange={(e) => setAiRoutingForm({ ...aiRoutingForm, active_model: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12.5,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Inference Temperature ({aiRoutingForm.temperature})
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={aiRoutingForm.temperature}
                  onChange={(e) => setAiRoutingForm({ ...aiRoutingForm, temperature: parseFloat(e.target.value) })}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
            </div>
          </div>

          {/* Operational Feature Toggles */}
          <div className="surface-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={16} color="#06b6d4" />
              <span>Platform Feature Switches</span>
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Live runtime feature flags with zero downtime deployment.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                {
                  key: 'allow_guest_trials',
                  label: 'Allow Unauthenticated Guest Screenings (/try)',
                  desc: 'When enabled, allows anonymous visitors to screen 1 NIT document per day.',
                },
                {
                  key: 'brevo_live_email',
                  label: 'Brevo Transactional Email Live Dispatch',
                  desc: 'When enabled, sends real transactional emails (OTP, welcome, low credit) via Brevo API.',
                },
                {
                  key: 'strict_gstin_check',
                  label: 'Strict Indian GSTIN Format Verification',
                  desc: 'Enforces checksum validation on 15-character GSTINs in Company Vault.',
                },
                {
                  key: 'maintenance_mode',
                  label: 'Global Maintenance Mode (Lock Platform)',
                  desc: 'Blocks new tender runs and displays maintenance banner to non-admin users.',
                  danger: true,
                },
              ].map((flag) => (
                <div
                  key={flag.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 10,
                    border: flag.danger ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: flag.danger ? '#ef4444' : 'var(--text-primary)' }}>
                      {flag.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{flag.desc}</div>
                  </div>
                  <label className="switch" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(governanceForm[flag.key])}
                      onChange={(e) => setGovernanceForm({ ...governanceForm, [flag.key]: e.target.checked })}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                onClick={handleSaveGovernance}
                disabled={settingsSaving}
                className="btn btn-primary"
                style={{ minWidth: 160 }}
              >
                {settingsSaving ? 'Updating...' : 'Update Governance Controls'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: AUDIT TRAIL & LOGS ───────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sub-Tabs & Filter */}
          <div
            className="surface-card"
            style={{
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setLogSubTab('audit')}
                className={`btn ${logSubTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                Platform Audit Trail
              </button>
              <button
                onClick={() => setLogSubTab('email')}
                className={`btn ${logSubTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                Brevo Email Logs
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', maxWidth: 380 }}>
              <Search size={14} color="var(--text-tertiary)" />
              <input
                type="text"
                placeholder="Search actions, emails, or IP..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchLogs();
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 12.5,
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
            {logSubTab === 'audit' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp (UTC)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Action</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Actor</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>IP Address</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Event Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={16} className="spin" style={{ margin: '0 auto 6px' }} />
                        <div>Loading audit entries...</div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No audit events recorded.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {log.action}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {log.user_email || log.user_id?.slice(0, 8) || 'System / Anonymous'}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                          {log.ip_address || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                          {log.details_jsonb ? JSON.stringify(log.details_jsonb).slice(0, 80) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Timestamp</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Recipient</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Template / Subject</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 14px', fontWeight: 600 }}>Message ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={16} className="spin" style={{ margin: '0 auto 6px' }} />
                        <div>Loading email delivery records...</div>
                      </td>
                    </tr>
                  ) : emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No email delivery records found.
                      </td>
                    </tr>
                  ) : (
                    emailLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.recipient_email}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {log.subject || log.template_name || 'Transactional Alert'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 10.5,
                              fontWeight: 700,
                              background: log.status === 'sent' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: log.status === 'sent' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {log.brevo_message_id || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: GRANT / DEDUCT CREDITS ─────────────────────────────────── */}
      {creditModalTenant && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="surface-card animate-in"
            style={{ maxWidth: 440, width: '100%', padding: 26, position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>Adjust Contractor Credits</h3>
              </div>
              <button
                onClick={() => setCreditModalTenant(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Organization: <strong>{creditModalTenant.name}</strong>
              <br />
              Current Balance: <strong>{creditModalTenant.credit_balance} Credits</strong>
            </p>

            <form onSubmit={handleGrantCredits} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Credit Delta (Positive to add, Negative to deduct) *
                </label>
                <input
                  type="number"
                  value={creditDelta}
                  onChange={(e) => setCreditDelta(parseInt(e.target.value, 10) || 0)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: creditDelta >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Operational Reason (Audited) *
                </label>
                <textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  required
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontSize: 12.5,
                    color: 'var(--text-primary)',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setCreditModalTenant(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creditSubmitting || creditDelta === 0}
                  className="btn btn-primary"
                  style={{ minWidth: 120 }}
                >
                  {creditSubmitting ? 'Applying...' : 'Apply Delta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TENANT DOSSIER INSPECTOR ───────────────────────────────── */}
      {selectedTenantDossier && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="surface-card animate-in"
            style={{
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Contractor Dossier: {selectedTenantDossier.tenant?.name}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  UUID: {selectedTenantDossier.tenant?.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedTenantDossier(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profile & Wallet summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 10,
                  padding: 14,
                  background: 'var(--bg-elevated)',
                  borderRadius: 10,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Plan Tier</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTenantDossier.tenant?.plan_tier}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Credit Balance</div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {selectedTenantDossier.tenant?.credit_balance} Cr
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Status</div>
                  <div style={{ fontWeight: 700, color: selectedTenantDossier.tenant?.is_active ? '#10b981' : '#ef4444' }}>
                    {selectedTenantDossier.tenant?.is_active ? 'Active' : 'Suspended'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Created</div>
                  <div style={{ fontWeight: 600 }}>{new Date(selectedTenantDossier.tenant?.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Company Vault Facts */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={14} color="#06b6d4" />
                  <span>Company Vault Facts ({selectedTenantDossier.vault_facts?.length || 0})</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11.5 }}>
                  {(selectedTenantDossier.vault_facts || []).map((fact) => (
                    <div key={fact.id} style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{fact.fact_key}: </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fact.raw_value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tenders list */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="var(--accent-primary)" />
                  <span>Analyzed Tenders ({selectedTenantDossier.tenders?.length || 0})</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(selectedTenantDossier.tenders || []).map((tender) => (
                    <div
                      key={tender.id}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tender.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tender.authority || 'Tender Authority'}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--bg-surface)', fontSize: 11, fontWeight: 600 }}>
                        {tender.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Credit Ledger Runs */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={14} color="#10b981" />
                  <span>Recent Credit Runs & Purchases ({selectedTenantDossier.credit_ledger?.length || 0})</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {(selectedTenantDossier.credit_ledger || []).map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 11.5,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span>{entry.operation_type}</span>
                      <span style={{ color: entry.credits_delta >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {entry.credits_delta >= 0 ? `+${entry.credits_delta}` : entry.credits_delta} Cr
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;

