'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, PlusCircle, Package, ClipboardList, LogOut } from 'lucide-react';
import { useDriverSession } from '@/lib/driver-session-context';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/driver/dashboard', labelKey: 'driverDashboard.navTruck', icon: LayoutDashboard },
  { href: '/driver/postings', labelKey: 'driverDashboard.navPostTruck', icon: PlusCircle },
  { href: '/driver/loads', labelKey: 'driverDashboard.navFindLoads', icon: Package },
  { href: '/driver/bookings', labelKey: 'driverDashboard.navBookings', icon: ClipboardList },
];

// Deliberately much smaller than DashboardShell — a driver only ever manages
// one truck and a handful of actions (post/browse/accept/message), not the
// owner's full fleet/payments/settings surface.
export function DriverShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { driverSession, clearDriverSession } = useDriverSession();

  if (!driverSession) return null;

  const handleLogout = () => {
    clearDriverSession();
    router.push('/driver/login');
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <Logo />
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-1.5 size-4" />
          {t('nav.logout')}
        </Button>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || (href !== '/driver/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap',
                active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
