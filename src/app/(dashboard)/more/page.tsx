'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ChevronRight, FileText, Headphones, LogOut, Route, Settings, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { useDisplayName } from '@/lib/use-display-name';

// Phone / app "More" page: everything that isn't one of the five bottom-bar
// slots. On desktop these all live in the sidebar, so this page is only linked
// from the bottom bar.
export default function MorePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, clearSession } = useSession();
  const displayName = useDisplayName();
  if (!session) return null;

  const rows = [
    { href: session.userType === 'shipper' ? '/dashboard/wallet' : '/dashboard/payments', label: t('nav.money'), icon: Wallet },
    { href: '/lanes', label: t('nav.lanes'), icon: Route },
    ...(session.userType === 'carrier'
      ? [{ href: '/dashboard/documents', label: t('nav.documents'), icon: FileText }]
      : []),
    { href: '/dashboard/settings', label: t('nav.settings'), icon: Settings },
    { href: '/dashboard/support', label: t('nav.help'), icon: Headphones },
  ];

  const handleLogout = async () => {
    try {
      await api.logout(session.accessToken);
    } catch {
      // still clear locally, same as the desktop sidebar's logout
    }
    clearSession();
    router.push('/login');
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
          {(displayName || session.userType).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName || '…'}</p>
          <p className="text-xs text-muted-foreground">
            {session.userType === 'carrier' ? t('nav.roleCarrier') : t('nav.roleShipper')}
          </p>
        </div>
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {rows.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3.5 text-sm">
            <Icon className="size-5 text-muted-foreground" />
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
        <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm text-destructive">
          <LogOut className="size-5" />
          <span className="flex-1 text-left font-medium">{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );
}
