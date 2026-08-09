'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Users, ClipboardList, Wallet, Headphones, ShieldCheck, LogOut } from 'lucide-react';
import { useAdminSession } from '@/lib/admin-session-context';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/admin/accounts', labelKey: 'admin.navAccounts', icon: Users },
  { href: '/admin/oversight', labelKey: 'admin.navOversight', icon: ClipboardList },
  { href: '/admin/payments', labelKey: 'admin.navPayments', icon: Wallet },
  { href: '/admin/support', labelKey: 'admin.navSupport', icon: Headphones },
  { href: '/admin/users', labelKey: 'admin.navAdminUsers', icon: ShieldCheck, superAdminOnly: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { adminSession, clearAdminSession } = useAdminSession();

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
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-base font-bold text-primary-foreground">
            R
          </div>
          <p className="font-heading text-lg font-bold text-sidebar-foreground">{t('admin.panelName')}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.filter((item) => !item.superAdminOnly || adminSession.admin.role === 'super_admin').map(
            ({ href, labelKey, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
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
