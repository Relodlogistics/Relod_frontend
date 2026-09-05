'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError, Shipper, ReverificationRequest } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { ReverifyButton } from '@/components/admin/ReverifyButton';

export default function AdminShipperDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { adminSession } = useAdminSession();

  const [shipper, setShipper] = useState<Shipper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reverifications, setReverifications] = useState<ReverificationRequest[]>([]);

  useEffect(() => {
    if (!adminSession) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    api
      .adminGetShipper(adminSession.accessToken, params.id)
      .then(setShipper)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
    api
      .adminListReverifications(adminSession.accessToken, { accountId: params.id })
      .then(setReverifications)
      .catch(() => undefined);
  }, [adminSession, params.id, t]);

  const findExisting = (fieldName: string) =>
    reverifications.find((r) => r.fieldName === fieldName && r.status !== 'resolved');

  const handleReverificationCreated = (created: ReverificationRequest) => {
    setReverifications((prev) => [created, ...prev]);
  };

  const toggleSuspend = async () => {
    if (!adminSession || !shipper) return;
    setBusy(true);
    try {
      const updated = await api.adminSuspendShipper(adminSession.accessToken, shipper.id, !shipper.isSuspended);
      setShipper({ ...shipper, isSuspended: updated.isSuspended });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  function ProfileFieldRow({
    label,
    value,
    fieldName,
  }: {
    label: string;
    value: string | null;
    fieldName: string;
  }) {
    if (!shipper || !adminSession) return null;
    return (
      <div className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-b-0">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p>{value ?? '—'}</p>
        </div>
        <ReverifyButton
          token={adminSession.accessToken}
          accountType="shipper"
          accountId={shipper.id}
          fieldName={fieldName}
          existingRequest={findExisting(fieldName)}
          onCreated={handleReverificationCreated}
        />
      </div>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>;
  if (error || !shipper) return <p className="text-sm text-destructive">{error ?? t('errors.generic')}</p>;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push('/admin/accounts')}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('admin.backToAccounts')}
      </button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>{shipper.fullName}</CardTitle>
            <p className="text-sm text-muted-foreground">{shipper.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={shipper.isVerified ? 'secondary' : 'outline'}>
              {shipper.isVerified ? t('admin.verified') : t('admin.notVerified')}
            </Badge>
            <Badge variant={shipper.isSuspended ? 'destructive' : 'outline'}>
              {shipper.isSuspended ? t('admin.suspended') : t('admin.active')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colUsername')}</p>
              <p>{shipper.username ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colRegisteredOn')}</p>
              <p>{new Date(shipper.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex flex-col border-t pt-2">
            <ProfileFieldRow label={t('admin.colPhone')} value={shipper.phone} fieldName="phone" />
            <ProfileFieldRow label={t('admin.colWhatsapp')} value={shipper.whatsappNumber} fieldName="whatsappNumber" />
            <ProfileFieldRow label={t('admin.email')} value={shipper.email} fieldName="email" />
            <ProfileFieldRow label={t('admin.colBusiness')} value={shipper.businessName} fieldName="businessName" />
            <ProfileFieldRow
              label={t('admin.colBusinessType')}
              value={shipper.businessType}
              fieldName="businessType"
            />
            <ProfileFieldRow label={t('admin.colGstin')} value={shipper.gstin} fieldName="gstin" />
            <ProfileFieldRow label={t('admin.colPan')} value={shipper.panNumber} fieldName="panNumber" />
            <ProfileFieldRow label={t('admin.colUpi')} value={shipper.paymentUpiId} fieldName="paymentUpiId" />
            <ProfileFieldRow label={t('admin.colIndustry')} value={shipper.industryType} fieldName="industryType" />
            <ProfileFieldRow label={t('admin.colAddress')} value={shipper.businessAddress} fieldName="businessAddress" />
            <ProfileFieldRow
              label={t('admin.colShipmentVolume')}
              value={shipper.shipmentVolume}
              fieldName="shipmentVolume"
            />
          </div>

          <div>
            <Button variant="outline" size="sm" disabled={busy} onClick={toggleSuspend}>
              {shipper.isSuspended ? t('admin.unsuspend') : t('admin.suspend')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
