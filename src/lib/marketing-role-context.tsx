'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type MarketingRole = 'shipper' | 'truck';

interface MarketingRoleContextValue {
  role: MarketingRole;
  setRole: (role: MarketingRole) => void;
}

const STORAGE_KEY = 'relod_marketing_role';

const MarketingRoleContext = createContext<MarketingRoleContextValue | null>(null);

// Lets an anonymous landing-page visitor say "I'm a shipper" / "I'm a truck
// owner" once (header dropdown) and have every role-aware marketing section
// (the Loadboard/Truck-board preview, the How-it-works tabs) reflect that
// choice without re-selecting it in each section. Persisted so it survives a
// page reload during the same visit — not tied to an actual account.
export function MarketingRoleProvider({ children }: { children: React.ReactNode }) {
  // Shipper is the default persona the landing page speaks to; picking
  // "I'm a Truck" in the header shifts everything role-aware over to truck.
  const [role, setRoleRaw] = useState<MarketingRole>('shipper');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'shipper' || stored === 'truck') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoleRaw(stored);
    }
  }, []);

  const setRole = (next: MarketingRole) => {
    localStorage.setItem(STORAGE_KEY, next);
    setRoleRaw(next);
  };

  return (
    <MarketingRoleContext.Provider value={{ role, setRole }}>
      {children}
    </MarketingRoleContext.Provider>
  );
}

export function useMarketingRole() {
  const ctx = useContext(MarketingRoleContext);
  if (!ctx) throw new Error('useMarketingRole must be used within MarketingRoleProvider');
  return ctx;
}
