'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Navigation,
  ArrowLeftRight,
  CalendarDays,
  BadgeCheck,
  Lock,
  List as ListIcon,
  LayoutGrid,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/lib/session-context';
import { useMarketingRole } from '@/lib/marketing-role-context';
import { cn } from '@/lib/utils';

interface SampleEntry {
  // 'route' shows a normal origin → destination pair, same as a load
  // listing. 'nearby' shows how far this truck currently is from the
  // shipper's own load location instead — a different, truck-availability-
  // specific way of describing the same "is this useful to me" question,
  // since a truck's current position matters more than a fixed route.
  variant: 'route' | 'nearby';
  origin?: string;
  destination?: string;
  distanceKm?: number;
  // For 'route': the load's available-from date. For 'nearby': the date
  // this truck expects to reach the shipper's load location.
  date: string;
  cost: number;
  postedBy: string;
  // Truck entries only — kept separate from postedBy so it can be masked
  // (see maskRegNumber below) rather than baked into a display string.
  regNumber?: string;
  loadType: 'full' | 'part_load_ok';
}

// Anonymous visitors never see a real price or a real registration number —
// both only appear once logged in, on the real /postings board. This preview
// is sample data anyway, but masks it the same way real public data would be,
// so the format itself demonstrates what a signed-out visitor actually sees.
function maskRegNumber(reg: string): string {
  return reg.replace(/\d{4}$/, 'xxxx');
}

