'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError, Shipper } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';

export default function AdminShipperDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { adminSession } = useAdminSession();

  const [shipper, setShipper] = useState<Shipper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
  }, [adminSession, params.id, t]);

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
              <p className="text-xs text-muted-foreground">{t('admin.colWhatsapp')}</p>
              <p>{shipper.whatsappNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.email')}</p>
              <p>{shipper.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colBusiness')}</p>
              <p>{shipper.businessName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colBusinessType')}</p>
              <p>{shipper.businessType ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colGstin')}</p>
              <p>{shipper.gstin ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colPan')}</p>
              <p>{shipper.panNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colUpi')}</p>
              <p>{shipper.paymentUpiId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colIndustry')}</p>
              <p>{shipper.industryType ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colAddress')}</p>
              <p>{shipper.businessAddress ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colShipmentVolume')}</p>
              <p>{shipper.shipmentVolume ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colRegisteredOn')}</p>
              <p>{new Date(shipper.createdAt).toLocaleDateString()}</p>
            </div>
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
