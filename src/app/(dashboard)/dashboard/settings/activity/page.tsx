'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, Vehicle } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { useChangeRequests } from '@/lib/use-change-requests';
import { FIELD_LABEL_KEY } from '@/lib/change-request-labels';

const STATUS_BADGE_VARIANT = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
} as const;

// A carrier/shipper's own history of change requests — what they asked to
// change, whether it went through, and why not when it didn't. Pulled out
// of the inline "Your last request was rejected: <admin note>" text under
// each field (still there as a pointer here) since dumping that raw text
// next to the field read oddly and buried anything older than the most
// recent request.
export default function SettingsActivityPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const cr = useChangeRequests(session, t);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!session || session.userType !== 'carrier') return;
    api.listMyVehicles(session.accessToken).then(setVehicles).catch(() => undefined);
  }, [session]);

  if (!session) return null;

  const registrationNumberFor = (vehicleId: string | null) =>
    vehicleId ? vehicles.find((v) => v.id === vehicleId)?.registrationNumber : undefined;

  const sorted = [...cr.changeRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-heading text-xl font-semibold">{t('settingsPage.navActivity')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.activityTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('settingsPage.noActivity')}</p>
          )}
          {sorted.map((r) => {
            const regNumber = registrationNumberFor(r.vehicleId);
            return (
              <div key={r.id} className="flex flex-col gap-1 border-t pt-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {t(FIELD_LABEL_KEY[r.fieldName])}
                    {regNumber ? ` · ${regNumber}` : ''}
                  </p>
                  <Badge variant={STATUS_BADGE_VARIANT[r.status]}>
                    {t(`settingsPage.activityStatus.${r.status}`)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('settingsPage.activityRequestedValue', { value: r.requestedValue })}
                </p>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
                {r.status === 'rejected' && r.adminNote && (
                  <p className="text-xs text-destructive">
                    {t('settingsPage.activityAdminNote', { note: r.adminNote })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
