'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, DriverVehicle } from '@/lib/api';
import { useDriverSession } from '@/lib/driver-session-context';
import { DriverShell } from '@/components/DriverShell';
import { truckTypeLabel } from '@/lib/truck-types';

const DOCUMENT_LABELS: { key: keyof DriverVehicle['documents']; labelKey: string }[] = [
  { key: 'rc', labelKey: 'vehicle.rc' },
  { key: 'insurance', labelKey: 'vehicle.insurance' },
  { key: 'fitness', labelKey: 'vehicle.fitness' },
  { key: 'puc', labelKey: 'vehicle.puc' },
  { key: 'permit', labelKey: 'vehicle.permit' },
  { key: 'photoFront', labelKey: 'vehicle.photo_front' },
  { key: 'photoSide', labelKey: 'vehicle.photo_side' },
  { key: 'photoRear', labelKey: 'vehicle.photo_rear' },
  { key: 'cargoPhoto', labelKey: 'vehicle.cargo_photo' },
  { key: 'numberPlatePhoto', labelKey: 'vehicle.number_plate_photo' },
  { key: 'walkaroundVideo', labelKey: 'vehicle.walkaround_video' },
  { key: 'driverPhoto', labelKey: 'vehicle.driver_photo' },
  { key: 'driverLicense', labelKey: 'vehicle.driver_license' },
];

export default function DriverDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { driverSession, loaded } = useDriverSession();

  const [vehicle, setVehicle] = useState<DriverVehicle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!driverSession) {
      router.replace('/driver/login');
      return;
    }
    api
      .getMyDriverVehicle(driverSession.accessToken)
      .then(setVehicle)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, driverSession]);

  if (!driverSession) return null;

  return (
    <DriverShell>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {vehicle && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{vehicle.registrationNumber}</CardTitle>
              <CardDescription>{t('driverDashboard.drivingFor', { name: vehicle.ownerFullName })}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('vehicle.truckType')}</span>
                <span className="font-medium">{truckTypeLabel(vehicle.truckType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('vehicle.capacityTons')}</span>
                <span className="font-medium">{vehicle.capacityTons}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('driverDashboard.verificationStatus')}</span>
                <Badge variant={vehicle.verificationStatus === 'approved' ? 'default' : 'secondary'}>
                  {t(`driverDashboard.status_${vehicle.verificationStatus}`)}
                </Badge>
              </div>
              {!vehicle.driverAuthorizedAt && (
                <Alert className="mt-2">
                  <AlertDescription>{t('driverDashboard.notAuthorizedYet')}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('driverDashboard.documents')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {DOCUMENT_LABELS.map((doc) => (
                <div key={doc.key} className="flex items-center justify-between text-sm">
                  <span>{t(doc.labelKey)}</span>
                  {vehicle.documents[doc.key] ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <CircleDashed className="size-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </DriverShell>
  );
}
