'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

// Shared across the header balance chip and the wallet page itself, same
// pattern as notifications-store — so crediting a top-up or booking a load
// (which debits the wallet) can push a fresh balance to both without a full
// reload, instead of each place fetching its own stale copy.
let balance: string | null = null;
let lastToken: string | null = null;
const listeners = new Set<(b: string | null) => void>();

function setBalance(next: string | null) {
  balance = next;
  listeners.forEach((fn) => fn(balance));
}

export async function refreshWalletBalance(token: string): Promise<void> {
  lastToken = token;
  try {
    const wallet = await api.getMyWallet(token);
    setBalance(wallet.balance);
  } catch {
    // best-effort — chip keeps showing whatever balance was last known
  }
}

export function useWalletBalance(token: string | undefined): string | null {
  const [value, setValue] = useState(balance);

  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    if (token !== lastToken) refreshWalletBalance(token);
  }, [token]);

  return value;
}

// Below this, a low balance is flagged red so a shipper notices before it
// blocks their next booking; at or above it, green.
export const LOW_BALANCE_THRESHOLD = 5000;

export function balanceColorClass(balance: number): string {
  return balance < LOW_BALANCE_THRESHOLD ? 'text-destructive' : 'text-emerald-600';
}
