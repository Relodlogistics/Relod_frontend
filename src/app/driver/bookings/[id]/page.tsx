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

  if (!driverSession) return null;

  const badge = booking ? statusBadge(booking.status) : null;
  // See BookingDetailPage (carrier/shipper) — an instant-accept candidate on a
  // load posting isn't a negotiation, so messaging is hidden until it's either
  // a negotiated offer or the booking has moved past "pending".
  const canMessage =
    !!booking && !(booking.bookingType === 'instant_book' && booking.status === 'pending');

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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {booking?.posting ? (
                <>
                  <MapPin className="size-4 shrink-0 text-violet-600" />
                  <span>{boardLocation(booking.posting.originCityLabel, booking.posting.originLabel)}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    {boardLocation(booking.posting.destinations[0]?.cityLabel, booking.posting.destinations[0]?.label)}
                  </span>
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
