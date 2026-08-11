import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const BLANK = {
  sku: '', barcode: '', name: '', category_id: '', cost_price: 0, sale_price: 0, tax_rate: 0,
  unit: 'pcs', reorder_level: 5, stock_qty: 0,
  pack_size: 1, pack_price: '', pack_barcode: '',
};

export default function Products() {
  const { formatMoney } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await client.get('/products', { params: q ? { q } : {} });
    setProducts(data);
  };
  useEffect(() => { load(); }, [q]);
  useEffect(() => { client.get('/categories').then(({ data }) => setCategories(data)); }, []);

  const openNew = () => { setForm(BLANK); setEditing('new'); setError(''); };
  const openEdit = (p) => { setForm({ ...BLANK, ...p, pack_price: p.pack_price ?? '', pack_barcode: p.pack_barcode ?? '' }); setEditing(p.id); setError(''); };

  const save = async () => {
    try {
      const payload = { ...form, pack_price: form.pack_price === '' ? null : form.pack_price, pack_barcode: form.pack_barcode || null };
      if (editing === 'new') await client.post('/products', payload);
      else await client.put(`/products/${editing}`, payload);
      setEditing(null);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Save failed'); }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this product?')) return;
    await client.delete(`/products/${id}`);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search products…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openNew}>+ New Product</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr><th>Product</th><th>SKU / Barcode</th><th>Category</th><th>Cost</th><th>Each Price</th><th>Pack</th><th>Tax</th><th>Stock</th><th></th></tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="mono" style={{ fontSize: 12 }}>{p.sku}<br /><span style={{ color: 'var(--text-muted)' }}>{p.barcode}</span></td>
                <td>{p.Category?.name || '—'}</td>
                <td className="mono">{formatMoney(p.cost_price)}</td>
                <td className="mono">{formatMoney(p.sale_price)}</td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {Number(p.pack_size) > 1 && p.pack_price
                    ? <>Box of {p.pack_size}<br />{formatMoney(p.pack_price)}</>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td>{p.tax_rate}%</td>
                <td>
                  <span className={`badge ${Number(p.stock_qty) <= Number(p.reorder_level) ? 'badge-amber' : 'badge-green'}`}>{p.stock_qty} {p.unit}</span>
                </td>
                <td>
                  <button className="btn" style={{ padding: '6px 10px', marginRight: 6 }} onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => deactivate(p.id)}>Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Product' : 'Edit Product'} onClose={() => setEditing(null)}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div className="form-grid">
            <F label="Name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F>
            <F label="SKU"><input className="input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></F>
            <F label="Barcode (each/bottle)"><input className="input" value={form.barcode || ''} onChange={e => setForm({ ...form, barcode: e.target.value })} /></F>
            <F label="Category">
              <select className="input" value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">—</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </F>
            <F label="Cost Price (per each)"><input className="input" type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} /></F>
            <F label="Sale Price (per each)"><input className="input" type="number" step="0.01" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} /></F>
            <F label="Tax Rate (%)"><input className="input" type="number" step="0.01" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} /></F>
            <F label="Unit"><input className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></F>
            <F label="Reorder Level"><input className="input" type="number" value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} /></F>
            {editing === 'new' && <F label="Opening Stock (in eaches)"><input className="input" type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} /></F>}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0 14px', paddingTop: 14 }}>
            <label className="field-label" style={{ marginBottom: 8 }}>Sell by the box/case? (optional)</label>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
              Leave Pack Size at 1 if this item is never sold as a box. Stock always stays in eaches either way —
              a box sale just deducts several eaches at once.
            </p>
            <div className="form-grid">
              <F label="Pack Size (eaches per box)"><input className="input" type="number" min="1" value={form.pack_size} onChange={e => setForm({ ...form, pack_size: e.target.value })} /></F>
              <F label="Pack Price (per box)"><input className="input" type="number" step="0.01" placeholder="e.g. box discount price" value={form.pack_price} onChange={e => setForm({ ...form, pack_price: e.target.value })} /></F>
              <F label="Pack Barcode (box barcode)"><input className="input" value={form.pack_barcode || ''} onChange={e => setForm({ ...form, pack_barcode: e.target.value })} /></F>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function F({ label, children }) { return <div><label className="field-label">{label}</label>{children}</div>; }
