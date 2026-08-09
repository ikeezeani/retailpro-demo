import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const TABS = ['Chart of Accounts', 'Journal', 'Trial Balance', 'Profit & Loss', 'Balance Sheet'];

export default function Accounting() {
  const [tab, setTab] = useState('Chart of Accounts');
  return (
    <div>
      <div className="toolbar">
        {TABS.map(t => (
          <button key={t} className="btn" style={{ background: tab === t ? 'var(--accent)' : undefined, color: tab === t ? '#06231c' : undefined, borderColor: tab === t ? 'var(--accent)' : undefined }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Chart of Accounts' && <ChartOfAccounts />}
      {tab === 'Journal' && <Journal />}
      {tab === 'Trial Balance' && <TrialBalance />}
      {tab === 'Profit & Loss' && <ProfitLoss />}
      {tab === 'Balance Sheet' && <BalanceSheet />}
    </div>
  );
}

function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'expense' });
  const load = () => client.get('/accounting/accounts').then(({ data }) => setAccounts(data));
  useEffect(() => { load(); }, []);
  const save = async () => { await client.post('/accounting/accounts', form); setCreating(false); setForm({ code: '', name: '', type: 'expense' }); load(); };
  return (
    <div>
      <div className="toolbar"><div className="spacer" /><button className="btn btn-primary" onClick={() => setCreating(true)}>+ New Account</button></div>
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id}>
                <td className="mono">{a.code}</td><td>{a.name}</td>
                <td><span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{a.type}</span></td>
                <td>{a.is_system && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>system</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && (
        <Modal title="New Account" onClose={() => setCreating(false)}>
          <div className="form-grid single">
            <div><label className="field-label">Code</label><input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><label className="field-label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label className="field-label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="asset">Asset</option><option value="liability">Liability</option>
                <option value="equity">Equity</option><option value="income">Income</option><option value="expense">Expense</option>
              </select>
            </div>
          </div>
          <div className="modal-actions"><button className="btn" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></div>
        </Modal>
      )}
    </div>
  );
}

