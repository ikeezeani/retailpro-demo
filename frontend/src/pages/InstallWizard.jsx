import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const STEPS = ['Welcome', 'Database', 'Company & Currency', 'Admin Account', 'Review & Install', 'Done'];

export default function InstallWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dbTested, setDbTested] = useState(false);
  const [currencies, setCurrencies] = useState([]);

  const [db, setDb] = useState({ host: 'mysql', port: 3306, database: 'retailpro', username: 'retailpro', password: '' });
  const [company, setCompany] = useState({ name: '', address: '', phone: '', email: '' });
  const [currency, setCurrency] = useState(null);
  const [taxRate, setTaxRate] = useState(0);
  const [admin, setAdmin] = useState({ name: '', email: '', password: '', confirm: '' });

  useEffect(() => {
    client.get('/install/status').then(({ data }) => { if (data.installed) nav('/login'); });
    client.get('/install/currencies').then(({ data }) => { setCurrencies(data); setCurrency(data[0]); });
    // Prefill the Database step from whatever is actually configured on this
    // host (Docker defaults locally, or e.g. TiDB credentials on Render)
    // instead of always assuming the Docker-only defaults.
    client.get('/install/db-defaults').then(({ data }) => {
      setDb(prev => ({ ...prev, ...data }));
    });
  }, [nav]);

  const testDb = async () => {
    setBusy(true); setError('');
    try {
      await client.post('/install/test-db', db);
      setDbTested(true);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not connect to that database.');
      setDbTested(false);
    } finally { setBusy(false); }
  };

  const runInstall = async () => {
    setBusy(true); setError('');
    try {
      await client.post('/install/run', { db, company, currency, taxRate, admin });
      setStep(5);
    } catch (e) {
      setError(e.response?.data?.error || 'Installation failed.');
    } finally { setBusy(false); }
  };

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
          <div className="brand-mark" style={{ width: 36, height: 36, fontSize: 16 }}>R</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>RetailPro 5.0</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Installation Wizard</div>
          </div>
        </div>

        <Stepper step={step} />

        {error && <div style={errorBox}>{error}</div>}

        <div style={{ marginTop: 20, minHeight: 280 }}>
          {step === 0 && (
            <div>
              <h2 style={{ marginBottom: 10 }}>Welcome to RetailPro 5.0</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
                This wizard will connect RetailPro to your MySQL database, set up your company profile
                and currency, and create your administrator account. It takes about two minutes.
              </p>
              <ul style={{ color: 'var(--text-muted)', lineHeight: 2, paddingLeft: 18, marginBottom: 20 }}>
                <li>MySQL 8.0+ database reachable from this server</li>
                <li>Database credentials with permission to create tables</li>
                <li>Your business currency and default tax rate</li>
              </ul>
              <button className="btn btn-primary" onClick={() => setStep(1)}>Get Started →</button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ marginBottom: 14 }}>Database Connection</h2>
              <div className="form-grid">
                <Field label="Host"><input className="input" value={db.host} onChange={e => setDb({ ...db, host: e.target.value })} /></Field>
                <Field label="Port"><input className="input" value={db.port} onChange={e => setDb({ ...db, port: e.target.value })} /></Field>
                <Field label="Database Name"><input className="input" value={db.database} onChange={e => setDb({ ...db, database: e.target.value })} /></Field>
                <Field label="Username"><input className="input" value={db.username} onChange={e => setDb({ ...db, username: e.target.value })} /></Field>
                <Field label="Password"><input type="password" className="input" value={db.password} onChange={e => setDb({ ...db, password: e.target.value })} placeholder="Enter your database password" /></Field>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                The fields above are pre-filled from this server's configuration — if you're running the
                bundled Docker Compose stack, just enter <code>retailpro</code> as the password and click Test
                Connection. If you're connecting to a cloud database (e.g. TiDB Cloud), enter its password below.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => setStep(0)}>Back</button>
                <button className="btn btn-primary" onClick={testDb} disabled={busy}>
                  {busy ? 'Testing…' : 'Test Connection →'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ marginBottom: 14 }}>Company & Currency</h2>
              <div className="form-grid">
                <Field label="Company Name"><input className="input" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} /></Field>
                <Field label="Phone"><input className="input" value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} /></Field>
                <Field label="Email"><input className="input" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} /></Field>
                <Field label="Address"><input className="input" value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} /></Field>
              </div>
              <div className="form-grid">
                <Field label="Currency">
                  <select className="input" value={currency?.code || ''} onChange={e => setCurrency(currencies.find(c => c.code === e.target.value))}>
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>)}
                  </select>
                </Field>
                <Field label="Default Tax Rate (%)">
                  <input className="input" type="number" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" disabled={!company.name} onClick={() => setStep(3)}>Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ marginBottom: 14 }}>Create Administrator Account</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 13.5 }}>
                This account has full access to every module, including user management and accounting.
              </p>
              <div className="form-grid single">
                <Field label="Full Name"><input className="input" value={admin.name} onChange={e => setAdmin({ ...admin, name: e.target.value })} /></Field>
                <Field label="Email"><input className="input" type="email" value={admin.email} onChange={e => setAdmin({ ...admin, email: e.target.value })} /></Field>
                <Field label="Password"><input className="input" type="password" value={admin.password} onChange={e => setAdmin({ ...admin, password: e.target.value })} /></Field>
                <Field label="Confirm Password"><input className="input" type="password" value={admin.confirm} onChange={e => setAdmin({ ...admin, confirm: e.target.value })} /></Field>
              </div>
              {admin.password && admin.confirm && admin.password !== admin.confirm && (
                <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 10 }}>Passwords do not match.</div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => setStep(2)}>Back</button>
                <button
                  className="btn btn-primary"
                  disabled={!admin.name || !admin.email || admin.password.length < 6 || admin.password !== admin.confirm}
                  onClick={() => setStep(4)}
                >Continue →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ marginBottom: 14 }}>Review & Install</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <ReviewBlock title="Database" rows={[['Host', `${db.host}:${db.port}`], ['Database', db.database], ['User', db.username]]} />
                <ReviewBlock title="Company" rows={[['Name', company.name], ['Currency', `${currency?.code} (${currency?.symbol})`], ['Tax Rate', `${taxRate}%`]]} />
                <ReviewBlock title="Administrator" rows={[['Name', admin.name], ['Email', admin.email]]} />
                <ReviewBlock title="What happens next" rows={[['1', 'Database tables created'], ['2', 'Chart of accounts seeded'], ['3', 'Admin account created']]} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => setStep(3)} disabled={busy}>Back</button>
                <button className="btn btn-primary" onClick={runInstall} disabled={busy}>
                  {busy ? 'Installing…' : 'Install RetailPro 5.0 ✓'}
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
              <h2 style={{ marginBottom: 10 }}>RetailPro is ready</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 22 }}>
                Your database, chart of accounts, and administrator account have been created.
              </p>
              <button className="btn btn-primary" onClick={() => nav('/login')}>Go to Login →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ flex: 1 }}>
          <div style={{ height: 4, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border)', marginBottom: 6 }} />
          <div style={{ fontSize: 10, color: i <= step ? 'var(--text)' : 'var(--text-muted)', fontWeight: 600 }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="field-label">{label}</label>{children}</div>;
}

function ReviewBlock({ title, rows }) {
  return (
    <div style={{ background: 'var(--panel-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
          <span style={{ color: 'var(--text-muted)' }}>{k}</span><span>{v}</span>
        </div>
      ))}
    </div>
  );
}

const wrapStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'radial-gradient(circle at 20% 10%, #132038 0%, var(--ink) 55%)' };
const cardStyle = { width: '100%', maxWidth: 680, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 30, boxShadow: '0 30px 80px rgba(0,0,0,0.45)' };
const errorBox = { background: 'rgba(239,90,90,0.1)', border: '1px solid var(--danger)', color: '#ffb4b4', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 14 };
