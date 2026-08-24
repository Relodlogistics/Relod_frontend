'use client';

import { use, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, ArrowRight, Phone, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, Booking, BookingMessage } from '@/lib/api';
import { useDriverSession } from '@/lib/driver-session-context';
import { DriverShell } from '@/components/DriverShell';
import { boardLocation, formatMoney } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';

export default function DriverBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { driverSession, loaded } = useDriverSession();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!driverSession) {
      router.replace('/driver/login');
      return;
    }
    api.driverGetBooking(driverSession.accessToken, id).then(setBooking).catch(() => undefined);
    api
      .driverListBookingMessages(driverSession.accessToken, id)
      .then(setMessages)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, driverSession, id]);

  const refreshMessages = async () => {
    if (!driverSession) return;
    setMessages(await api.driverListBookingMessages(driverSession.accessToken, id));
  };

  const handleSend = async () => {
    if (!driverSession || !body) return;
    setError(null);
    setLoading(true);
    try {
      await api.driverSendBookingMessage(driverSession.accessToken, id, body);
      setBody('');
      await refreshMessages();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!driverSession) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await api.driverAcceptBooking(driverSession.accessToken, id);
      setBooking(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const [tripOtp, setTripOtp] = useState('');
  const [startTripError, setStartTripError] = useState<string | null>(null);
  const [startingTrip, setStartingTrip] = useState(false);

  const handleStartTrip = async () => {
    if (!driverSession) return;
    setStartTripError(null);
    setStartingTrip(true);
    try {
      const updated = await api.driverStartTrip(driverSession.accessToken, id, tripOtp);
      setBooking(updated);
      setTripOtp('');
    } catch (e) {
      setStartTripError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setStartingTrip(false);
    }
  };

  if (!driverSession) return null;

  const badge = booking ? statusBadge(booking.status) : null;
  // See BookingDetailPage (carrier/shipper) — messaging only makes sense
  // while still negotiating; once a truck is selected, Contact details
  // below gives both sides a phone/WhatsApp number instead.
  const canMessage =
    !!booking && booking.status === 'pending' && booking.bookingType !== 'instant_book';

  return (
    <DriverShell>
      <Link href="/driver/bookings" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        {t('dashboard.viewAllBookings')}
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium">
              {booking?.posting ? (
                <>
                  <MapPin className="size-4 shrink-0 text-violet-600" />
                  <span className="min-w-0">{boardLocation(booking.posting.originCityLabel, booking.posting.originLabel)}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    {boardLocation(booking.posting.destinations[0]?.cityLabel, booking.posting.destinations[0]?.label)}
                  </span>
                </>
              ) : (
                t('bookingDetail.title')
              )}
            </div>
            {badge && <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>}
          </div>

          {booking?.agreedPrice && (
            <p className="text-2xl font-semibold">{formatMoney(Number(booking.agreedPrice))}</p>
          )}

          {booking?.status === 'accepted' && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">{t('bookingDetail.startTripTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('bookingDetail.startTripHint')}</p>
              {startTripError && <p className="mt-2 text-xs text-destructive">{startTripError}</p>}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={tripOtp}
                  onChange={(e) => setTripOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-24 rounded-md border border-input px-3 py-2 text-center text-lg tracking-widest"
                />
                <Button className="flex-1" disabled={startingTrip || tripOtp.length !== 4} onClick={handleStartTrip}>
                  {t('bookingDetail.startTripButton')}
                </Button>
              </div>
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

          {canMessage && (
            <>
              <p className="text-sm font-medium">{t('bookingDetail.messages')}</p>
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.senderType === 'carrier' ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted'
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
            </>
          )}

          {booking?.status === 'pending' && booking.bookingType === 'negotiated' && (
            <Button variant="outline" onClick={handleAccept} disabled={loading}>
              {t('bookingDetail.accept')}
            </Button>
          )}
        </CardContent>
      </Card>
    </DriverShell>
  );
}
