import { BOQ_ITEMS } from '../data/mockData';

export function BOQ() {
  const total = '₹48.60 Cr';
  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Bill of Quantities</h1>
          <p className="page-subtitle">MJP Municipal Water Pipeline Phase-II · {BOQ_ITEMS.length} line items</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary">Export BOQ</button>
          <button className="btn btn-secondary">Download XLSX</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Items', value: BOQ_ITEMS.length.toString() },
          { label: 'Estimated Value', value: total },
          { label: 'Pipeline Works', value: '₹31.2 Cr' },
          { label: 'Civil & Other', value: '₹17.4 Cr' },
        ].map((s, i) => (
          <div key={i} className="card card-sm" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="data-table boq-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Item / Description</th>
              <th>Unit</th>
              <th style={{ textAlign: 'right' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Est. Rate</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {BOQ_ITEMS.map((item, i) => (
              <tr key={item.id}>
                <td style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>{item.id}</td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.item}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{item.description}</div>
                </td>
                <td style={{ fontSize: 13 }}>{item.unit}</td>
                <td style={{ fontSize: 13, textAlign: 'right', fontWeight: 500 }}>{item.qty.toLocaleString()}</td>
                <td style={{ fontSize: 13, textAlign: 'right' }}>{item.rate}</td>
                <td style={{ fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{item.amount}</td>
                <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{item.remarks}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--color-navy)', color: 'white' }}>
              <td colSpan={5} style={{ padding: '12px 20px', fontWeight: 700, fontSize: 14 }}>Total Estimated Value</td>
              <td style={{ padding: '12px 20px', fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{total}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
