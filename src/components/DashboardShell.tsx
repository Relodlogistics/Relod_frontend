'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ClipboardList,
  Truck,
  Wallet,
  FileText,
  MessageSquare,
  Headphones,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useDisplayName } from '@/lib/use-display-name';

function navItemsFor(userType: 'carrier' | 'shipper') {
  return [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/postings', labelKey: userType === 'carrier' ? 'postings.loadBoardTitle' : 'postings.truckBoardTitle', icon: Package },
    {
      href: '/postings/new',
      labelKey: userType === 'carrier' ? 'nav.postTruck' : 'nav.postLoad',
      icon: PlusCircle,
    },
    { href: '/bookings', labelKey: 'nav.bookings', icon: ClipboardList },
    // Only shippers need to track shipments in transit — a carrier's own truck isn't something they "track".
    ...(userType === 'shipper'
      ? [{ href: '/dashboard/tracking', labelKey: 'nav.trackShipments', icon: Truck }]
      : []),
    { href: '/dashboard/payments', labelKey: 'nav.payments', icon: Wallet },
    { href: '/dashboard/documents', labelKey: 'nav.documents', icon: FileText },
    { href: '/dashboard/messages', labelKey: 'nav.messages', icon: MessageSquare },
    { href: '/dashboard/support', labelKey: 'nav.support', icon: Headphones },
    { href: '/dashboard/settings', labelKey: 'nav.settings', icon: Settings },
  ];
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { session, clearSession } = useSession();

  const displayName = useDisplayName();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    api
      .listNotifications(session.accessToken)
      .then((all) => setUnreadCount(all.filter((n) => !n.readAt).length))
      .catch(() => undefined);
  }, [session]);

  if (!session) return null;

  const handleLogout = async () => {
    // Best-effort — invalidates the token server-side so a copy of it (if
    // ever stolen) can't keep being used after this device logs out. If the
    // request fails (offline, etc.), still clear locally rather than trap
    // the user on the page.
    try {
      await api.logout(session.accessToken);
    } catch {
      // ignore — see comment above
    }
    clearSession();
    router.push('/login');
  };

  const initial = (displayName || session.userType).charAt(0).toUpperCase();
  const roleLabel = session.userType === 'carrier' ? t('nav.roleCarrier') : t('nav.roleShipper');

  return (
    <div className="flex flex-1 bg-background">
      <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-base font-bold text-primary-foreground">
            R
          </div>
          <p className="font-heading text-lg font-bold text-sidebar-foreground">{t('appName')}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItemsFor(session.userType).map(({ href, labelKey, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            const showBadge = href === '/dashboard/messages' && unreadCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60',
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1">{t(labelKey)}</span>
                {showBadge && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName || '…'}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60"
          >
            <LogOut className="size-4" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col p-6 pt-16">{children}</main>
      </div>
    </div>
  );
}
