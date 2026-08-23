'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight, CalendarDays, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, Posting } from '@/lib/api';
import { useDriverSession } from '@/lib/driver-session-context';
import { DriverShell } from '@/components/DriverShell';
import { boardLocation, formatMoney } from '@/lib/utils';

export default function DriverLoadsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { driverSession, loaded } = useDriverSession();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [items, setItems] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actingId, setActingId] = useState<string | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loaded && !driverSession) router.replace('/driver/login');
  }, [loaded, driverSession, router]);

  const fetchResults = async () => {
    if (!driverSession) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.driverSearchPostings(driverSession.accessToken, {
        origin: origin || undefined,
        destination: destination || undefined,
      });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverSession]);

  const handleBook = async (postingId: string) => {
    if (!driverSession) return;
    setError(null);
    setActingId(postingId);
    try {
      await api.driverBookPosting(driverSession.accessToken, postingId);
      setBookedIds((prev) => new Set(prev).add(postingId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setActingId(null);
    }
  };

  if (!driverSession) return null;

  return (
    <DriverShell>
      <div>
        <h1 className="font-heading text-lg font-semibold">{t('driverDashboard.findLoadsTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('driverDashboard.findLoadsSubtitle')}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder={t('postings.originPlaceholder')}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
            <Input
              placeholder={t('postings.destinationPlaceholder')}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <Button onClick={fetchResults} disabled={loading}>
            <Search className="size-4" />
            {t('dashboard.searchLoad')}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('postings.emptyFiltered')}</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((posting) => {
          const isBooked = bookedIds.has(posting.id);
          return (
            <Card key={posting.id}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <MapPin className="size-3.5 shrink-0 text-violet-600" />
                  <span className="truncate">{boardLocation(posting.originCityLabel, posting.originLabel)}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {boardLocation(posting.destinations[0]?.cityLabel, posting.destinations[0]?.label)}
                  </span>
                </div>
                <p className="text-lg font-semibold">
                  {posting.priceAmount ? formatMoney(Number(posting.priceAmount)) : t('postings.notSpecified')}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {new Date(posting.availableFromDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1"
                    disabled={isBooked || actingId === posting.id}
                    onClick={() => handleBook(posting.id)}
                  >
                    {isBooked ? t('postings.bookingConfirmed') : t('postings.book')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DriverShell>
  );
}
