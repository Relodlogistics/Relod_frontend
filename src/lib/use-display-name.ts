'use client';

import { useEffect, useState } from 'react';
import { useSession } from './session-context';
import { api } from './api';

/** Shipper's businessName (falling back to fullName) or carrier's fullName. */
export function useDisplayName(): string {
  const { session } = useSession();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!session) return;
    const load =
      session.userType === 'carrier'
        ? api.getCarrierProfile(session.accessToken, session.accountId)
        : api.getShipperProfile(session.accessToken, session.accountId);
    load
      .then((profile) => {
        setName('businessName' in profile ? profile.businessName || profile.fullName : profile.fullName);
      })
      .catch(() => undefined);
  }, [session]);

  return name;
}
