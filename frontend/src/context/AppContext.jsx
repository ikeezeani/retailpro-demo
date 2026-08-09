import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import client from '../api/client';

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('retailpro_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [settings, setSettings] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await client.get('/settings');
      setSettings(data);
    } catch (e) { /* not installed yet, or not logged in */ }
  }, []);

  useEffect(() => { if (user) loadSettings(); }, [user, loadSettings]);

  const login = (token, userObj) => {
    localStorage.setItem('retailpro_token', token);
    localStorage.setItem('retailpro_user', JSON.stringify(userObj));
    setUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem('retailpro_token');
    localStorage.removeItem('retailpro_user');
    setUser(null);
  };

  const currencySymbol = settings?.currency_symbol || '$';
  const formatMoney = (n) => `${currencySymbol}${Number(n || 0).toFixed(2)}`;

  return (
    <AppCtx.Provider value={{ user, login, logout, settings, loadSettings, formatMoney, currencySymbol }}>
      {children}
    </AppCtx.Provider>
  );
}

export const useApp = () => useContext(AppCtx);
