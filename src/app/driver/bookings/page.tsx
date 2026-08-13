'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, ApiError, Booking } from '@/lib/api';
import { useDriverSession } from '@/lib/driver-session-context';
import { DriverShell } from '@/components/DriverShell';
import { boardLocation, formatMoney } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';

export default function DriverBookingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { driverSession, loaded } = useDriverSession();

  const [items, setItems] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!driverSession) {
      router.replace('/driver/login');
      return;
    }
    api
      .driverListMyBookings(driverSession.accessToken)
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, driverSession]);

  if (!driverSession) return null;

  return (
    <DriverShell>
      <h1 className="font-heading text-lg font-semibold">{t('driverDashboard.navBookings')}</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">{t('driverDashboard.noBookingsYet')}</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((booking) => {
          const badge = statusBadge(booking.status);
          return (
            <Link key={booking.id} href={`/driver/bookings/${booking.id}`}>
              <Card className="hover:bg-accent/40">
                <CardContent className="flex items-center justify-between gap-2 py-4">
                  <div className="flex flex-col gap-1">
                    {booking.posting ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="size-3.5 shrink-0 text-violet-600" />
                        <span className="truncate">
                          {boardLocation(booking.posting.originCityLabel, booking.posting.originLabel)}
                        </span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {boardLocation(
                            booking.posting.destinations[0]?.cityLabel,
                            booking.posting.destinations[0]?.label,
                          )}
                        </span>
                      </div>
                    ) : null}
                    {booking.agreedPrice && (
                      <p className="text-sm text-muted-foreground">{formatMoney(Number(booking.agreedPrice))}</p>
                    )}
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </DriverShell>
  );
}
