'use client';

import Link from 'next/link';
import { WalletCards } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { useWalletBalance } from '@/lib/wallet-store';
import { formatMoney } from '@/lib/utils';

// Wallet is a shipper-only concept — carriers get paid via CarrierPayout,
// not a wallet — so this renders nothing for a carrier session, same as
// how DashboardShell hides the sidebar "Wallet" item for carriers.
export function WalletBalanceChip() {
  const { session } = useSession();
  const balance = useWalletBalance(session?.accessToken);

  if (!session || session.userType !== 'shipper') return null;

  return (
    <Link
      href="/dashboard/wallet"
      className="flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium text-foreground shadow-sm hover:bg-accent/40"
    >
      <WalletCards className="size-4 text-muted-foreground" />
      {balance === null ? '—' : formatMoney(Number(balance))}
    </Link>
  );
}
