'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, ApiError, AdminActivityLogEntry } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { timeAgo } from '@/lib/utils';

export default function AdminActivityPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [entries, setEntries] = useState<AdminActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminSession) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
     
    setError(null);
    api
      .adminListActivity(adminSession.accessToken)
      .then(setEntries)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navActivity')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.activitySubtitle')}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && entries.length === 0 && !error && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">{t('admin.activityEmpty')}</CardContent>
        </Card>
      )}

      {!loading && entries.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.activityWho')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.activityWhat')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.activityTarget')}</th>
                  <th className="py-2 font-medium">{t('admin.activityWhen')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-b-0 align-top hover:bg-accent/40">
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <p className="font-medium">{entry.adminName}</p>
                      <Badge variant="outline" className="mt-1">
                        {t(`admin.role_${entry.adminRole}`)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">{entry.description}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{entry.targetLabel ?? '—'}</td>
                    <td className="py-3 whitespace-nowrap text-muted-foreground">{timeAgo(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
