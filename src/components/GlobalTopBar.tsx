'use client';

import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';

// The (marketing) route group renders its own header — with its own nav,
// language switcher, and login/register CTAs — so this floating bar would
// duplicate the language switcher there. Hide it on those public pages.
const MARKETING_PATHS = ['/', '/about', '/contact', '/faq', '/terms', '/privacy'];

export function GlobalTopBar() {
  const pathname = usePathname();
  if (MARKETING_PATHS.includes(pathname)) return null;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      <NotificationBell />
      <LanguageSwitcher />
    </div>
  );
}
