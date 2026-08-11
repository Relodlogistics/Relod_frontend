'use client';

import { useEffect, useState } from 'react';
import { MapPin, MapPinOff } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { api, Vehicle } from '@/lib/api';
import { isNativeApp, openLocationSettings, useLiveTrackingStatus } from '@/lib/carrier-live-tracking';
import { cn } from '@/lib/utils';

// Only carriers have a vehicle to broadcast a position for, and this whole
// feature is meaningless outside the native app shell (a browser tab can't
// keep reporting location once backgrounded) — self-gates on both rather
// than making every call site remember to check.
export function LiveTrackingIndicator() {
  const { session } = useSession();
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!session || session.userType !== 'carrier' || !isNativeApp()) return;
    api
      .listMyVehicles(session.accessToken)
      .then((vehicles: Vehicle[]) => setVehicleId(vehicles[0]?.id))
      .catch(() => undefined);
  }, [session]);

  const status = useLiveTrackingStatus(session?.accessToken, vehicleId);

  if (!session || session.userType !== 'carrier' || !isNativeApp() || !vehicleId) return null;

  const isLive = status === 'live';
  const isOff = status === 'off';

  return (
    <button
      type="button"
      onClick={isOff ? () => openLocationSettings() : undefined}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium shadow-sm',
        isLive && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        isOff && 'border-destructive/30 bg-destructive/10 text-destructive',
        !isLive && !isOff && 'border bg-card text-muted-foreground',
      )}
    >
      {isLive ? <MapPin className="size-3.5" /> : <MapPinOff className="size-3.5" />}
      {isLive ? 'Live' : isOff ? 'Location off' : 'Starting…'}
    </button>
  );
}
