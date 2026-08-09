'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError, AdminPaymentTrackingLog } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { boardLocation, formatMoney } from '@/lib/utils';

export default function AdminPaymentDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { adminSession } = useAdminSession();

  const [log, setLog] = useState<AdminPaymentTrackingLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReceivedUtr, setAdvanceReceivedUtr] = useState('');
  const [advancePaidUtr, setAdvancePaidUtr] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReceivedUtr, setBalanceReceivedUtr] = useState('');
  const [balancePaidUtr, setBalancePaidUtr] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    api
      .adminGetPayment(adminSession.accessToken, params.id)
      .then(setLog)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, params.id, t]);

  const runAction = async (action: () => Promise<AdminPaymentTrackingLog>) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setLog(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>;
  if (error && !log) return <p className="text-sm text-destructive">{error}</p>;
  if (!log) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push('/admin/payments')}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('admin.backToPayments')}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {boardLocation(log.booking.posting?.originCityLabel, log.booking.posting?.originLabel)} →{' '}
              {boardLocation(log.booking.posting?.destinations?.[0]?.cityLabel, log.booking.posting?.destinations?.[0]?.label)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {log.carrier?.fullName ?? '—'} · {log.shipper?.fullName ?? '—'}
              {log.booking.agreedPrice ? ` · ${formatMoney(Number(log.booking.agreedPrice))}` : ''}
            </p>
          </div>
          <Badge variant={log.status === 'fully_settled' ? 'secondary' : 'outline'}>
            {t(`admin.paymentStatus_${log.status}`)}
          </Badge>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.advanceSection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t('admin.receivedFromShipper')}</p>
            {log.advanceReceivedAt ? (
              <div className="text-sm text-muted-foreground">
                <p>
                  {t('admin.amount')}: {formatMoney(Number(log.advanceAmount))}
                </p>
                <p>UTR: {log.advanceReceivedUtr}</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="advAmount">{t('admin.amount')}</Label>
                  <Input
                    id="advAmount"
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="advRecUtr">{t('admin.utr')}</Label>
                  <Input
                    id="advRecUtr"
                    value={advanceReceivedUtr}
                    onChange={(e) => setAdvanceReceivedUtr(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={busy || !advanceAmount || !advanceReceivedUtr}
                  onClick={() =>
                    runAction(() =>
                      api.adminMarkAdvanceReceived(adminSession!.accessToken, log.id, advanceAmount, advanceReceivedUtr),
                    )
                  }
                >
                  {t('admin.markReceived')}
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t('admin.paidToCarrier')}</p>
            {log.advancePaidAt ? (
              <p className="text-sm text-muted-foreground">UTR: {log.advancePaidUtr}</p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="advPaidUtr">{t('admin.utr')}</Label>
                  <Input id="advPaidUtr" value={advancePaidUtr} onChange={(e) => setAdvancePaidUtr(e.target.value)} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !advancePaidUtr}
                  onClick={() =>
                    runAction(() => api.adminMarkAdvancePaid(adminSession!.accessToken, log.id, advancePaidUtr))
                  }
                >
                  {t('admin.markPaid')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.balanceSection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t('admin.receivedFromShipper')}</p>
            {log.balanceReceivedAt ? (
              <div className="text-sm text-muted-foreground">
                <p>
                  {t('admin.amount')}: {formatMoney(Number(log.balanceAmount))}
                </p>
                <p>UTR: {log.balanceReceivedUtr}</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="balAmount">{t('admin.amount')}</Label>
                  <Input
                    id="balAmount"
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="balRecUtr">{t('admin.utr')}</Label>
                  <Input
                    id="balRecUtr"
                    value={balanceReceivedUtr}
                    onChange={(e) => setBalanceReceivedUtr(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={busy || !balanceAmount || !balanceReceivedUtr}
                  onClick={() =>
                    runAction(() =>
                      api.adminMarkBalanceReceived(adminSession!.accessToken, log.id, balanceAmount, balanceReceivedUtr),
                    )
                  }
                >
                  {t('admin.markReceived')}
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t('admin.paidToCarrier')}</p>
            {log.balancePaidAt ? (
              <p className="text-sm text-muted-foreground">UTR: {log.balancePaidUtr}</p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="balPaidUtr">{t('admin.utr')}</Label>
                  <Input id="balPaidUtr" value={balancePaidUtr} onChange={(e) => setBalancePaidUtr(e.target.value)} />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !balancePaidUtr}
                  onClick={() =>
                    runAction(() => api.adminMarkBalancePaid(adminSession!.accessToken, log.id, balancePaidUtr))
                  }
                >
                  {t('admin.markPaid')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.discrepancySection')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {log.discrepancyFlag ? (
            <>
              <Badge variant="destructive" className="w-fit">
                {t('admin.discrepancy')}
              </Badge>
              {log.discrepancyNotes && <p className="text-sm text-muted-foreground">{log.discrepancyNotes}</p>}
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                disabled={busy}
                onClick={() => runAction(() => api.adminClearDiscrepancy(adminSession!.accessToken, log.id))}
              >
                {t('admin.clearDiscrepancy')}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="discNotes">{t('admin.discrepancyNotes')}</Label>
                <Textarea
                  id="discNotes"
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                disabled={busy}
                onClick={() =>
                  runAction(() =>
                    api.adminSetDiscrepancy(adminSession!.accessToken, log.id, discrepancyNotes || undefined),
                  )
                }
              >
                {t('admin.flagDiscrepancy')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
