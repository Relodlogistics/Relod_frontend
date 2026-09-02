'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ClipboardList,
  Truck,
  Route,
  Wallet,
  WalletCards,
  FileText,
  MessageSquare,
  Headphones,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useDisplayName } from '@/lib/use-display-name';
import { useUnreadCount } from '@/lib/notifications-store';
import { ChangeRequestResultPopup } from './ChangeRequestResultPopup';

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
    { href: '/lanes', labelKey: 'nav.lanes', icon: Route },
    // Wallet (pre-loaded credits) is a shipper concept only — carriers get
    // paid via CarrierPayout, not a wallet.
    ...(userType === 'shipper'
      ? [{ href: '/dashboard/wallet', labelKey: 'nav.wallet', icon: WalletCards }]
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
  const unreadCount = useUnreadCount(session?.accessToken);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close the mobile drawer automatically on navigation — otherwise it'd
  // stay open over the new page after tapping a nav link.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileNavOpen(false);
  }, [pathname]);

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

  const navItems = navItemsFor(session.userType);
  // Every item whose href fits the current path (exact match, or a real
  // sub-route via a trailing "/"), keeping only the longest one — otherwise
  // "/postings" and "/postings/new" both matched "/postings/new" and lit up
  // two nav items at once.
  const activeHref = navItems
    .filter(({ href }) => pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex flex-1 bg-background md:h-screen md:overflow-hidden">
      <ChangeRequestResultPopup />
      {/* Hamburger button — the sidebar below is a fixed-width, always-visible
          block on desktop, but becomes a slide-in drawer on mobile (see the
          aside's responsive classes). Placed top-left since GlobalTopBar's
          language switcher/notification bell already occupy top-right. */}
      <button
        onClick={() => setMobileNavOpen(true)}
        aria-label={t('nav.openMenu')}
        className="fixed top-3 left-3 z-40 flex size-9 items-center justify-center rounded-lg border bg-card shadow-sm md:hidden"
      >
        <Menu className="size-4" />
      </button>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Pinned via fixed positioning at every breakpoint (not just mobile) —
          inset-y-0 guarantees its height is exactly the viewport height, so
          the user-card/logout block at the bottom reliably sits flush at the
          bottom instead of depending on flex-stretch from its row parent. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 transition-transform duration-200 md:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={32} height={32} className="shrink-0" />
            <p className="font-heading text-lg font-bold text-sidebar-foreground">{t('appName')}</p>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label={t('nav.closeMenu')}
            className="text-muted-foreground md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ href, labelKey, icon: Icon }) => {
            const active = href === activeHref;
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

      <div className="flex min-w-0 flex-1 flex-col md:h-full md:overflow-y-auto md:ml-64">
        <main className="flex min-w-0 flex-1 flex-col p-6 pt-16">{children}</main>
      </div>
    </div>
  );
}
