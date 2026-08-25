'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, Booking, BookingTracking } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { boardLocation, formatMoney, googleMapsDirectionsUrl, timeAgo } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';
import LiveTrackingMap from '@/components/LiveTrackingMap';

const TRACKING_POLL_INTERVAL_MS = 20000;

function CurrentLoadCard({ booking, tracking }: { booking: Booking; tracking: BookingTracking | null }) {
  const { t } = useTranslation();
  const badge = statusBadge(booking.status);
  const destination = booking.posting?.destinations[0];

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <MapPin className="size-4 shrink-0 text-violet-600" />
            {boardLocation(booking.posting?.originCityLabel, booking.posting?.originLabel)}
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            {boardLocation(destination?.cityLabel, destination?.label)}
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {tracking?.latestPing && booking.posting && destination ? (
          <LiveTrackingMap
            origin={{ lat: Number(booking.posting.originLat), lng: Number(booking.posting.originLng) }}
            destination={{ lat: Number(destination.lat), lng: Number(destination.lng) }}
            current={{ lat: Number(tracking.latestPing.lat), lng: Number(tracking.latestPing.lng) }}
            trail={tracking.history.map((h) => ({ lat: Number(h.lat), lng: Number(h.lng) }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t('bookingDetail.noLocationYet')}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          {tracking?.latestPing && booking.posting && destination ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {t('bookingDetail.lastUpdated', { time: timeAgo(tracking.latestPing.recordedAt) })}
              </p>
              <a
                href={googleMapsDirectionsUrl(
                  { lat: Number(booking.posting.originLat), lng: Number(booking.posting.originLng) },
                  { lat: Number(destination.lat), lng: Number(destination.lng) },
                  { lat: Number(tracking.latestPing.lat), lng: Number(tracking.latestPing.lng) },
                )}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <MapPin className="size-3" />
                {t('bookingDetail.openInMaps')}
              </a>
            </div>
          ) : (
            <span />
          )}
          <Link href={`/bookings/${booking.id}`}>
            <Button variant="outline" size="sm">
              {t('dashboard.viewDetails')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrackingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trackingByBookingId, setTrackingByBookingId] = useState<Record<string, BookingTracking>>({});

  useEffect(() => {
    if (session) api.listMyBookings(session.accessToken).then(setBookings).catch(() => undefined);
  }, [session]);

  // Only shippers track shipments — a carrier has no use for this page.
  useEffect(() => {
    if (session?.userType === 'carrier') router.replace('/dashboard');
  }, [session, router]);

  const currentLoads = bookings.filter((b) => b.status === 'in_transit');

  useEffect(() => {
    if (!session || currentLoads.length === 0) return;
    let cancelled = false;
    const refresh = () => {
      Promise.all(
        currentLoads.map((b) =>
          api
            .getBookingTracking(session.accessToken, b.id)
            .then((tr) => [b.id, tr] as const)
            .catch(() => null),
        ),
      ).then((results) => {
        if (cancelled) return;
        setTrackingByBookingId((prev) => {
          const next = { ...prev };
          for (const r of results) if (r) next[r[0]] = r[1];
          return next;
        });
      });
    };
    refresh();
    const interval = setInterval(refresh, TRACKING_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, currentLoads.map((b) => b.id).join(',')]);

  if (!session || session.userType === 'carrier') return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('tracking.title')}</h1>

      {currentLoads.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">{t('tracking.currentLoadsTitle')}</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {currentLoads.map((b) => (
              <CurrentLoadCard key={b.id} booking={b} tracking={trackingByBookingId[b.id] ?? null} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="py-4">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('tracking.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableLoadId')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableRoute')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableAmount')}</th>
                    <th className="py-2 font-medium">{t('dashboard.tableStatus')}</th>
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
                          {b.agreedPrice ? formatMoney(Number(b.agreedPrice)) : t('postings.notSpecified')}
                        </td>
                        <td className="py-2.5">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
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
