'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// A driver's identity is a single Vehicle, not an account — see
// DriverAccessGuard on the backend. Kept as its own context (rather than
// widening session-context's userType union) so the much larger
// carrier/shipper-facing surface doesn't need to account for a third,
// very different identity shape.
export interface DriverSession {
  accessToken: string;
  vehicleId: string;
  phone: string;
  driverName: string | null;
}

interface DriverSessionContextValue {
  driverSession: DriverSession | null;
  setDriverSession: (session: DriverSession) => void;
  clearDriverSession: () => void;
  loaded: boolean;
}

const STORAGE_KEY = 'relod_driver_session';

const DriverSessionContext = createContext<DriverSessionContextValue | null>(null);

export function DriverSessionProvider({ children }: { children: React.ReactNode }) {
  const [driverSession, setDriverSessionRaw] = useState<DriverSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (raw) setDriverSessionRaw(JSON.parse(raw));
    setLoaded(true);
  }, []);

  const setDriverSession = (next: DriverSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setDriverSessionRaw(next);
  };

  const clearDriverSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDriverSessionRaw(null);
  };

  useEffect(() => {
    const onInvalid = () => clearDriverSession();
    window.addEventListener('driver-session-invalid', onInvalid);
    return () => window.removeEventListener('driver-session-invalid', onInvalid);
  }, []);

  return (
    <DriverSessionContext.Provider
      value={{ driverSession, setDriverSession, clearDriverSession, loaded }}
    >
      {children}
    </DriverSessionContext.Provider>
  );
}

export function useDriverSession() {
  const ctx = useContext(DriverSessionContext);
  if (!ctx) throw new Error('useDriverSession must be used within DriverSessionProvider');
  return ctx;
}
