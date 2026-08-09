import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import client from '../api/client';
import { useApp } from '../context/AppContext.jsx';

export default function Dashboard() {
  const { formatMoney } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => { client.get('/reports/dashboard').then(({ data }) => setData(data)); }, []);

  if (!data) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>;

  return (
    <div>
      <div className="kpi-grid">
        <Kpi label="Sales Today" value={formatMoney(data.todayTotal)} sub={`${data.todayCount} transactions`} />
        <Kpi label="Sales This Month" value={formatMoney(data.monthTotal)} />
        <Kpi label="Active Products" value={data.productCount} />
        <Kpi label="Low Stock Items" value={data.lowStockCount} warn={data.lowStockCount > 0} />
      </div>

      <div className="grid-2-responsive">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trend}>
              <CartesianGrid stroke="#24314A" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#8C9AB5', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#8C9AB5', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#182338', border: '1px solid #24314A', borderRadius: 8 }} labelStyle={{ color: '#E7ECF5' }} />
              <Line type="monotone" dataKey="total" stroke="#23C4A0" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Top Sellers (30d)</h3>
          {data.topItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sales yet.</p>}
          {data.topItems.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.Product?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }} className="mono">{it.Product?.sku}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 13 }}>{formatMoney(it.dataValues?.totalRevenue ?? it.totalRevenue)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.dataValues?.totalQty ?? it.totalQty} sold</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, warn }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: warn ? 'var(--amber)' : undefined }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
