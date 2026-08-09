import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';

export default function Login() {
  const { login, user } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) { nav('/'); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await client.post('/auth/login', { email, password });
      login(data.token, data.user);
      nav('/');
    } catch (e2) {
      setError(e2.response?.data?.error || 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'radial-gradient(circle at 80% 20%, #132038 0%, var(--ink) 55%)' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 18, padding: 30, boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
          <div className="brand-mark" style={{ width: 36, height: 36, fontSize: 16 }}>R</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>RetailPro 5.0</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sign in to continue</div>
          </div>
        </div>
        {error && <div style={{ background: 'rgba(239,90,90,0.1)', border: '1px solid var(--danger)', color: '#ffb4b4', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 40 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                padding: 4, display: 'flex', alignItems: 'center', cursor: 'pointer',
              }}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </div>
  );
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
  );
}
