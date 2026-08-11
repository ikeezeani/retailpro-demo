import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const STATUS_BADGE = {
  completed: 'badge-green',
  partially_refunded: 'badge-amber',
  refunded: 'badge-muted',
  void: 'badge-red',
};

export default function SalesHistory() {
  const { formatMoney, user } = useApp();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [sales, setSales] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [refundQtys, setRefundQtys] = useState({}); // sale_item_id -> qty
  const [refundReason, setRefundReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => client.get('/sales').then(({ data }) => setSales(data));
  useEffect(() => { load(); }, []);

  const view = async (s) => {
    const { data } = await client.get(`/sales/${s.id}`);
    setViewing(data);
    setRefundQtys({});
    setRefundReason('');
    setVoiding(false);
    setVoidReason('');
    setError('');
  };

  const remaining = (it) => Number(it.sold_qty ?? it.qty) - Number(it.refunded_qty || 0);

  const submitRefund = async () => {
    setError('');
    const items = Object.entries(refundQtys)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([sale_item_id, qty]) => ({ sale_item_id: Number(sale_item_id), qty: Number(qty) }));
    if (!items.length) return setError('Enter a quantity to refund for at least one item');
    setBusy(true);
    try {
      const { data } = await client.post(`/sales/${viewing.id}/refund`, { items, reason: refundReason });
      setViewing(data.sale);
      setRefundQtys({});
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Refund failed');
    } finally { setBusy(false); }
  };

  const submitVoid = async () => {
    setError('');
    if (!voidReason.trim()) return setError('A reason is required to void a sale');
    if (!confirm('Void this entire sale? This fully reverses the stock and accounting impact and cannot be undone.')) return;
    setBusy(true);
    try {
      const { data } = await client.post(`/sales/${viewing.id}/void`, { reason: voidReason });
      setViewing(data.sale);
      setVoiding(false);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Void failed');
    } finally { setBusy(false); }
  };

  const canReturn = viewing && viewing.status !== 'refunded' && viewing.status !== 'void';

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
                <td><span className={`badge ${STATUS_BADGE[s.status] || 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>{s.status.replace('_', ' ')}</span></td>
                <td><button className="btn" style={{ padding: '6px 10px' }} onClick={() => view(s)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <Modal title={`Invoice ${viewing.invoice_no}`} onClose={() => setViewing(null)}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</div>}

          <div style={{ marginBottom: 10 }}>
            <span className={`badge ${STATUS_BADGE[viewing.status] || 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>{viewing.status.replace('_', ' ')}</span>
            {Number(viewing.refunded_total) > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12.5, color: 'var(--text-muted)' }}>
                {formatMoney(viewing.refunded_total)} refunded so far
              </span>
            )}
          </div>

          {viewing.SaleItems?.map(it => {
            const remainingQty = remaining(it);
            return (
              <div key={it.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{it.sold_qty ?? it.qty} × {formatMoney(it.unit_price)}{it.mode === 'pack' ? ' (box)' : ''}</span>
                  <span className="mono">{formatMoney(it.line_total)}</span>
                </div>
                {canManage && canReturn && remainingQty > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Refund qty (max {remainingQty}):</span>
                    <input
                      className="input" type="number" min="0" max={remainingQty} step="1"
                      style={{ width: 70, padding: '5px 8px' }}
                      value={refundQtys[it.id] || ''}
                      onChange={e => setRefundQtys({ ...refundQtys, [it.id]: e.target.value })}
                    />
                  </div>
                )}
                {Number(it.refunded_qty) > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--amber)', marginTop: 4 }}>
                    {it.refunded_qty} already refunded
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: 14, fontSize: 13.5 }}>
            <Row label="Subtotal" value={formatMoney(viewing.subtotal)} />
            <Row label="Discount" value={formatMoney(viewing.discount)} />
            <Row label="Tax" value={formatMoney(viewing.tax_total)} />
            <Row label="Total" value={formatMoney(viewing.total)} bold />
          </div>

          {canManage && canReturn && !voiding && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <label className="field-label">Refund Reason</label>
              <input className="input" value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="e.g. Customer returned item" style={{ marginBottom: 10 }} />
              <button className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }} onClick={submitRefund} disabled={busy}>
                {busy ? 'Processing…' : 'Process Refund'}
              </button>
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => setVoiding(true)}>
                Void Entire Sale…
              </button>
            </div>
          )}

          {voiding && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <label className="field-label">Reason for voiding (required)</label>
              <input className="input" value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="e.g. Rung up by mistake" style={{ marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ flex: 1 }} onClick={() => setVoiding(false)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={submitVoid} disabled={busy}>
                  {busy ? 'Voiding…' : 'Confirm Void'}
                </button>
              </div>
            </div>
          )}

          <button
            className="btn"
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
