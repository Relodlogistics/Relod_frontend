'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { api, ApiError, BookingCandidateDetail } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { truckTypeLabel } from '@/lib/truck-types';

const CARGO_TYPE_LABEL_KEYS: Record<string, string> = {
  general: 'vehicle.cargoTypeGeneral',
  refrigerated: 'vehicle.cargoTypeRefrigerated',
  hazardous: 'vehicle.cargoTypeHazardous',
  fragile: 'vehicle.cargoTypeFragile',
  livestock: 'vehicle.cargoTypeLivestock',
  oversized: 'vehicle.cargoTypeOversized',
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// One reusable modal, fetching the full profile for whichever candidate it's
// opened for — same component every time, only the bookingId changes. Only
// fetched on open, not preloaded for the whole candidates list — see
// api.getCandidateDetail.
export function TruckDetailsModal({
  postingId,
  bookingId,
  onClose,
}: {
  postingId: string;
  bookingId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [detail, setDetail] = useState<BookingCandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    api
      .getCandidateDetail(session.accessToken, postingId, bookingId)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, postingId, bookingId]);

  const photos = detail?.vehicle
    ? [
        detail.vehicle.photoFrontUrl,
        detail.vehicle.photoSideUrl,
        detail.vehicle.photoRearUrl,
        detail.vehicle.cargoPhotoUrl,
        detail.vehicle.numberPlatePhotoUrl,
        ...detail.vehicle.photoUrls,
      ].filter((u): u is string => !!u)
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">{t('postings.moreDetailsTitle')}</h2>
          <button
            onClick={onClose}
            aria-label={t('changeRequestPopup.close')}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!detail && !error && <p className="text-sm text-muted-foreground">{t('bookingDetail.loading')}</p>}

        {detail && (
          <div className="flex flex-col gap-4 text-sm">
            {detail.vehicle && (
              <div className="rounded-md border p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">{t('postings.candidateVehicleLabel')}</p>
                <p className="font-medium">{detail.vehicle.registrationNumber}</p>
                <p className="text-muted-foreground">
                  {truckTypeLabel(detail.vehicle.truckType)} · {detail.vehicle.capacityTons}t
                  {detail.vehicle.lengthFeet ? ` · ${detail.vehicle.lengthFeet}ft` : ''}
                  {detail.vehicle.numberOfAxles ? ` · ${t('postings.axlesCount', { count: detail.vehicle.numberOfAxles })}` : ''}
                </p>
                {detail.vehicle.cargoTypes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {detail.vehicle.cargoTypes.map((ct) => (
                      <Badge key={ct} variant="outline">
                        {t(CARGO_TYPE_LABEL_KEYS[ct] ?? ct)}
                      </Badge>
                    ))}
                  </div>
                )}
                <Badge className="mt-2" variant={detail.vehicle.verificationStatus === 'approved' ? 'default' : 'outline'}>
                  {t(`postings.vehicleStatus_${detail.vehicle.verificationStatus}`)}
                </Badge>
              </div>
            )}

            {detail.owner && (
              <div className="rounded-md border p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">{t('postings.candidateOwnerLabel')}</p>
                <p className="flex items-center gap-1.5 font-medium">
                  <User className="size-3.5 shrink-0 text-muted-foreground" />
                  {detail.owner.name}
                </p>
                <p className="text-muted-foreground">
                  {detail.owner.isOwnerOperator ? t('postings.ownerOperator') : t('postings.fleetOperator')}
                </p>
                {detail.owner.ratingCount > 0 ? (
                  <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    {detail.owner.rating?.toFixed(1)} ({detail.owner.ratingCount})
                  </p>
                ) : (
                  <p className="mt-1 text-muted-foreground">{t('postings.noRatingsYet')}</p>
                )}
              </div>
            )}

            {detail.driver && (
              <div className="rounded-md border p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">{t('postings.candidateDriverLabel')}</p>
                <p className="flex items-center gap-1.5 font-medium">
                  <User className="size-3.5 shrink-0 text-muted-foreground" />
                  {detail.driver.name}
                  {detail.actedByDriver && (
                    <span className="text-xs font-normal text-muted-foreground">({t('postings.candidateViaDriver')})</span>
                  )}
                </p>
              </div>
            )}

            {detail.frequentLanes.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('postings.frequentLanesLabel')}</p>
                <div className="flex flex-col gap-1">
                  {detail.frequentLanes.map((lane, i) => (
                    <p key={i} className="text-muted-foreground">
                      {lane.originLabel} → {lane.destinationLabel}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {detail.vehicle && (
              <div className="rounded-md border p-3">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('postings.documentsValidityLabel')}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                  <p>{t('postings.insuranceLabel')}: {formatDate(detail.vehicle.insuranceExpiryDate) ?? t('postings.notSpecified')}</p>
                  <p>{t('postings.fitnessLabel')}: {formatDate(detail.vehicle.fitnessExpiryDate) ?? t('postings.notSpecified')}</p>
                  <p>{t('postings.pucLabel')}: {formatDate(detail.vehicle.pucExpiryDate) ?? t('postings.notSpecified')}</p>
                  <p>{t('postings.permitLabel')}: {formatDate(detail.vehicle.permitExpiryDate) ?? t('postings.notSpecified')}</p>
                </div>
              </div>
            )}

            {photos.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('postings.candidatePhotosLabel')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" className="size-20 rounded-md border object-cover" />
                  ))}
                </div>
              </div>
            )}

            {detail.vehicle?.walkaroundVideoUrl && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('postings.candidateWalkaroundLabel')}</p>
                <video src={detail.vehicle.walkaroundVideoUrl} controls className="w-full rounded-md border" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