// Placeholder data for the anonymous-visitor preview only — never fetched
// from the API, since unauthenticated visitors shouldn't see real postings
// or contact details. Real data only appears once logged in, via /postings
// (see goToRealLoadboard below). loadType only drives the same green/amber
// left-border accent the real table uses, purely decorative here.
//
// Two pools, one per marketing role: LOAD_POOL is what a truck owner would
// browse (loads to carry), TRUCK_POOL is what a shipper would browse (trucks
// available to hire) — same Posting-shaped fields either way, matching how
// the real /postings page reuses one table for both "Load Board" and "Truck
// Board" (see postings.loadBoardTitle / truckBoardTitle).
const LOAD_POOL: SampleEntry[] = [
  { variant: 'route', origin: 'Mumbai, Maharashtra', destination: 'Pune, Maharashtra', cost: 18500, date: '2026-08-06', postedBy: 'Anand Traders', loadType: 'full' },
  { variant: 'route', origin: 'Delhi, NCR', destination: 'Jaipur, Rajasthan', cost: 22000, date: '2026-08-07', postedBy: 'Sharma Logistics', loadType: 'full' },
  { variant: 'route', origin: 'Ahmedabad, Gujarat', destination: 'Surat, Gujarat', cost: 12800, date: '2026-08-06', postedBy: 'Patel Exports', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Bengaluru, Karnataka', destination: 'Chennai, Tamil Nadu', cost: 27500, date: '2026-08-08', postedBy: 'South Star Freight', loadType: 'full' },
  { variant: 'route', origin: 'Hyderabad, Telangana', destination: 'Nagpur, Maharashtra', cost: 24000, date: '2026-08-09', postedBy: 'Deccan Cargo Co.', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Kolkata, West Bengal', destination: 'Bhubaneswar, Odisha', cost: 19200, date: '2026-08-07', postedBy: 'Eastern Route Traders', loadType: 'full' },
  { variant: 'route', origin: 'Chandigarh, Punjab', destination: 'Ludhiana, Punjab', cost: 9800, date: '2026-08-06', postedBy: 'Northline Freight', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Indore, Madhya Pradesh', destination: 'Bhopal, Madhya Pradesh', cost: 11200, date: '2026-08-08', postedBy: 'Malwa Traders', loadType: 'full' },
  { variant: 'route', origin: 'Coimbatore, Tamil Nadu', destination: 'Kochi, Kerala', cost: 16400, date: '2026-08-09', postedBy: 'Nilgiri Exports', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Lucknow, Uttar Pradesh', destination: 'Kanpur, Uttar Pradesh', cost: 8600, date: '2026-08-06', postedBy: 'Awadh Cargo', loadType: 'full' },
];

const TRUCK_POOL: SampleEntry[] = [
  { variant: 'nearby', distanceKm: 48, cost: 17500, date: '2026-08-08', postedBy: 'Ramesh Yadav', regNumber: 'MH12AB1234', loadType: 'full' },
  { variant: 'route', origin: 'Delhi, NCR', destination: 'Jaipur, Rajasthan', cost: 21000, date: '2026-08-07', postedBy: 'Suresh Chauhan', regNumber: 'RJ14CD5678', loadType: 'full' },
  { variant: 'nearby', distanceKm: 22, cost: 12000, date: '2026-08-07', postedBy: 'Kiran Patel', regNumber: 'GJ01EF9012', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Bengaluru, Karnataka', destination: 'Chennai, Tamil Nadu', cost: 26000, date: '2026-08-08', postedBy: 'Manjunath R', regNumber: 'KA05GH3456', loadType: 'full' },
  { variant: 'nearby', distanceKm: 65, cost: 23000, date: '2026-08-10', postedBy: 'Venkatesh Rao', regNumber: 'TS09IJ7890', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Kolkata, West Bengal', destination: 'Bhubaneswar, Odisha', cost: 18200, date: '2026-08-07', postedBy: 'Bimal Das', regNumber: 'WB06KL1234', loadType: 'full' },
  { variant: 'nearby', distanceKm: 14, cost: 9200, date: '2026-08-07', postedBy: 'Gurpreet Singh', regNumber: 'PB11MN5678', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Indore, Madhya Pradesh', destination: 'Bhopal, Madhya Pradesh', cost: 10500, date: '2026-08-08', postedBy: 'Ashok Verma', regNumber: 'MP09OP9012', loadType: 'full' },
  { variant: 'nearby', distanceKm: 37, cost: 15600, date: '2026-08-09', postedBy: 'Selvam K', regNumber: 'TN37QR3456', loadType: 'part_load_ok' },
  { variant: 'route', origin: 'Lucknow, Uttar Pradesh', destination: 'Kanpur, Uttar Pradesh', cost: 8000, date: '2026-08-06', postedBy: 'Ram Singh', regNumber: 'UP32ST7890', loadType: 'full' },
];

const VISIBLE_COUNT = 6;
const ROTATE_MS = 10000;
const TAB_KEYS = ['tabAll', 'tabBookNow', 'tabNearYou', 'tabSaved'] as const;

function formatSampleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function LoadboardPreview() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { role } = useMarketingRole();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [offset, setOffset] = useState(0);

  const pool = role === 'shipper' ? TRUCK_POOL : LOAD_POOL;

  // Simulated live feed: slides the visible window over the pool every 10s,
  // just enough motion to feel like new postings are coming in. Resets to the
  // start whenever the role changes so it doesn't jump mid-scroll.
  useEffect(() => {
    setOffset(0);
  }, [role]);
  useEffect(() => {
    const id = setInterval(() => setOffset((prev) => (prev + 1) % pool.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [pool.length]);

  const displayed = useMemo(
    () => Array.from({ length: VISIBLE_COUNT }, (_, i) => pool[(offset + i) % pool.length]),
    [pool, offset],
  );

  // A real, logged-in user goes straight to the actual loadboard. Anyone
  // else is sent to register first — every interactive-looking control here
  // (search, filters, tabs, view details) is decorative over sample data, so
  // any attempt to actually use it should lead to the real thing instead.
  const goToRealLoadboard = () => router.push(session ? '/postings' : '/register/phone');

  const titleKey = role === 'shipper' ? 'marketing.loadboard.titleShipper' : 'marketing.loadboard.titleTruck';
  const subtitleKey = role === 'shipper' ? 'marketing.loadboard.subtitleShipper' : 'marketing.loadboard.subtitleTruck';
  const searchLabelKey = role === 'shipper' ? 'dashboard.searchCarrier' : 'dashboard.searchLoad';

  return (
    <section id="loadboard" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-primary">{t('marketing.loadboard.eyebrow')}</span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">
            {t(titleKey)}
          </h2>
          <p className="mt-4 text-muted-foreground">{t(subtitleKey)}</p>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {/* Search bar — mirrors the real loadboard's filter card exactly, but
              every field is read-only: there's no backend query behind sample
              data, so any attempt to use it hands off to the real page instead. */}
          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-1 items-end gap-2">
                  <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                    <Label className="text-xs">{t('postings.origin')}</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        readOnly
                        onFocus={goToRealLoadboard}
                        placeholder={t('postings.originPlaceholder')}
                        className="cursor-pointer pl-8"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    aria-label={t('postings.swapOriginDestination')}
                    onClick={goToRealLoadboard}
                    className="mb-0.5 shrink-0"
                  >
                    <ArrowLeftRight className="size-4" />
                  </Button>
                  <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
                    <Label className="text-xs">{t('postings.destinationOptional')}</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        readOnly
                        onFocus={goToRealLoadboard}
                        placeholder={t('postings.destinationPlaceholder')}
                        className="cursor-pointer pl-8"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{t('postings.loadType')}</Label>
                  <Select value="any" onValueChange={goToRealLoadboard}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">{t('postings.filterAny')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={goToRealLoadboard}>{t(searchLabelKey)}</Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs + view toggle — tabs are decorative (sample data doesn't
              change), the list/grid toggle actually works since it's just a
              client-side layout switch over the same six sample cards. */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b">
            <div className="flex items-center gap-5">
              {TAB_KEYS.map((key, idx) => (
                <button
                  key={key}
                  type="button"
                  onClick={goToRealLoadboard}
                  className={cn(
                    'relative pb-2.5 text-sm font-medium transition-colors',
                    idx === 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`postings.${key}`)}
                  {idx === 0 && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pb-2.5">
              <div className="flex rounded-lg border">
                <button
                  type="button"
                  aria-label={t('postings.viewList')}
                  onClick={() => setView('list')}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-l-lg',
                    view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  <ListIcon className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={t('postings.viewGrid')}
                  onClick={() => setView('grid')}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-r-lg',
                    view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {view === 'list' ? (
            <Card>
              <CardContent className="overflow-x-auto py-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 pl-2 font-medium">
                        <p>{t('postings.tableOrigin')}</p>
                        <p className="font-normal">{t('postings.tableDestination')}</p>
                      </th>
                      <th className="py-2 pr-3 font-medium">{t('postings.tableDetails')}</th>
                      <th className="py-2 pr-3 font-medium">{t('dashboard.tablePrice')}</th>
                      <th className="py-2 pr-3 font-medium">{t('postings.tableCompany')}</th>
                      <th className="py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((load, idx) => (
                      <tr
                        key={`${load.postedBy}-${idx}`}
                        className={cn(
                          'border-b border-l-4 last:border-b-0 align-top hover:bg-accent/40',
                          load.loadType === 'full' ? 'border-l-emerald-500' : 'border-l-amber-500',
                        )}
                      >
                        <td className="py-3 pr-3 pl-2">
                          {load.variant === 'route' ? (
                            <>
                              <div className="flex items-start gap-1.5">
                                <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                                <p className="font-medium">{load.origin}</p>
                              </div>
                              <div className="mt-1.5 flex items-start gap-1.5">
                                <MapPin className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                                <p className="font-medium">{load.destination}</p>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-start gap-1.5">
                              <Navigation className="mt-0.5 size-3.5 shrink-0 text-primary" />
                              <p className="font-medium">
                                {t('marketing.loadboard.kmAway', { distance: load.distanceKm })}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="size-3.5 shrink-0" />
                            {load.variant === 'route'
                              ? formatSampleDate(load.date)
                              : t('marketing.loadboard.reachingOn', { date: formatSampleDate(load.date) })}
                          </div>
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                            <Lock className="size-3.5 shrink-0" />
                            {t('marketing.loadboard.signInForPrice')}
                          </p>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            {load.postedBy}
                            {load.regNumber && (
                              <span className="text-xs text-muted-foreground">· {maskRegNumber(load.regNumber)}</span>
                            )}
                            <BadgeCheck className="size-3.5 shrink-0 text-primary" />
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={goToRealLoadboard}>
                              {t('marketing.loadboard.viewMore')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayed.map((load, idx) => (
                <Card key={`${load.origin ?? load.distanceKm}-${load.destination ?? ''}-${idx}`} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 py-4">
                    {load.variant === 'route' ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="size-3.5 shrink-0 text-violet-600" />
                        <span className="truncate">{load.origin}</span>
                        <MapPin className="size-3.5 shrink-0 text-rose-500" />
                        <span className="truncate">{load.destination}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Navigation className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{t('marketing.loadboard.kmAway', { distance: load.distanceKm })}</span>
                      </div>
                    )}

                    <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <Lock className="size-3.5 shrink-0" />
                      {t('marketing.loadboard.signInForPrice')}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5 shrink-0" />
                      {load.variant === 'route'
                        ? formatSampleDate(load.date)
                        : t('marketing.loadboard.reachingOn', { date: formatSampleDate(load.date) })}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {load.postedBy}
                      {load.regNumber && <span>· {maskRegNumber(load.regNumber)}</span>}
                      <BadgeCheck className="size-3.5 text-primary" />
                    </div>

                    <Button variant="outline" className="mt-auto w-full" onClick={goToRealLoadboard}>
                      {t('marketing.loadboard.viewMore')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <p className="mt-8 text-center">
          <Link href={session ? '/postings' : '/register/phone'} className="text-sm font-medium text-primary hover:underline">
            {t('marketing.loadboard.viewAll')}
          </Link>
        </p>
      </div>
    </section>
  );
}
