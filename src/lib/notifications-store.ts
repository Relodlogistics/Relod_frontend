'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

// Shared across NotificationBell and DashboardShell's sidebar badge so both
// stay in sync — previously each fetched its own count once on mount, so
// marking notifications read on the /notifications page never updated the
// other one until a full reload.
let unreadCount = 0;
let lastToken: string | null = null;
const listeners = new Set<(n: number) => void>();

function setUnreadCount(next: number) {
  unreadCount = next;
  listeners.forEach((fn) => fn(unreadCount));
}

export async function refreshUnreadCount(token: string): Promise<void> {
  lastToken = token;
  try {
    const all = await api.listNotifications(token);
    setUnreadCount(all.filter((n) => !n.readAt).length);
  } catch {
    // best-effort — keep whatever count was last known
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  try {
    await api.markAllNotificationsRead(token);
    setUnreadCount(0);
  } catch {
    // best-effort — badge will correct itself on the next refresh
  }
}

export function useUnreadCount(token: string | undefined): number {
  const [count, setCount] = useState(unreadCount);

  useEffect(() => {
    listeners.add(setCount);
    return () => {
      listeners.delete(setCount);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    if (token !== lastToken) refreshUnreadCount(token);
  }, [token]);

  return count;
}
