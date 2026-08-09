import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';

export default function Settings() {
  const { loadSettings } = useApp();
  const [form, setForm] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    client.get('/settings').then(({ data }) => setForm(data));
    client.get('/install/currencies').then(({ data }) => setCurrencies(data));
  }, []);

  if (!form) return null;

  const save = async () => {
    await client.put('/settings', form);
    await loadSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h3 style={{ marginBottom: 18 }}>Company & Currency</h3>
      <div className="form-grid single">
        <F label="Company Name"><input className="input" value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })} /></F>
        <F label="Address"><input className="input" value={form.company_address || ''} onChange={e => setForm({ ...form, company_address: e.target.value })} /></F>
        <F label="Phone"><input className="input" value={form.company_phone || ''} onChange={e => setForm({ ...form, company_phone: e.target.value })} /></F>
        <F label="Email"><input className="input" value={form.company_email || ''} onChange={e => setForm({ ...form, company_email: e.target.value })} /></F>
        <F label="Currency">
          <select className="input" value={form.currency_code} onChange={e => {
            const c = currencies.find(x => x.code === e.target.value);
            setForm({ ...form, currency_code: c.code, currency_symbol: c.symbol });
          }}>
            {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>)}
          </select>
        </F>
        <F label="Default Tax Rate (%)"><input className="input" type="number" step="0.01" value={form.default_tax_rate} onChange={e => setForm({ ...form, default_tax_rate: e.target.value })} /></F>
        <F label="Receipt Footer"><input className="input" value={form.receipt_footer || ''} onChange={e => setForm({ ...form, receipt_footer: e.target.value })} /></F>
      </div>
      <button className="btn btn-primary" onClick={save}>Save Settings</button>
      {saved && <span style={{ marginLeft: 12, color: 'var(--accent)', fontSize: 13 }}>Saved ✓</span>}
    </div>
  );
}

function F({ label, children }) { return <div><label className="field-label">{label}</label>{children}</div>; }
