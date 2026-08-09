'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, Booking } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { boardLocation, formatMoney } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';

export default function BookingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  useEffect(() => {
    if (!session) return;
    api.listMyBookings(session.accessToken).then(setBookings).catch(() => undefined);
  }, [session]);

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('bookingsPage.title')}</h1>

      <Card>
        <CardContent className="py-4">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('bookingsPage.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableLoadId')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableRoute')}</th>
                    <th className="py-2 pr-3 font-medium">{t('bookingsPage.type')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableAmount')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableStatus')}</th>
                    <th className="py-2 font-medium">{t('dashboard.tableBookedOn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const badge = statusBadge(b.status);
                    return (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-accent/40">
                        <td className="py-2.5 pr-3">
                          <Link href={`/bookings/${b.id}`} className="text-primary hover:underline">
                            RL-{b.id.slice(0, 6).toUpperCase()}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {b.posting
                            ? `${boardLocation(b.posting.originCityLabel, b.posting.originLabel)} → ${boardLocation(b.posting.destinations[0]?.cityLabel, b.posting.destinations[0]?.label)}`
                            : '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          {b.bookingType === 'instant_book' ? t('bookingsPage.typeInstant') : t('bookingsPage.typeNegotiated')}
                        </td>
                        <td className="py-2.5 pr-3">
                          {b.agreedPrice ? formatMoney(Number(b.agreedPrice)) : t('postings.notSpecified')}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="py-2.5 whitespace-nowrap text-muted-foreground">
                          {new Date(b.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
