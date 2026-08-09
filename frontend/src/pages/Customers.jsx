import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const BLANK = { name: '', phone: '', email: '' };

export default function Customers() {
  const { formatMoney } = useApp();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const load = () => client.get('/customers').then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing === 'new') await client.post('/customers', form);
    else await client.put(`/customers/${editing}`, form);
    setEditing(null);
    load();
  };

  return (
    <div>
      <div className="toolbar"><div className="spacer" /><button className="btn btn-primary" onClick={() => { setForm(BLANK); setEditing('new'); }}>+ New Customer</button></div>
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Credit Balance</th><th></th></tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.phone}</td><td>{c.email}</td>
                <td className="mono">{formatMoney(c.balance)}</td>
                <td><button className="btn" style={{ padding: '6px 10px' }} onClick={() => { setForm(c); setEditing(c.id); }}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing === 'new' ? 'New Customer' : 'Edit Customer'} onClose={() => setEditing(null)}>
          <div className="form-grid single">
            <div><label className="field-label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="field-label">Phone</label><input className="input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="field-label">Email</label><input className="input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
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
