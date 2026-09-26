import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Settings, Wallet } from 'lucide-react';

export type NavUserType = 'carrier' | 'shipper';

export interface NavTab {
  href: string;
  labelKey: string;
}

/** A sidebar item / bottom-bar slot that groups several related pages as tabs. */
export interface NavSection {
  id: 'bookings' | 'money' | 'settings';
  labelKey: string;
  icon: LucideIcon;
  tabs: NavTab[];
}

// Related pages live under one entry instead of each having its own sidebar
// row — the pages themselves keep their existing routes; SectionTabs shows the
// tab strip on top of them.
export function navSectionsFor(userType: NavUserType): NavSection[] {
  const shipper = userType === 'shipper';
  return [
    {
      id: 'bookings',
      labelKey: 'nav.bookings',
      icon: ClipboardList,
      tabs: [
        { href: '/bookings', labelKey: shipper ? 'nav.allBookings' : 'nav.bookings' },
        ...(shipper ? [{ href: '/dashboard/tracking', labelKey: 'nav.liveTracking' }] : []),
      ],
    },
    {
      id: 'money',
      labelKey: 'nav.money',
      icon: Wallet,
      tabs: [
        // Wallet (pre-loaded credits) is a shipper concept only — carriers get
        // paid via CarrierPayout, not a wallet.
        ...(shipper ? [{ href: '/dashboard/wallet', labelKey: 'nav.wallet' }] : []),
        { href: '/dashboard/payments', labelKey: shipper ? 'nav.paymentHistory' : 'nav.payments' },
      ],
    },
    {
      id: 'settings',
      labelKey: 'nav.settings',
      icon: Settings,
      tabs: [
        { href: '/dashboard/settings', labelKey: 'nav.settings' },
        { href: '/lanes', labelKey: 'nav.lanes' },
        // Vehicle documents (insurance, fitness, ...) — nothing for a shipper to
        // upload, so their Documents page would only ever say "not required".
        ...(shipper ? [] : [{ href: '/dashboard/documents', labelKey: 'nav.documents' }]),
      ],
    },
  ];
}

export const pathMatches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export const sectionIsActive = (section: NavSection, pathname: string) =>
  section.tabs.some((tab) => pathMatches(pathname, tab.href));
