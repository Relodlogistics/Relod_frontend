'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api, ApiError, AwaitingOwnerVehicle, ClaimableVehicle } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { truckTypeLabel } from '@/lib/truck-types';

// Two sides of the "truck listed by someone who isn't its owner" flow: an
// owner sees trucks a transporter listed under their phone number and can
// accept them; the transporter sees which trucks they listed are still
// waiting for their owner to join. Renders nothing when neither applies.
export function OwnershipCards() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [claimable, setClaimable] = useState<ClaimableVehicle[]>([]);
  const [awaiting, setAwaiting] = useState<AwaitingOwnerVehicle[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCarrier = session?.userType === 'carrier';

  const load = useCallback(() => {
    if (!session || !isCarrier) return;
    api.listClaimableVehicles(session.accessToken).then(setClaimable).catch(() => undefined);
    api.listAwaitingOwnerVehicles(session.accessToken).then(setAwaiting).catch(() => undefined);
  }, [session, isCarrier]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClaim = async (vehicleId: string) => {
    if (!session) return;
    setError(null);
    setClaimingId(vehicleId);
    try {
      await api.claimVehicle(session.accessToken, vehicleId);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setClaimingId(null);
    }
  };

  if (claimable.length === 0 && awaiting.length === 0) return null;

  return (
    <>
      {claimable.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  {t('ownership.claimableTitle', { count: claimable.length })}
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  {t('ownership.claimableDesc')}
                </p>
              </div>
            </div>
            {claimable.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background/60 px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{v.registrationNumber}</span>
                  <span className="text-muted-foreground">
                    {' · '}
                    {truckTypeLabel(v.truckType)}
                    {v.listedBy ? ` · ${t('ownership.listedBy', { name: v.listedBy })}` : ''}
                  </span>
                </div>
                <Button size="sm" disabled={claimingId === v.id} onClick={() => handleClaim(v.id)}>
                  {t('ownership.claim')}
                </Button>
              </div>
            ))}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {awaiting.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t('ownership.awaitingTitle', { count: awaiting.length })}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200">{t('ownership.awaitingDesc')}</p>
            {awaiting.map((v) => (
              <p key={v.id} className="text-sm">
                <span className="font-medium">{v.registrationNumber}</span>
                <span className="text-muted-foreground">
                  {v.pendingOwnerPhone ? ` · ${t('ownership.invited', { phone: v.pendingOwnerPhone })}` : ''}
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