function Journal() {
  const { formatMoney } = useApp();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState([{ code: '', debit: 0, credit: 0 }, { code: '', debit: 0, credit: 0 }]);
  const [error, setError] = useState('');

  const load = () => client.get('/accounting/journal').then(({ data }) => setEntries(data));
  useEffect(() => { load(); client.get('/accounting/accounts').then(({ data }) => setAccounts(data)); }, []);

  const updateLine = (i, field, val) => { const c = [...lines]; c[i][field] = val; setLines(c); };
  const addLine = () => setLines([...lines, { code: '', debit: 0, credit: 0 }]);

  const submit = async () => {
    setError('');
    try {
      await client.post('/accounting/journal', { date, memo, lines });
      setCreating(false); setMemo(''); setLines([{ code: '', debit: 0, credit: 0 }, { code: '', debit: 0, credit: 0 }]);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Failed to post entry'); }
  };

  return (
    <div>
      <div className="toolbar"><div className="spacer" /><button className="btn btn-primary" onClick={() => setCreating(true)}>+ Manual Journal Entry</button></div>
      {entries.map(e => (
        <div className="card" key={e.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{e.entry_no} — {e.memo}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{e.date} · {e.source}</span>
          </div>
          <table className="data-table"><tbody>
            {e.JournalLines?.map(l => (
              <tr key={l.id}>
                <td style={{ padding: '6px 0', border: 'none' }}>{l.Account?.code} — {l.Account?.name}</td>
                <td style={{ padding: '6px 0', border: 'none', textAlign: 'right' }} className="mono">{Number(l.debit) > 0 ? formatMoney(l.debit) : ''}</td>
                <td style={{ padding: '6px 0', border: 'none', textAlign: 'right' }} className="mono">{Number(l.credit) > 0 ? formatMoney(l.credit) : ''}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      ))}
      {creating && (
        <Modal title="New Manual Journal Entry" onClose={() => setCreating(false)}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div className="form-grid">
            <div><label className="field-label">Date</label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label className="field-label">Memo</label><input className="input" value={memo} onChange={e => setMemo(e.target.value)} /></div>
          </div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <select className="input" value={l.code} onChange={e => updateLine(i, 'code', e.target.value)}>
                <option value="">Account…</option>
                {accounts.map(a => <option key={a.id} value={a.code}>{a.code} — {a.name}</option>)}
              </select>
              <input className="input" type="number" step="0.01" placeholder="Debit" value={l.debit} onChange={e => updateLine(i, 'debit', Number(e.target.value))} />
              <input className="input" type="number" step="0.01" placeholder="Credit" value={l.credit} onChange={e => updateLine(i, 'credit', Number(e.target.value))} />
            </div>
          ))}
          <button className="btn" onClick={addLine} style={{ marginBottom: 14 }}>+ Add Line</button>
          <div className="modal-actions"><button className="btn" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-primary" onClick={submit}>Post Entry</button></div>
        </Modal>
      )}
    </div>
  );
}

function TrialBalance() {
  const { formatMoney } = useApp();
  const [rows, setRows] = useState([]);
  useEffect(() => { client.get('/accounting/trial-balance').then(({ data }) => setRows(data)); }, []);
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="data-table">
        <thead><tr><th>Code</th><th>Account</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.code}><td className="mono">{r.code}</td><td>{r.name}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{r.debit ? formatMoney(r.debit) : ''}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{r.credit ? formatMoney(r.credit) : ''}</td></tr>
          ))}
          <tr><td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(totalDebit)}</td>
            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(totalCredit)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ProfitLoss() {
  const { formatMoney } = useApp();
  const [pl, setPl] = useState(null);
  useEffect(() => { client.get('/accounting/profit-loss').then(({ data }) => setPl(data)); }, []);
  if (!pl) return null;
  return (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>Income</h3>
      {pl.rows.filter(r => r.type === 'income').map(r => <Row key={r.code} label={r.name} value={formatMoney(r.amount)} />)}
      <Row label="Total Income" value={formatMoney(pl.totalIncome)} bold />
      <h3 style={{ margin: '20px 0 14px' }}>Expenses</h3>
      {pl.rows.filter(r => r.type === 'expense').map(r => <Row key={r.code} label={r.name} value={formatMoney(r.amount)} />)}
      <Row label="Total Expenses" value={formatMoney(pl.totalExpense)} bold />
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
        <Row label="Net Profit" value={formatMoney(pl.netProfit)} bold big />
      </div>
    </div>
  );
}

function BalanceSheet() {
  const { formatMoney } = useApp();
  const [bs, setBs] = useState(null);
  useEffect(() => { client.get('/accounting/balance-sheet').then(({ data }) => setBs(data)); }, []);
  if (!bs) return null;
  return (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>Assets</h3>
      {bs.rows.filter(r => r.type === 'asset').map(r => <Row key={r.code} label={r.name} value={formatMoney(r.balance)} />)}
      <Row label="Total Assets" value={formatMoney(bs.totals.assets)} bold />
      <h3 style={{ margin: '20px 0 14px' }}>Liabilities</h3>
      {bs.rows.filter(r => r.type === 'liability').map(r => <Row key={r.code} label={r.name} value={formatMoney(r.balance)} />)}
      <Row label="Total Liabilities" value={formatMoney(bs.totals.liabilities)} bold />
      <h3 style={{ margin: '20px 0 14px' }}>Equity</h3>
      {bs.rows.filter(r => r.type === 'equity').map(r => <Row key={r.code} label={r.name} value={formatMoney(r.balance)} />)}
      <Row label="Total Equity" value={formatMoney(bs.totals.equity)} bold />
      <div style={{ marginTop: 14, fontSize: 12, color: bs.totals.checksOut ? 'var(--accent)' : 'var(--danger)' }}>
        {bs.totals.checksOut ? '✓ Assets = Liabilities + Equity' : '⚠ Balance sheet does not balance — review journal entries'}
      </div>
    </div>
  );
}

function Row({ label, value, bold, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: bold ? 700 : 400, fontSize: big ? 16 : 13.5 }}>
      <span style={{ color: bold ? undefined : 'var(--text-muted)' }}>{label}</span><span className="mono">{value}</span>
    </div>
  );
}
