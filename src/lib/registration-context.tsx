'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface PendingCarrierProfile {
  fullName: string;
  isOwnerOperator: boolean;
  // Only present when isOwnerOperator is true — a non-owner-operator's own
  // WhatsApp number isn't collected at signup, only their drivers' are (one
  // per truck, added after registration).
  whatsappNumber?: string;
  whatsappVerificationToken?: string;
  // Only present when isOwnerOperator is false.
  truckCount?: number;
  wantsReturnLoads: boolean;
  aadhaarNumber: string;
  panNumber?: string;
  email?: string;
  preferredLanguage?: string;
}

interface PendingShipperProfile {
  fullName: string;
  whatsappNumber: string;
  whatsappVerificationToken: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  gstin?: string;
  panNumber?: string;
  paymentUpiId?: string;
  industryType?: string;
  shipmentVolume?: string;
  businessAddress?: string;
  preferredLanguage?: string;
}

interface RegistrationState {
  phone: string;
  token: string;
  userType: 'carrier' | 'shipper';
  accountId: string;
  // Neither account is actually created until the KYC verification step
  // (and, for owner-operator carriers, the vehicle step) also completes —
  // these fields are held here, client-side only, in between.
  pendingCarrierProfile: PendingCarrierProfile;
  pendingShipperProfile: PendingShipperProfile;
}

interface RegistrationContextValue {
  state: Partial<RegistrationState>;
  setState: (patch: Partial<RegistrationState>) => void;
  clear: () => void;
}

const STORAGE_KEY = 'relod_registration';

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<Partial<RegistrationState>>({});

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (raw) setStateRaw(JSON.parse(raw));
  }, []);

  const setState = (patch: Partial<RegistrationState>) => {
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clear = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setStateRaw({});
  };

  return (
    <RegistrationContext.Provider value={{ state, setState, clear }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
