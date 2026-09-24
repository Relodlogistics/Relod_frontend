'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ChangeRequest } from '@/lib/api';
import { FIELD_LABEL_KEY } from '@/lib/change-request-labels';

const STATUS_BADGE_VARIANT = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
} as const;

// Sits in the right-side column next to a settings page's field list —
// pulls the same change-request data those fields already have, so the
// person can see what they've asked for without hunting for it. Full
// history (older than `limit`, or from other settings pages) lives at
// /dashboard/settings/activity.
export function RecentActivityCard({
  changeRequests,
  registrationNumberFor,
  limit = 5,
}: {
  changeRequests: ChangeRequest[];
  registrationNumberFor?: (vehicleId: string | null) => string | undefined;
  limit?: number;
}) {
  const { t } = useTranslation();
  const sorted = [...changeRequests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settingsPage.navActivity')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('settingsPage.noActivity')}</p>
        )}
        {sorted.map((r) => {
          const regNumber = registrationNumberFor?.(r.vehicleId);
          return (
            <div key={r.id} className="flex flex-col gap-1 border-t pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {t(FIELD_LABEL_KEY[r.fieldName])}
                  {regNumber ? ` · ${regNumber}` : ''}
                </p>
                <Badge variant={STATUS_BADGE_VARIANT[r.status]}>
                  {t(`settingsPage.activityStatus.${r.status}`)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
          );
        })}
        <Link href="/dashboard/settings/activity" className="text-sm text-primary hover:underline">
          {t('settingsPage.viewAllActivity')}
        </Link>
      </CardContent>
    </Card>
  );
}
