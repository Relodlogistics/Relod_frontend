'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, ArrowRight, Phone, Lock, Star, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, Booking, BookingMessage, BookingTracking, PaymentTrackingLog } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { boardLocation, formatMoney, timeAgo } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';
import LiveTrackingMap from '@/components/LiveTrackingMap';
import { isNativeApp, startNativeTracking, stopNativeTracking } from '@/lib/native-tracking';

const TRACKING_POLL_INTERVAL_MS = 20000;
// watchPosition can fire far more often than we want to hit the API — only
// forward a ping if at least this long has passed since the last one sent.
const MIN_PING_INTERVAL_MS = 25000;

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [body, setBody] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentTrackingLog['status'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [tracking, setTracking] = useState<BookingTracking | null>(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  const refreshMessages = async () => {
    if (!session) return;
    const res = await api.listBookingMessages(session.accessToken, id);
    setMessages(res);
  };

  const refreshPaymentStatus = async () => {
    if (!session) return;
    try {
      const log = await api.getPaymentTracking(session.accessToken, id);
      setPaymentStatus(log.status);
    } catch (e) {
      // No tracking log yet (booking still pending negotiation) — not an error to show.
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
  };

  useEffect(() => {
    if (session) {
      api.getBooking(session.accessToken, id).then(setBooking).catch(() => undefined);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshMessages().catch(() => undefined);
      refreshPaymentStatus().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  const refreshTracking = async () => {
    if (!session) return;
    try {
      setTracking(await api.getBookingTracking(session.accessToken, id));
    } catch {
      // Tracking is best-effort — don't surface an error banner for it.
    }
  };

  useEffect(() => {
    if (!session || !booking) return;
    if (booking.status !== 'in_transit' && booking.status !== 'completed') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshTracking();
    if (booking.status !== 'in_transit') return;
    const interval = setInterval(refreshTracking, TRACKING_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, booking?.status, id]);

  // Stop the location watch on unmount so it doesn't keep running (and
  // draining battery) after the driver navigates away. In the native app
  // shell this is a background watcher (survives the screen turning off);
  // on plain web it's the browser's foreground-only watchPosition.
  useEffect(() => {
    return () => {
      if (isNativeApp()) {
        stopNativeTracking().catch(() => undefined);
      } else if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Also stop it the moment the booking itself leaves in_transit (e.g. marked
  // completed) — otherwise the toggle button disappears from the screen but
  // the phone keeps sending location pings in the background indefinitely.
  useEffect(() => {
    if (booking && booking.status !== 'in_transit' && sharingLocation) {
      if (isNativeApp()) {
        stopNativeTracking().catch(() => undefined);
      } else if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharingLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  const toggleShareLocation = () => {
    if (sharingLocation) {
      if (isNativeApp()) {
        stopNativeTracking().catch(() => undefined);
      } else if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharingLocation(false);
      return;
    }
    if (!session || !tracking?.vehicleId) return;
    setTrackingError(null);
    const vehicleId = tracking.vehicleId;

    // The app shell gets a real background watcher (keeps sending pings with
    // the screen off or the app minimized) — see native-tracking.ts. Plain
    // web can only ever watch while this tab stays open and foregrounded.
    if (isNativeApp()) {
      startNativeTracking(session.accessToken, vehicleId).catch(() =>
        setTrackingError(t('bookingDetail.locationPermissionDenied')),
      );
      setSharingLocation(true);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < MIN_PING_INTERVAL_MS) return;
        lastSentAtRef.current = now;
        api
          .sendLocationPing(session.accessToken, vehicleId, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speedKmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined,
          })
          .then(refreshTracking)
          .catch(() => undefined);
      },
      () => setTrackingError(t('bookingDetail.locationPermissionDenied')),
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    setSharingLocation(true);
  };

  const handleSend = async () => {
    if (!session || !body) return;
    setError(null);
    setLoading(true);
    try {
      await api.sendBookingMessage(session.accessToken, id, body);
      setBody('');
      await refreshMessages();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await api.acceptBooking(session.accessToken, id);
      setBooking(updated);
      await refreshPaymentStatus();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!session || !reviewRating) return;
    setReviewError(null);
    setReviewSubmitting(true);
    try {
      const review = await api.submitReview(session.accessToken, id, reviewRating, reviewComment || undefined);
      setBooking((prev) => (prev ? { ...prev, reviews: [...(prev.reviews ?? []), review] } : prev));
    } catch (e) {
      setReviewError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!session) return null;

  const badge = booking ? statusBadge(booking.status) : null;
  const paymentBadge = paymentStatus ? statusBadge(paymentStatus) : null;
  const isPostingOwner =
    booking?.posting &&
    ((session.userType === 'carrier' && booking.posting.postedByCarrierId === session.accountId) ||
      (session.userType === 'shipper' && booking.posting.postedByShipperId === session.accountId));
  const myReview = booking?.reviews?.find((r) => r.reviewerType === session.userType);
  const theirReview = booking?.reviews?.find((r) => r.reviewerType !== session.userType);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Link
        href="/bookings"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('dashboard.viewAllBookings')}
      </Link>

      <div className="mx-auto w-full max-w-lg">
        <Card>
          <CardContent className="flex flex-col gap-4 py-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {booking?.posting ? (
                  <>
                    <MapPin className="size-4 shrink-0 text-violet-600" />
                    <span>{boardLocation(booking.posting.originCityLabel, booking.posting.originLabel)}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span>{boardLocation(booking.posting.destinations[0]?.cityLabel, booking.posting.destinations[0]?.label)}</span>
                  </>
                ) : (
                  t('bookingDetail.title')
                )}
              </div>
              {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
            </div>

            {booking?.agreedPrice && (
              <p className="text-2xl font-semibold">{formatMoney(Number(booking.agreedPrice))}</p>
            )}

            {paymentBadge && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <p className="text-sm font-medium">{t('payment.status')}</p>
                <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
              </div>
            )}

            {booking && booking.status !== 'cancelled' && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{t('bookingDetail.contactTitle')}</p>
                {booking.counterpartyContact ? (
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-medium">{booking.counterpartyContact.name}</p>
                    <a
                      href={`tel:${booking.counterpartyContact.phone}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {booking.counterpartyContact.phone}
                    </a>
                    {booking.counterpartyContact.whatsappNumber && (
                      <p className="text-xs text-muted-foreground">
                        {t('bookingDetail.contactWhatsapp')}: {booking.counterpartyContact.whatsappNumber}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Lock className="size-3.5 shrink-0" />
                    {booking.status === 'pending'
                      ? t('bookingDetail.contactHiddenPending')
                      : t('bookingDetail.contactHiddenGeneric')}
                  </p>
                )}
              </div>
            )}

            {session.userType === 'carrier' &&
              booking?.posting &&
              (booking.status === 'accepted' || booking.status === 'in_transit') && (
                <a
                  href={(() => {
                    const target =
                      booking.status === 'accepted'
                        ? { lat: booking.posting.originLat, lng: booking.posting.originLng }
                        : booking.posting.destinations[0];
                    return `https://www.google.com/maps/dir/?api=1&destination=${target?.lat},${target?.lng}&travelmode=driving`;
                  })()}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" className="w-full">
                    <Navigation className="size-4" />
                    {booking.status === 'accepted'
                      ? t('bookingDetail.navigateToPickup')
                      : t('bookingDetail.navigateToDelivery')}
                  </Button>
                </a>
              )}

            {booking && (booking.status === 'in_transit' || booking.status === 'completed') && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{t('bookingDetail.trackingTitle')}</p>
                {trackingError && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertDescription>{trackingError}</AlertDescription>
                  </Alert>
                )}

                {session.userType === 'carrier' &&
                  booking.status === 'in_transit' &&
                  (tracking?.hasDevice ? (
                    <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Navigation className="size-3.5 shrink-0" />
                      {t('bookingDetail.trackedByDevice')}
                    </p>
                  ) : (
                    <>
                      <Button
                        variant={sharingLocation ? 'destructive' : 'outline'}
                        size="sm"
                        className="w-full"
                        onClick={toggleShareLocation}
                        disabled={!tracking?.vehicleId}
                      >
                        <Navigation className="size-3.5" />
                        {sharingLocation
                          ? t('bookingDetail.stopSharingLocation')
                          : t('bookingDetail.startSharingLocation')}
                      </Button>
                      <p className="mb-2 mt-1.5 text-xs text-muted-foreground">
                        {t('bookingDetail.locationShareDisclosure')}
                      </p>
                    </>
                  ))}

                {tracking?.latestPing && booking.posting ? (
                  <div className="flex flex-col gap-2 text-sm">
                    <LiveTrackingMap
                      origin={{ lat: Number(booking.posting.originLat), lng: Number(booking.posting.originLng) }}
                      destination={{
                        lat: Number(booking.posting.destinations[0]?.lat),
                        lng: Number(booking.posting.destinations[0]?.lng),
                      }}
                      current={{ lat: Number(tracking.latestPing.lat), lng: Number(tracking.latestPing.lng) }}
                      trail={tracking.history.map((h) => ({ lat: Number(h.lat), lng: Number(h.lng) }))}
                    />
                    <p className="text-muted-foreground">
                      {t('bookingDetail.lastUpdated', { time: timeAgo(tracking.latestPing.recordedAt) })}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${tracking.latestPing.lat},${tracking.latestPing.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <MapPin className="size-3.5" />
                      {t('bookingDetail.openInMaps')}
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('bookingDetail.noLocationYet')}</p>
                )}
              </div>
            )}

            <p className="text-sm font-medium">{t('bookingDetail.messages')}</p>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-md border p-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.senderType === session.userType
                      ? 'self-end bg-primary text-primary-foreground'
                      : 'self-start bg-muted'
                  }`}
                >
                  {m.body}
                </div>
              ))}
            </div>

            <Textarea
              placeholder={t('bookingDetail.typeMessage')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button onClick={handleSend} disabled={loading || !body}>
              {t('bookingDetail.send')}
            </Button>

            {booking?.status === 'pending' && booking.bookingType === 'negotiated' && isPostingOwner && (
              <Button variant="outline" onClick={handleAccept} disabled={loading}>
                {t('bookingDetail.accept')}
              </Button>
            )}

            {booking?.status === 'completed' && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{t('bookingDetail.reviewTitle')}</p>
                {reviewError && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertDescription>{reviewError}</AlertDescription>
                  </Alert>
                )}
                {myReview ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-4 ${n <= myReview.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    {myReview.comment && <p className="text-sm text-muted-foreground">{myReview.comment}</p>}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onMouseEnter={() => setReviewHoverRating(n)}
                          onMouseLeave={() => setReviewHoverRating(0)}
                          onClick={() => setReviewRating(n)}
                          aria-label={String(n)}
                        >
                          <Star
                            className={`size-6 ${
                              n <= (reviewHoverRating || reviewRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      placeholder={t('bookingDetail.reviewCommentPlaceholder')}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="w-fit"
                      onClick={handleSubmitReview}
                      disabled={reviewSubmitting || !reviewRating}
                    >
                      {t('bookingDetail.reviewSubmit')}
                    </Button>
                  </div>
                )}
                {theirReview && (
                  <div className="mt-3 flex flex-col gap-1 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">{t('bookingDetail.reviewTheirRating')}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`size-4 ${n <= theirReview.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    {theirReview.comment && <p className="text-sm text-muted-foreground">{theirReview.comment}</p>}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
