'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface AdminSession {
  accessToken: string;
  admin: {
    id: string;
    name: string;
    email: string;
    role: 'support' | 'ops' | 'super_admin';
  };
}

interface AdminSessionContextValue {
  adminSession: AdminSession | null;
  setAdminSession: (session: AdminSession) => void;
  clearAdminSession: () => void;
  loaded: boolean;
}

const STORAGE_KEY = 'relod_admin_session';

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [adminSession, setAdminSessionRaw] = useState<AdminSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (raw) setAdminSessionRaw(JSON.parse(raw));
    setLoaded(true);
  }, []);

  const setAdminSession = (next: AdminSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAdminSessionRaw(next);
  };

  const clearAdminSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminSessionRaw(null);
  };

  useEffect(() => {
    const onInvalid = () => clearAdminSession();
    window.addEventListener('admin-session-invalid', onInvalid);
    return () => window.removeEventListener('admin-session-invalid', onInvalid);
  }, []);

  return (
    <AdminSessionContext.Provider value={{ adminSession, setAdminSession, clearAdminSession, loaded }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used within AdminSessionProvider');
  return ctx;
}
