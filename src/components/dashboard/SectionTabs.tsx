'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { navSectionsFor, type NavUserType } from '@/lib/dashboard-nav';

/**
 * Tab strip shown at the top of a grouped section's list pages (Bookings /
 * Live tracking, Wallet / Payment history, Settings / Lanes / Documents).
 * Only on the tab pages themselves — a booking's detail page keeps its own
 * layout.
 */
export function SectionTabs({ userType }: { userType: NavUserType }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const section = navSectionsFor(userType).find((s) => s.tabs.some((tab) => tab.href === pathname));
  if (!section || section.tabs.length < 2) return null;

  return (
    <div className="mb-4 flex gap-6 overflow-x-auto border-b">
      {section.tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'relative shrink-0 pb-2.5 text-sm font-medium transition-colors',
            tab.href === pathname
              ? 'text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(tab.labelKey)}
        </Link>
      ))}
    </div>
  );
}
