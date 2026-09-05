'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError, AdminReverificationRequest, ReverificationStatus } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { reverificationFieldLabel } from '@/lib/reverification-field-labels';
import { timeAgo } from '@/lib/utils';

function statusVariant(status: ReverificationStatus) {
  if (status === 'resolved') return 'secondary' as const;
  if (status === 'user_completed') return 'default' as const;
  return 'outline' as const;
}

function RequestRow({
  request,
  token,
  onUpdated,
}: {
  request: AdminReverificationRequest;
  token: string;
  onUpdated: (updated: AdminReverificationRequest) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResolve, setShowResolve] = useState(false);
  const [note, setNote] = useState('');

  const resolve = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.adminResolveReverification(token, request.id, note || undefined);
      onUpdated({ ...request, ...updated });
      setShowResolve(false);
      setNote('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const accountHref =
    request.accountType === 'carrier'
      ? `/admin/accounts/carriers/${request.accountId}`
      : `/admin/accounts/shippers/${request.accountId}`;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={accountHref} className="font-medium hover:underline">
              {request.account?.fullName ?? '—'}
            </Link>
            <p className="text-xs text-muted-foreground">
              {t(`admin.role_${request.accountType}`)} · {request.account?.phone ?? '—'}
              {request.vehicleRegistrationNumber ? ` · ${request.vehicleRegistrationNumber}` : ''}
            </p>
          </div>
          <Badge variant={statusVariant(request.status)}>
            {t(`admin.tabReverify${request.status === 'user_completed' ? 'Completed' : request.status === 'resolved' ? 'Resolved' : 'Pending'}`)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">{t('admin.colField')}: </span>
            {reverificationFieldLabel(t, request.fieldName)}
          </p>
          <p>
            <span className="text-muted-foreground">{t('admin.colRequestedAt')}: </span>
            {timeAgo(request.requestedAt)}
          </p>
          {request.reason && (
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">{t('admin.colReason')}: </span>
              {request.reason}
            </p>
          )}
          {request.userCompletedAt && (
            <p>
              <span className="text-muted-foreground">{t('admin.colUserCompletedAt')}: </span>
              {timeAgo(request.userCompletedAt)}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {request.status !== 'resolved' && (
          <div className="flex flex-col gap-2 pt-2">
            {showResolve ? (
              <div className="flex flex-col gap-2">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('admin.resolveNotePlaceholder')}
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy} onClick={resolve}>
                    {t('admin.confirmResolve')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowResolve(false)}>
                    {t('admin.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowResolve(true)}>
                {t('admin.markResolved')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminReverificationsPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [tab, setTab] = useState<ReverificationStatus>('pending');
  const [requests, setRequests] = useState<AdminReverificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    api
      .adminListReverifications(adminSession.accessToken, { status: tab })
      .then(setRequests)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, tab, t]);

  // Marks the badge as seen for this admin, then tells AdminShell to clear
  // it immediately — see the identical effect in change-requests/page.tsx.
  useEffect(() => {
    if (!adminSession) return;
    api
      .adminMarkReverificationsSeen(adminSession.accessToken)
      .then(() => window.dispatchEvent(new Event('admin-reverifications-seen')))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  const handleUpdated = (updated: AdminReverificationRequest) => {
    if (tab !== 'resolved' && updated.status === 'resolved') {
      setRequests((prev) => prev.filter((r) => r.id !== updated.id));
    } else {
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navReverifications')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.reverificationsSubtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => v && setTab(v as ReverificationStatus)}>
        <TabsList>
          <TabsTrigger value="pending">{t('admin.tabReverifyPending')}</TabsTrigger>
          <TabsTrigger value="user_completed">{t('admin.tabReverifyCompleted')}</TabsTrigger>
          <TabsTrigger value="resolved">{t('admin.tabReverifyResolved')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && requests.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            {t('admin.noReverificationRequests')}
          </CardContent>
        </Card>
      )}

      {!loading && requests.map((r) => (
        <RequestRow key={r.id} request={r} token={adminSession!.accessToken} onUpdated={handleUpdated} />
      ))}
    </div>
  );
}
