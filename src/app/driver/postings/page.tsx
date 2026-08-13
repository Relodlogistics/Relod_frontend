'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, ArrowRight, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError, Posting } from '@/lib/api';
import { useDriverSession } from '@/lib/driver-session-context';
import { DriverShell } from '@/components/DriverShell';
import { boardLocation, formatMoney } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';

export default function DriverMyPostingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { driverSession, loaded } = useDriverSession();

  const [items, setItems] = useState<Posting[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!driverSession) {
      router.replace('/driver/login');
      return;
    }
    api
      .driverListMyPostings(driverSession.accessToken)
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, driverSession]);

  if (!driverSession) return null;

  return (
    <DriverShell>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold">{t('driverDashboard.myPostingsTitle')}</h1>
        <Link href="/driver/postings/new">
          <Button size="sm">
            <PlusCircle className="size-4" />
            {t('driverDashboard.navPostTruck')}
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">{t('driverDashboard.noPostingsYet')}</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((posting) => {
          const badge = statusBadge(posting.status);
          return (
            <Card key={posting.id}>
              <CardContent className="flex items-center justify-between gap-2 py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="size-3.5 shrink-0 text-violet-600" />
                    <span className="truncate">{boardLocation(posting.originCityLabel, posting.originLabel)}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {boardLocation(posting.destinations[0]?.cityLabel, posting.destinations[0]?.label)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {posting.priceAmount ? formatMoney(Number(posting.priceAmount)) : t('postings.notSpecified')}
                  </p>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DriverShell>
  );
}
