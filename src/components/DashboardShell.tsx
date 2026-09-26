'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Package, PlusCircle, Headphones, ChevronDown, Settings } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { cn } from '@/lib/utils';
import { useDisplayName } from '@/lib/use-display-name';
import { navSectionsFor, pathMatches, sectionIsActive } from '@/lib/dashboard-nav';
import { ChangeRequestResultPopup } from './ChangeRequestResultPopup';
import { WalletTopupResultPopup } from './WalletTopupResultPopup';
import { ReverificationPopup } from './ReverificationPopup';
import { SectionTabs } from './dashboard/SectionTabs';
import { MobileBottomBar } from './dashboard/MobileBottomBar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { session } = useSession();

  const displayName = useDisplayName();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on navigation and on any click outside it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accountMenuOpen]);

  if (!session) return null;

  const initial = (displayName || session.userType).charAt(0).toUpperCase();
  const roleLabel = session.userType === 'carrier' ? t('nav.roleCarrier') : t('nav.roleShipper');
  const carrier = session.userType === 'carrier';

  const onPost = pathname === '/postings/new';
  const onBoard = !onPost && pathMatches(pathname, '/postings');
  const navItems = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, active: pathname === '/dashboard' },
    {
      href: '/postings',
      labelKey: carrier ? 'postings.loadBoardTitle' : 'postings.truckBoardTitle',
      icon: Package,
      active: onBoard,
    },
    {
      href: '/postings/new',
      labelKey: carrier ? 'nav.postTruck' : 'nav.postLoad',
      icon: PlusCircle,
      active: onPost,
      // Only the icon is coloured — a quiet shortcut, since the dashboard
      // already has the big Post button.
      accent: true,
    },
    // Settings (with Lanes and Documents) lives in the account menu below.
    ...navSectionsFor(session.userType)
      .filter((section) => section.id !== 'settings')
      .map((section) => ({
        href: section.tabs[0].href,
        labelKey: section.labelKey,
        icon: section.icon,
        active: sectionIsActive(section, pathname),
      })),
  ];
  const settingsSection = navSectionsFor(session.userType).find((section) => section.id === 'settings')!;
  const onAccountPage = sectionIsActive(settingsSection, pathname) || pathMatches(pathname, '/dashboard/support');

  return (
    <div className="flex flex-1 bg-background md:h-screen md:overflow-hidden">
      <ChangeRequestResultPopup />
      <WalletTopupResultPopup />
      <ReverificationPopup />

      {/* Phone / app: the sidebar below is replaced by the bottom bar, so the
          logo sits top-left where the old menu button was (GlobalTopBar's
          language switcher and notification bell occupy top-right). */}
      <Link href="/dashboard" className="fixed top-3 left-3 z-40 flex items-center gap-2 md:hidden">
        <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
        <span className="font-heading text-base font-bold">{t('appName')}</span>
      </Link>
      <MobileBottomBar userType={session.userType} />

      {/* Desktop sidebar, pinned via fixed positioning — inset-y-0 guarantees
          its height is exactly the viewport height, so the user-card/logout
          block at the bottom reliably sits flush at the bottom. */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2">
          <Image src="/logo.png" alt="" width={32} height={32} className="shrink-0" />
          <p className="font-heading text-lg font-bold text-sidebar-foreground">{t('appName')}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ href, labelKey, icon: Icon, active, accent }) => (
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
              <Icon className={cn('size-4', accent && !active && 'text-primary')} />
              <span className="flex-1">{t(labelKey)}</span>
            </Link>
          ))}
        </nav>

        <div ref={accountMenuRef} className="relative mt-4 border-t border-sidebar-border pt-4">
          {accountMenuOpen && (
            <div className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-xl border bg-card p-1 shadow-lg">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <Settings className="size-4 text-muted-foreground" />
                {t('nav.settings')}
              </Link>
              <Link
                href="/dashboard/support"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
              >
                <Headphones className="size-4 text-muted-foreground" />
                {t('nav.help')}
              </Link>
            </div>
          )}
          <button
            onClick={() => setAccountMenuOpen((open) => !open)}
            aria-expanded={accountMenuOpen}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent/60',
              onAccountPage && 'bg-sidebar-accent',
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName || '…'}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', accountMenuOpen && 'rotate-180')} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-64 md:h-full md:overflow-y-auto">
        <main className="flex min-w-0 flex-1 flex-col p-6 pt-16 pb-28 md:pb-6">
          <SectionTabs userType={session.userType} />
          {children}
        </main>
      </div>
    </div>
  );
}
