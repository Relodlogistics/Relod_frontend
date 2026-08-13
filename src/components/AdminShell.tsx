'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Users, ClipboardList, Wallet, Headphones, ShieldCheck, ClipboardCheck, LogOut } from 'lucide-react';
import { useAdminSession } from '@/lib/admin-session-context';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/admin/accounts', labelKey: 'admin.navAccounts', icon: Users },
  { href: '/admin/oversight', labelKey: 'admin.navOversight', icon: ClipboardList },
  { href: '/admin/payments', labelKey: 'admin.navPayments', icon: Wallet },
  { href: '/admin/support', labelKey: 'admin.navSupport', icon: Headphones },
  { href: '/admin/change-requests', labelKey: 'admin.navChangeRequests', icon: ClipboardCheck },
  { href: '/admin/users', labelKey: 'admin.navAdminUsers', icon: ShieldCheck, superAdminOnly: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { adminSession, clearAdminSession } = useAdminSession();
  const [unseenChangeRequests, setUnseenChangeRequests] = useState(0);

  // Re-checked on every navigation, and also instantly on the
  // 'admin-change-requests-seen' event the Change Requests page fires right
  // after marking itself seen — without that second path the badge would
  // keep showing the stale count for as long as the admin stayed on that
  // page, since pathname alone wouldn't change until they navigated away.
  useEffect(() => {
    if (!adminSession) return;
    const refresh = () => {
      api
        .adminCountUnseenChangeRequests(adminSession.accessToken)
        .then((res) => setUnseenChangeRequests(res.count))
        .catch(() => undefined);
    };
    refresh();
    window.addEventListener('admin-change-requests-seen', refresh);
    return () => window.removeEventListener('admin-change-requests-seen', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession, pathname]);

  if (!adminSession) return null;

  const handleLogout = async () => {
    try {
      await api.adminLogout(adminSession.accessToken);
    } catch {
      // best-effort — still clear locally even if the request fails
    }
    clearAdminSession();
    router.push('/admin/login');
  };

  const initial = adminSession.admin.name.charAt(0).toUpperCase();
  const roleLabel = t(`admin.role_${adminSession.admin.role}`);

  return (
    <div className="flex flex-1 bg-background">
      <aside className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Image src="/logo.png" alt="" width={32} height={32} className="shrink-0" />
          <p className="font-heading text-lg font-bold text-sidebar-foreground">{t('admin.panelName')}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.filter((item) => !item.superAdminOnly || adminSession.admin.role === 'super_admin').map(
            ({ href, labelKey, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              const showBadge = href === '/admin/change-requests' && unseenChangeRequests > 0;
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
                      {unseenChangeRequests}
                    </span>
                  )}
                </Link>
              );
            },
          )}
        </nav>

        <div className="mt-4 flex flex-col gap-1 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{adminSession.admin.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60"
          >
            <LogOut className="size-4" />
            {t('admin.logout')}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
