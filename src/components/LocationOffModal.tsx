'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPinOff } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { api, Vehicle } from '@/lib/api';
import { isNativeApp, openLocationSettings, useLiveTrackingStatus } from '@/lib/carrier-live-tracking';
import { Button } from '@/components/ui/button';

const SNOOZE_MS = 5 * 60 * 1000;

/**
 * Blocking-ish popup shown the moment location tracking drops to 'off' —
 * the status pill alone is easy to miss, and this is business-critical for
 * carriers (shippers can't match loads to a truck with no live position).
 * "Not now" only snoozes it; it comes back if still off after a few minutes,
 * same idea as the background local-notification reminder in
 * carrier-live-tracking.ts but for while the app is actually open.
 */
export function LocationOffModal() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
  const [snoozedAt, setSnoozedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session || session.userType !== 'carrier' || !isNativeApp()) return;
    api
      .listMyVehicles(session.accessToken)
      .then((vehicles: Vehicle[]) => setVehicleId(vehicles[0]?.id))
      .catch(() => undefined);
  }, [session]);

  const status = useLiveTrackingStatus(session?.accessToken, vehicleId);

  useEffect(() => {
    if (status !== 'off') return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      clearInterval(id);
      setSnoozedAt(null);
    };
  }, [status]);

  if (!session || session.userType !== 'carrier' || !isNativeApp() || !vehicleId) return null;
  if (status !== 'off') return null;
  if (snoozedAt && now - snoozedAt < SNOOZE_MS) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-lg">
        <MapPinOff className="size-8 text-destructive" />
        <h2 className="font-heading text-lg font-semibold">{t('tracking.locationOffTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('tracking.locationOffMessage')}</p>
        <Button className="w-full" onClick={() => openLocationSettings()}>
          {t('tracking.locationOffButton')}
        </Button>
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setSnoozedAt(Date.now())}
        >
          {t('tracking.notNow')}
        </button>
      </div>
    </div>
  );
}
