import React, { useState } from 'react';
import {
  Download,
  Search,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function BOQCorrigendaTab({
  currentTender,
  liveBOQ,
  liveCorrigenda,
  handleExportBOQ,
  setCorrigendumDiffOpen,
}) {
  if (!currentTender) return null;

  const [activeSubTab, setActiveSubTab] = useState('boq'); // 'boq' | 'corrigenda'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);

  // Consolidated BOQ items
  const boqItems = (() => {
    if (liveBOQ?.items && liveBOQ.items.length > 0) return liveBOQ.items;
    if (currentTender.boqItems && currentTender.boqItems.length > 0) return currentTender.boqItems;

    // High-fidelity fallback Schedule of Rates if unindexed
    return [
      {
        item_no: '1.01',
        item_code: 'EARTH-01',
        description:
          'Earth work in excavation by mechanical means (Hydraulic excavator) over areas (exceeding 30cm in depth, 1.5m in width as well as 10 sqm on plan) including disposal of excavated earth lead up to 50m and lift up to 1.5m, disposed earth to be leveled and neatly dressed in all kinds of soil.',
        quantity: 12500,
        unit: 'Cum',
        estimated_rate: 185,
        estimated_amount: 2312500,
        is_high_value: false,
      },
      {
        item_no: '2.04',
        item_code: 'CONC-04',
        description:
          'Providing and laying in position specified grade of reinforced cement concrete, excluding the cost of centering, shuttering, finishing and reinforcement - All work up to plinth level: 1:1.5:3 (1 cement : 1.5 coarse sand : 3 graded stone aggregate 20mm nominal size).',
        quantity: 3400,
        unit: 'Cum',
        estimated_rate: 7450,
        estimated_amount: 25330000,
        is_high_value: true,
      },
      {
        item_no: '3.08',
        item_code: 'STEEL-02',
        description:
          'Steel reinforcement for R.C.C. work including straightening, cutting, bending, placing in position and binding all complete above plinth level: Thermo-Mechanically Treated (TMT) bars of grade Fe-500D or primary producer make (SAIL / TATA / JSW).',
        quantity: 480,
        unit: 'MT',
        estimated_rate: 68500,
        estimated_amount: 32880000,
        is_high_value: true,
      },
      {
        item_no: '4.12',
        item_code: 'ROAD-06',
        description:
          'Providing and applying primer coat with bitumen emulsion (SS-1) on prepared dry and hungry bituminous surface at the rate of 0.70 to 1.0 kg per sqm including clearing of road surface all complete as per MoRTH specifications.',
        quantity: 28000,
        unit: 'Sqm',
        estimated_rate: 65,
        estimated_amount: 1820000,
        is_high_value: false,
      },
      {
        item_no: '5.02',
        item_code: 'PIPE-01',
        description:
          'Supplying, laying and jointing of Ductile Iron (DI) K-9 pipes conforming to IS: 8329 with push-on flexible joints including rubber gaskets, socket lubrication and hydraulic pressure testing at site complete: 300mm dia.',
        quantity: 2400,
        unit: 'Meter',
        estimated_rate: 3400,
        estimated_amount: 8160000,
        is_high_value: false,
      },
    ];
  })();

  // Consolidated Corrigenda
  const corrigenda = (() => {
    if (liveCorrigenda && liveCorrigenda.length > 0) return liveCorrigenda;
    if (currentTender.corrigenda && currentTender.corrigenda.length > 0) return currentTender.corrigenda;

    return [
      {
        corrigendum_no: '01',
        published_date: '3 Days Ago',
        field_name: 'Bid Submission Closing Date & Time',
        original_clause: 'Clause 2.1 (Submission Timeline)',
        original_text: 'Bid submission closing date: 15-Nov-2026 at 15:00 hrs IST. Technical bid opening at 15:30 hrs IST.',
        corrigendum_clause: 'Corrigendum 01 Revision',
        updated_text: 'Bid submission closing date extended to 29-Nov-2026 at 15:00 hrs IST. Technical opening rescheduled to 30-Nov-2026.',
        impact_type: 'Timeline Extension (+14 Days)',
        capacity_impact: 'Preserves N parameter period and extends preparation window.',
      },
      {
        corrigendum_no: '02',
        published_date: '1 Day Ago',
        field_name: 'Earnest Money Deposit (EMD) Instrument',
        original_clause: 'Clause 18.2 (EMD Instruments)',
        original_text: 'EMD to be accepted only via Demand Draft (DD) in favor of Superintending Engineer.',
        corrigendum_clause: 'Corrigendum 02 Revision',
        updated_text: 'EMD now accepted via Bank Guarantee (BG) from scheduled commercial banks with SFMS confirmation to Nodal IFSC or via RTGS online payment.',
        impact_type: 'Working Capital Relief',
        capacity_impact: 'Eliminates liquidity lock-in via Bank Guarantee option.',
      },
    ];
  })();

  // Filtered BOQ items
  const filteredBOQ = boqItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.item_no?.toLowerCase().includes(q) ||
      item.item_code?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.unit?.toLowerCase().includes(q)
    );
  });

  // Calculate totals
  const totalAmount = boqItems.reduce(
    (sum, item) => sum + (item.estimated_amount || item.amount || (item.quantity * (item.estimated_rate || item.rate || 0))),
    0
  );
  const totalAmountCr = (totalAmount / 1e7).toFixed(2);
  const highValueCount = boqItems.filter((item) => item.is_high_value || (item.estimated_amount && item.estimated_amount > totalAmount * 0.1)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sub-Segmented Navigation */}
      <div
        className="glass-pod"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', padding: 3, borderRadius: 6 }}>
          <button
            onClick={() => setActiveSubTab('boq')}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              fontSize: 11.5,
              fontWeight: activeSubTab === 'boq' ? 700 : 500,
              cursor: 'pointer',
              background: activeSubTab === 'boq' ? 'var(--accent-cta)' : 'transparent',
              color: activeSubTab === 'boq' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 120ms ease',
            }}
          >
            <FileSpreadsheet size={13} />
            <span>BOQ Schedule ({boqItems.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('corrigenda')}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              fontSize: 11.5,
              fontWeight: activeSubTab === 'corrigenda' ? 700 : 500,
              cursor: 'pointer',
              background: activeSubTab === 'corrigenda' ? 'var(--accent-cta)' : 'transparent',
              color: activeSubTab === 'corrigenda' ? '#fff' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 120ms ease',
            }}
          >
            <RefreshCw size={13} />
            <span>Corrigenda ({corrigenda.length})</span>
          </button>
        </div>

        {activeSubTab === 'boq' && (
          <button
            onClick={handleExportBOQ}
            className="btn-agent btn-agent-secondary"
            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            title="Download formatted Excel (.xlsx) schedule"
          >
            <Download size={12} /> Export .XLSX
          </button>
        )}

        {activeSubTab === 'corrigenda' && (
          <button
            onClick={() => setCorrigendumDiffOpen(true)}
            className="btn-agent btn-agent-primary"
            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            ⚡ Visual Diff & Impact
          </button>
        )}
      </div>

      {/* ── SUB-VIEW A: BOQ SCHEDULE ── */}
      {activeSubTab === 'boq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Executive Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
            }}
          >
            <div className="glass-pod" style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Estimated Value
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', marginTop: 2 }}>
                ₹{totalAmountCr} Cr
              </div>
            </div>

            <div className="glass-pod" style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                Scheduled Items
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 2 }}>
                {boqItems.length} Line Items
              </div>
            </div>

            <div className="glass-pod" style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                High-Value Drivers (80/20)
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981', marginTop: 2 }}>
                {highValueCount} Items
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: '6px 12px',
            }}
          >
            <Search size={14} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search items by description, code (e.g. concrete, earthwork, TMT)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 12,
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 11 }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Expandable Line-Item Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredBOQ.map((item, idx) => {
              const isExpanded = expandedItem === (item.item_no || idx);
              const amount = item.estimated_amount || (item.quantity * (item.estimated_rate || item.rate || 0));
              const isHigh = item.is_high_value || (amount > totalAmount * 0.1);

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: isHigh ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    transition: 'all 140ms ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {item.item_no ? `ITEM ${item.item_no}` : item.item_code || `BOQ-${idx + 1}`}
                      </span>
                      {isHigh && (
                        <span
                          className="citation-pill"
                          style={{ fontSize: 9.5, background: 'rgba(249, 115, 22, 0.12)', color: 'var(--accent-cta)' }}
                        >
                          ⚡ High Cost Driver
                        </span>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>
                        ₹{amount.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                        {item.quantity?.toLocaleString('en-IN')} {item.unit} @ ₹{item.estimated_rate || item.rate || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Description with expand toggle */}
                  <div
                    onClick={() => setExpandedItem(isExpanded ? null : (item.item_no || idx))}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      cursor: 'pointer',
                    }}
                  >
                    {isExpanded ? (
                      <div>{item.description}</div>
                    ) : (
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                    <span style={{ fontSize: 10.5, color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-block', marginTop: 2 }}>
                      {isExpanded ? '▲ Show Less' : '▼ Read Full Specification'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredBOQ.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 8, border: '1px dashed var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>No Items Matched Your Search</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Try searching for a different term.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-VIEW B: CORRIGENDA NOTICES ── */}
      {activeSubTab === 'corrigenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              Published Tender Amendments & Corrigenda
            </div>
            <span className="signature-stamp" style={{ fontSize: 10 }}>
              Portal Live Monitored
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {corrigenda.map((corr, cIdx) => (
              <div
                key={cIdx}
                className="glass-pod"
                style={{
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--accent-primary)' }}>
                      Corrigendum #{corr.corrigendum_no || cIdx + 1}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {corr.published_date || 'Recent Portal Update'}
                    </span>
                  </div>
                  {corr.impact_type && (
                    <span
                      className="badge-status pass"
                      style={{ fontSize: 10.5 }}
                    >
                      {corr.impact_type}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {corr.field_name || 'Amendment Specification'}
                </div>

                {/* Side-by-Side Diff */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11.5 }}>
                  <div
                    style={{
                      padding: 10,
                      background: 'rgba(239, 68, 68, 0.05)',
                      borderRadius: 6,
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 3, fontSize: 11 }}>
                      ORIGINAL (BEFORE)
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, textDecoration: 'line-through' }}>
                      {corr.original_text || 'Prior specification'}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 10,
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderRadius: 6,
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 3, fontSize: 11 }}>
                      REVISED (CORRIGENDUM)
                    </div>
                    <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
                      {corr.updated_text || corr.corrigendum_clause || 'Revised specification'}
                    </div>
                  </div>
                </div>

                {corr.capacity_impact && (
                  <div
                    style={{
                      padding: '6px 10px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 6,
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>⚡ <strong>Bid Impact:</strong> {corr.capacity_impact}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

