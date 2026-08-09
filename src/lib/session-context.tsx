'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface Session {
  accessToken: string;
  accountId: string;
  userType: 'carrier' | 'shipper';
  phone: string;
}

interface SessionContextValue {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
  loaded: boolean;
}

const STORAGE_KEY = 'relod_session';

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionRaw] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setSessionRaw(JSON.parse(raw));
    setLoaded(true);
  }, []);

  const setSession = (next: Session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionRaw(next);
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionRaw(null);
  };

  return (
    <SessionContext.Provider value={{ session, setSession, clearSession, loaded }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
