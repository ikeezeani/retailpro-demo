import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

export default function SalesHistory() {
  const { formatMoney } = useApp();
  const [sales, setSales] = useState([]);
  const [viewing, setViewing] = useState(null);

  useEffect(() => { client.get('/sales').then(({ data }) => setSales(data)); }, []);

  const view = async (s) => {
    const { data } = await client.get(`/sales/${s.id}`);
    setViewing(data);
  };

  return (
    <div>
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id}>
                <td className="mono">{s.invoice_no}</td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.Customer?.name || 'Walk-in'}</td>
                <td style={{ textTransform: 'capitalize' }}>{s.payment_method.replace('_', ' ')}</td>
                <td className="mono">{formatMoney(s.total)}</td>
                <td><span className="badge badge-green">{s.status}</span></td>
                <td><button className="btn" style={{ padding: '6px 10px' }} onClick={() => view(s)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <Modal title={`Invoice ${viewing.invoice_no}`} onClose={() => setViewing(null)}>
          {viewing.SaleItems?.map(it => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
              <span>{it.qty} × {formatMoney(it.unit_price)}</span>
              <span className="mono">{formatMoney(it.line_total)}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 13.5 }}>
            <Row label="Subtotal" value={formatMoney(viewing.subtotal)} />
            <Row label="Discount" value={formatMoney(viewing.discount)} />
            <Row label="Tax" value={formatMoney(viewing.tax_total)} />
            <Row label="Total" value={formatMoney(viewing.total)} bold />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16 }}
            onClick={() => window.open(`/receipt/${viewing.id}`, '_blank', 'width=420,height=700')}
          >
            🖨️ Print Receipt
          </button>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: bold ? 700 : 400 }}>
      <span style={{ color: bold ? undefined : 'var(--text-muted)' }}>{label}</span><span className="mono">{value}</span>
    </div>
  );
}
