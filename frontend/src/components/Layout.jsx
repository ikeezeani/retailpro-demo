import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const NAV = [
  { group: 'Sell', links: [
    { to: '/pos', label: 'Point of Sale', icon: '🛒' },
    { to: '/sales', label: 'Sales History', icon: '🧾' },
  ]},
  { group: 'Stock', links: [
    { to: '/products', label: 'Products', icon: '📦' },
    { to: '/categories', label: 'Categories', icon: '🏷️' },
    { to: '/inventory', label: 'Inventory', icon: '📊' },
  ]},
  { group: 'Buy', links: [
    { to: '/purchasing', label: 'Purchase Orders', icon: '📥' },
    { to: '/suppliers', label: 'Suppliers', icon: '🚚' },
  ]},
  { group: 'Relationships', links: [
    { to: '/customers', label: 'Customers', icon: '👥' },
  ]},
  { group: 'Finance', links: [
    { to: '/accounting', label: 'Nominal Ledger', icon: '📒' },
  ]},
  { group: 'Admin', links: [
    { to: '/users', label: 'Users', icon: '🔐' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ]},
];

const TITLES = {
  '/': 'Dashboard', '/pos': 'Point of Sale', '/sales': 'Sales History', '/products': 'Products',
  '/categories': 'Categories', '/inventory': 'Inventory', '/purchasing': 'Purchase Orders',
  '/suppliers': 'Suppliers', '/customers': 'Customers', '/accounting': 'Nominal Ledger',
  '/users': 'Users', '/settings': 'Settings',
};

export default function Layout({ children }) {
  const { user, logout } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile drawer automatically whenever the route changes, so
  // tapping a link doesn't leave the menu covering the new page.
  useEffect(() => { setNavOpen(false); }, [loc.pathname]);

  return (
    <div className="app-shell">
      {navOpen && <div className="mobile-nav-overlay" onClick={() => setNavOpen(false)} />}

      <aside className={`sidebar${navOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <div className="brand-name">RetailPro</div>
            <div className="brand-sub">v5.0</div>
          </div>
        </div>

        <NavLink to="/" end className="nav-link" style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : undefined })}>
          <span>🏠</span> Dashboard
        </NavLink>

        {NAV.map((g) => (
          <div className="nav-group" key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <span>{l.icon}</span> {l.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => { logout(); nav('/login'); }}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <button className="mobile-nav-toggle" aria-label="Open menu" onClick={() => setNavOpen(true)}>☰</button>
          <div className="page-title">{TITLES[loc.pathname] || 'RetailPro'}</div>
          <div style={{ width: 38 }} />
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
