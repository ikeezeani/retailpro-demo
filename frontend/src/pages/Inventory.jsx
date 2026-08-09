import React, { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [lowOnly, setLowOnly] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  const [qtyChange, setQtyChange] = useState('');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState(null);

  const load = async () => {
    const { data } = await client.get('/products', { params: lowOnly ? { low_stock: true } : {} });
    setProducts(data.filter(p => p.active));
  };
  useEffect(() => { load(); }, [lowOnly]);

  const submitAdjust = async () => {
    await client.post(`/products/${adjusting.id}/adjust`, { qty_change: Number(qtyChange), note });
    setAdjusting(null); setQtyChange(''); setNote('');
    load();
  };

  const viewHistory = async (p) => {
    const { data } = await client.get(`/products/${p.id}/movements`);
    setHistory({ product: p, movements: data });
  };

  return (
    <div>
      <div className="toolbar">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
          <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} />
          Show low stock only
        </label>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Product</th><th>SKU</th><th>On Hand</th><th>Reorder Level</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {products.map(p => {
              const low = Number(p.stock_qty) <= Number(p.reorder_level);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{p.sku}</td>
                  <td className="mono">{p.stock_qty} {p.unit}</td>
                  <td className="mono">{p.reorder_level}</td>
                  <td><span className={`badge ${low ? 'badge-amber' : 'badge-green'}`}>{low ? 'Reorder Soon' : 'In Stock'}</span></td>
                  <td>
                    <button className="btn" style={{ padding: '6px 10px', marginRight: 6 }} onClick={() => setAdjusting(p)}>Adjust</button>
                    <button className="btn" style={{ padding: '6px 10px' }} onClick={() => viewHistory(p)}>History</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <Modal title={`Adjust Stock — ${adjusting.name}`} onClose={() => setAdjusting(null)}>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
            Current stock: <strong className="mono">{adjusting.stock_qty} {adjusting.unit}</strong>. Enter a positive number
            to add stock (e.g. found items) or a negative number to remove it (e.g. damage, theft, stock count correction).
          </p>
          <div className="form-grid single">
            <div><label className="field-label">Quantity Change</label><input className="input" type="number" value={qtyChange} onChange={e => setQtyChange(e.target.value)} /></div>
            <div><label className="field-label">Reason / Note</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Damaged in storage" /></div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setAdjusting(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitAdjust} disabled={!qtyChange}>Apply Adjustment</button>
          </div>
        </Modal>
      )}

      {history && (
        <Modal title={`Movement History — ${history.product.name}`} onClose={() => setHistory(null)}>
          {history.movements.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No movements recorded yet.</p>}
          {history.movements.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.type}{m.reference ? ` — ${m.reference}` : ''}</div>
                {m.note && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.note}</div>}
              </div>
              <div className="mono" style={{ color: Number(m.qty_change) < 0 ? 'var(--danger)' : 'var(--accent)' }}>
                {Number(m.qty_change) > 0 ? '+' : ''}{m.qty_change}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
