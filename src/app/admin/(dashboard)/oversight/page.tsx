'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { api, ApiError, Posting, AdminBooking } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { boardLocation, formatMoney, timeAgo } from '@/lib/utils';

const POSTING_STATUSES: Posting['status'][] = ['active', 'matched', 'expired', 'cancelled'];
const BOOKING_STATUSES: AdminBooking['status'][] = ['pending', 'accepted', 'in_transit', 'completed', 'cancelled'];

function postingStatusVariant(status: Posting['status']) {
  if (status === 'active') return 'outline' as const;
  if (status === 'matched') return 'secondary' as const;
  return 'destructive' as const;
}

function bookingStatusVariant(status: AdminBooking['status']) {
  if (status === 'completed') return 'secondary' as const;
  if (status === 'cancelled') return 'destructive' as const;
  return 'outline' as const;
}

export default function AdminOversightPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [tab, setTab] = useState<'postings' | 'bookings'>('postings');
  const [postingStatus, setPostingStatus] = useState<'all' | Posting['status']>('all');
  const [bookingStatus, setBookingStatus] = useState<'all' | AdminBooking['status']>('all');
  const [postings, setPostings] = useState<Posting[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    const loader =
      tab === 'postings'
        ? api
            .adminListPostings(adminSession.accessToken, postingStatus === 'all' ? undefined : postingStatus)
            .then(setPostings)
        : api
            .adminListBookings(adminSession.accessToken, bookingStatus === 'all' ? undefined : bookingStatus)
            .then(setBookings);
    loader
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, tab, postingStatus, bookingStatus, t]);

  const handleBookingStatusChange = async (id: string, status: AdminBooking['status']) => {
    if (!adminSession) return;
    setBusyId(id);
    try {
      await api.adminUpdateBookingStatus(adminSession.accessToken, id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navOversight')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.oversightSubtitle')}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => v && setTab(v as 'postings' | 'bookings')}>
          <TabsList>
            <TabsTrigger value="postings">{t('admin.tabPostings')}</TabsTrigger>
            <TabsTrigger value="bookings">{t('admin.tabBookings')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'postings' ? (
          <Select value={postingStatus} onValueChange={(v) => v && setPostingStatus(v as typeof postingStatus)}>
            <SelectTrigger className="w-40">
              {postingStatus === 'all' ? t('admin.allStatuses') : t(`admin.postingStatus_${postingStatus}`)}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
              {POSTING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`admin.postingStatus_${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={bookingStatus} onValueChange={(v) => v && setBookingStatus(v as typeof bookingStatus)}>
            <SelectTrigger className="w-40">
              {bookingStatus === 'all' ? t('admin.allStatuses') : t(`admin.bookingStatus_${bookingStatus}`)}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
              {BOOKING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`admin.bookingStatus_${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && tab === 'postings' && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colRoute')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colPrice')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colLoadType')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colSource')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 font-medium">{t('admin.colPosted')}</th>
                </tr>
              </thead>
              <tbody>
                {postings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {postings.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0 hover:bg-accent/40">
                    <td className="py-3 pr-3">
                      {boardLocation(p.originCityLabel, p.originLabel)} → {boardLocation(p.destinations[0]?.cityLabel, p.destinations[0]?.label)}
                    </td>
                    <td className="py-3 pr-3">
                      {p.priceAmount ? formatMoney(Number(p.priceAmount)) : t('postings.notSpecified')}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{t(`admin.loadType_${p.loadType}`)}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{t(`admin.source_${p.source}`)}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={postingStatusVariant(p.status)}>{t(`admin.postingStatus_${p.status}`)}</Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{timeAgo(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!loading && tab === 'bookings' && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colRoute')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colCarrier')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colShipper')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colPrice')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colBookingType')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 font-medium">{t('admin.colPosted')}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-b-0 hover:bg-accent/40">
                    <td className="py-3 pr-3">
                      {boardLocation(b.posting?.originCityLabel, b.posting?.originLabel)} →{' '}
                      {boardLocation(b.posting?.destinations?.[0]?.cityLabel, b.posting?.destinations?.[0]?.label)}
                    </td>
                    <td className="py-3 pr-3">{b.carrier?.fullName ?? '—'}</td>
                    <td className="py-3 pr-3">{b.shipper?.fullName ?? '—'}</td>
                    <td className="py-3 pr-3">{b.agreedPrice ? formatMoney(Number(b.agreedPrice)) : '—'}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{t(`admin.bookingType_${b.bookingType}`)}</td>
                    <td className="py-3 pr-3">
                      <Select
                        value={b.status}
                        onValueChange={(v) => v && handleBookingStatusChange(b.id, v as AdminBooking['status'])}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs" disabled={busyId === b.id}>
                          <Badge variant={bookingStatusVariant(b.status)}>{t(`admin.bookingStatus_${b.status}`)}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {BOOKING_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`admin.bookingStatus_${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 text-muted-foreground">{timeAgo(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
