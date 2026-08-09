'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Route } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, LanePreference } from '@/lib/api';
import { useSession } from '@/lib/session-context';

export default function LanesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [lanes, setLanes] = useState<LanePreference[]>([]);
  const [originLabel, setOriginLabel] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [radiusKm, setRadiusKm] = useState('50');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  const refresh = async () => {
    if (!session) return;
    setLanes(await api.listLanePreferences(session.accessToken));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const resolvePlace = async (query: string) => {
    if (!session) throw new Error('no session');
    const results = await api.geocodeSearch(session.accessToken, query);
    if (results.length === 0) throw new ApiError(t('postings.placeNotFound'), 404);
    return results[0];
  };

  const handleAdd = async () => {
    if (!session || !originLabel || !destinationLabel) return;
    setError(null);
    setLoading(true);
    try {
      const [origin, destination] = await Promise.all([
        resolvePlace(originLabel),
        resolvePlace(destinationLabel),
      ]);
      await api.createLanePreference(session.accessToken, {
        originLabel,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLabel,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        radiusKm: Number(radiusKm),
      });
      setOriginLabel('');
      setDestinationLabel('');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!session) return;
    await api.deleteLanePreference(session.accessToken, id);
    await refresh();
  };

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('lanes.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('lanes.subtitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('lanes.originLabel')}</Label>
              <Input value={originLabel} onChange={(e) => setOriginLabel(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('lanes.destinationLabel')}</Label>
              <Input value={destinationLabel} onChange={(e) => setDestinationLabel(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('lanes.radiusKm')}</Label>
            <Input value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} className="w-32" />
          </div>
          <Button
            onClick={handleAdd}
            disabled={loading || !originLabel || !destinationLabel}
            className="w-fit"
          >
            {t('lanes.add')}
          </Button>
        </CardContent>
      </Card>

      {lanes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('lanes.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lanes.map((lane) => (
            <Card key={lane.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <Route className="size-4" />
                  </div>
                  <p className="text-sm font-medium">
                    {lane.originLabel} → {lane.destinationLabel}{' '}
                    <span className="font-normal text-muted-foreground">({lane.radiusKm}km)</span>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleRemove(lane.id)}>
                  {t('lanes.remove')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
