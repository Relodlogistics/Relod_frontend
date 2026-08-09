'use client';

import { use, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  MapPin,
  CalendarDays,
  Truck,
  BadgeCheck,
  Star,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, Posting } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { formatMoney, timeAgo, cn, boardLocationParts } from '@/lib/utils';
import { truckTypeLabel } from '@/lib/truck-types';

const NEARBY_RADIUS_KM = 100;

export default function FindCarriersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [posting, setPosting] = useState<Posting | null>(null);
  const [trucks, setTrucks] = useState<Posting[] | null>(null);
  const [matchScoreByCarrierId, setMatchScoreByCarrierId] = useState<Map<string, number>>(new Map());
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  useEffect(() => {
    if (!session) return;
    if (session.userType !== 'shipper') {
      router.replace(`/postings/${id}`);
      return;
    }

    Promise.all([
      api.getPosting(session.accessToken, id),
      api.matchingCarriers(session.accessToken, id),
    ])
      .then(async ([loadPosting, matchResult]) => {
        setPosting(loadPosting);
        const scoreMap = new Map(matchResult.items.map((m) => [m.carrierId, m.score]));
        setMatchScoreByCarrierId(scoreMap);

        const nearby = await api.searchPostings(session.accessToken, {
          nearLat: Number(loadPosting.originLat),
          nearLng: Number(loadPosting.originLng),
          radiusKm: NEARBY_RADIUS_KM,
          pageSize: 100,
        });
        // Matched carriers (from the scoring algorithm) bubble to the top,
        // ranked by score; everything else keeps the API's distance order.
        const ordered = [...nearby.items].sort((a, b) => {
          const scoreA = a.postedByCarrierId ? (scoreMap.get(a.postedByCarrierId) ?? -1) : -1;
          const scoreB = b.postedByCarrierId ? (scoreMap.get(b.postedByCarrierId) ?? -1) : -1;
          return scoreB - scoreA;
        });
        setTrucks(ordered);

        // Only auto-select matched carriers who actually have a visible row
        // here — selecting a carrier with no on-page checkbox would leave the
        // shipper unable to see or deselect them before sending.
        const visibleMatchedIds = ordered
          .map((p) => p.postedByCarrierId)
          .filter((c): c is string => !!c && scoreMap.has(c));
        setSelectedCarrierIds(new Set(visibleMatchedIds));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  const carrierIdsOnPage = trucks
    ? [...new Set(trucks.map((tr) => tr.postedByCarrierId).filter((c): c is string => !!c))]
    : [];

  const toggleCarrier = (carrierId: string | null) => {
    if (!carrierId) return;
    setSelectedCarrierIds((prev) => {
      const next = new Set(prev);
      if (next.has(carrierId)) next.delete(carrierId);
      else next.add(carrierId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedCarrierIds((prev) =>
      prev.size === carrierIdsOnPage.length ? new Set() : new Set(carrierIdsOnPage),
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
          {trucks == null ? (
            <p className="p-3 text-sm text-muted-foreground">{t('postings.loadingTrucks')}</p>
          ) : trucks.length === 0 ? (
            <div className="flex flex-col items-start gap-3 p-3">
              <p className="text-sm text-muted-foreground">{t('postings.noTrucksNearby')}</p>
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
                      checked={carrierIdsOnPage.length > 0 && selectedCarrierIds.size === carrierIdsOnPage.length}
                      onChange={toggleAll}
                      className="size-3.5 rounded border-input accent-primary"
                    />
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    <p>{t('postings.tableOrigin')}</p>
                    <p className="font-normal">{t('postings.tableDestination')}</p>
                  </th>
                  <th className="py-2 pr-3 font-medium">{t('postings.tableDetails')}</th>
                  <th className="py-2 pr-3 font-medium">
                    <p>{t('postings.equipment')}</p>
                    <p className="font-normal">{t('postings.lengthWeight')}</p>
                  </th>
                  <th className="py-2 pr-3 font-medium">{t('dashboard.tablePrice')}</th>
                  <th className="py-2 pr-3 font-medium">
                    <p>{t('postings.tableCompany')}</p>
                    <p className="font-normal">{t('postings.tablePosted')}</p>
                  </th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {trucks.map((truck) => {
                  const [originPrimary, originSecondary] = boardLocationParts(truck.originCityLabel, truck.originLabel);
                  const [destPrimary, destSecondary] = boardLocationParts(
                    truck.destinations[0]?.cityLabel,
                    truck.destinations[0]?.label,
                  );
                  const isFull = truck.loadType === 'full';
                  const score = truck.postedByCarrierId
                    ? matchScoreByCarrierId.get(truck.postedByCarrierId)
                    : undefined;
                  const isMatched = score != null;
                  const selected = !!truck.postedByCarrierId && selectedCarrierIds.has(truck.postedByCarrierId);
                  return (
                    <tr
                      key={truck.id}
                      className={cn(
                        'border-b border-l-4 last:border-b-0 align-top hover:bg-accent/40',
                        isMatched ? 'border-l-primary bg-primary/5' : isFull ? 'border-l-emerald-500' : 'border-l-amber-500',
                      )}
                    >
                      <td className="py-3 pr-1 pl-2">
                        <input
                          type="checkbox"
                          aria-label={truck.id}
                          checked={selected}
                          disabled={!truck.postedByCarrierId}
                          onChange={() => toggleCarrier(truck.postedByCarrierId)}
                          className="size-3.5 rounded border-input accent-primary"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                          <div>
                            <p className="font-medium">{originPrimary}</p>
                            {originSecondary && <p className="text-xs text-muted-foreground">{originSecondary}</p>}
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-start gap-1.5">
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                          <div>
                            <p className="font-medium">{destPrimary}</p>
                            {destSecondary && <p className="text-xs text-muted-foreground">{destSecondary}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          {new Date(truck.availableFromDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                          <Truck className="size-3.5 text-muted-foreground" />
                          {isFull ? t('postings.loadFull') : t('postings.loadPartOk')}
                        </div>
                        {isMatched && (
                          <Badge variant="secondary" className="mt-1">
                            {t('postings.matchScore', { score })}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {truck.equipment ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Truck className="size-3.5 text-muted-foreground" />
                            <div>
                              <p>{truckTypeLabel(truck.equipment.truckType)}</p>
                              {truck.equipment.capacityTons && (
                                <p className="text-muted-foreground">
                                  {t('postings.weightTon', { count: Number(truck.equipment.capacityTons) })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {truck.priceAmount ? (
                          <p className="font-semibold">{formatMoney(Number(truck.priceAmount))}</p>
                        ) : (
                          <p className="font-semibold text-muted-foreground">{t('postings.notSpecified')}</p>
                        )}
                        {truck.distanceKm != null && (
                          <p className="text-xs text-muted-foreground">
                            {t('postings.distanceAway', { distance: truck.distanceKm.toFixed(1) })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {truck.postedBy?.name ?? '—'}
                          {truck.postedBy?.verified && (
                            <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label={t('postings.verified')} />
                          )}
                        </div>
                        {truck.postedBy && truck.postedBy.ratingCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {truck.postedBy.rating?.toFixed(1)}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t('postings.postedAgo', { time: timeAgo(truck.createdAt) })}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <Link href={`/postings/${truck.id}`}>
                          <Button variant="outline" size="sm">
                            {t('dashboard.viewDetails')}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {trucks && trucks.length > 0 && (
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
