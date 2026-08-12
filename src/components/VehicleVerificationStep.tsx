'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DocumentUploadField } from '@/components/DocumentUploadField';
import { api, ApiError, Vehicle } from '@/lib/api';
import { VEHICLE_DOCUMENTS, DRIVER_DOCUMENTS } from '@/lib/document-types';

interface Props {
  token: string;
  vehicleId: string;
  includeDriverDocs: boolean;
  // Present when recovering an in-progress truck after a refresh — lets
  // already-uploaded docs and RC verification show as done instead of
  // re-prompting for everything (see api.listMyVehicles in the parent pages).
  existingVehicle?: Vehicle | null;
  onComplete: (complete: boolean) => void;
}

// A truck only counts as fully onboarded once RC is verified and every
// "required" doc (see document-types.ts) is uploaded — matches the
// "at least one working truck before anything else" requirement.
export function VehicleVerificationStep({
  token,
  vehicleId,
  includeDriverDocs,
  existingVehicle,
  onComplete,
}: Props) {
  const { t } = useTranslation();
  const [rcVerified, setRcVerified] = useState(!!existingVehicle?.rcVerifiedAt);
  const [rcLoading, setRcLoading] = useState(false);
  const [rcError, setRcError] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());

  const documents = includeDriverDocs ? [...VEHICLE_DOCUMENTS, ...DRIVER_DOCUMENTS] : VEHICLE_DOCUMENTS;
  const requiredDocTypes = documents.filter((d) => d.required).map((d) => d.docType);
  const allRequiredUploaded = requiredDocTypes.every((d) => uploadedDocs.has(d));
  const complete = rcVerified && allRequiredUploaded;

  useEffect(() => {
    onComplete(complete);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  const handleVerifyRc = async () => {
    setRcError(null);
    setRcLoading(true);
    try {
      await api.verifyVehicleRc(token, vehicleId);
      setRcVerified(true);
    } catch (e) {
      setRcError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setRcLoading(false);
    }
  };

  const remaining = requiredDocTypes.filter((d) => !uploadedDocs.has(d)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-medium">{t('addTrucks.rcTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('addTrucks.rcSubtitle')}</p>
        {rcError && (
          <Alert variant="destructive">
            <AlertDescription>{rcError}</AlertDescription>
          </Alert>
        )}
        {rcVerified ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="size-4" />
            {t('addTrucks.rcVerified')}
          </p>
        ) : (
          <Button size="sm" className="self-start" onClick={handleVerifyRc} disabled={rcLoading}>
            {t('phone.verify')}
          </Button>
        )}
      </div>

      <p className="text-xs font-medium text-muted-foreground">
        {remaining > 0
          ? t('vehicle.requiredDocsRemaining', { count: remaining })
          : t('vehicle.requiredDocsComplete')}
      </p>

      {documents.map((doc) => {
        const field = DOC_FIELD_MAP[doc.docType];
        const alreadyUploaded = field ? !!existingVehicle?.[field] : false;
        return (
          <DocumentUploadField
            key={doc.docType}
            docType={doc.docType}
            labelKey={doc.labelKey}
            accept={doc.accept}
            required={doc.required}
            token={token}
            vehicleId={vehicleId}
            alreadyUploaded={alreadyUploaded}
            onUploaded={() => setUploadedDocs((prev) => new Set(prev).add(doc.docType))}
          />
        );
      })}
    </div>
  );
}

const DOC_FIELD_MAP: Partial<Record<string, keyof Vehicle>> = {
  rc: 'rcUrl',
  insurance: 'insuranceUrl',
  fitness: 'fitnessUrl',
  puc: 'pucUrl',
  permit: 'permitUrl',
  photo_front: 'photoFrontUrl',
  photo_side: 'photoSideUrl',
  photo_rear: 'photoRearUrl',
  cargo_photo: 'cargoPhotoUrl',
  number_plate_photo: 'numberPlatePhotoUrl',
  walkaround_video: 'walkaroundVideoUrl',
  driver_photo: 'driverPhotoUrl',
  driver_license: 'driverLicenseUrl',
};
