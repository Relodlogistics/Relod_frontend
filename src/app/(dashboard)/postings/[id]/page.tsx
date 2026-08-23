'use client';

import { use, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  ArrowRight,
  MessageCircle,
  BadgeCheck,
  Star,
  Truck,
  Calendar,
  Package,
  StickyNote,
  Navigation,
  Phone,
  Mail,
  Building2,
  Lock,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError, BookingCandidate, CargoType, MatchingCarrier, Posting, Vehicle } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { boardLocation, formatMoney, timeAgo } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';
import { truckTypeLabel } from '@/lib/truck-types';
import { useSpeak } from '@/lib/use-speak';
import { MatchingCarrierCard } from '@/components/MatchingCarrierCard';
import { TruckDetailsModal } from '@/components/TruckDetailsModal';

const CARGO_TYPE_LABEL_KEYS: Record<CargoType, string> = {
  general: 'vehicle.cargoTypeGeneral',
  refrigerated: 'vehicle.cargoTypeRefrigerated',
  hazardous: 'vehicle.cargoTypeHazardous',
  fragile: 'vehicle.cargoTypeFragile',
  livestock: 'vehicle.cargoTypeLivestock',
  oversized: 'vehicle.cargoTypeOversized',
};

// Addresses often carry a pincode or house number (e.g. "...517425, India")
// that TTS engines read as one giant number ("five hundred seventeen
// thousand..."), which is unintelligible for a code meant to be heard
// digit-by-digit. Spell out any run of 3+ digits as separate digits; short
// runs (a 1–2 digit door number) are left alone since those read fine
// normally. Price and dates never go through this — only address text.
function spellOutDigits(text: string): string {
  return text.replace(/\d{3,}/g, (run) => run.split('').join(' '));
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// The visible date range uses a short "Aug 10, 2026 – Aug 12, 2026" format
// with an en dash — fine to read on screen, but TTS reads "–" as a stray
// symbol rather than "to", and "Aug" doesn't always expand cleanly. Spoken
// form spells out the month and day ordinal instead.
function formatDateForSpeech(iso: string): string {
  const d = new Date(iso);
  return `${ordinal(d.getDate())} ${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();
  const { speak, stop, speaking, supported: speechSupported } = useSpeak();

  const [posting, setPosting] = useState<Posting | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchingCarrier[] | null>(null);
  const [matchRadiusKm, setMatchRadiusKm] = useState<number | null>(null);
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<Set<string>>(new Set());
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [candidates, setCandidates] = useState<BookingCandidate[]>([]);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [selectingCandidateId, setSelectingCandidateId] = useState<string | null>(null);
  const [viewingDetailsBookingId, setViewingDetailsBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  useEffect(() => {
    if (!session) return;
    api
      .getPosting(session.accessToken, id)
      .then(setPosting)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')));
  }, [session, id, t]);

  useEffect(() => {
    if (!session || session.userType !== 'carrier') return;
    api
      .listMyVehicles(session.accessToken)
      .then((v) => {
        setVehicles(v);
        if (v.length > 0) setSelectedVehicleId(v[0].id);
      })
      .catch(() => undefined);
  }, [session]);

  useEffect(() => {
    if (!session || session.userType !== 'shipper' || !posting) return;
    if (posting.postedByShipperId !== session.accountId || posting.status !== 'active') return;
    api
      .matchingCarriers(session.accessToken, id)
      .then((res) => {
        setMatches(res.items);
        setMatchRadiusKm(res.searchRadiusKm);
         
        setSelectedCarrierIds(new Set(res.items.map((r) => r.carrierId)));
      })
      .catch(() => undefined);
  }, [session, posting, id]);

  const isOwner =
    session &&
    posting &&
    ((session.userType === 'carrier' && posting.postedByCarrierId === session.accountId) ||
      (session.userType === 'shipper' && posting.postedByShipperId === session.accountId));

  const isOwnActiveLoad =
    session?.userType === 'shipper' &&
    !!posting &&
    posting.postedByShipperId === session.accountId &&
    posting.status === 'active';

  useEffect(() => {
    if (!isOwnActiveLoad || !session) return;
    api
      .listCandidates(session.accessToken, id)
      .then(setCandidates)
      .catch(() => undefined);
     
  }, [session, id, isOwnActiveLoad]);

  const handleSelectCandidate = async (bookingId: string) => {
    if (!session) return;
    setError(null);
    setSelectingCandidateId(bookingId);
    try {
      await api.acceptBooking(session.accessToken, bookingId);
      router.push(`/bookings/${bookingId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSelectingCandidateId(null);
    }
  };

  // A carrier accepting a shipper's LOAD needs to say which of their trucks is
  // taking it (the shipper's candidate list shows this per truck) — a shipper
  // booking a carrier's TRUCK posting doesn't, the vehicle is already fixed on
  // that posting.
  const isLoadPosting = !!posting && posting.postedByShipperId != null;
  const bookNeedsVehicle = session?.userType === 'carrier' && isLoadPosting && !isOwner;

  const handleBook = async () => {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const booking = await api.instantBook(
        session.accessToken,
        id,
        bookNeedsVehicle ? selectedVehicleId : undefined,
      );
      router.push(`/bookings/${booking.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.broadcastPosting(session.accessToken, id);
      setInfo(t('postings.broadcastResult', { count: res.notified }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const toggleCarrier = (carrierId: string) => {
    setSelectedCarrierIds((prev) => {
      const next = new Set(prev);
      if (next.has(carrierId)) next.delete(carrierId);
      else next.add(carrierId);
      return next;
    });
  };

  const handleSendAlerts = async () => {
    if (!session || selectedCarrierIds.size === 0) return;
    setError(null);
    setSendingAlerts(true);
    try {
      const res = await api.sendLoadAlerts(session.accessToken, id, [...selectedCarrierIds]);
      setInfo(t('postings.alertsSentResult', { sent: res.sent, failed: res.failed }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSendingAlerts(false);
    }
  };

  const handleCancel = async () => {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await api.cancelPosting(session.accessToken, id);
      setPosting(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const badge = posting ? statusBadge(posting.status) : null;

  const buildVoiceText = () => {
    if (!posting) return '';
    // Voice always reads in English regardless of the site's UI language —
    // matching useSpeak's fixed en-IN voice. Pulling every label via t()'s
    // per-call `lng` override (instead of the ambient language) keeps this
    // independent of whatever the LanguageSwitcher is currently set to.
    const te = (key: string, options?: Record<string, unknown>) => t(key, { ...options, lng: 'en' });
    const notSpecified = te('postings.notSpecified');
    const parts: string[] = [
      `${te('postings.pickupLocation')}: ${posting.originLabel ? spellOutDigits(posting.originLabel) : notSpecified}`,
    ];

    posting.destinations.forEach((dest, i) => {
      const label =
        posting.destinations.length > 1
          ? `${te('postings.deliveryLocation')} ${i + 1}`
          : te('postings.deliveryLocation');
      parts.push(`${label}: ${dest.label ? spellOutDigits(dest.label) : notSpecified}`);
    });

    parts.push(
      `${te('postings.priceLabel')}: ${posting.priceAmount ? formatMoney(Number(posting.priceAmount)) : notSpecified}`,
    );
    parts.push(
      `${te('postings.summaryAvailable')}: ${formatDateForSpeech(posting.availableFromDate)} to ${formatDateForSpeech(posting.availableToDate)}`,
    );

    const equipmentText =
      posting.equipment?.truckType || posting.equipment?.capacityTons
        ? [
            posting.equipment.truckType ? truckTypeLabel(posting.equipment.truckType) : notSpecified,
            posting.equipment.capacityTons
              ? te('postings.weightTon', { count: Number(posting.equipment.capacityTons) })
              : '',
          ]
            .filter(Boolean)
            .join(', ')
        : notSpecified;
    parts.push(`${te('postings.equipment')}: ${equipmentText}`);

    parts.push(
      `${te('postings.cargoTypeLabel')}: ${posting.cargoType ? te(CARGO_TYPE_LABEL_KEYS[posting.cargoType]) : notSpecified}`,
    );

    return parts.join('. ');
  };

  const handleToggleReadAloud = () => {
    if (speaking) {
      stop();
      return;
    }
    const text = buildVoiceText();
    if (text) speak(text);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Link href="/postings" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t('dashboard.viewAll')}
      </Link>

      <div className="mx-auto w-full max-w-lg">
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
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
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="size-4 shrink-0 text-violet-600" />
                      <span>{boardLocation(posting.originCityLabel, posting.originLabel)}</span>
                    </div>
                    {posting.destinations.map((dest, i) => (
                      <div key={dest.id ?? i} className="flex items-center gap-1.5 pl-5 text-sm text-muted-foreground">
                        <ArrowRight className="size-3.5 shrink-0" />
                        <span>{boardLocation(dest.cityLabel, dest.label)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {speechSupported && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={speaking ? t('postings.stopReading') : t('postings.readAloud')}
                        title={speaking ? t('postings.stopReading') : t('postings.readAloud')}
                        onClick={handleToggleReadAloud}
                      >
                        {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      </Button>
                    )}
                    {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                  </div>
                </div>

                {posting.distanceKm != null && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Navigation className="size-3.5 shrink-0" />
                    {t('postings.distanceAway', { distance: posting.distanceKm })}
                  </p>
                )}

                <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('postings.pickupLocation')}</p>
                      <p className="font-medium">{posting.originLabel ?? t('postings.notSpecified')}</p>
                    </div>
                  </div>
                  {posting.destinations.map((dest, i) => (
                    <div key={dest.id ?? i} className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {posting.destinations.length > 1
                            ? `${t('postings.deliveryLocation')} ${i + 1}`
                            : t('postings.deliveryLocation')}
                        </p>
                        <p className="font-medium">{dest.label ?? t('postings.notSpecified')}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-2xl font-semibold">
                  {posting.priceAmount ? formatMoney(Number(posting.priceAmount)) : t('postings.notSpecified')}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {posting.loadType === 'full' ? t('postings.loadFull') : t('postings.loadPartOk')}
                  </Badge>
                  {posting.cargoType && (
                    <Badge variant="outline">{t(CARGO_TYPE_LABEL_KEYS[posting.cargoType])}</Badge>
                  )}
                </div>

                {posting.postedBy && (
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-muted-foreground">{t('postings.tableCompany')}</p>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {posting.postedBy.name}
                        {posting.postedBy.verified && (
                          <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label={t('postings.verified')} />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {posting.postedBy.ratingCount > 0 ? (
                          <>
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {posting.postedBy.rating?.toFixed(1)} ({posting.postedBy.ratingCount})
                          </>
                        ) : (
                          t('postings.noRatingsYet')
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('postings.postedAgo', { time: timeAgo(posting.createdAt) })}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('postings.summaryAvailable')}:</span>
                    <span className="font-medium">
                      {formatDate(posting.availableFromDate)} – {formatDate(posting.availableToDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Truck className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('postings.equipment')}:</span>
                    <span className="font-medium">
                      {posting.equipment?.truckType || posting.equipment?.capacityTons || posting.equipment?.lengthFeet ? (
                        <>
                          {posting.equipment.truckType ? truckTypeLabel(posting.equipment.truckType) : t('postings.notSpecified')}
                          {posting.equipment.capacityTons
                            ? ` · ${t('postings.weightTon', { count: Number(posting.equipment.capacityTons) })}`
                            : ''}
                          {posting.equipment.lengthFeet ? ` · ${posting.equipment.lengthFeet}ft` : ''}
                        </>
                      ) : (
                        t('postings.notSpecified')
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Package className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('postings.cargoTypeLabel')}:</span>
                    <span className="font-medium">
                      {posting.cargoType ? t(CARGO_TYPE_LABEL_KEYS[posting.cargoType]) : t('postings.notSpecified')}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('postings.notesLabel')}</p>
                    <p className={posting.optionalNote ? '' : 'text-muted-foreground'}>
                      {posting.optionalNote || t('postings.notSpecified')}
                    </p>
                  </div>
                </div>

                {posting.contact && (
                  <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {posting.contact.partyType === 'shipper'
                        ? t('postings.shipperDetailsTitle')
                        : t('postings.carrierDetailsTitle')}
                    </p>

                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">
                        {posting.contact.businessName || posting.contact.fullName}
                      </span>
                    </div>

                    {posting.contact.partyType === 'shipper' ? (
                      <>
                        {posting.contact.businessType && (
                          <p className="pl-6 text-muted-foreground">
                            {t('postings.businessType')}: <span className="text-foreground">{posting.contact.businessType}</span>
                          </p>
                        )}
                        {posting.contact.industryType && (
                          <p className="pl-6 text-muted-foreground">
                            {t('postings.industryType')}: <span className="text-foreground">{posting.contact.industryType}</span>
                          </p>
                        )}
                        {posting.contact.gstin && (
                          <p className="pl-6 text-muted-foreground">
                            {t('postings.gstin')}: <span className="text-foreground">{posting.contact.gstin}</span>
                          </p>
                        )}
                        {posting.contact.businessAddress && (
                          <p className="pl-6 text-muted-foreground">
                            {t('postings.businessAddress')}: <span className="text-foreground">{posting.contact.businessAddress}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="pl-6 text-muted-foreground">
                          {posting.contact.isOwnerOperator ? t('postings.ownerOperator') : t('postings.fleetOperator')}
                        </p>
                        {posting.contact.vehicles && posting.contact.vehicles.length > 0 && (
                          <div className="pl-6 text-muted-foreground">
                            {t('postings.vehicleDetails')}:{' '}
                            <span className="text-foreground">
                              {posting.contact.vehicles
                                .map(
                                  (v) =>
                                    `${truckTypeLabel(v.truckType)} (${v.capacityTons}t${v.lengthFeet ? `, ${v.lengthFeet}ft` : ''}, ${v.registrationNumber})`,
                                )
                                .join(', ')}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {posting.contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{posting.contact.email}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Phone className="size-4 shrink-0 text-muted-foreground" />
                      {posting.contact.phone ? (
                        <span className="font-medium">{posting.contact.phone}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Lock className="size-3.5 shrink-0" />
                          {t('postings.phoneLockedHint')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {posting?.status === 'active' && !isOwner && (
              <>
                {bookNeedsVehicle && vehicles.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">{t('postings.selectVehicle')}</Label>
                    <Select value={selectedVehicleId} onValueChange={(v) => v && setSelectedVehicleId(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.registrationNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {bookNeedsVehicle && vehicles.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('postings.negotiateNoVehicleHint')}</p>
                )}

                <Button onClick={handleBook} disabled={loading || (bookNeedsVehicle && !selectedVehicleId)}>
                  {t('postings.book')}
                </Button>
              </>
            )}

            {posting?.status === 'active' && isOwner && (
              <>
                {session.userType === 'shipper' && (
                  <Button variant="outline" onClick={handleBroadcast} disabled={loading}>
                    {t('postings.broadcast')}
                  </Button>
                )}
                <Button variant="destructive" onClick={handleCancel} disabled={loading}>
                  {t('postings.cancel')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {isOwnActiveLoad && candidates.length > 0 && (
          <Card className="mt-4">
            <CardContent className="flex flex-col gap-3 py-5">
              <div>
                <p className="text-sm font-semibold">
                  {t('postings.candidatesTitle', { count: candidates.length })}
                </p>
                <p className="text-xs text-muted-foreground">{t('postings.candidatesHint')}</p>
              </div>

              <div className="flex flex-col gap-2">
                {candidates.map((c) => {
                  const expanded = expandedCandidateId === c.bookingId;
                  return (
                    <div key={c.bookingId} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {c.vehicle?.registrationNumber ?? t('postings.notSpecified')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.vehicle
                              ? `${truckTypeLabel(c.vehicle.truckType)} · ${c.vehicle.capacityTons}t${c.vehicle.lengthFeet ? ` · ${c.vehicle.lengthFeet}ft` : ''}`
                              : ''}
                          </span>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {c.bookingType === 'instant_book'
                            ? t('postings.candidateInstantAccept')
                            : t('postings.candidateNegotiated')}
                        </Badge>
                      </div>

                      {c.proposedPrice && (
                        <p className="mt-1.5 text-sm">
                          {t('postings.candidateProposedPrice')}: <span className="font-semibold">{formatMoney(Number(c.proposedPrice))}</span>
                        </p>
                      )}

                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={() => setExpandedCandidateId(expanded ? null : c.bookingId)}
                      >
                        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        {expanded ? t('postings.hideDetails') : t('postings.viewDetails')}
                      </button>

                      {expanded && (
                        <div className="mt-2 flex flex-col gap-2 rounded-md bg-muted/40 p-2.5 text-sm">
                          {c.owner && (
                            <p className="flex items-center gap-1.5">
                              <User className="size-3.5 shrink-0 text-muted-foreground" />
                              {t('postings.candidateOwnerLabel')}: <span className="font-medium">{c.owner.name}</span>
                            </p>
                          )}
                          {c.driver && (
                            <p className="flex items-center gap-1.5">
                              <User className="size-3.5 shrink-0 text-muted-foreground" />
                              {t('postings.candidateDriverLabel')}: <span className="font-medium">{c.driver.name}</span>
                              {c.actedByDriver && (
                                <span className="text-xs text-muted-foreground">({t('postings.candidateViaDriver')})</span>
                              )}
                            </p>
                          )}
                          <button
                            type="button"
                            className="w-fit text-xs text-primary hover:underline"
                            onClick={() => setViewingDetailsBookingId(c.bookingId)}
                          >
                            {t('postings.viewMoreDetails')}
                          </button>
                        </div>
                      )}

                      <Button
                        className="mt-3 w-full"
                        size="sm"
                        onClick={() => handleSelectCandidate(c.bookingId)}
                        disabled={selectingCandidateId !== null}
                      >
                        {t('postings.selectThisTruck')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {session.userType === 'shipper' && posting?.status === 'active' && isOwner && matches && (
          <Card className="mt-4">
            <CardContent className="flex flex-col gap-3 py-5">
              <div>
                <p className="text-sm font-semibold">{t('postings.matchingCarriersTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('postings.matchingCarriersHint')}</p>
              </div>

              {matchRadiusKm != null && matchRadiusKm > 100 && matches.length > 0 && (
                <Alert>
                  <AlertDescription>
                    {t('postings.matchRadiusExpanded', { radius: matchRadiusKm })}
                  </AlertDescription>
                </Alert>
              )}

              {matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('postings.noMatchingCarriers')}</p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {matches.map((carrier, index) => (
                      <MatchingCarrierCard
                        key={carrier.carrierId}
                        rank={index + 1}
                        carrier={carrier}
                        selected={selectedCarrierIds.has(carrier.carrierId)}
                        onToggle={() => toggleCarrier(carrier.carrierId)}
                      />
                    ))}
                  </div>
                  <Button
                    onClick={handleSendAlerts}
                    disabled={sendingAlerts || selectedCarrierIds.size === 0}
                  >
                    <MessageCircle className="size-4" />
                    {t('postings.sendWhatsappAlerts', { count: selectedCarrierIds.size })}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {viewingDetailsBookingId && (
        <TruckDetailsModal
          postingId={id}
          bookingId={viewingDetailsBookingId}
          onClose={() => setViewingDetailsBookingId(null)}
        />
      )}
    </div>
  );
}
