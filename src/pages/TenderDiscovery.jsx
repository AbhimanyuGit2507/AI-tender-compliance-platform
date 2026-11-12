import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  BadgeAlert,
  Wallet,
  Zap,
} from 'lucide-react';
import api from '../services/api';

const PORTALS = [
  { id: 'all', label: 'All Portals' },
  { id: 'GeM', label: 'GeM Portal' },
  { id: 'CPPP', label: 'CPPP (Central)' },
  { id: 'State PWD', label: 'State PWD' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'Water Infrastructure', label: 'Water Infrastructure' },
  { id: 'Highways & Bridges', label: 'Highways & Bridges' },
  { id: 'Building & Healthcare', label: 'Building & Healthcare' },
  { id: 'Electrical & Energy', label: 'Electrical & Energy' },
];

function formatCr(val) {
  if (!val) return '₹0 Cr';
  const cr = val / 10000000;
  return `₹${cr.toFixed(2)} Cr`;
}

function formatLakh(val) {
  if (!val) return '₹0 L';
  const lakh = val / 100000;
  return `₹${lakh.toFixed(2)} L`;
}

export function TenderDiscovery({ showToast }) {
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importingId, setImportingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortal, setSelectedPortal] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [qualifiedOnly, setQualifiedOnly] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [stats, setStats] = useState({
    totalCount: 0,
    qualifiedCount: 0,
    totalPipelineCr: 0,
  });

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await api.getDiscoveryFeed({
        q: searchQuery,
        portal: selectedPortal,
        category: selectedCategory,
        qualifiedOnly: qualifiedOnly,
      });

      const items = data.feed || [];
      setFeed(items);

      const totalVal = items.reduce((acc, curr) => acc + (curr.estimated_value_inr || 0), 0);
      setStats({
        totalCount: data.total_count || items.length,
        qualifiedCount: data.qualified_count || items.filter(t => t.qualification?.is_eligible).length,
        totalPipelineCr: totalVal / 10000000,
      });
    } catch (err) {
      console.error('Failed to load discovery feed:', err);
      if (showToast) showToast('Could not load tender feed. Check connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeed();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedPortal, selectedCategory, qualifiedOnly]);

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleImport = async (tender) => {
    setImportingId(tender.external_id);
    try {
      const res = await api.importDiscoveryTender(tender.external_id);
      if (showToast) {
        showToast(res.message || 'Tender imported into your workspace!', 'success');
      }
      if (res.redirect_url) {
        navigate(res.redirect_url);
      } else if (res.tender_id) {
        navigate(`/workspace/${res.tender_id}`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      if (showToast) showToast(err.message || 'Import failed', 'error');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="page-content" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              background: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--color-blue)',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5
            }}>
              <Sparkles size={13} />
              GeM & CPPP LIVE AGGREGATOR
            </span>
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>•</span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500 }}>
              Real-Time Pre-Qualification Math
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Tender Discovery Feed
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: '6px 0 0', maxWidth: 720 }}>
            Discover active Indian government procurement tenders automatically vetted against your Company Vault's 
            3-year audited turnover, similar project experiences (Rule 1x80/2x50/3x40), and bid capacity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/vault')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '9px 15px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              transition: 'all 0.15s ease',
            }}
          >
            <ShieldCheck size={15} color="var(--color-blue)" />
            Manage Company Vault
          </button>
          <button
            onClick={loadFeed}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '9px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Stats Banner ───────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Live Opportunities
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 4 }}>
            {stats.totalCount} Tenders
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Across GeM, CPPP & State Portals
          </div>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pre-Qualified For You
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)', marginTop: 4 }}>
            {stats.qualifiedCount} Match
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Passes 100% financial & work criteria
          </div>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pipeline Opportunity
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-blue)', marginTop: 4 }}>
            ₹{stats.totalPipelineCr.toFixed(1)} Cr
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Aggregate estimated project value
          </div>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            MSME GFR 170 Status
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-purple)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={18} />
            EMD Exempted
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            UDYAM MSE registered (100% waiver)
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Search size={17} style={{ position: 'absolute', left: 14, color: 'var(--color-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by tender title, department, keyword, or reference number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontSize: 14,
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            )}
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            border: qualifiedOnly ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
            background: qualifiedOnly ? 'var(--color-success-subtle)' : 'var(--color-bg)',
            transition: 'all 0.15s ease',
          }}>
            <input
              type="checkbox"
              checked={qualifiedOnly}
              onChange={(e) => setQualifiedOnly(e.target.checked)}
              style={{ accentColor: 'var(--color-success)' }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: qualifiedOnly ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              Only Show Pre-Qualified
            </span>
          </label>
        </div>

        {/* Portal & Category Filter Pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              Portals:
            </span>
            {PORTALS.map(portal => (
              <button
                key={portal.id}
                onClick={() => setSelectedPortal(portal.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: selectedPortal === portal.id ? '1px solid var(--color-blue)' : '1px solid var(--color-border)',
                  background: selectedPortal === portal.id ? 'var(--color-blue)' : 'var(--color-surface)',
                  color: selectedPortal === portal.id ? '#ffffff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {portal.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Feed Listing ────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                height: 180,
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                opacity: 0.6,
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <Filter size={36} color="var(--color-text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>No tenders matched your search</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '6px 0 16px' }}>
            Try broadening your search keyword or unchecking "Only Show Pre-Qualified".
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedPortal('all'); setSelectedCategory('all'); setQualifiedOnly(false); }}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-blue)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {feed.map(tender => {
            const isQualified = tender.qualification?.verdict === 'QUALIFIED';
            const isNeedsReview = tender.qualification?.verdict === 'NEEDS_REVIEW';
            const isDisqualified = tender.qualification?.verdict === 'DISQUALIFIED';
            const isExpanded = !!expandedCards[tender.external_id];
            const isImporting = importingId === tender.external_id;

            return (
              <div
                key={tender.external_id}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: isQualified
                    ? '1.5px solid var(--color-success-border)'
                    : '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Card Top Ribbon */}
                <div style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--color-border)',
                  gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        background: tender.portal === 'GeM' ? '#EEF2FF' : tender.portal === 'CPPP' ? '#FFFBEB' : '#F5F3FF',
                        color: tender.portal === 'GeM' ? '#3730A3' : tender.portal === 'CPPP' ? '#B45309' : '#6D28D9',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {tender.portal}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>•</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        {tender.reference_no}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>•</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {tender.category}
                      </span>
                      {tender.is_corrigendum_issued && (
                        <span style={{
                          background: 'var(--color-warning-subtle)',
                          color: 'var(--color-warning)',
                          padding: '2px 7px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <BadgeAlert size={12} />
                          Corrigendum Active
                        </span>
                      )}
                    </div>

                    <h3 style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      margin: '0 0 6px',
                      lineHeight: 1.35,
                    }}>
                      {tender.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Building2 size={14} color="var(--color-text-tertiary)" />
                        {tender.authority}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={14} color="var(--color-text-tertiary)" />
                        Closes in 22 days ({new Date(tender.closing_at).toLocaleDateString('en-IN')})
                      </span>
                      <span>📍 {tender.location}</span>
                    </div>
                  </div>

                  {/* Pre-Qualification Badge */}
                  <div style={{ textAlign: 'right', minWidth: 160 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 800,
                      background: isQualified
                        ? 'var(--color-success-subtle)'
                        : isNeedsReview
                        ? 'var(--color-warning-subtle)'
                        : 'var(--color-critical-subtle)',
                      color: isQualified
                        ? 'var(--color-success)'
                        : isNeedsReview
                        ? 'var(--color-warning)'
                        : 'var(--color-critical)',
                      border: `1px solid ${
                        isQualified
                          ? 'var(--color-success-border)'
                          : isNeedsReview
                          ? 'var(--color-warning-border)'
                          : 'var(--color-critical-border)'
                      }`,
                    }}>
                      {isQualified && <CheckCircle2 size={14} />}
                      {isNeedsReview && <AlertTriangle size={14} />}
                      {isDisqualified && <XCircle size={14} />}
                      {tender.qualification?.verdict}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 5, fontWeight: 600 }}>
                      Pre-Qual Match Score: {tender.qualification?.match_score}%
                    </div>
                  </div>
                </div>

                {/* Values & Fast Metrics Strip */}
                <div style={{
                  padding: '12px 20px',
                  background: 'var(--color-surface-2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                        Tender Value (INR)
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {formatCr(tender.estimated_value_inr)}
                      </div>
                    </div>

                    <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                        Earnest Money (EMD)
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {formatLakh(tender.emd_inr)}
                        {tender.qualification?.emd_check?.is_exempted && (
                          <span style={{ fontSize: 11, color: 'var(--color-purple)', fontWeight: 600, marginLeft: 6 }}>
                            (MSME 100% Exempted)
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                        Duration
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {tender.contract_period_years} Years
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={() => toggleExpand(tender.external_id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        padding: '6px 10px',
                      }}
                    >
                      {isExpanded ? 'Hide Pre-Qualification Logic' : 'View Pre-Qualification Logic'}
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      onClick={() => handleImport(tender)}
                      disabled={isImporting}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--color-blue)',
                        color: '#ffffff',
                        padding: '9px 18px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 13,
                        fontWeight: 700,
                        boxShadow: 'var(--shadow-blue)',
                        transition: 'all 0.15s ease',
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                        opacity: isImporting ? 0.7 : 1,
                      }}
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={14} className="spin" />
                          Importing into Workspace...
                        </>
                      ) : (
                        <>
                          1-Click Analyze in Workspace
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Pre-Qualification Breakdown Drawer */}
                {isExpanded && (
                  <div style={{
                    padding: '16px 20px',
                    background: '#FAFCFF',
                    borderTop: '1px solid var(--color-border)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>
                      Verified Company Vault Eligibility Criteria:
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 12,
                    }}>
                      {/* 1. Turnover */}
                      <div style={{
                        background: 'var(--color-surface)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            1. Annual Turnover Check (3-Yr Avg)
                          </span>
                          {tender.qualification?.turnover_check?.is_qualified ? (
                            <span style={{ color: 'var(--color-success)', fontSize: 11, fontWeight: 700 }}>PASS</span>
                          ) : (
                            <span style={{ color: 'var(--color-critical)', fontSize: 11, fontWeight: 700 }}>FAIL</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          Company 3-Yr Avg: <strong>{formatCr(tender.qualification?.turnover_check?.company_turnover_inr)}</strong> vs Required: <strong>{formatCr(tender.qualification?.turnover_check?.required_turnover_inr)}</strong>
                        </div>
                      </div>

                      {/* 2. Similar Work */}
                      <div style={{
                        background: 'var(--color-surface)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            2. Past Project Experience Match
                          </span>
                          {tender.qualification?.similar_work_check?.is_qualified ? (
                            <span style={{ color: 'var(--color-success)', fontSize: 11, fontWeight: 700 }}>PASS ({tender.qualification?.similar_work_check?.matched_rule})</span>
                          ) : (
                            <span style={{ color: 'var(--color-warning)', fontSize: 11, fontWeight: 700 }}>NEEDS REVIEW</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          Top Completed Project in Vault: <strong>{formatCr(tender.qualification?.similar_work_check?.largest_project_inr)}</strong> (inflated at 7% p.a.)
                        </div>
                      </div>

                      {/* 3. Bid Capacity */}
                      <div style={{
                        background: 'var(--color-surface)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            3. Maximum Available Bidding Capacity
                          </span>
                          {tender.qualification?.bid_capacity_check?.is_qualified ? (
                            <span style={{ color: 'var(--color-success)', fontSize: 11, fontWeight: 700 }}>PASS</span>
                          ) : (
                            <span style={{ color: 'var(--color-critical)', fontSize: 11, fontWeight: 700 }}>INSUFFICIENT</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          Available: <strong>{formatCr(tender.qualification?.bid_capacity_check?.available_capacity_inr)}</strong> vs Estimated Value: <strong>{formatCr(tender.qualification?.bid_capacity_check?.required_capacity_inr)}</strong>
                        </div>
                      </div>

                      {/* 4. EMD Exemption */}
                      <div style={{
                        background: 'var(--color-surface)',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            4. GFR Rule 170 MSE / Startup EMD Exemption
                          </span>
                          <span style={{ color: 'var(--color-purple)', fontSize: 11, fontWeight: 700 }}>EXEMPTED</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          {tender.qualification?.emd_check?.clause_note} (Bid Security Declaration will be auto-generated).
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TenderDiscovery;
