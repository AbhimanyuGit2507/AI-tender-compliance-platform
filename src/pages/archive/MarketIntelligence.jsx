import { MARKET_TENDERS } from '../data/mockData';
import { TrendingUp, Info } from 'lucide-react';

export function MarketIntelligence() {
  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Market Intelligence</h1>
        <p className="page-subtitle">Research connected to the tender you're preparing. Data sourced from available public records.</p>
      </div>

      <div style={{ padding: '10px 16px', background: 'var(--color-blue-subtle)', border: '1px solid #DBEAFE', borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-blue)' }}>
        <Info size={14} />
        <span><strong>Data disclaimer:</strong> Information shown is observed in available public records and should be independently verified before use in bidding decisions.</span>
      </div>

      {/* Summary cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Similar Tenders Analyzed', value: '12', sub: 'Water pipeline, Maharashtra' },
          { label: 'Common Technical Requirements', value: '8', sub: 'Across similar tenders' },
          { label: 'Observed Bid Participation', value: '4–7', sub: 'Bidders per similar tender' },
          { label: 'Historical Award Range', value: '94–98%', sub: 'Of estimated value' },
        ].map((s, i) => (
          <div key={i} className="card card-sm" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Similar Tenders</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Tender</th><th>Authority</th><th>Value</th><th>Date</th><th>Outcome</th></tr>
              </thead>
              <tbody>
                {MARKET_TENDERS.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.authority}</td>
                    <td style={{ fontSize: 13 }}>{t.value}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.date}</td>
                    <td style={{ fontSize: 12 }}><span className={`badge ${t.outcome.includes('Under') ? 'badge-warning' : 'badge-teal'}`}>{t.outcome}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: 16 }}>Authority Insights</h2>
            <div className="card">
              {[
                ['Procurement authority', 'Maharashtra Jeevan Pradhikaran (MJP)'],
                ['Tender type', 'EPC / Works — Open competitive bidding'],
                ['Observed payment terms', 'Monthly progress payments (RA bills)'],
                ['Observed retention', '5% — Released after DLP'],
                ['Previous MJP tenders', '3 similar in last 24 months'],
              ].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--color-border)' : 'none', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 500, maxWidth: '55%', textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="section-title" style={{ marginBottom: 16 }}>Common Technical Requirements</h2>
            <div className="card" style={{ padding: 0 }}>
              {['IS:4984 compliant HDPE pipes', 'Hydrostatic pressure testing (IS:3114)', 'GPS as-built drawings', 'NABL lab material testing', 'OEM authorization', 'ISO 9001 quality certification', 'Warranty period 12 months minimum', 'Third-party inspection'].map((r, i, arr) => (
                <div key={i} style={{ padding: '9px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={12} style={{ color: 'var(--color-teal)', flexShrink: 0 }} />
                  {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
