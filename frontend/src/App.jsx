import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import client from './api/client';
import { useApp } from './context/AppContext.jsx';
import Layout from './components/Layout.jsx';

import InstallWizard from './pages/InstallWizard.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import POS from './pages/POS.jsx';
import Products from './pages/Products.jsx';
import Categories from './pages/Categories.jsx';
import Inventory from './pages/Inventory.jsx';
import Purchasing from './pages/Purchasing.jsx';
import Suppliers from './pages/Suppliers.jsx';
import Customers from './pages/Customers.jsx';
import Accounting from './pages/Accounting.jsx';
import SalesHistory from './pages/SalesHistory.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import Receipt from './pages/Receipt.jsx';

function Protected({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// Receipts render standalone (no sidebar) since they're meant to be printed
// cleanly or opened in their own tab from POS/Sales History.
function ProtectedBare({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [installChecked, setInstallChecked] = useState(false);
  // Default to "not installed" rather than "installed": if the status check
  // fails (e.g. a cold-starting backend on a free host taking a moment to
  // wake up), sending the user to the wizard is self-correcting — the wizard
  // re-checks status itself and redirects to /login if already installed.
  // The reverse default would strand users on a login screen with no way in.
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus(attemptsLeft) {
      try {
        const { data } = await client.get('/install/status');
        if (!cancelled) {
          setInstalled(data.installed);
          setInstallChecked(true);
        }
      } catch (e) {
        // Likely a cold-starting backend (common on free-tier hosts) — retry
        // a couple of times with a short delay before giving up.
        if (attemptsLeft > 0) {
          setTimeout(() => checkStatus(attemptsLeft - 1), 2000);
        } else if (!cancelled) {
          setInstallChecked(true); // fall through with the safe default above
        }
      }
    }

    checkStatus(3);
    return () => { cancelled = true; };
  }, []);

  if (!installChecked) return null;

  return (
    <Routes>
      <Route path="/install" element={<InstallWizard />} />
      {!installed && <Route path="*" element={<Navigate to="/install" replace />} />}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/pos" element={<Protected><POS /></Protected>} />
      <Route path="/products" element={<Protected><Products /></Protected>} />
      <Route path="/categories" element={<Protected><Categories /></Protected>} />
      <Route path="/inventory" element={<Protected><Inventory /></Protected>} />
      <Route path="/purchasing" element={<Protected><Purchasing /></Protected>} />
      <Route path="/suppliers" element={<Protected><Suppliers /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/accounting" element={<Protected><Accounting /></Protected>} />
      <Route path="/sales" element={<Protected><SalesHistory /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/receipt/:id" element={<ProtectedBare><Receipt /></ProtectedBare>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
