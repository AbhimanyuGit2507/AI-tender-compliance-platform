import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, ChevronRight, Calendar, Building2, RefreshCw } from 'lucide-react';
import api from '../services/api';

const DEFAULT_TENDERS = [
  { id: 'mjp-water-pipeline', emoji: '🏗️', name: 'Municipal Water Pipeline Phase-II', authority: 'Maharashtra Jeevan Pradhikaran', value: '₹48.60 Cr', deadline: '15 Nov 2026', readiness: 74, status: 'Needs Attention', route: '/app' },
  { id: 'srep', emoji: '☀️', name: 'Solar Rooftop EPC Package', authority: 'IREC', value: '₹12.30 Cr', deadline: '02 Dec 2026', readiness: 91, status: 'Ready', route: '/app' },
  { id: 'hfm', emoji: '🏥', name: 'Super Specialty Hospital Block', authority: 'Central PWD', value: '₹74.20 Cr', deadline: '10 Dec 2026', readiness: 65, status: 'Needs Review', route: '/app' },
  { id: 'wtp', emoji: '💧', name: 'Water Treatment Plant Upgrade', authority: 'MIDC', value: '₹22.00 Cr', deadline: '29 Nov 2026', readiness: 55, status: 'Active', route: '/app' },
  { id: 'nhai', emoji: '🛣️', name: '4-Lane Highway Bypass & Flyovers', authority: 'NHAI', value: '₹112.50 Cr', deadline: '28 Dec 2026', readiness: 82, status: 'Ready', route: '/app' },
];

const FILTERS = ['All', 'Active', 'Ready', 'Needs Attention', 'Needs Review'];

const STATUS_CONFIG = {
  'Needs Attention': { bg: 'var(--color-critical-subtle)', color: 'var(--color-critical)' },
  'Ready':           { bg: 'var(--color-success-subtle)', color: 'var(--color-success)' },
  'Needs Review':    { bg: 'var(--color-warning-subtle)', color: 'var(--color-warning)' },
  'Active':          { bg: 'var(--color-blue-subtle)', color: 'var(--color-blue)' },
};

function Ring({ score, size = 44 }) {
  const r = (size / 2) - 4.5;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-critical)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="3.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}

export function MyTenders({ showToast }) {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState(DEFAULT_TENDERS);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTenders() {
      try {
        setLoading(true);
        const res = await api.listTenders();
        if (res && res.length > 0) {
          const mapped = res.map(t => ({
            id: t.id,
            emoji: '📄',
            name: t.title,
            authority: t.authority || 'Tender Authority',
            value: t.estimated_value_inr ? `₹${(t.estimated_value_inr / 10000000).toFixed(2)} Cr` : '₹48.60 Cr',
            deadline: t.closing_at ? new Date(t.closing_at).toLocaleDateString() : 'Active',
            readiness: t.readiness_score || 74,
            status: t.status === 'completed' || t.status === 'analysed' ? 'Ready' : 'Active',
            route: '/app',
          }));
          setTenders([...mapped, ...DEFAULT_TENDERS]);
        }
      } catch (err) {
        console.warn('Using local tenders library:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTenders();
  }, []);

  const filtered = tenders.filter(t => {
    const matchFilter = filter === 'All' || t.status === filter;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.authority.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="page-content" style={{ maxWidth: 1050, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 3 }}>Processed Tenders Library</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>View, search and resume active tender analyses and submission packages.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app')}>
          <Upload size={13} /> Upload Tender
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search tenders or authorities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Tenders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>Readiness</th>
              <th>Tender Name / Scope</th>
              <th>Authority</th>
              <th>Est. Value</th>
              <th>Deadline</th>
              <th>Status</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr
                key={t.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(t.route || '/app')}
              >
                <td>
                  <Ring score={t.readiness} />
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    ID: {t.id}
                  </div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {t.authority}
                </td>
                <td style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {t.value}
                </td>
                <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {t.deadline}
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: STATUS_CONFIG[t.status]?.bg || 'var(--color-surface-2)',
                      color: STATUS_CONFIG[t.status]?.color || 'var(--color-text-primary)',
                      fontSize: 11,
                    }}
                  >
                    {t.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <ChevronRight size={16} color="var(--color-text-tertiary)" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyTenders;
