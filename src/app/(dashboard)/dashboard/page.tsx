'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import {
  Package,
  Truck,
  PlusCircle,
  Search,
  CalendarDays,
  IndianRupee,
  Wallet,
  CheckCircle2,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api, AppNotification, Posting, Booking, BookingTracking, PaymentTrackingLog } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { useDisplayName } from '@/lib/use-display-name';
import { boardLocation, cn, formatMoney, timeAgo } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';
import LiveTrackingMap from '@/components/LiveTrackingMap';

const TRACKING_POLL_INTERVAL_MS = 20000;

const NOTIFICATION_LABEL_KEY: Record<AppNotification['type'], string> = {
  lane_match: 'notifications.laneMatch',
  broadcast: 'notifications.broadcast',
  booking_update: 'dashboard.carrierAcceptedNotif',
  driver_action: 'notifications.driverAction',
};

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatDateRange(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth();
  const fmt = (d: Date, withMonth: boolean) =>
    `${d.getDate()}${withMonth ? ' ' + d.toLocaleString('en', { month: 'short' }) : ''}`;
  return `${fmt(start, !sameMonth)} – ${fmt(end, true)} ${end.getFullYear()}`;
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  sublabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between py-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', iconClass)}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const displayName = useDisplayName();

  const [postings, setPostings] = useState<Posting[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentTrackingLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bannerPosting, setBannerPosting] = useState<Posting | null>(null);
  const [currentLoadTracking, setCurrentLoadTracking] = useState<BookingTracking | null>(null);
  const [pendingTruckCount, setPendingTruckCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    api.listMyPostings(session.accessToken).then(setPostings).catch(() => undefined);
    api.listMyBookings(session.accessToken).then(setBookings).catch(() => undefined);
    api.listMyPaymentTracking(session.accessToken).then(setPaymentLogs).catch(() => undefined);
    api.listNotifications(session.accessToken).then(setNotifications).catch(() => undefined);
  }, [session]);

  // A fleet owner (non-owner-operator) can leave the add-trucks loop partway
  // through via "Skip for now" after their first truck — surface the
  // shortfall here rather than leaving it silently unfinished.
  useEffect(() => {
    if (!session || session.userType !== 'carrier') return;
    Promise.all([
      api.getCarrierProfile(session.accessToken, session.accountId),
      api.listMyVehicles(session.accessToken),
    ])
      .then(([carrier, vehicles]) => {
        if (!carrier.isOwnerOperator && carrier.truckCount) {
          setPendingTruckCount(Math.max(0, carrier.truckCount - vehicles.length));
        }
      })
      .catch(() => undefined);
  }, [session]);

  const currentLoad = bookings.find((b) => b.status === 'in_transit') ?? null;

  useEffect(() => {
    if (!session || !currentLoad) return;
    let cancelled = false;
    const refresh = () => {
      api
        .getBookingTracking(session.accessToken, currentLoad.id)
        .then((tr) => {
          if (!cancelled) setCurrentLoadTracking(tr);
        })
        .catch(() => undefined);
    };
    refresh();
    const interval = setInterval(refresh, TRACKING_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, currentLoad?.id]);

  const latestNotification = useMemo(() => notifications.find((n) => !n.readAt) ?? null, [notifications]);

  useEffect(() => {
    if (!session || !latestNotification?.payload.postingId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBannerPosting(null);
      return;
    }
    api
      .getPosting(session.accessToken, latestNotification.payload.postingId)
      .then(setBannerPosting)
      .catch(() => setBannerPosting(null));
  }, [session, latestNotification]);

  if (!session) return null;

  const isShipper = session.userType === 'shipper';
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);

  const isInThisWeek = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= weekStart && d <= weekEnd;
  };

  const activePostingsCount = postings.filter((p) => p.status === 'active').length;
  const upcomingBookings = bookings.filter((b) => b.status === 'accepted' || b.status === 'in_transit');
  const inTransitCount = bookings.filter((b) => b.status === 'in_transit').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  const weekAmount = paymentLogs.reduce((sum, log) => {
    let total = sum;
    if (isInThisWeek(log.advanceReceivedAt) && log.advanceAmount) total += Number(log.advanceAmount);
    if (isInThisWeek(log.balanceReceivedAt) && log.balanceAmount) total += Number(log.balanceAmount);
    return total;
  }, 0);

  const pendingLogs = paymentLogs.filter((l) => l.status === 'awaiting_advance' || l.status === 'awaiting_balance');
  const pendingAmount = pendingLogs.reduce((sum, log) => {
    let total = sum;
    if (log.status === 'awaiting_advance' && log.advanceAmount) total += Number(log.advanceAmount);
    if (log.status === 'awaiting_balance' && log.balanceAmount) total += Number(log.balanceAmount);
    return total;
  }, 0);
  const completedPaymentsCount = paymentLogs.filter((l) => l.status === 'fully_settled').length;

  const recentPostings = [...postings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const upcomingBookingsSorted = [...upcomingBookings]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 4);

  const handleDismissNotification = async () => {
    if (!latestNotification) return;
    await api.markNotificationRead(session.accessToken, latestNotification.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === latestNotification.id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  };

  const handleAccept = async () => {
    if (!bannerPosting) return;
    await api.instantBook(session.accessToken, bannerPosting.id);
    await handleDismissNotification();
    api.listMyBookings(session.accessToken).then(setBookings).catch(() => undefined);
  };

  const isOwnPosting =
    bannerPosting &&
    ((session.userType === 'carrier' && bannerPosting.postedByCarrierId === session.accountId) ||
      (session.userType === 'shipper' && bannerPosting.postedByShipperId === session.accountId));

  const greetingKey = (() => {
    const h = now.getHours();
    if (h < 12) return 'dashboard.greetingMorning';
    if (h < 17) return 'dashboard.greetingAfternoon';
    return 'dashboard.greetingEvening';
  })();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold">
            {t(greetingKey, { name: displayName || '…' })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isShipper ? t('dashboard.subtitleShipper') : t('dashboard.subtitleCarrier')}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          {formatDateRange(weekStart, weekEnd)}
        </div>
      </div>

      {pendingTruckCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {t('dashboard.pendingTrucksTitle', { count: pendingTruckCount })}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200">{t('dashboard.pendingTrucksDesc')}</p>
              </div>
            </div>
            <Link href="/register/add-trucks">
              <Button size="sm">{t('dashboard.pendingTrucksCta')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/postings/new">
          <Button size="lg" className="gap-2">
            <PlusCircle className="size-4" />
            {isShipper ? t('dashboard.postLoad') : t('dashboard.postTruck')}
          </Button>
        </Link>
        <Link href="/postings">
          <Button size="lg" variant="outline" className="gap-2">
            <Search className="size-4" />
            {isShipper ? t('dashboard.searchCarrier') : t('dashboard.searchLoad')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isShipper ? (
          <>
            <StatCard
              icon={Package}
              iconClass="bg-violet-100 text-violet-600"
              label={t('dashboard.statActiveLoads')}
              value={activePostingsCount}
            />
            <StatCard
              icon={Truck}
              iconClass="bg-blue-100 text-blue-600"
              label={t('dashboard.statInTransit')}
              value={inTransitCount}
            />
            <StatCard
              icon={CheckCircle2}
              iconClass="bg-emerald-100 text-emerald-600"
              label={t('dashboard.statCompleted')}
              value={completedCount}
            />
            <StatCard
              icon={Wallet}
              iconClass="bg-amber-100 text-amber-600"
              label={t('dashboard.statTotalSpentWeek')}
              value={formatMoney(weekAmount)}
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Package}
              iconClass="bg-violet-100 text-violet-600"
              label={t('dashboard.statActivePostings')}
              value={activePostingsCount}
            />
            <StatCard
              icon={CalendarDays}
              iconClass="bg-blue-100 text-blue-600"
              label={t('dashboard.statUpcomingBookings')}
              value={upcomingBookings.length}
            />
            <StatCard
              icon={IndianRupee}
              iconClass="bg-emerald-100 text-emerald-600"
              label={t('dashboard.statEarningsWeek')}
              value={formatMoney(weekAmount)}
            />
            <StatCard
              icon={Wallet}
              iconClass="bg-amber-100 text-amber-600"
              label={t('dashboard.statPendingPayments')}
              value={formatMoney(pendingAmount)}
              sublabel={t(
                pendingLogs.length === 1 ? 'dashboard.pendingPaymentsCount' : 'dashboard.pendingPaymentsCount_other',
                { count: pendingLogs.length },
              )}
            />
          </>
        )}
      </div>

      {latestNotification && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {isOwnPosting ? t('dashboard.loadIsLive') : t('dashboard.newLoadAvailable')}
                  </p>
                  <Badge variant="outline" className="border-emerald-300 text-[10px] text-emerald-700">
                    {t('dashboard.justNow')}
                  </Badge>
                </div>
                {bannerPosting ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      {boardLocation(bannerPosting.originCityLabel, bannerPosting.originLabel)}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-amber-500" />
                      {boardLocation(bannerPosting.destinations[0]?.cityLabel, bannerPosting.destinations[0]?.label)}
                    </span>
                    <span className="font-semibold">
                      {bannerPosting.priceAmount ? formatMoney(Number(bannerPosting.priceAmount)) : t('postings.notSpecified')}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    {t(NOTIFICATION_LABEL_KEY[latestNotification.type])}
                  </p>
                )}
                {!isOwnPosting && (
                  <p className="text-xs text-muted-foreground">{t('dashboard.loadIsLiveDesc')}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={`/postings/${latestNotification.payload.postingId ?? ''}`}>
                <Button size="sm" variant="outline" onClick={handleDismissNotification}>
                  {t('dashboard.viewDetails')}
                </Button>
              </Link>
              {!isOwnPosting && bannerPosting?.status === 'active' && (
                <Button size="sm" onClick={handleAccept}>
                  {t('dashboard.acceptLoad')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isShipper && currentLoad && (
        <Card className="border-primary/30">
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-sm font-semibold">{t('tracking.currentLoadsTitle')}</h2>
              <Link href="/dashboard/tracking" className="text-xs text-primary hover:underline">
                {t('dashboard.viewAll')}
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="size-4 shrink-0 text-violet-600" />
              {boardLocation(currentLoad.posting?.originCityLabel, currentLoad.posting?.originLabel)}
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
              {boardLocation(currentLoad.posting?.destinations[0]?.cityLabel, currentLoad.posting?.destinations[0]?.label)}
            </div>
            {currentLoadTracking?.latestPing && currentLoad.posting?.destinations[0] ? (
              <>
                <LiveTrackingMap
                  className="h-48 w-full overflow-hidden rounded-md"
                  origin={{ lat: Number(currentLoad.posting.originLat), lng: Number(currentLoad.posting.originLng) }}
                  destination={{
                    lat: Number(currentLoad.posting.destinations[0].lat),
                    lng: Number(currentLoad.posting.destinations[0].lng),
                  }}
                  current={{ lat: Number(currentLoadTracking.latestPing.lat), lng: Number(currentLoadTracking.latestPing.lng) }}
                  trail={currentLoadTracking.history.map((h) => ({ lat: Number(h.lat), lng: Number(h.lng) }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t('bookingDetail.lastUpdated', { time: timeAgo(currentLoadTracking.latestPing.recordedAt) })}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('bookingDetail.noLocationYet')}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold">
                {isShipper ? t('dashboard.recentLoads') : t('dashboard.recentBookings')}
              </h2>
              <Link href="/postings" className="text-xs text-primary hover:underline">
                {t('dashboard.viewAll')}
              </Link>
            </div>
            {recentPostings.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">{t('dashboard.tableLoadId')}</th>
                      <th className="py-2 pr-3 font-medium">{t('dashboard.tableRoute')}</th>
                      <th className="py-2 pr-3 font-medium">{t('dashboard.tableLoadType')}</th>
                      <th className="py-2 pr-3 font-medium">{t('dashboard.tablePrice')}</th>
                      <th className="py-2 pr-3 font-medium">{t('dashboard.tableStatus')}</th>
                      <th className="py-2 font-medium">{t('dashboard.tablePostedOn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPostings.map((p) => {
                      const badge = statusBadge(p.status);
                      return (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-accent/40">
                          <td className="py-2.5 pr-3">
                            <Link href={`/postings/${p.id}`} className="text-primary hover:underline">
                              RL-{p.id.slice(0, 6).toUpperCase()}
                            </Link>
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {boardLocation(p.originCityLabel, p.originLabel)} &rarr;{' '}
                            {boardLocation(p.destinations[0]?.cityLabel, p.destinations[0]?.label)}
                          </td>
                          <td className="py-2.5 pr-3">
                            {p.loadType === 'full' ? t('postings.loadFull') : t('postings.loadPartOk')}
                          </td>
                          <td className="py-2.5 pr-3">
                            {p.priceAmount ? formatMoney(Number(p.priceAmount)) : t('postings.notSpecified')}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                          <td className="py-2.5 whitespace-nowrap text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {isShipper ? (
            <>
              <Card>
                <CardContent className="py-4">
                  <h2 className="mb-3 font-heading text-sm font-semibold">{t('dashboard.recentActivities')}</h2>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {notifications.slice(0, 4).map((n) => (
                        <div key={n.id} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          <div>
                            <p className="text-sm">{t(NOTIFICATION_LABEL_KEY[n.type])}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(n.createdAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <h2 className="mb-3 font-heading text-sm font-semibold">{t('dashboard.paymentsOverview')}</h2>
                  <p className="text-xs text-muted-foreground">{t('dashboard.statTotalSpentWeek')}</p>
                  <p className="mb-3 text-xl font-semibold">{formatMoney(weekAmount)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-xs text-muted-foreground">{t('dashboard.statPendingPayments')}</p>
                      <p className="text-sm font-semibold">{formatMoney(pendingAmount)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-xs text-muted-foreground">{t('dashboard.statCompleted')}</p>
                      <p className="text-sm font-semibold">
                        {t(
                          completedPaymentsCount === 1
                            ? 'dashboard.completedPaymentsCount'
                            : 'dashboard.completedPaymentsCount_other',
                          { count: completedPaymentsCount },
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-4">
                <h2 className="mb-3 font-heading text-sm font-semibold">{t('dashboard.upcomingBookingsList')}</h2>
                {upcomingBookingsSorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('tracking.empty')}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {upcomingBookingsSorted.map((b) => {
                      const badge = statusBadge(b.status);
                      return (
                        <Link
                          key={b.id}
                          href={`/bookings/${b.id}`}
                          className="block rounded-lg border p-2.5 hover:bg-accent/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {b.posting
                                ? `${boardLocation(b.posting.originCityLabel, b.posting.originLabel)} → ${boardLocation(b.posting.destinations[0]?.cityLabel, b.posting.destinations[0]?.label)}`
                                : '—'}
                            </p>
                            <Badge variant={badge.variant} className="shrink-0 text-[10px]">
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {b.agreedPrice ? formatMoney(Number(b.agreedPrice)) : t('postings.notSpecified')} &middot;{' '}
                            {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
                <Link href="/bookings" className="mt-3 block text-center text-sm text-primary hover:underline">
                  {t('dashboard.viewAllBookings')}
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
