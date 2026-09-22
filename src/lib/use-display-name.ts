'use client';

import { useEffect, useState } from 'react';
import { useSession } from './session-context';
import { api } from './api';

/** The account's businessName when it has one (shippers, and carriers trading as a company), else fullName. */
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
        setName(profile.businessName || profile.fullName);
      })
      .catch(() => undefined);
  }, [session]);

  return name;
}
