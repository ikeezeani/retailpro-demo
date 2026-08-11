import React, { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal.jsx';

const BLANK = { name: '', email: '', password: '', role: 'cashier' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(null); // the user being password-reset
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [resetError, setResetError] = useState('');
  const [toast, setToast] = useState('');

  const load = () => client.get('/users').then(({ data }) => setUsers(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    try { await client.post('/users', form); setCreating(false); setForm(BLANK); load(); }
    catch (e) { setError(e.response?.data?.error || 'Failed to create user'); }
  };

  const toggleActive = async (u) => { await client.put(`/users/${u.id}`, { active: !u.active }); load(); };

  const submitReset = async () => {
    setResetError('');
    if (newPassword.length < 6) return setResetError('Password must be at least 6 characters');
    try {
      await client.put(`/users/${resetting.id}`, { password: newPassword });
      setResetting(null);
      setNewPassword('');
      setToast(`Password reset for ${resetting.name}. Let them know their new password securely.`);
      setTimeout(() => setToast(''), 5000);
    } catch (e) {
      setResetError(e.response?.data?.error || 'Failed to reset password');
    }
  };

  return (
    <div>
      <div className="toolbar"><div className="spacer" /><button className="btn btn-primary" onClick={() => setCreating(true)}>+ New User</button></div>
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td>
                <td><span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td><span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>{u.active ? 'Active' : 'Disabled'}</span></td>
                <td>
                  <button className="btn" style={{ padding: '6px 10px', marginRight: 6 }} onClick={() => { setResetting(u); setNewPassword(''); setResetError(''); }}>
                    Reset Password
                  </button>
                  <button className="btn" style={{ padding: '6px 10px' }} onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Enable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title="New User" onClose={() => setCreating(false)}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div className="form-grid single">
            <div><label className="field-label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="field-label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="field-label">Password</label><input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <label className="field-label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <div className="modal-actions"><button className="btn" onClick={() => setCreating(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Create User</button></div>
        </Modal>
      )}

      {resetting && (
        <Modal title={`Reset Password — ${resetting.name}`} onClose={() => setResetting(null)}>
          {resetError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{resetError}</div>}
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            This immediately replaces {resetting.name}'s password. Share the new one with them
            directly and privately — never over an unsecured channel.
          </p>
          <div className="form-grid single">
            <div>
              <label className="field-label">New Password</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setResetting(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitReset}>Set New Password</button>
          </div>
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
