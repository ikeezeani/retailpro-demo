import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

const BLANK = { name: '', phone: '', email: '', address: '' };

export default function Suppliers() {
  const { formatMoney } = useApp();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const load = () => client.get('/suppliers').then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (editing === 'new') await client.post('/suppliers', form);
    else await client.put(`/suppliers/${editing}`, form);
    setEditing(null);
    load();
  };

  return (
    <div>
      <div className="toolbar"><div className="spacer" /><button className="btn btn-primary" onClick={() => { setForm(BLANK); setEditing('new'); }}>+ New Supplier</button></div>
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Payable Balance</th><th></th></tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td><td>{s.phone}</td><td>{s.email}</td>
                <td className="mono">{formatMoney(s.balance)}</td>
                <td><button className="btn" style={{ padding: '6px 10px' }} onClick={() => { setForm(s); setEditing(s.id); }}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing === 'new' ? 'New Supplier' : 'Edit Supplier'} onClose={() => setEditing(null)}>
          <div className="form-grid single">
            <div><label className="field-label">Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="field-label">Phone</label><input className="input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="field-label">Email</label><input className="input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="field-label">Address</label><input className="input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
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
