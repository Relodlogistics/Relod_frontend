'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError, AdminChangeRequest } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { timeAgo } from '@/lib/utils';

const STATUSES: AdminChangeRequest['status'][] = ['pending', 'approved', 'rejected'];
const VEHICLE_FIELD_NAMES = new Set(['registrationNumber', 'truckType', 'capacityTons']);

function statusVariant(status: AdminChangeRequest['status']) {
  if (status === 'approved') return 'default' as const;
  if (status === 'rejected') return 'destructive' as const;
  return 'outline' as const;
}

export default function AdminChangeRequestsPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [status, setStatus] = useState<'all' | AdminChangeRequest['status']>('pending');
  const [requests, setRequests] = useState<AdminChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    api
      .adminListChangeRequests(adminSession.accessToken, status === 'all' ? undefined : status)
      .then(setRequests)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, status, t]);

  // Marks the badge as seen for this admin — AdminShell re-checks the
  // unseen count on every navigation, so leaving this page is what clears it.
  useEffect(() => {
    if (!adminSession) return;
    api.adminMarkChangeRequestsSeen(adminSession.accessToken).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  const handleApprove = async (id: string) => {
    if (!adminSession) return;
    setBusyId(id);
    setError(null);
    try {
      await api.adminApproveChangeRequest(adminSession.accessToken, id);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!adminSession) return;
    setBusyId(id);
    setError(null);
    try {
      await api.adminRejectChangeRequest(adminSession.accessToken, id, rejectNote || undefined);
      setRejectingId(null);
      setRejectNote('');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">{t('admin.navChangeRequests')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.changeRequestsSubtitle')}</p>
        </div>
        <Select value={status} onValueChange={(v) => v && setStatus(v as typeof status)}>
          <SelectTrigger className="w-40">
            {status === 'all' ? t('admin.allStatuses') : t(`admin.changeRequestStatus_${status}`)}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`admin.changeRequestStatus_${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && requests.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">{t('admin.noResults')}</CardContent>
        </Card>
      )}

      {!loading &&
        requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.account?.fullName ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`admin.role_${r.accountType}`)} · {r.account?.phone ?? '—'}
                  </p>
                </div>
                <Badge variant={statusVariant(r.status)}>{t(`admin.changeRequestStatus_${r.status}`)}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">{t('admin.changeRequestField')}: </span>
                  {t(`${VEHICLE_FIELD_NAMES.has(r.fieldName) ? 'vehicle' : 'profile'}.${r.fieldName}`)}
                  {r.vehicle && ` (${r.vehicle.registrationNumber})`}
                </p>
                <p>
                  <span className="text-muted-foreground">{t('admin.changeRequestWhen')}: </span>
                  {timeAgo(r.createdAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">{t('admin.changeRequestCurrent')}: </span>
                  {r.currentValue || t('settingsPage.notSet')}
                </p>
                <p>
                  <span className="text-muted-foreground">{t('admin.changeRequestRequested')}: </span>
                  {r.requestedValue}
                </p>
              </div>

              <p className="text-sm">
                <span className="text-muted-foreground">{t('admin.changeRequestReason')}: </span>
                {r.reason}
              </p>

              {r.status === 'rejected' && r.adminNote && (
                <p className="text-sm text-destructive">
                  <span className="text-muted-foreground">{t('admin.changeRequestAdminNote')}: </span>
                  {r.adminNote}
                </p>
              )}

              {r.status === 'pending' && (
                <div className="flex flex-col gap-2 pt-2">
                  {rejectingId === r.id ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder={t('admin.changeRequestRejectNotePlaceholder')}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === r.id}
                          onClick={() => handleReject(r.id)}
                        >
                          {t('admin.confirmReject')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectNote('');
                          }}
                        >
                          {t('settingsPage.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busyId === r.id} onClick={() => handleApprove(r.id)}>
                        {t('admin.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => setRejectingId(r.id)}
                      >
                        {t('admin.reject')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
