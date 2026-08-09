import React, { useEffect, useState } from 'react';
import client from '../api/client';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');

  const load = () => client.get('/categories').then(({ data }) => setCategories(data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await client.post('/categories', { name });
    setName('');
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this category?')) return;
    await client.delete(`/categories/${id}`);
    load();
  };

  return (
    <div>
      <form className="toolbar" onSubmit={add}>
        <input className="input" style={{ maxWidth: 280 }} placeholder="New category name…" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-primary">Add Category</button>
      </form>
      <div className="card" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th></th></tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td><button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => remove(c.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
