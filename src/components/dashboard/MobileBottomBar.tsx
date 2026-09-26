'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Ellipsis, House, Package, Plus, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navSectionsFor, pathMatches, sectionIsActive, type NavUserType } from '@/lib/dashboard-nav';

/** Phone / app navigation: fixed to the bottom, five slots, Post in the middle. */
export function MobileBottomBar({ userType }: { userType: NavUserType }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const carrier = userType === 'carrier';
  const bookings = navSectionsFor(userType).find((s) => s.id === 'bookings')!;

  const onPost = pathname === '/postings/new';
  const onBoard = !onPost && pathMatches(pathname, '/postings');
  const onBookings = sectionIsActive(bookings, pathname);
  const onHome = pathname === '/dashboard';
  // Everything that lives under More (Money, Settings, Help, ...).
  const onMore = !onPost && !onBoard && !onBookings && !onHome;

  const slot = (active: boolean) =>
    cn(
      'flex w-16 flex-col items-center gap-0.5 text-[11px] font-medium',
      active ? 'text-primary' : 'text-muted-foreground',
    );
  const BoardIcon = carrier ? Package : Truck;
  const BookingsIcon = bookings.icon;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t bg-card px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label={t('nav.mainNavigation')}
    >
      <Link href="/dashboard" className={slot(onHome)}>
        <House className="size-6" />
        {t('nav.home')}
      </Link>
      <Link href="/postings" className={slot(onBoard)}>
        <BoardIcon className="size-6" />
        {t(carrier ? 'nav.loads' : 'nav.trucks')}
      </Link>
      <Link href="/postings/new" className={slot(onPost)}>
        <span className="-mt-6 flex size-12 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground">
          <Plus className="size-6" />
        </span>
        {t('nav.post')}
      </Link>
      <Link href={bookings.tabs[0].href} className={slot(onBookings)}>
        <BookingsIcon className="size-6" />
        {t('nav.bookings')}
      </Link>
      <Link href="/more" className={slot(onMore)}>
        <Ellipsis className="size-6" />
        {t('nav.more')}
      </Link>
    </nav>
  );
}
