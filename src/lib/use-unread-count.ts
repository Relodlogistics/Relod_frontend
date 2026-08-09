'use client';

import { useEffect, useState } from 'react';
import { useSession } from './session-context';
import { api } from './api';

export function useUnreadCount(): number {
  const { session } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    api
      .listNotifications(session.accessToken)
      .then((all) => setCount(all.filter((n) => !n.readAt).length))
      .catch(() => undefined);
  }, [session]);

  return count;
}
