'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  ArrowRight,
  ArrowLeftRight,
  SlidersHorizontal,
  CalendarDays,
  Truck,
  Package,
  BadgeCheck,
  Star,
  Bookmark,
  BookmarkCheck,
  List as ListIcon,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError, Posting } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { boardLocation, boardLocationParts, formatMoney, timeAgo, cn } from '@/lib/utils';
import { TRUCK_TYPES, truckTypeLabel } from '@/lib/truck-types';

type TabKey = 'all' | 'book_now' | 'near_you' | 'saved';
type SortKey = 'newest' | 'price_low' | 'price_high' | 'nearest';
type ViewMode = 'list' | 'grid';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

interface AppliedFilters {
  origin: string;
  destination: string;
  loadType: 'any' | 'full' | 'part_load_ok';
}

const DEFAULT_FILTERS: AppliedFilters = { origin: '', destination: '', loadType: 'any' };

function PostingsSearchContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loaded } = useSession();

  const [origin, setOrigin] = useState(searchParams.get('origin') ?? '');
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '');
  const [loadType, setLoadType] = useState<AppliedFilters['loadType']>('any');
  const [truckType, setTruckType] = useState<'any' | string>('any');
  const [minCapacity, setMinCapacity] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);
  // Visual-only filter chips matching the reference design — we don't collect
  // truck length or a separate booking-terms field, so these have a single
  // "All" option rather than fabricating data we don't have.
  const [lengthFilter, setLengthFilter] = useState('all');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const [tab, setTab] = useState<TabKey>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<ViewMode>('list');

  const [items, setItems] = useState<Posting[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const [tabCounts, setTabCounts] = useState<Record<TabKey, number | null>>({
    all: null,
    book_now: null,
    near_you: null,
    saved: null,
  });

  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  // Seed the Book Now / Saved tab counts up front — All and Near You are set
  // whenever those tabs are actually fetched (see fetchResults below).
  useEffect(() => {
    if (!session) return;
    api
      .searchPostings(session.accessToken, { page: 1, pageSize: 1, priceType: 'fixed' })
      .then((res) => setTabCounts((prev) => ({ ...prev, book_now: res.total })))
      .catch(() => undefined);
    api
      .listSavedLoads(session.accessToken)
      .then((res) => setTabCounts((prev) => ({ ...prev, saved: res.total })))
      .catch(() => undefined);
     
  }, [session]);

  const requestGeolocation = () => {
    setGeoError(null);
    setGeoLoading(true);
    if (!navigator.geolocation) {
      setGeoError(t('postings.geoUnsupported'));
      setGeoLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError(t('postings.geoDenied'));
        setGeoLoading(false);
      },
      { timeout: 10000 },
    );
  };

  useEffect(() => {
    if (tab === 'near_you' && !geoCoords && !geoLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      requestGeolocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const fetchResults = async () => {
    if (!session) return;
    if (tab === 'near_you' && !geoCoords) return;
    setError(null);
    setLoading(true);
    try {
      let res;
      if (tab === 'saved') {
        res = await api.listSavedLoads(session.accessToken);
      } else if (tab === 'near_you' && geoCoords) {
        res = await api.searchPostings(session.accessToken, {
          nearLat: geoCoords.lat,
          nearLng: geoCoords.lng,
          loadType: appliedFilters.loadType === 'any' ? undefined : appliedFilters.loadType,
          page,
          pageSize,
        });
      } else {
        res = await api.searchPostings(session.accessToken, {
          origin: appliedFilters.origin || undefined,
          destination: appliedFilters.destination || undefined,
          loadType: appliedFilters.loadType === 'any' ? undefined : appliedFilters.loadType,
          priceType: tab === 'book_now' ? 'fixed' : undefined,
          page,
          pageSize,
        });
      }
      setItems(res.items);
      setTotal(res.total);
      setTabCounts((prev) => ({ ...prev, [tab]: res.total }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tab, page, pageSize, appliedFilters, geoCoords]);

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({ origin, destination, loadType });
  };

  const handleClearAll = () => {
    setOrigin('');
    setDestination('');
    setLoadType('any');
    setTruckType('any');
    setMinCapacity('');
    setLengthFilter('all');
    setBookingFilter('all');
    setPage(1);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleTabChange = (next: TabKey) => {
    setTab(next);
    setPage(1);
  };

  const handleToggleSave = async (posting: Posting) => {
    if (!session) return;
    setSavingId(posting.id);
    const wasSaved = posting.savedByMe;
    try {
      if (wasSaved) {
        await api.unsaveLoad(session.accessToken, posting.id);
      } else {
        await api.saveLoad(session.accessToken, posting.id);
      }
      setItems((prev) => prev.map((p) => (p.id === posting.id ? { ...p, savedByMe: !p.savedByMe } : p)));
      setTabCounts((prev) => ({ ...prev, saved: Math.max(0, (prev.saved ?? 0) + (wasSaved ? -1 : 1)) }));
      if (tab === 'saved' && wasSaved) {
        setItems((prev) => prev.filter((p) => p.id !== posting.id));
        setTotal((prevTotal) => Math.max(0, prevTotal - 1));
      }
    } catch {
      // Non-critical UI action — silently ignore, the toggle just won't flip.
    } finally {
      setSavingId(null);
    }
  };

  // Server-known status (persists across visits) takes priority over the
  // locally just-clicked bookedIds set (which resets on reload) — otherwise
  // revisiting the board after already applying showed "Book now" again.
  const bookedLabel = (posting: Posting): string | null => {
    switch (posting.myBookingStatus) {
      case 'pending':
        return t('postings.waitingConfirmation');
      case 'accepted':
      case 'in_transit':
      case 'completed':
        return t('postings.bookingConfirmed');
      case 'cancelled':
        return t('postings.bookingNotSelectedLabel');
      default:
        return null;
    }
  };

  const handleBook = async (postingId: string) => {
    if (!session) return;
    setBookingId(postingId);
    try {
      await api.instantBook(session.accessToken, postingId);
      setBookedIds((prev) => new Set(prev).add(postingId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBookingId(null);
    }
  };

  const displayedItems = useMemo(() => {
    let list = items;
    if (truckType !== 'any') {
      list = list.filter((p) => p.equipment?.truckType === truckType);
    }
    if (minCapacity) {
      const min = Number(minCapacity);
      list = list.filter((p) => p.equipment?.capacityTons != null && Number(p.equipment.capacityTons) >= min);
    }
    const sorted = [...list];
    if (sort === 'price_low') {
      sorted.sort((a, b) => (Number(a.priceAmount) || Infinity) - (Number(b.priceAmount) || Infinity));
    } else if (sort === 'price_high') {
      sorted.sort((a, b) => (Number(b.priceAmount) || -Infinity) - (Number(a.priceAmount) || -Infinity));
    } else if (sort === 'nearest') {
      sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return sorted;
  }, [items, truckType, minCapacity, sort]);

  const toggleRowSelected = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedRows((prev) =>
      prev.size === displayedItems.length ? new Set() : new Set(displayedItems.map((p) => p.id)),
    );
  };

  if (!session) return null;

  const isShipper = session.userType === 'shipper';
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(total, page * pageSize);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('postings.tabAll') },
    { key: 'book_now', label: t('postings.tabBookNow') },
    { key: 'near_you', label: t('postings.tabNearYou') },
    { key: 'saved', label: t('postings.tabSaved') },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">
          {isShipper ? t('postings.truckBoardTitle') : t('postings.loadBoardTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isShipper ? t('postings.subtitleShipper') : t('postings.subtitleCarrier')}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label className="text-xs">{t('postings.origin')}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder={t('postings.originPlaceholder')}
                    className="pl-8"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                type="button"
                aria-label={t('postings.swapOriginDestination')}
                onClick={handleSwap}
                className="self-center sm:mb-0.5 sm:self-auto shrink-0"
              >
                <ArrowLeftRight className="size-4" />
              </Button>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label className="text-xs">{t('postings.destinationOptional')}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={t('postings.destinationPlaceholder')}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('postings.loadType')}</Label>
              <Select value={loadType} onValueChange={(v) => v && setLoadType(v as typeof loadType)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('postings.filterAny')}</SelectItem>
                  <SelectItem value="full">{t('postings.loadFull')}</SelectItem>
                  <SelectItem value="part_load_ok">{t('postings.loadPartOk')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('postings.truckType')}</Label>
              <Select value={truckType} onValueChange={(v) => v && setTruckType(v)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('postings.filterAny')}</SelectItem>
                  {TRUCK_TYPES.map((tt) => (
                    <SelectItem key={tt} value={tt}>
                      {truckTypeLabel(tt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
              {isShipper ? t('dashboard.searchCarrier') : t('dashboard.searchLoad')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <SlidersHorizontal className="size-4" />
              {t('postings.moreFilters')}
            </span>

            <Select value={lengthFilter} onValueChange={(v) => v && setLengthFilter(v)}>
              <SelectTrigger className="h-8 rounded-md px-2.5 text-xs" size="sm">
                <span className="text-muted-foreground">{t('postings.length')}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('postings.filterAny')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={minCapacity || 'all'}
              onValueChange={(v) => v && setMinCapacity(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-8 rounded-md px-2.5 text-xs" size="sm">
                <span className="text-muted-foreground">{t('postings.weight')}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('postings.filterAny')}</SelectItem>
                <SelectItem value="10">{t('postings.weightTon', { count: 10 })}+</SelectItem>
                <SelectItem value="20">{t('postings.weightTon', { count: 20 })}+</SelectItem>
                <SelectItem value="30">{t('postings.weightTon', { count: 30 })}+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={loadType} onValueChange={(v) => v && setLoadType(v as typeof loadType)}>
              <SelectTrigger className="h-8 rounded-md px-2.5 text-xs" size="sm">
                <span className="text-muted-foreground">{t('postings.fullPart')}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t('postings.filterAny')}</SelectItem>
                <SelectItem value="full">{t('postings.loadFull')}</SelectItem>
                <SelectItem value="part_load_ok">{t('postings.loadPartOk')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bookingFilter} onValueChange={(v) => v && setBookingFilter(v)}>
              <SelectTrigger className="h-8 rounded-md px-2.5 text-xs" size="sm">
                <span className="text-muted-foreground">{t('postings.booking')}:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('postings.filterAny')}</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={handleClearAll}
              className="ml-auto text-sm text-primary hover:underline"
            >
              {t('postings.clearAll')}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b">
        <div className="flex items-center gap-5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={cn(
                'relative flex items-center gap-1.5 pb-2.5 text-sm font-medium transition-colors',
                tab === key ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {tabCounts[key] != null && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    tab === key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tabCounts[key]}
                </span>
              )}
              {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pb-2.5">
          <Label className="text-xs text-muted-foreground">{t('postings.sortBy')}</Label>
          <Select value={sort} onValueChange={(v) => v && setSort(v as SortKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('postings.sortNewest')}</SelectItem>
              <SelectItem value="price_low">{t('postings.sortPriceLow')}</SelectItem>
              <SelectItem value="price_high">{t('postings.sortPriceHigh')}</SelectItem>
              {tab === 'near_you' && <SelectItem value="nearest">{t('postings.sortNearest')}</SelectItem>}
            </SelectContent>
          </Select>
          {/* Below sm the table always falls back to cards regardless of this
              toggle, so it wouldn't do anything useful there — hide it. */}
          <div className="hidden rounded-lg border sm:flex">
            <button
              aria-label={t('postings.viewList')}
              onClick={() => setView('list')}
              className={cn('flex size-8 items-center justify-center rounded-l-lg', view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
            >
              <ListIcon className="size-4" />
            </button>
            <button
              aria-label={t('postings.viewGrid')}
              onClick={() => setView('grid')}
              className={cn('flex size-8 items-center justify-center rounded-r-lg', view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {tab === 'near_you' && geoLoading && <p className="text-sm text-muted-foreground">{t('postings.geoLoading')}</p>}
      {tab === 'near_you' && geoError && <p className="text-sm text-destructive">{geoError}</p>}

      {!loading && displayedItems.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('postings.emptyFiltered')}</p>
      )}

      {view === 'list' ? (
        <>
          {/* A 7-column table can't fit a phone screen readably no matter how
              it's scrolled — below sm, show the same cards the grid view uses
              instead, regardless of the list/grid toggle. Desktop/tablet keep
              the table exactly as before. */}
          <div className="grid gap-3 sm:hidden">
            {displayedItems.map((posting) => {
              const bookedLbl = bookedLabel(posting);
              const isBooked = bookedIds.has(posting.id) || bookedLbl !== null;
              return (
                <Card key={posting.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="size-3.5 shrink-0 text-violet-600" />
                      <span className="truncate">{boardLocation(posting.originCityLabel, posting.originLabel)}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {boardLocation(posting.destinations[0]?.cityLabel, posting.destinations[0]?.label)}
                      </span>
                    </div>

                    <p className="text-lg font-semibold">
                      {posting.priceAmount ? formatMoney(Number(posting.priceAmount)) : t('postings.notSpecified')}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">
                        {posting.loadType === 'full' ? t('postings.loadFull') : t('postings.loadPartOk')}
                      </Badge>
                      {posting.distanceKm != null && (
                        <Badge variant="secondary">{t('postings.distanceAway', { distance: posting.distanceKm.toFixed(1) })}</Badge>
                      )}
                      <button
                        aria-label={posting.savedByMe ? t('postings.saved') : t('postings.save')}
                        onClick={() => handleToggleSave(posting)}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                      >
                        {posting.savedByMe ? (
                          <BookmarkCheck className="size-4 text-primary" />
                        ) : (
                          <Bookmark className="size-4" />
                        )}
                      </button>
                    </div>

                    {posting.postedBy && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {posting.postedBy.name}
                        {posting.postedBy.verified && <BadgeCheck className="size-3.5 text-primary" />}
                        {posting.postedBy.ratingCount > 0 && (
                          <span className="ml-1 flex items-center gap-0.5">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {posting.postedBy.rating?.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex gap-2 pt-2">
                      <Link href={`/postings/${posting.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          {t('dashboard.viewDetails')}
                        </Button>
                      </Link>
                      <Button
                        className="flex-1"
                        disabled={isBooked || bookingId === posting.id}
                        onClick={() => handleBook(posting.id)}
                      >
                        {bookedLbl ?? (bookedIds.has(posting.id) ? t('postings.bookingConfirmed') : t('postings.book'))}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="hidden sm:block">
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="w-8 py-2 pr-1">
                    <input
                      type="checkbox"
                      aria-label={t('postings.selectAll')}
                      checked={selectedRows.size > 0 && selectedRows.size === displayedItems.length}
                      onChange={toggleSelectAll}
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
                {displayedItems.map((posting) => {
                  const [originPrimary, originSecondary] = boardLocationParts(posting.originCityLabel, posting.originLabel);
                  const [destPrimary, destSecondary] = boardLocationParts(
                    posting.destinations[0]?.cityLabel,
                    posting.destinations[0]?.label,
                  );
                  const isFull = posting.loadType === 'full';
                  return (
                    <tr
                      key={posting.id}
                      className={cn(
                        'border-b border-l-4 last:border-b-0 align-top hover:bg-accent/40',
                        isFull ? 'border-l-emerald-500' : 'border-l-amber-500',
                      )}
                    >
                      <td className="py-3 pr-1 pl-2">
                        <input
                          type="checkbox"
                          aria-label={posting.id}
                          checked={selectedRows.has(posting.id)}
                          onChange={() => toggleRowSelected(posting.id)}
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
                          {new Date(posting.availableFromDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                          <Truck className="size-3.5 text-muted-foreground" />
                          {isFull ? t('postings.loadFull') : t('postings.loadPartOk')}
                        </div>
                        {posting.optionalNote && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Package className="size-3.5 shrink-0" />
                            <span className="max-w-[160px] truncate">{posting.optionalNote}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {posting.equipment ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Truck className="size-3.5 text-muted-foreground" />
                            <div>
                              <p>{truckTypeLabel(posting.equipment.truckType)}</p>
                              {posting.equipment.capacityTons && (
                                <p className="text-muted-foreground">
                                  {t('postings.weightTon', { count: Number(posting.equipment.capacityTons) })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {posting.priceAmount ? (
                          <>
                            <p className="font-semibold">{formatMoney(Number(posting.priceAmount))}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoney(Number(posting.priceAmount))} / {isFull ? t('postings.loadFull') : t('postings.loadPartOk')}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-muted-foreground">{t('postings.notSpecified')}</p>
                        )}
                        {posting.distanceKm != null && (
                          <p className="text-xs text-muted-foreground">
                            {t('postings.distanceAway', { distance: posting.distanceKm.toFixed(1) })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          {posting.postedBy?.name ?? '—'}
                          {posting.postedBy?.verified && (
                            <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label={t('postings.verified')} />
                          )}
                        </div>
                        {posting.postedBy && posting.postedBy.ratingCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {posting.postedBy.rating?.toFixed(1)}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">{t('postings.postedAgo', { time: timeAgo(posting.createdAt) })}</p>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            aria-label={posting.savedByMe ? t('postings.saved') : t('postings.save')}
                            disabled={savingId === posting.id}
                            onClick={() => handleToggleSave(posting)}
                            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground"
                          >
                            {posting.savedByMe ? (
                              <BookmarkCheck className="size-4 text-primary" />
                            ) : (
                              <Bookmark className="size-4" />
                            )}
                          </button>
                          <Link href={`/postings/${posting.id}`}>
                            <Button variant="outline" size="sm">
                              {t('dashboard.viewDetails')}
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayedItems.map((posting) => {
            const bookedLbl = bookedLabel(posting);
            const isBooked = bookedIds.has(posting.id) || bookedLbl !== null;
            return (
              <Card key={posting.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 py-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="size-3.5 shrink-0 text-violet-600" />
                    <span className="truncate">{boardLocation(posting.originCityLabel, posting.originLabel)}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {boardLocation(posting.destinations[0]?.cityLabel, posting.destinations[0]?.label)}
                    </span>
                  </div>

                  <p className="text-lg font-semibold">
                    {posting.priceAmount ? formatMoney(Number(posting.priceAmount)) : t('postings.notSpecified')}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">
                      {posting.loadType === 'full' ? t('postings.loadFull') : t('postings.loadPartOk')}
                    </Badge>
                    {posting.distanceKm != null && (
                      <Badge variant="secondary">{t('postings.distanceAway', { distance: posting.distanceKm.toFixed(1) })}</Badge>
                    )}
                    <button
                      aria-label={posting.savedByMe ? t('postings.saved') : t('postings.save')}
                      onClick={() => handleToggleSave(posting)}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      {posting.savedByMe ? (
                        <BookmarkCheck className="size-4 text-primary" />
                      ) : (
                        <Bookmark className="size-4" />
                      )}
                    </button>
                  </div>

                  {posting.postedBy && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {posting.postedBy.name}
                      {posting.postedBy.verified && <BadgeCheck className="size-3.5 text-primary" />}
                      {posting.postedBy.ratingCount > 0 && (
                        <span className="ml-1 flex items-center gap-0.5">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {posting.postedBy.rating?.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex gap-2 pt-2">
                    <Link href={`/postings/${posting.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        {t('dashboard.viewDetails')}
                      </Button>
                    </Link>
                    <Button
                      className="flex-1"
                      disabled={isBooked || bookingId === posting.id}
                      onClick={() => handleBook(posting.id)}
                    >
                      {bookedLbl ?? (bookedIds.has(posting.id) ? t('postings.bookingConfirmed') : t('postings.book'))}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {tab !== 'saved' && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            {t('postings.showingRange', { from: rangeFrom, to: rangeTo, total })}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md text-sm',
                      p === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">{t('postings.rowsPerPage')}</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  if (!v) return;
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostingsPage() {
  return (
    <Suspense>
      <PostingsSearchContent />
    </Suspense>
  );
}
