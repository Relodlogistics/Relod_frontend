'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, PaymentTrackingLog } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { formatMoney } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [logs, setLogs] = useState<PaymentTrackingLog[]>([]);

  useEffect(() => {
    if (session) api.listMyPaymentTracking(session.accessToken).then(setLogs).catch(() => undefined);
  }, [session]);

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('paymentsPage.title')}</h1>

      <Card>
        <CardContent className="py-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('paymentsPage.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t('paymentsPage.advance')}</th>
                    <th className="py-2 pr-3 font-medium">{t('paymentsPage.balance')}</th>
                    <th className="py-2 font-medium">{t('dashboard.tableStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const badge = statusBadge(log.status);
                    return (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-accent/40">
                        <td className="py-2.5 pr-3">
                          {log.advanceAmount ? formatMoney(Number(log.advanceAmount)) : '—'}
                        </td>
                        <td className="py-2.5 pr-3">
                          {log.balanceAmount ? formatMoney(Number(log.balanceAmount)) : '—'}
                        </td>
                        <td className="py-2.5">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
