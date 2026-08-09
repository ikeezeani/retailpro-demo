import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

export default function Purchasing() {
  const { formatMoney } = useApp();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [lines, setLines] = useState([{ product_id: '', qty: 1, unit_cost: 0, tax_rate: 0 }]);
  const [error, setError] = useState('');

  const load = () => client.get('/purchases').then(({ data }) => setPurchases(data));
  useEffect(() => {
    load();
    client.get('/suppliers').then(({ data }) => setSuppliers(data));
    client.get('/products').then(({ data }) => setProducts(data));
  }, []);

  const addLine = () => setLines([...lines, { product_id: '', qty: 1, unit_cost: 0, tax_rate: 0 }]);
  const updateLine = (i, field, val) => {
    const copy = [...lines];
    copy[i][field] = val;
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(val));
      if (prod) copy[i].unit_cost = prod.cost_price;
    }
    setLines(copy);
  };
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => {
    const gross = Number(l.unit_cost) * Number(l.qty || 0);
    return s + gross + (gross * Number(l.tax_rate || 0)) / 100;
  }, 0);

  const submit = async () => {
    setError('');
    const items = lines.filter(l => l.product_id).map(l => ({ ...l, product_id: Number(l.product_id) }));
    if (!items.length) return setError('Add at least one line item');
    try {
      await client.post('/purchases', { supplier_id: supplierId || null, items, payment_method: paymentMethod, status: 'ordered' });
      setCreating(false);
      setLines([{ product_id: '', qty: 1, unit_cost: 0, tax_rate: 0 }]);
      setSupplierId('');
      load();
    } catch (e) { setError(e.response?.data?.error || 'Failed to create order'); }
  };

  const receive = async (po) => {
    if (!confirm(`Receive goods for ${po.po_no}? This will increase stock and post accounting entries.`)) return;
    try {
      await client.post(`/purchases/${po.id}/receive`);
      load();
    } catch (e) { alert(e.response?.data?.error || 'Failed to receive'); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New Purchase Order</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>PO #</th><th>Supplier</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {purchases.map(po => (
              <tr key={po.id}>
                <td className="mono">{po.po_no}</td>
                <td>{po.Supplier?.name || '—'}</td>
                <td className="mono">{formatMoney(po.total)}</td>
                <td style={{ textTransform: 'capitalize' }}>{po.payment_method.replace('_', ' ')}</td>
                <td><span className={`badge ${po.status === 'received' ? 'badge-green' : po.status === 'cancelled' ? 'badge-red' : 'badge-amber'}`}>{po.status}</span></td>
                <td>
                  {po.status === 'ordered' && <button className="btn btn-primary" style={{ padding: '6px 10px' }} onClick={() => receive(po)}>Receive Goods</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title="New Purchase Order" onClose={() => setCreating(false)}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div className="form-grid">
            <div>
              <label className="field-label">Supplier</label>
              <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Payment Method</label>
              <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="credit">On Credit</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
          </div>

          <label className="field-label">Line Items</label>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.9fr 0.7fr auto', gap: 8, marginBottom: 8 }}>
              <select className="input" value={l.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)}>
                <option value="">Product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className="input" type="number" placeholder="Qty" value={l.qty} onChange={e => updateLine(i, 'qty', e.target.value)} />
              <input className="input" type="number" step="0.01" placeholder="Unit Cost" value={l.unit_cost} onChange={e => updateLine(i, 'unit_cost', e.target.value)} />
              <input className="input" type="number" step="0.01" placeholder="Tax %" value={l.tax_rate} onChange={e => updateLine(i, 'tax_rate', e.target.value)} />
              <button className="btn btn-danger" onClick={() => removeLine(i)}>×</button>
            </div>
          ))}
          <button className="btn" onClick={addLine} style={{ marginBottom: 14 }}>+ Add Line</button>

          <div style={{ textAlign: 'right', fontWeight: 700, marginBottom: 14 }}>Total: <span className="mono">{formatMoney(total)}</span></div>

          <div className="modal-actions">
            <button className="btn" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit}>Create Purchase Order</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
