import React, { useEffect, useRef, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';
import ReceiptView from '../components/ReceiptView.jsx';

const PAY_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'mobile_money', label: 'Mobile Money' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'split', label: 'Split Pay' },
  { key: 'credit', label: 'On Credit' },
];

const lineKey = (productId, mode) => `${productId}-${mode}`;

export default function POS() {
  const { formatMoney, settings } = useApp();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [scanValue, setScanValue] = useState('');
  const [cart, setCart] = useState([]); // {product, mode, qty}
  const [payMethod, setPayMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountTouched, setAmountTouched] = useState(false); // has the cashier manually edited this?
  const [splitCash, setSplitCash] = useState('');
  const [splitElectronic, setSplitElectronic] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [completedSale, setCompletedSale] = useState(null); // shown in an in-page receipt modal after checkout
  const scanRef = useRef(null);
  const latestQueryRef = useRef(''); // guards against an older, slower search response overwriting a newer one

  useEffect(() => {
    client.get('/customers').then(({ data }) => setCustomers(data));
    scanRef.current?.focus();
  }, []);

  useEffect(() => { loadProducts(); }, [query]);

  const loadProducts = async () => {
    const q = query; // capture the query this specific request is for
    latestQueryRef.current = q;
    const { data } = await client.get('/products', { params: q ? { q } : {} });
    // If the search box has moved on to a different query since this request
    // was fired, its response is stale — discard it instead of letting it
    // clobber whatever the more recent request already showed.
    if (latestQueryRef.current === q) {
      setProducts(data.filter(p => p.active));
    }
  };

  const showToast = (message, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3000);
  };

  // eaches already committed to the cart for this product, across both
  // each- and pack-mode lines, so we never oversell combined stock.
  const eachesInCart = (productId, packSize) =>
    cart.filter(l => l.product.id === productId)
      .reduce((s, l) => s + (l.mode === 'pack' ? l.qty * packSize : l.qty), 0);

  const addToCart = (product, mode = 'each', qty = 1) => {
    const packSize = Math.max(1, Number(product.pack_size) || 1);
    if (mode === 'pack' && !(Number(product.pack_price) > 0)) {
      return showToast(`${product.name} has no pack price set`, true);
    }
    const eachesNeeded = mode === 'pack' ? qty * packSize : qty;
    const already = eachesInCart(product.id, packSize);
    if (already + eachesNeeded > Number(product.stock_qty)) {
      return showToast(`Only ${product.stock_qty} ${product.unit} of ${product.name} in stock`, true);
    }
    setCart(prev => {
      const key = lineKey(product.id, mode);
      const existing = prev.find(l => lineKey(l.product.id, l.mode) === key);
      if (existing) return prev.map(l => lineKey(l.product.id, l.mode) === key ? { ...l, qty: l.qty + qty } : l);
      return [...prev, { product, mode, qty }];
    });
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    setScanValue('');
    if (!code) return;
    try {
      const { data } = await client.get(`/products/barcode/${encodeURIComponent(code)}`);
      addToCart(data, data.matchedAs === 'pack' ? 'pack' : 'each');
    } catch {
      showToast(`No product found for barcode "${code}"`, true);
    }
  };

  const setQty = (productId, mode, qty) => {
    setCart(prev => prev
      .map(l => lineKey(l.product.id, l.mode) === lineKey(productId, mode) ? { ...l, qty: Math.max(0, qty) } : l)
      .filter(l => l.qty > 0));
  };

  const removeLine = (productId, mode) => setCart(prev => prev.filter(l => lineKey(l.product.id, l.mode) !== lineKey(productId, mode)));

  const unitPriceFor = (l) => l.mode === 'pack' ? Number(l.product.pack_price) : Number(l.product.sale_price);
  const subtotal = cart.reduce((s, l) => s + unitPriceFor(l) * l.qty, 0);
  const taxTotal = cart.reduce((s, l) => s + (unitPriceFor(l) * l.qty * Number(l.product.tax_rate || 0)) / 100, 0);
  const total = subtotal + taxTotal;

  // Default cash payments to the exact total — most sales are paid exactly,
  // and this avoids the confusing "the field looks filled in but isn't"
  // trap of relying on placeholder text alone. Stops auto-syncing the
  // moment the cashier actually types their own amount.
  useEffect(() => {
    if (payMethod === 'cash' && !amountTouched) {
      setAmountPaid(total > 0 ? total.toFixed(2) : '');
    }
  }, [total, payMethod, amountTouched]);
  const change = Math.max(0, Number(amountPaid || 0) - total);
  const splitEntered = Number(splitCash || 0) + Number(splitElectronic || 0);
  const splitRemaining = total - splitEntered;

  const checkout = async () => {
    if (!cart.length) return;
    if (payMethod === 'cash' && Number(amountPaid || 0) < total - 0.01) return showToast('Amount received is less than total due', true);
    if (payMethod === 'credit' && !customerId) return showToast('Select a customer for credit sales', true);
    if (payMethod === 'split' && Math.abs(splitRemaining) > 0.01) {
      return showToast(`Split amounts must add up to ${formatMoney(total)} (currently ${formatMoney(splitEntered)})`, true);
    }
    setBusy(true);
    try {
      const { data } = await client.post('/sales', {
        items: cart.map(l => ({ product_id: l.product.id, qty: l.qty, mode: l.mode })),
        payment_method: payMethod,
        amount_paid: payMethod === 'credit' || payMethod === 'split' ? 0 : Number(amountPaid),
        customer_id: customerId || null,
        split_cash_amount: payMethod === 'split' ? Number(splitCash || 0) : undefined,
        split_electronic_amount: payMethod === 'split' ? Number(splitElectronic || 0) : undefined,
      });
      showToast('Sale completed ✓');
      setCompletedSale(data);
      setCart([]); setAmountPaid(''); setAmountTouched(false); setCustomerId(''); setPayMethod('cash'); setSplitCash(''); setSplitElectronic('');
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
            placeholder="Scan a bottle or a box barcode…"
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
          {products.map(p => {
            const canSellPack = Number(p.pack_size) > 1 && Number(p.pack_price) > 0;
            return (
              <div key={p.id} className={`product-tile${Number(p.stock_qty) <= 0 ? ' out-of-stock' : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
                <button style={{ all: 'unset', display: 'block', width: '100%', padding: 14, cursor: 'pointer', boxSizing: 'border-box' }} onClick={() => addToCart(p, 'each')}>
                  <div className="p-name">{p.name}</div>
                  <div className="p-price">{formatMoney(p.sale_price)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {p.unit}</span></div>
                  <div className="p-stock">{p.stock_qty} {p.unit} in stock</div>
                </button>
                {canSellPack && (
                  <button
                    onClick={() => addToCart(p, 'pack')}
                    style={{
                      width: '100%', border: 'none', borderTop: '1px solid var(--border)', background: 'rgba(35,196,160,0.08)',
                      color: 'var(--accent)', fontSize: 11.5, fontWeight: 700, padding: '7px 10px', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    + Box of {p.pack_size} — {formatMoney(p.pack_price)}
                  </button>
                )}
              </div>
            );
          })}
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
              <div className="receipt-line" key={lineKey(l.product.id, l.mode)}>
                <div className="receipt-line-top">
                  <span>{l.product.name}{l.mode === 'pack' ? ` (Box of ${l.product.pack_size})` : ''}</span>
                  <span>{formatMoney(unitPriceFor(l) * l.qty)}</span>
                </div>
                <div className="receipt-line-sub">
                  <div className="receipt-qty-controls">
                    <button onClick={() => setQty(l.product.id, l.mode, l.qty - 1)}>−</button>
                    <span>{l.qty} × {formatMoney(unitPriceFor(l))}</span>
                    <button onClick={() => setQty(l.product.id, l.mode, l.qty + 1)}>+</button>
                  </div>
                  <button onClick={() => removeLine(l.product.id, l.mode)} style={{ border: 'none', background: 'none', color: '#b34a4a', cursor: 'pointer' }}>remove</button>
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
              <button key={m.key} className={`pay-method-btn${payMethod === m.key ? ' active' : ''}`} onClick={() => { setPayMethod(m.key); setAmountTouched(false); }}>
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
          ) : payMethod === 'split' ? (
            <div style={{ marginBottom: 10 }}>
              <label className="field-label">Cash Amount</label>
              <input className="input mono" type="number" step="0.01" value={splitCash} onChange={e => setSplitCash(e.target.value)} placeholder="0.00" style={{ marginBottom: 8 }} />
              <label className="field-label">Card / Mobile Money / Bank Transfer Amount</label>
              <input className="input mono" type="number" step="0.01" value={splitElectronic} onChange={e => setSplitElectronic(e.target.value)} placeholder="0.00" />
              <div style={{ fontSize: 12, marginTop: 6, color: Math.abs(splitRemaining) > 0.01 ? 'var(--amber)' : 'var(--accent)' }}>
                {Math.abs(splitRemaining) <= 0.01
                  ? '✓ Fully covers the total'
                  : splitRemaining > 0
                  ? `${formatMoney(splitRemaining)} still needed`
                  : `${formatMoney(-splitRemaining)} over the total`}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 10 }}>
              <label className="field-label">Amount Received</label>
              <input className="input mono" type="number" step="0.01" value={amountPaid} onChange={e => { setAmountPaid(e.target.value); setAmountTouched(true); }} placeholder={formatMoney(total)} />
              {Number(amountPaid) > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Change due: <strong className="mono">{formatMoney(change)}</strong></div>}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={checkout} disabled={busy || !cart.length || (payMethod === 'split' && Math.abs(splitRemaining) > 0.01)}>
            {busy ? 'Processing…' : `Charge ${formatMoney(total)}`}
          </button>
        </div>
      </div>

      {toast && <div className={`toast${toast.error ? ' error' : ''}`}>{toast.message}</div>}

      {completedSale && (
        <Modal title={`Sale Complete — ${completedSale.invoice_no}`} onClose={() => setCompletedSale(null)}>
          <ReceiptView sale={completedSale} />
          <button
            className="btn btn-primary no-print"
            style={{ width: '100%', marginTop: 16 }}
            onClick={() => window.print()}
          >
            🖨️ Print Receipt
          </button>
          <button className="btn no-print" style={{ width: '100%', marginTop: 8 }} onClick={() => setCompletedSale(null)}>
            Start Next Sale
          </button>
        </Modal>
      )}
    </div>
  );
}
