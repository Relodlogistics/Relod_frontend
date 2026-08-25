'use client';

import { Fragment, use, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, MapPin, Truck, BadgeCheck, Star, Phone, MessageCircle, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, MatchingCarrier, Posting } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { formatMoney, boardLocationParts, googleMapsDirectionsUrl } from '@/lib/utils';
import { truckTypeLabel } from '@/lib/truck-types';
import LiveTrackingMap from '@/components/LiveTrackingMap';

export default function FindCarriersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [posting, setPosting] = useState<Posting | null>(null);
  const [carriers, setCarriers] = useState<MatchingCarrier[] | null>(null);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null);
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Temporary diagnostic — see MatchingCarrier.matchLat/matchLng.
  const [trackingCarrierId, setTrackingCarrierId] = useState<string | null>(null);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  useEffect(() => {
    if (!session) return;
    if (session.userType !== 'shipper') {
      router.replace(`/postings/${id}`);
      return;
    }

    Promise.all([api.getPosting(session.accessToken, id), api.matchingCarriers(session.accessToken, id)])
      .then(([loadPosting, matchResult]) => {
        setPosting(loadPosting);
        setCarriers(matchResult.items);
        setSearchRadiusKm(matchResult.searchRadiusKm);
        setSelectedCarrierIds(new Set(matchResult.items.map((c) => c.carrierId)));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  const toggleCarrier = (carrierId: string) => {
    setSelectedCarrierIds((prev) => {
      const next = new Set(prev);
      if (next.has(carrierId)) next.delete(carrierId);
      else next.add(carrierId);
      return next;
    });
  };

  const toggleAll = () => {
    if (!carriers) return;
    setSelectedCarrierIds((prev) =>
      prev.size === carriers.length ? new Set() : new Set(carriers.map((c) => c.carrierId)),
    );
  };

  const handleSend = async () => {
    if (!session || selectedCarrierIds.size === 0) return;
    setError(null);
    setSending(true);
    try {
      const res = await api.sendLoadAlerts(session.accessToken, id, [...selectedCarrierIds]);
      setInfo(t('postings.alertsSentResult', { sent: res.sent, failed: res.failed }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSending(false);
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{t('postings.findCarriersTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('postings.findCarriersSubtitle')}</p>
        </div>
        <button
          type="button"
          aria-label={t('postings.skipForNow')}
          onClick={() => router.push(`/postings/${id}`)}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {info && (
        <Alert>
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}

      {posting && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="size-4 shrink-0 text-violet-600" />
              <span>{boardLocationParts(posting.originCityLabel, posting.originLabel)[0]}</span>
              <span className="text-muted-foreground">→</span>
              <span>{boardLocationParts(posting.destinations[0]?.cityLabel, posting.destinations[0]?.label)[0]}</span>
            </div>
            <p className="text-xl font-semibold">
              {posting.priceAmount ? formatMoney(Number(posting.priceAmount)) : t('postings.notSpecified')}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto py-2">
          {carriers == null ? (
            <p className="p-3 text-sm text-muted-foreground">{t('postings.loadingTrucks')}</p>
          ) : carriers.length === 0 ? (
            <div className="flex flex-col items-start gap-3 p-3">
              <p className="text-sm text-muted-foreground">
                {t('postings.noCarriersNearby', { radius: searchRadiusKm ?? 100 })}
              </p>
              <Link href="/postings">
                <Button variant="outline" size="sm">
                  {t('postings.viewMoreTrucks')}
                </Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-8 py-2 pr-1">
                    <input
                      type="checkbox"
                      aria-label={t('postings.selectAllCarriers')}
                      checked={carriers.length > 0 && selectedCarrierIds.size === carriers.length}
                      onChange={toggleAll}
                      className="size-3.5 rounded border-input accent-primary"
                    />
                  </th>
                  <th className="py-2 pr-3 font-medium">{t('postings.tableCarrier')}</th>
                  <th className="py-2 pr-3 font-medium">{t('postings.tableTruck')}</th>
                  <th className="py-2 pr-3 font-medium">{t('postings.tableDistance')}</th>
                  <th className="py-2 pr-3 font-medium">{t('postings.tableMatch')}</th>
                  <th className="py-2 pr-3 font-medium">{t('postings.tableContact')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {carriers.map((carrier) => {
                  const selected = selectedCarrierIds.has(carrier.carrierId);
                  const isTracking = trackingCarrierId === carrier.carrierId;
                  return (
                    <Fragment key={carrier.carrierId}>
                    <tr
                      className="border-b border-l-4 border-l-primary bg-primary/5 align-top hover:bg-accent/40"
                    >
                      <td className="py-3 pr-1 pl-2">
                        <input
                          type="checkbox"
                          aria-label={carrier.carrierId}
                          checked={selected}
                          onChange={() => toggleCarrier(carrier.carrierId)}
                          className="size-3.5 rounded border-input accent-primary"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1 font-medium">
                          {carrier.fullName}
                          {carrier.verificationTier !== 'basic' && (
                            <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label={t('postings.verified')} />
                          )}
                        </div>
                        {carrier.ratingCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {(carrier.rating ?? 0).toFixed(1)} ({carrier.ratingCount})
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Truck className="size-3.5 text-muted-foreground" />
                          <div>
                            <p>{truckTypeLabel(carrier.truckType)}</p>
                            <p className="text-muted-foreground">
                              {t('postings.weightTon', { count: carrier.capacityTons })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <p className="font-medium">{t('postings.distanceAway', { distance: carrier.distanceKm.toFixed(1) })}</p>
                        <p className="text-xs text-muted-foreground">
                          {carrier.usedLiveLocation ? t('postings.liveLocation') : t('postings.homeBaseLocation')}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="secondary">{t('postings.matchScore', { score: carrier.score })}</Badge>
                        <div className="mt-1 flex flex-col gap-0.5">
                          {carrier.hasDeclaredAvailability && (
                            <span className="text-xs text-muted-foreground">{t('postings.markedAvailable')}</span>
                          )}
                          {carrier.onRegisteredLane && (
                            <span className="text-xs text-muted-foreground">{t('postings.onRegisteredLane')}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <a
                          href={`tel:${carrier.phone}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Phone className="size-3.5" />
                          {carrier.phone}
                        </a>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTrackingCarrierId(isTracking ? null : carrier.carrierId)}
                        >
                          <Navigation className="size-3.5" />
                          {isTracking ? t('postings.trackTruckHide') : t('postings.trackTruck')}
                        </Button>
                      </td>
                    </tr>
                    {isTracking && posting && (
                      <tr className="border-b border-l-4 border-l-primary bg-primary/5 last:border-b-0">
                        <td colSpan={7} className="p-3">
                          <LiveTrackingMap
                            className="h-64 w-full rounded-md"
                            origin={{
                              lat: Number(posting.originLat),
                              lng: Number(posting.originLng),
                              label: 'Pickup',
                            }}
                            destination={{
                              lat: Number(posting.destinations[0]?.lat ?? posting.originLat),
                              lng: Number(posting.destinations[0]?.lng ?? posting.originLng),
                              label: 'Delivery',
                            }}
                            current={{ lat: carrier.matchLat, lng: carrier.matchLng, label: carrier.fullName }}
                          />
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">{t('postings.trackTruckHint')}</p>
                            <a
                              href={googleMapsDirectionsUrl(
                                { lat: Number(posting.originLat), lng: Number(posting.originLng) },
                                { lat: carrier.matchLat, lng: carrier.matchLng },
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MapPin className="size-3" />
                              {t('bookingDetail.openInMaps')}
                            </a>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {carriers && carriers.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <Link href="/postings">
            <Button variant="ghost">{t('postings.viewMoreTrucks')}</Button>
          </Link>
          <Button onClick={handleSend} disabled={sending || selectedCarrierIds.size === 0}>
            <MessageCircle className="size-4" />
            {t('postings.sendWhatsappAlerts', { count: selectedCarrierIds.size })}
          </Button>
        </div>
      )}
    </div>
  );
}
