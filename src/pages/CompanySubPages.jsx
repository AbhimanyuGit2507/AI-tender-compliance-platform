import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMPANY_DOCUMENTS, PROJECTS, CERTIFICATIONS, FINANCIALS } from '../data/mockData';
import { Eye, Upload, Download, CheckCircle2, AlertTriangle, Plus, BarChart2, FileText, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function CompanyDocuments() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              margin: '0 0 6px 0',
            }}
          >
            Company Documents Vault
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
            Official statutory records, licenses, and verified compliance certificates ({COMPANY_DOCUMENTS.length} documents)
          </p>
        </div>
        <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>
          <Upload size={14} />
          <span>Upload Document</span>
        </button>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Title</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Validity</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenders Linked</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {COMPANY_DOCUMENTS.map((d, i) => (
                <tr
                  key={d.id}
                  style={{
                    borderBottom: i < COMPANY_DOCUMENTS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <FileText size={15} color="var(--accent-primary)" />
                      <span>{d.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{d.type}</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{d.expiry}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: d.status === 'Verified' ? 'var(--status-pass-bg)' : 'var(--status-warn-bg)',
                        color: d.status === 'Verified' ? 'var(--status-pass-text)' : 'var(--status-warn-text)',
                        border: `1px solid ${d.status === 'Verified' ? 'var(--status-pass-border)' : 'var(--status-warn-border)'}`,
                      }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-primary)' }}>
                    {d.usedIn > 0 ? `${d.usedIn} tenders` : '—'}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>
                        <Eye size={12} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}>
                        <Download size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompanyProjects() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              margin: '0 0 6px 0',
            }}
          >
            Past Executed Projects
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
            Verified completion certificates applied in CPWD 3/2/1 similar work eligibility ({PROJECTS.length} records)
          </p>
        </div>
        <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>
          <Plus size={14} />
          <span>Add Completed Project</span>
        </button>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Description</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tendering Client</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract Value</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Year</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sector</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: i < PROJECTS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.location}</div>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{p.client}</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-numeric)', fontWeight: 700, color: 'var(--accent-primary-light, #a5b4fc)' }}>
                    {p.value}
                  </td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-secondary)' }}>{p.year}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11.5 }}>
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompanyCertifications() {
  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              margin: '0 0 6px 0',
            }}
          >
            Accreditations & Certificates
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
            ISO standards, safety ratings, and contractor registrations ({CERTIFICATIONS.length} active credentials)
          </p>
        </div>
        <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 8 }}>
          <Upload size={14} />
          <span>Upload Certificate</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {CERTIFICATIONS.map(cert => (
          <div
            key={cert.id}
            style={{
              background: 'var(--bg-surface)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '20px 22px',
              boxShadow: 'var(--shadow-card)',
              transition: 'all 160ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  {cert.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{cert.type}</div>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: cert.status === 'Valid' || cert.status === 'Active' ? 'var(--status-pass-bg)' : 'var(--status-warn-bg)',
                  color: cert.status === 'Valid' || cert.status === 'Active' ? 'var(--status-pass-text)' : 'var(--status-warn-text)',
                  border: `1px solid ${cert.status === 'Valid' || cert.status === 'Active' ? 'var(--status-pass-border)' : 'var(--status-warn-border)'}`,
                }}
              >
                {cert.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              {[
                ['Issuing Authority', cert.issuer],
                ['Issue Date', cert.issueDate],
                ['Expiry Date', cert.expiryDate],
                ['Tenders Attached', `${cert.usedIn} submissions`],
              ].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', textAlign: 'right', maxWidth: '65%' }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 11.5 }}>
                <Eye size={12} />
                <span>View Scan</span>
              </button>
              <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 11.5 }}>
                <Download size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompanyFinancials() {
  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            color: 'var(--text-primary)',
            margin: '0 0 6px 0',
          }}
        >
          CA-Audited Financials
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
          Statutory turnover, net worth, and liquidity metrics for CPWD compound inflation calculation (Apex Infra Projects Pvt. Ltd.)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'FY2025 Audited Turnover', value: '₹7.2 Cr', trend: '+18% YoY' },
          { label: '3-Year Average Turnover', value: '₹6.03 Cr', trend: 'Qualifies up to ₹15 Cr bids' },
          { label: 'Statutory Net Worth (FY25)', value: '₹4.8 Cr', trend: 'Positive Solvency' },
          { label: 'Compound Growth Rate', value: '+50%', trend: 'Last 3 Fiscal Years' },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-surface)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: '18px 22px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>{s.label}</div>
            <div
              style={{
                fontFamily: 'var(--font-numeric)',
                fontSize: 26,
                fontWeight: 800,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent-primary-light, #a5b4fc)', marginTop: 6, fontFamily: 'var(--font-sans)' }}>
              {s.trend}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          padding: '24px 26px',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            Annual Turnover Trend (Last 5 Fiscal Years)
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-sans)' }}>
            7% CPWD Statutory Inflation Escalator applied
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={FINANCIALS} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="turnoverGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickFormatter={v => `₹${v}Cr`} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface-solid)',
                borderColor: 'var(--border-default)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
              formatter={(v) => [`₹${v} Cr`, 'Audited Turnover']}
            />
            <Area type="monotone" dataKey="turnover" stroke="#6366f1" strokeWidth={2.5} fill="url(#turnoverGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fiscal Year</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audited Turnover</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operating Revenue</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Worth</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Profit (PAT)</th>
                <th style={{ padding: '12px 18px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {FINANCIALS.slice().reverse().map((f, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < FINANCIALS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background 120ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 18px', fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>{f.year}</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-numeric)', fontWeight: 700, color: 'var(--text-primary)' }}>₹{f.turnover} Cr</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-numeric)', color: 'var(--text-secondary)' }}>₹{f.revenue} Cr</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-numeric)', color: 'var(--text-secondary)' }}>₹{f.netWorth} Cr</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'var(--font-numeric)', color: 'var(--status-pass-text)' }}>₹{f.profit} Cr</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11.5 }}>
                        <Eye size={12} />
                        <span>CA Certificate</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
