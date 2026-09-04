'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError, AdminCarrierPayout } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { formatMoney } from '@/lib/utils';

function statusVariant(status: AdminCarrierPayout['status']) {
  return status === 'paid' ? ('secondary' as const) : ('outline' as const);
}

function PayoutRow({
  payout,
  token,
  onUpdated,
}: {
  payout: AdminCarrierPayout;
  token: string;
  onUpdated: (updated: AdminCarrierPayout) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utr, setUtr] = useState('');

  const markPaid = async () => {
    if (!window.confirm(t('admin.confirmMarkPaid'))) return;
    setBusy(true);
    setError(null);
    try {
      onUpdated(await api.adminMarkCarrierPayoutPaid(token, payout.id, utr));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b last:border-b-0 align-top hover:bg-accent/40">
      <td className="py-3 pr-3">{payout.carrier?.fullName ?? '—'}</td>
      <td className="py-3 pr-3 text-muted-foreground">{payout.carrier?.phone ?? '—'}</td>
      <td className="py-3 pr-3 text-muted-foreground">
        {payout.carrier?.payoutAccountNumber ? (
          <>
            {payout.carrier.payoutAccountNumber} · {payout.carrier.payoutIfsc}
          </>
        ) : (
          t('admin.noPayoutDetails')
        )}
      </td>
      <td className="py-3 pr-3">{formatMoney(Number(payout.amount))}</td>
      <td className="py-3 pr-3 text-muted-foreground">{new Date(payout.createdAt).toLocaleString()}</td>
      <td className="py-3 pr-3">
        <Badge variant={statusVariant(payout.status)}>{t(`admin.payoutStatus_${payout.status}`)}</Badge>
        {payout.status === 'paid' && payout.paidUtr && (
          <p className="mt-1 text-xs text-muted-foreground">UTR: {payout.paidUtr}</p>
        )}
      </td>
      <td className="py-3">
        {payout.status === 'pending' && (
          <div className="flex flex-col items-end gap-1.5">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Input
              className="w-40"
              placeholder={t('admin.utr')}
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
            />
            <Button size="sm" disabled={busy || !utr} onClick={markPaid}>
              {t('admin.markPaid')}
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AdminCarrierPayoutsPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [view, setView] = useState<'queue' | 'all'>('queue');
  const [payouts, setPayouts] = useState<AdminCarrierPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    const loader =
      view === 'queue'
        ? api.adminListCarrierPayoutQueue(adminSession.accessToken)
        : api.adminListCarrierPayouts(adminSession.accessToken);
    loader
      .then(setPayouts)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, view, t]);

  // Marks the badge as seen for this admin, then tells AdminShell to clear
  // it immediately — see the identical effect in change-requests/page.tsx.
  useEffect(() => {
    if (!adminSession) return;
    api
      .adminMarkCarrierPayoutsSeen(adminSession.accessToken)
      .then(() => window.dispatchEvent(new Event('admin-carrier-payouts-seen')))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  const handleUpdated = (updated: AdminCarrierPayout) => {
    if (view === 'queue' && updated.status !== 'pending') {
      setPayouts((prev) => prev.filter((p) => p.id !== updated.id));
    } else {
      setPayouts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navCarrierPayouts')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.carrierPayoutsSubtitle')}</p>
      </div>

      <Tabs value={view} onValueChange={(v) => v && setView(v as 'queue' | 'all')}>
        <TabsList>
          <TabsTrigger value="queue">{t('admin.tabQueue')}</TabsTrigger>
          <TabsTrigger value="all">{t('admin.tabAllPayouts')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colCarrier')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colPhone')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colPayoutAccount')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colAmount')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colSubmitted')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {payouts.map((payout) => (
                  <PayoutRow key={payout.id} payout={payout} token={adminSession!.accessToken} onUpdated={handleUpdated} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
