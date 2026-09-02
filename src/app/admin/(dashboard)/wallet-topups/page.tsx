'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError, AdminWalletTopupRequest } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { formatMoney } from '@/lib/utils';

function statusVariant(status: AdminWalletTopupRequest['status']) {
  if (status === 'credited') return 'secondary' as const;
  if (status === 'rejected' || status === 'failed') return 'destructive' as const;
  return 'outline' as const;
}

function TopupRow({
  request,
  token,
  onUpdated,
}: {
  request: AdminWalletTopupRequest;
  token: string;
  onUpdated: (updated: AdminWalletTopupRequest) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  const verify = async () => {
    if (!window.confirm(t('admin.confirmVerifyTopup'))) return;
    setBusy(true);
    setError(null);
    try {
      onUpdated(await api.adminVerifyWalletTopup(token, request.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await api.adminRejectWalletTopup(token, request.id, reason || undefined));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b last:border-b-0 align-top hover:bg-accent/40">
      <td className="py-3 pr-3">{request.shipper?.fullName ?? '—'}</td>
      <td className="py-3 pr-3 text-muted-foreground">{request.shipper?.phone ?? '—'}</td>
      <td className="py-3 pr-3">{t(`admin.channel_${request.channel}`)}</td>
      <td className="py-3 pr-3">{formatMoney(Number(request.amount))}</td>
      <td className="py-3 pr-3 text-muted-foreground">{request.utr ?? '—'}</td>
      <td className="py-3 pr-3 text-muted-foreground">{new Date(request.createdAt).toLocaleString()}</td>
      <td className="py-3 pr-3">
        <Badge variant={statusVariant(request.status)}>{t(`admin.topupStatus_${request.status}`)}</Badge>
        {request.status === 'rejected' && request.rejectionReason && (
          <p className="mt-1 text-xs text-muted-foreground">{request.rejectionReason}</p>
        )}
      </td>
      <td className="py-3">
        {request.status === 'pending' && (
          <div className="flex flex-col items-end gap-1.5">
            {error && <p className="text-xs text-destructive">{error}</p>}
            {showReject ? (
              <div className="flex flex-col items-end gap-1.5">
                <Input
                  className="w-48"
                  placeholder={t('admin.rejectionReasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setShowReject(false)}>
                    {t('admin.cancel')}
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={reject}>
                    {t('admin.reject')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowReject(true)}>
                  {t('admin.reject')}
                </Button>
                <Button size="sm" disabled={busy} onClick={verify}>
                  {t('admin.verify')}
                </Button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AdminWalletTopupsPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [view, setView] = useState<'queue' | 'all'>('queue');
  const [requests, setRequests] = useState<AdminWalletTopupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    const loader =
      view === 'queue'
        ? api.adminListWalletTopupQueue(adminSession.accessToken)
        : api.adminListWalletTopups(adminSession.accessToken);
    loader
      .then(setRequests)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, view, t]);

  const handleUpdated = (updated: AdminWalletTopupRequest) => {
    if (view === 'queue' && updated.status !== 'pending') {
      setRequests((prev) => prev.filter((r) => r.id !== updated.id));
    } else {
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navWalletTopups')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.walletTopupsSubtitle')}</p>
      </div>

      <Tabs value={view} onValueChange={(v) => v && setView(v as 'queue' | 'all')}>
        <TabsList>
          <TabsTrigger value="queue">{t('admin.tabQueue')}</TabsTrigger>
          <TabsTrigger value="all">{t('admin.tabAllTopups')}</TabsTrigger>
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
                  <th className="py-2 pr-3 font-medium">{t('admin.colShipper')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colPhone')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colChannel')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colAmount')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colUtr')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colSubmitted')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {requests.map((request) => (
                  <TopupRow
                    key={request.id}
                    request={request}
                    token={adminSession!.accessToken}
                    onUpdated={handleUpdated}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
