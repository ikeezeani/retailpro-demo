import React, { useEffect, useRef, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';

const PAY_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'mobile_money', label: 'Mobile Money' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'credit', label: 'On Credit' },
];

export default function POS() {
  const { formatMoney, settings } = useApp();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [scanValue, setScanValue] = useState('');
  const [cart, setCart] = useState([]); // {product, qty}
  const [payMethod, setPayMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const scanRef = useRef(null);

  useEffect(() => {
    loadProducts();
    client.get('/customers').then(({ data }) => setCustomers(data));
    scanRef.current?.focus();
  }, []);

  useEffect(() => { loadProducts(); }, [query]);

  const loadProducts = async () => {
    const { data } = await client.get('/products', { params: query ? { q: query } : {} });
    setProducts(data.filter(p => p.active));
  };

  const showToast = (message, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3000);
  };

  const addToCart = (product, qty = 1) => {
    if (Number(product.stock_qty) <= 0) return showToast(`${product.name} is out of stock`, true);
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      if (existing) {
        if (existing.qty + qty > Number(product.stock_qty)) {
          showToast(`Only ${product.stock_qty} of ${product.name} in stock`, true);
          return prev;
        }
        return prev.map(l => l.product.id === product.id ? { ...l, qty: l.qty + qty } : l);
      }
      return [...prev, { product, qty }];
    });
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    setScanValue('');
    if (!code) return;
    try {
      const { data } = await client.get(`/products/barcode/${encodeURIComponent(code)}`);
      addToCart(data);
    } catch {
      showToast(`No product found for barcode "${code}"`, true);
    }
  };

  const setQty = (productId, qty) => {
    setCart(prev => prev
      .map(l => l.product.id === productId ? { ...l, qty: Math.max(0, qty) } : l)
      .filter(l => l.qty > 0));
  };

  const removeLine = (productId) => setCart(prev => prev.filter(l => l.product.id !== productId));

  const subtotal = cart.reduce((s, l) => s + Number(l.product.sale_price) * l.qty, 0);
  const taxTotal = cart.reduce((s, l) => s + (Number(l.product.sale_price) * l.qty * Number(l.product.tax_rate || 0)) / 100, 0);
  const total = subtotal + taxTotal;
  const change = Math.max(0, Number(amountPaid || 0) - total);

  const checkout = async () => {
    if (!cart.length) return;
    if (payMethod !== 'credit' && Number(amountPaid || 0) < total) return showToast('Amount received is less than total due', true);
    if (payMethod === 'credit' && !customerId) return showToast('Select a customer for credit sales', true);
    setBusy(true);
    try {
      const { data } = await client.post('/sales', {
        items: cart.map(l => ({ product_id: l.product.id, qty: l.qty })),
        payment_method: payMethod,
        amount_paid: payMethod === 'credit' ? 0 : Number(amountPaid),
        customer_id: customerId || null,
      });
      showToast('Sale completed ✓');
      window.open(`/receipt/${data.id}`, '_blank', 'width=420,height=700');
      setCart([]); setAmountPaid(''); setCustomerId(''); setPayMethod('cash');
      loadProducts();
      scanRef.current?.focus();
    } catch (e) {
      showToast(e.response?.data?.error || 'Checkout failed', true);
    } finally { setBusy(false); }
  };

  return (
    <div className="pos-layout">
      <div className="pos-left">
        <form className="scan-bar" onSubmit={handleScanSubmit}>
          <span className="scan-icon">▌▌ ▍▌▍▌▍</span>
          <input
            ref={scanRef}
            placeholder="Scan barcode or click a product below…"
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            autoFocus
          />
          <span className="scan-hint">Enter to add</span>
        </form>

        <input
          className="input"
          placeholder="Search products by name or SKU…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ maxWidth: 320 }}
        />

        <div className="product-grid">
          {products.map(p => (
            <button
              key={p.id}
              className={`product-tile${Number(p.stock_qty) <= 0 ? ' out-of-stock' : ''}`}
              onClick={() => addToCart(p)}
            >
              <div className="p-name">{p.name}</div>
              <div className="p-price">{formatMoney(p.sale_price)}</div>
              <div className="p-stock">{p.stock_qty} {p.unit} in stock</div>
            </button>
          ))}
        </div>
      </div>

      <div className="receipt-tape-wrap">
        <div className="receipt-tape">
          <div className="receipt-tape-torn" />
          <div className="receipt-head">
            <div className="store">{settings?.company_name || 'RetailPro Store'}</div>
            <div className="meta">{new Date().toLocaleString()}</div>
          </div>
          <div className="receipt-items">
            {cart.length === 0 && <div className="receipt-empty">Cart is empty — scan or tap a product to begin a sale.</div>}
            {cart.map(l => (
              <div className="receipt-line" key={l.product.id}>
                <div className="receipt-line-top">
                  <span>{l.product.name}</span>
                  <span>{formatMoney(Number(l.product.sale_price) * l.qty)}</span>
                </div>
                <div className="receipt-line-sub">
                  <div className="receipt-qty-controls">
                    <button onClick={() => setQty(l.product.id, l.qty - 1)}>−</button>
                    <span>{l.qty} × {formatMoney(l.product.sale_price)}</span>
                    <button onClick={() => setQty(l.product.id, l.qty + 1)}>+</button>
                  </div>
                  <button onClick={() => removeLine(l.product.id)} style={{ border: 'none', background: 'none', color: '#b34a4a', cursor: 'pointer' }}>remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="receipt-totals">
            <div className="row"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
            <div className="row"><span>Tax</span><span>{formatMoney(taxTotal)}</span></div>
            <div className="row grand"><span>Total</span><span>{formatMoney(total)}</span></div>
          </div>
        </div>

        <div className="pos-checkout">
          <label className="field-label">Payment Method</label>
          <div className="pay-methods">
            {PAY_METHODS.map(m => (
              <button key={m.key} className={`pay-method-btn${payMethod === m.key ? ' active' : ''}`} onClick={() => setPayMethod(m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          {payMethod === 'credit' ? (
            <div style={{ marginBottom: 10 }}>
              <label className="field-label">Customer</label>
              <select className="input" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div style={{ marginBottom: 10 }}>
              <label className="field-label">Amount Received</label>
              <input className="input mono" type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={formatMoney(total)} />
              {Number(amountPaid) > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Change due: <strong className="mono">{formatMoney(change)}</strong></div>}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={checkout} disabled={busy || !cart.length}>
            {busy ? 'Processing…' : `Charge ${formatMoney(total)}`}
          </button>
        </div>
      </div>

      {toast && <div className={`toast${toast.error ? ' error' : ''}`}>{toast.message}</div>}
    </div>
  );
}
