'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError, AdminCarrierDetail, AdminVehicle, apiFileUrl, vehicleDocumentUrl } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { truckTypeLabel } from '@/lib/truck-types';

export default function AdminCarrierDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { adminSession } = useAdminSession();

  const [carrier, setCarrier] = useState<AdminCarrierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    api
      .adminGetCarrier(adminSession.accessToken, params.id)
      .then(setCarrier)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, params.id, t]);

  const toggleSuspend = async () => {
    if (!adminSession || !carrier) return;
    setBusy('suspend');
    try {
      const updated = await api.adminSuspendCarrier(adminSession.accessToken, carrier.id, !carrier.isSuspended);
      setCarrier({ ...carrier, isSuspended: updated.isSuspended });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(null);
    }
  };

  const updateVerification = async (vehicleId: string, status: 'approved' | 'rejected') => {
    if (!adminSession) return;
    setBusy(vehicleId);
    try {
      await api.adminUpdateVehicleVerification(adminSession.accessToken, vehicleId, status);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(null);
    }
  };

  // Legacy fallback for the (unused-by-current-UI) generic `photoUrls` array
  // field — those weren't migrated to the authenticated document route (see
  // VehiclesService.getDocumentPath's doc comment) since a docType alone
  // can't disambiguate which array entry.
  function DocLink({ label, rawUrl }: { label: string; rawUrl: string | null }) {
    return (
      <div className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-b-0">
        <span className="text-muted-foreground">{label}</span>
        {rawUrl ? (
          <a
            href={apiFileUrl(rawUrl)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {t('admin.view')} <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{t('admin.notUploaded')}</span>
        )}
      </div>
    );
  }

  function VehicleDocLink({
    label,
    vehicleId,
    docType,
    uploaded,
  }: {
    label: string;
    vehicleId: string;
    docType: string;
    uploaded: boolean;
  }) {
    return (
      <div className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-b-0">
        <span className="text-muted-foreground">{label}</span>
        {uploaded && adminSession ? (
          <a
            href={vehicleDocumentUrl(vehicleId, docType, adminSession.accessToken)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {t('admin.view')} <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{t('admin.notUploaded')}</span>
        )}
      </div>
    );
  }

  function VehicleCard({ vehicle }: { vehicle: AdminVehicle }) {
    const statusVariant =
      vehicle.verificationStatus === 'approved'
        ? 'secondary'
        : vehicle.verificationStatus === 'rejected'
          ? 'destructive'
          : 'outline';
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{vehicle.registrationNumber}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {truckTypeLabel(vehicle.truckType)} · {vehicle.capacityTons} {t('admin.tons')}
              {vehicle.numberOfAxles ? ` · ${vehicle.numberOfAxles} ${t('admin.axles')}` : ''}
            </p>
          </div>
          <Badge variant={statusVariant}>{t(`admin.verification_${vehicle.verificationStatus}`)}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {vehicle.driverName && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{vehicle.driverName}</p>
              <p className="text-xs text-muted-foreground">{vehicle.driverPhone}</p>
            </div>
          )}
          <div className="flex flex-col">
            <VehicleDocLink label={t('admin.docRc')} vehicleId={vehicle.id} docType="rc" uploaded={!!vehicle.rcUrl} />
            <VehicleDocLink
              label={t('admin.docInsurance')}
              vehicleId={vehicle.id}
              docType="insurance"
              uploaded={!!vehicle.insuranceUrl}
            />
            <VehicleDocLink
              label={t('admin.docPermit')}
              vehicleId={vehicle.id}
              docType="permit"
              uploaded={!!vehicle.permitUrl}
            />
            <VehicleDocLink
              label={t('admin.docFitness')}
              vehicleId={vehicle.id}
              docType="fitness"
              uploaded={!!vehicle.fitnessUrl}
            />
            <VehicleDocLink label={t('admin.docPuc')} vehicleId={vehicle.id} docType="puc" uploaded={!!vehicle.pucUrl} />
            <VehicleDocLink
              label={t('admin.docDriverLicense')}
              vehicleId={vehicle.id}
              docType="driver_license"
              uploaded={!!vehicle.driverLicenseUrl}
            />
            <VehicleDocLink
              label={t('admin.docDriverPhoto')}
              vehicleId={vehicle.id}
              docType="driver_photo"
              uploaded={!!vehicle.driverPhotoUrl}
            />
            <VehicleDocLink
              label={t('admin.docWalkaround')}
              vehicleId={vehicle.id}
              docType="walkaround_video"
              uploaded={!!vehicle.walkaroundVideoUrl}
            />
            <VehicleDocLink
              label={t('admin.docPhotoFront')}
              vehicleId={vehicle.id}
              docType="photo_front"
              uploaded={!!vehicle.photoFrontUrl}
            />
            <VehicleDocLink
              label={t('admin.docPhotoSide')}
              vehicleId={vehicle.id}
              docType="photo_side"
              uploaded={!!vehicle.photoSideUrl}
            />
            <VehicleDocLink
              label={t('admin.docPhotoRear')}
              vehicleId={vehicle.id}
              docType="photo_rear"
              uploaded={!!vehicle.photoRearUrl}
            />
            <VehicleDocLink
              label={t('admin.docPhotoCargo')}
              vehicleId={vehicle.id}
              docType="cargo_photo"
              uploaded={!!vehicle.cargoPhotoUrl}
            />
            <VehicleDocLink
              label={t('admin.docPhotoPlate')}
              vehicleId={vehicle.id}
              docType="number_plate_photo"
              uploaded={!!vehicle.numberPlatePhotoUrl}
            />
            {vehicle.photoUrls.map((url, i) => (
              <DocLink key={url} label={`${t('admin.docPhotoOther')} ${i + 1}`} rawUrl={url} />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy === vehicle.id}
              onClick={() => updateVerification(vehicle.id, 'rejected')}
            >
              {t('admin.reject')}
            </Button>
            <Button size="sm" disabled={busy === vehicle.id} onClick={() => updateVerification(vehicle.id, 'approved')}>
              {t('admin.approve')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>;
  if (error || !carrier)
    return <p className="text-sm text-destructive">{error ?? t('errors.generic')}</p>;

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
            <CardTitle>{carrier.fullName}</CardTitle>
            <p className="text-sm text-muted-foreground">{carrier.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t(`admin.tier_${carrier.verificationTier}`)}</Badge>
            <Badge variant={carrier.isSuspended ? 'destructive' : 'outline'}>
              {carrier.isSuspended ? t('admin.suspended') : t('admin.active')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colWhatsapp')}</p>
              <p>{carrier.whatsappNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.email')}</p>
              <p>{carrier.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colAadhaar')}</p>
              <p>{carrier.aadhaarNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colPan')}</p>
              <p>{carrier.panNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.colReturnLoads')}</p>
              <p>{carrier.wantsReturnLoads ? t('admin.yes') : t('admin.no')}</p>
            </div>
          </div>
          <div>
            <Button variant="outline" size="sm" disabled={busy === 'suspend'} onClick={toggleSuspend}>
              {carrier.isSuspended ? t('admin.unsuspend') : t('admin.suspend')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 font-heading text-base font-semibold">
          {t('admin.vehiclesTitle', { count: carrier.vehicles.length })}
        </h2>
        <div className="flex flex-col gap-4">
          {carrier.vehicles.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('admin.noVehicles')}</p>
          )}
          {carrier.vehicles.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      </div>
    </div>
  );
}
