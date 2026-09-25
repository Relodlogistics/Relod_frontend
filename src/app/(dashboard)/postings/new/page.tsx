'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import {
  IndianRupee,
  EyeOff,
  Truck as TruckIcon,
  Package,
  CalendarDays,
  Weight,
  Check,
  Info,
  Plus,
  Ruler,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateField } from '@/components/DateField';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { truckTypeLabel } from '@/lib/truck-types';
import { TruckTypeCombobox } from '@/components/TruckTypeCombobox';
import { LENGTH_PRESETS, PresetChipField } from '@/components/PresetChipField';
import { cn } from '@/lib/utils';
import { PlaceAutocompleteInput, PlaceResult, cityLabel } from '@/components/PlaceAutocompleteInput';
import { Modal } from '@/components/Modal';

type PostingPayload = Parameters<typeof api.createPosting>[1];
type PreviewData = {
  payload: PostingPayload;
  rows: { label: string; value: string }[];
  route: { kind: 'origin' | 'destination'; title: string; detail: string; approximate?: boolean }[];
};

function SectionHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
        {step}
      </span>
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

function ToggleCard({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-primary' : 'border-muted-foreground/40',
          )}
        >
          {selected && <span className="size-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </span>
      {subtitle && <span className="pl-6 text-xs text-muted-foreground">{subtitle}</span>}
    </button>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function NewPostingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [originCity, setOriginCity] = useState('');
  const [originPlace, setOriginPlace] = useState<PlaceResult | null>(null);
  const [destCity, setDestCity] = useState('');
  const [destPlace, setDestPlace] = useState<PlaceResult | null>(null);
  const [stops, setStops] = useState<{ city: string; address: string; place: PlaceResult | null }[]>([
    { city: '', address: '', place: null },
  ]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  // Free text — resolved to real coordinates via api.geocodeResolve() at
  // submit time (always Google; see backend GoogleAddressResolver). The
  // origin/destination "city" dropdowns above are for a friendly label
  // only and never determine the stored lat/lng.
  const [pickupAddress, setPickupAddress] = useState('');

  const updateStopCity = (index: number, city: string) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, city, place: null } : s)));
  };
  const selectStopPlace = (index: number, place: PlaceResult) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, city: place.label, place } : s)));
  };
  const updateStopAddress = (index: number, address: string) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, address } : s)));
  };
  const addStop = () => setStops((prev) => [...prev, { city: '', address: '', place: null }]);
  const removeStop = (index: number) => setStops((prev) => prev.filter((_, i) => i !== index));

  const today = new Date();
  const maxSelectableDate = new Date(today);
  maxSelectableDate.setDate(today.getDate() + 7);
  const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);
  const minDate = toDateInputValue(today);
  const maxDate = toDateInputValue(maxSelectableDate);
  // Delivery can't share the pickup field's absolute cap — a pickup date
  // chosen near that cap would otherwise leave zero valid delivery dates
  // (min > max) for any load that takes more than a few hours to transit.
  const deliveryMaxDate = toDateInputValue(
    new Date(new Date(fromDate || maxDate).getTime() + 14 * 24 * 60 * 60 * 1000),
  );
  // Every posting is created with a real price — the old fixed/open-to-offers
  // choice is gone; carriers who want a different number send it via the
  // existing negotiate/make-an-offer flow instead.
  const priceType = 'fixed' as const;
  const [priceAmount, setPriceAmount] = useState('');
  const [actualBudget, setActualBudget] = useState('');
  const [loadType, setLoadType] = useState<'full' | 'part_load_ok'>('full');
  const [requiredTruckType, setRequiredTruckType] = useState<'any' | string>('any');
  const [requiredCapacityTons, setRequiredCapacityTons] = useState('');
  const [requiredLengthFeet, setRequiredLengthFeet] = useState('');
  const [optionalNote, setOptionalNote] = useState('');
  const [selfDeclared, setSelfDeclared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  // Drafts live in this browser only (localStorage, per account) — the
  // backend has no draft status, and a half-filled load shouldn't be
  // visible to carriers or run through matching. Same tradeoff as the
  // chat widget's saved conversation.
  const draftKey = session ? `relod_posting_draft:${session.accountId}` : null;
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<'restored' | 'saved' | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const resetForm = () => {
    setOriginCity('');
    setOriginPlace(null);
    setDestCity('');
    setDestPlace(null);
    setStops([{ city: '', address: '', place: null }]);
    setFromDate('');
    setToDate('');
    setPickupTime('');
    setDeliveryTime('');
    setPickupAddress('');
    setPriceAmount('');
    setActualBudget('');
    setLoadType('full');
    setRequiredTruckType('any');
    setRequiredCapacityTons('');
    setRequiredLengthFeet('');
    setOptionalNote('');
    setSelfDeclared(false);
  };

  const saveDraft = () => {
    if (!draftKey) return;
    const draft = {
      originCity, originPlace, destCity, destPlace, stops, fromDate, toDate, pickupTime, deliveryTime,
      pickupAddress, priceAmount, actualBudget, loadType, requiredTruckType, requiredCapacityTons,
      requiredLengthFeet, optionalNote, selfDeclared,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Private window / blocked storage — nothing to fall back to.
    }
    setPreview(null);
    setError(null);
    setDraftNotice('saved');
  };

  const discardDraft = () => {
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }
    resetForm();
    setDraftNotice(null);
    setConfirmDiscard(false);
  };

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      setOriginCity(d.originCity ?? '');
      setOriginPlace(d.originPlace ?? null);
      setDestCity(d.destCity ?? '');
      setDestPlace(d.destPlace ?? null);
      if (Array.isArray(d.stops) && d.stops.length > 0) setStops(d.stops);
      // A saved date that has since passed would fail the date field's own
      // min bound — drop it rather than restore something unpostable.
      const todayStr = new Date().toISOString().slice(0, 10);
      setFromDate(d.fromDate && d.fromDate >= todayStr ? d.fromDate : '');
      setToDate(d.toDate && d.toDate >= todayStr ? d.toDate : '');
      setPickupTime(d.pickupTime ?? '');
      setDeliveryTime(d.deliveryTime ?? '');
      setPickupAddress(d.pickupAddress ?? '');
      setPriceAmount(d.priceAmount ?? '');
      setActualBudget(d.actualBudget ?? '');
      setLoadType(d.loadType ?? 'full');
      setRequiredTruckType(d.requiredTruckType ?? 'any');
      setRequiredCapacityTons(d.requiredCapacityTons ?? '');
      setRequiredLengthFeet(d.requiredLengthFeet ?? '');
      setOptionalNote(d.optionalNote ?? '');
      setSelfDeclared(!!d.selfDeclared);
      setDraftNotice('restored');
    } catch {
      // Corrupt draft — ignore it.
    }
  }, [draftKey]);

  // Validates and resolves everything, then shows the preview — nothing is
  // posted until the visitor confirms there. Typed-but-never-selected
  // origin/destination text is accepted (a typo the dropdown can't suggest
  // shouldn't block a real load): for a shipper the city text is only a
  // display label since the real coordinates come from the street address;
  // for a carrier it's geocoded here, and only fails if that can't find it.
  const handlePreview = async () => {
    if (!session) return;
    setError(null);
    const isShipper = session.userType === 'shipper';

    const missing: string[] = [];
    if (!originPlace && !originCity.trim()) missing.push(t('postings.originCity'));
    if (isShipper) {
      stops.forEach((s, i) => {
        if (!s.place && !s.city.trim()) {
          missing.push(stops.length > 1 ? t('postings.stopNumber', { number: i + 1 }) : t('postings.destinationCity'));
        }
      });
    } else if (!destPlace && !destCity.trim()) {
      missing.push(t('postings.destinationCity'));
    }
    if (!fromDate) missing.push(t('postings.pickupDate'));
    if (!toDate) missing.push(t('postings.deliveryDate'));
    if (!priceAmount) missing.push(isShipper ? t('postings.minimumBudget') : t('postings.priceAmount'));
    if (isShipper && !actualBudget) missing.push(t('postings.actualBudget'));
    if (isShipper && !pickupAddress.trim()) missing.push(t('postings.pickupLocation'));
    if (isShipper && stops.some((s) => !s.address.trim())) missing.push(t('postings.deliveryLocation'));
    if (missing.length > 0) {
      setError(t('postings.missingRequiredFields', { fields: missing.join(', ') }));
      return;
    }
    if (isShipper && Number(actualBudget) < Number(priceAmount)) {
      setError(t('postings.budgetBelowMinimum'));
      return;
    }

    setLoading(true);
    try {
      const geocode = async (text: string) => {
        const r = await api.geocodeResolve(session.accessToken, text);
        return r ? { lat: r.lat, lng: r.lng, label: r.label } : null;
      };
      const originCityText = originPlace ? cityLabel(originPlace) : originCity.trim();
      // A very specific address (door number, landmark, small locality) often
      // has no exact match in the geocoder. Rather than block the post, retry
      // with progressively simpler versions — number-free, then the last few
      // parts, then just the city — and flag the result as approximate so the
      // preview can say so and the shipper can Edit.
      const looseGeocode = async (address: string, cityHint: string) => {
        const parts = address.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
        const tries = [
          address.trim(),
          address.replace(/\b\d[\d/-]*\b/g, ' ').replace(/\s+/g, ' ').trim(),
          parts.slice(-3).join(', '),
          parts.slice(-2).join(', '),
          cityHint,
        ].filter((v, i, a) => v && a.indexOf(v) === i);
        for (let i = 0; i < tries.length; i++) {
          const r = await geocode(tries[i]);
          if (r) return { ...r, approximate: i > 0 };
        }
        return null;
      };

      type Resolved = { lat: number; lng: number; label: string; approximate?: boolean };
      let originResolved: Resolved | null;
      let destResolved: (Resolved | null)[];
      let destCityTexts: string[];
      if (isShipper) {
        // The precise pickup/delivery address the shipper typed is what
        // drives real coordinates (always via Google — see
        // GoogleAddressResolver); the city fields only supply the label.
        destCityTexts = stops.map((s) => (s.place ? cityLabel(s.place) : s.city.trim()));
        [originResolved, ...destResolved] = await Promise.all([
          looseGeocode(pickupAddress, originCityText),
          ...stops.map((s, i) => looseGeocode(s.address, destCityTexts[i])),
        ]);
        if (!originResolved) {
          setError(t('postings.addressNotResolved', { field: t('postings.pickupLocation') }));
          return;
        }
        if (destResolved.some((r) => !r)) {
          setError(t('postings.addressNotResolved', { field: t('postings.deliveryLocation') }));
          return;
        }
      } else {
        originResolved = originPlace
          ? { lat: originPlace.lat, lng: originPlace.lng, label: originPlace.label }
          : await geocode(originCity.trim());
        const carrierDest = destPlace
          ? { lat: destPlace.lat, lng: destPlace.lng, label: destPlace.label }
          : await geocode(destCity.trim());
        if (!originResolved) {
          setError(t('postings.addressNotResolved', { field: t('postings.originCity') }));
          return;
        }
        if (!carrierDest) {
          setError(t('postings.addressNotResolved', { field: t('postings.destinationCity') }));
          return;
        }
        destResolved = [carrierDest];
        destCityTexts = [destPlace ? cityLabel(destPlace) : destCity.trim()];
      }

      const destinations = destResolved.map((r, i) => ({
        lat: r!.lat,
        lng: r!.lng,
        label: r!.label,
        cityLabel: destCityTexts[i],
      }));
      const payload: PostingPayload = {
        originLat: originResolved!.lat,
        originLng: originResolved!.lng,
        originLabel: originResolved!.label,
        originCityLabel: originCityText,
        destinations,
        availableFromDate: new Date(pickupTime ? `${fromDate}T${pickupTime}:00` : fromDate).toISOString(),
        availableToDate: new Date(deliveryTime ? `${toDate}T${deliveryTime}:00` : toDate).toISOString(),
        priceType,
        priceAmount,
        priceMax: isShipper ? actualBudget : undefined,
        loadType,
        optionalNote: optionalNote || undefined,
        requiredTruckType: isShipper && requiredTruckType !== 'any' ? requiredTruckType : undefined,
        requiredCapacityTons: isShipper && requiredCapacityTons ? requiredCapacityTons : undefined,
        requiredLengthFeet: isShipper && requiredLengthFeet ? requiredLengthFeet : undefined,
        selfDeclared: session.userType === 'carrier' ? selfDeclared : undefined,
      };

      const rows: { label: string; value: string }[] = [
        { label: t('postings.loadType'), value: loadType === 'full' ? t('postings.loadTypeFtl') : t('postings.loadTypePtl') },
      ];
      if (isShipper) {
        rows.push({
          label: t('postings.truckType'),
          value: requiredTruckType === 'any' ? t('postings.notSelected') : truckTypeLabel(requiredTruckType),
        });
        rows.push({ label: t('postings.minimumBudget'), value: `₹${priceAmount}` });
        rows.push({ label: t('postings.actualBudget'), value: `₹${actualBudget}` });
        if (requiredCapacityTons) rows.push({ label: t('postings.weight'), value: `${requiredCapacityTons} ${t('postings.summaryTons')}` });
        if (requiredLengthFeet) rows.push({ label: t('postings.preferredLength'), value: `${requiredLengthFeet} ft` });
      } else {
        rows.push({ label: t('postings.priceAmount'), value: `₹${priceAmount}` });
      }
      rows.push({ label: t('postings.summaryPickup'), value: `${fromDate}${pickupTime ? ` ${pickupTime}` : ''}` });
      rows.push({ label: t('postings.summaryDelivery'), value: `${toDate}${deliveryTime ? ` ${deliveryTime}` : ''}` });
      if (optionalNote) rows.push({ label: t('postings.note'), value: optionalNote });

      const route: PreviewData['route'] = [
        {
          kind: 'origin',
          title: originCityText,
          detail: isShipper ? `${pickupAddress.trim()} → ${originResolved!.label}` : originResolved!.label,
          approximate: originResolved!.approximate,
        },
        ...destinations.map((d, i) => ({
          kind: 'destination' as const,
          title: d.cityLabel,
          detail: isShipper ? `${stops[i].address.trim()} → ${d.label}` : d.label,
          approximate: destResolved[i]!.approximate,
        })),
      ];

      setPreviewError(null);
      setPreview({ payload, rows, route });
    } catch (e) {
      // Unexpected (non-API) failures keep the friendly message but append
      // the underlying reason, so a report of "something went wrong" says
      // what actually broke (network drop, blocked request, bad response).
      setError(
        e instanceof ApiError ? e.message : `${t('errors.generic')}${e instanceof Error ? ` (${e.message})` : ''}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmPost = async () => {
    if (!session || !preview) return;
    setPreviewError(null);
    setLoading(true);
    try {
      const posting = await api.createPosting(session.accessToken, preview.payload);
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
      router.push(
        session.userType === 'shipper' ? `/postings/${posting.id}/find-carriers` : `/postings/${posting.id}`,
      );
    } catch (e) {
      setPreviewError(
        e instanceof ApiError ? e.message : `${t('errors.generic')}${e instanceof Error ? ` (${e.message})` : ''}`,
      );
      setLoading(false);
    }
  };

  const previewDialog = (
    <Modal
      open={!!preview}
      onClose={() => setPreview(null)}
      title={t('postings.previewTitle')}
      closeLabel={t('postings.previewClose')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => setPreview(null)} disabled={loading}>
            {t('postings.previewEdit')}
          </Button>
          <Button type="button" variant="outline" onClick={saveDraft} disabled={loading}>
            {t('postings.saveDraft')}
          </Button>
          <Button type="button" onClick={confirmPost} disabled={loading}>
            <TruckIcon className="size-4" />
            {t('postings.previewPost')}
          </Button>
        </>
      }
    >
      {preview && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('postings.previewSubtitle')}</p>
          {previewError && (
            <Alert variant="destructive">
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col">
            {preview.route.map((stop, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', stop.kind === 'origin' ? 'bg-primary' : 'bg-emerald-500')} />
                  {i < preview.route.length - 1 && <span className="h-8 w-px bg-border" />}
                </div>
                <div className={i < preview.route.length - 1 ? 'pb-3' : ''}>
                  <p className="text-xs text-muted-foreground">
                    {stop.kind === 'origin'
                      ? t('postings.summaryOrigin')
                      : preview.route.length > 2
                        ? t('postings.stopNumber', { number: i })
                        : t('postings.destination')}
                  </p>
                  <p className="text-sm font-medium">{stop.title}</p>
                  <p className="text-xs text-muted-foreground">{stop.detail}</p>
                  {stop.approximate && (
                    <p className="text-xs text-amber-600">{t('postings.approximateLocation')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t pt-3">
            {preview.rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium break-words">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );

  const discardDialog = (
    <Modal
      open={confirmDiscard}
      onClose={() => setConfirmDiscard(false)}
      title={t('postings.discardDraftTitle')}
      closeLabel={t('postings.previewClose')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>
            {t('postings.keepDraft')}
          </Button>
          <Button type="button" variant="destructive" onClick={discardDraft}>
            {t('postings.discardDraftConfirm')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{t('postings.discardDraftBody')}</p>
    </Modal>
  );

  const draftAlert = draftNotice && (
    <Alert>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>{draftNotice === 'restored' ? t('postings.draftRestored') : t('postings.draftSaved')}</span>
        {draftNotice === 'restored' && (
          <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDiscard(true)}>
            {t('postings.discardDraft')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );

  if (!session) return null;

  if (session.userType === 'shipper') {
    // Only `loading` truly blocks the click now — everything else is
    // validated with a specific, visible error inside handleSubmit instead
    // of a silently disabled button that gave no clue what was missing.
    const shipperDisabled = loading;

    return (
      <main className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">{t('postings.postAsShipperLoad')}</h1>
          <p className="text-sm text-muted-foreground">{t('postings.postLoadSubtitle')}</p>
        </div>

        {draftAlert}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <SectionHeading step={1} title={t('postings.routeDetailsSection')} />

                <div className="flex flex-col gap-1.5">
                  <Label>{t('postings.originCity')} *</Label>
                  <PlaceAutocompleteInput
                    placeholder={t('postings.originPlaceholder')}
                    value={originCity}
                    onChange={(text) => {
                      setOriginCity(text);
                      setOriginPlace(null);
                    }}
                    onSelect={(place) => {
                      setOriginPlace(place);
                      setOriginCity(place.label);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('postings.pickupLocation')} *</Label>
                  <Input
                    placeholder={t('postings.pickupLocationPlaceholder')}
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t('postings.pickupLocationHint')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.pickupDate')} *</Label>
                    <DateField value={fromDate} min={minDate} max={maxDate} onChange={setFromDate} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.pickupTime')}</Label>
                    <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
                  </div>
                </div>

                {stops.map((stop, i) => (
                  <div key={i} className="flex flex-col gap-4 border-t-2 border-primary/20 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-end gap-2">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Label>
                          {stops.length > 1
                            ? t('postings.stopNumber', { number: i + 1 })
                            : `${t('postings.destinationCity')} *`}
                        </Label>
                        <PlaceAutocompleteInput
                          placeholder={t('postings.destinationPlaceholder')}
                          value={stop.city}
                          onChange={(text) => updateStopCity(i, text)}
                          onSelect={(place) => selectStopPlace(i, place)}
                        />
                      </div>
                      {stops.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="mb-0.5 shrink-0"
                          title={t('postings.removeStop')}
                          onClick={() => removeStop(i)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>{t('postings.deliveryLocation')} *</Label>
                      <Input
                        placeholder={t('postings.deliveryLocationPlaceholder')}
                        value={stop.address}
                        onChange={(e) => updateStopAddress(i, e.target.value)}
                      />
                      {i === 0 && <p className="text-xs text-muted-foreground">{t('postings.deliveryLocationHint')}</p>}
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addStop}>
                  <Plus className="size-3.5" />
                  {t('postings.addStop')}
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.deliveryDate')} *</Label>
                    <DateField value={toDate} min={fromDate || minDate} max={deliveryMaxDate} onChange={setToDate} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.deliveryTime')}</Label>
                    <Input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <SectionHeading step={2} title={t('postings.pricingBudgetSection')} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.actualBudget')}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        className="pr-9"
                        min={priceAmount || 0}
                        value={actualBudget}
                        onChange={(e) => setActualBudget(e.target.value)}
                      />
                      <EyeOff className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.minimumBudget')}</Label>
                    <Input type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <SectionHeading step={3} title={t('postings.loadTruckDetailsSection')} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.truckType')}</Label>
                    <TruckTypeCombobox
                      value={requiredTruckType}
                      onValueChange={setRequiredTruckType}
                      anyOption={{ value: 'any', label: t('postings.filterAny') }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.minCapacity')}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={requiredCapacityTons}
                      onChange={(e) => setRequiredCapacityTons(e.target.value)}
                    />
                  </div>
                </div>

                <PresetChipField
                  id="requiredLengthFeet"
                  label={t('postings.preferredLength')}
                  value={requiredLengthFeet}
                  onChange={setRequiredLengthFeet}
                  presets={LENGTH_PRESETS}
                  unit="ft"
                />

                <div className="flex flex-col gap-2">
                  <Label>{t('postings.loadType')}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleCard
                      selected={loadType === 'full'}
                      title={t('postings.loadTypeFtl')}
                      onClick={() => setLoadType('full')}
                    />
                    <ToggleCard
                      selected={loadType === 'part_load_ok'}
                      title={t('postings.loadTypePtl')}
                      onClick={() => setLoadType('part_load_ok')}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>{t('postings.note')}</Label>
                  <Textarea maxLength={500} value={optionalNote} onChange={(e) => setOptionalNote(e.target.value)} />
                  <p className="text-right text-xs text-muted-foreground">{optionalNote.length}/500</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={saveDraft}>
                {t('postings.saveDraft')}
              </Button>
              <Button onClick={handlePreview} disabled={shipperDisabled}>
                <TruckIcon className="size-4" />
                {t('postings.postLoadButton')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <p className="text-sm font-semibold">{t('postings.summaryTitle')}</p>
                <div className="flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
                      <span className="h-6 w-px bg-border" />
                    </div>
                    <div className="pb-3">
                      <p className="text-xs text-muted-foreground">{t('postings.summaryOrigin')}</p>
                      <p className="text-sm font-medium">{originPlace?.label || originCity.trim() || t('postings.notSelected')}</p>
                    </div>
                  </div>
                  {stops.map((stop, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500" />
                        {i < stops.length - 1 && <span className="h-6 w-px bg-border" />}
                      </div>
                      <div className={i < stops.length - 1 ? 'pb-3' : ''}>
                        <p className="text-xs text-muted-foreground">
                          {stops.length > 1 ? t('postings.stopNumber', { number: i + 1 }) : t('postings.destination')}
                        </p>
                        <p className="text-sm font-medium">{stop.place?.label || stop.city.trim() || t('postings.notSelected')}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2.5 border-t pt-3.5">
                  <SummaryRow
                    icon={Package}
                    label={t('postings.loadType')}
                    value={loadType === 'full' ? t('postings.loadTypeFtl') : t('postings.loadTypePtl')}
                  />
                  <SummaryRow
                    icon={TruckIcon}
                    label={t('postings.truckType')}
                    value={requiredTruckType === 'any' ? t('postings.notSelected') : truckTypeLabel(requiredTruckType)}
                  />
                  <SummaryRow
                    icon={IndianRupee}
                    label={t('postings.minimumBudget')}
                    value={priceAmount ? `₹${priceAmount}` : t('postings.notSelected')}
                  />
                  <SummaryRow
                    icon={CalendarDays}
                    label={t('postings.summaryPickup')}
                    value={fromDate ? `${fromDate}${pickupTime ? ` ${pickupTime}` : ''}` : t('postings.notSelected')}
                  />
                  <SummaryRow
                    icon={CalendarDays}
                    label={t('postings.summaryDelivery')}
                    value={toDate ? `${toDate}${deliveryTime ? ` ${deliveryTime}` : ''}` : t('postings.notSelected')}
                  />
                  <SummaryRow
                    icon={Weight}
                    label={t('postings.weight')}
                    value={
                      requiredCapacityTons
                        ? `${requiredCapacityTons} ${t('postings.summaryTons')}`
                        : t('postings.notSpecified')
                    }
                  />
                  <SummaryRow
                    icon={Ruler}
                    label={t('postings.preferredLength')}
                    value={requiredLengthFeet ? `${requiredLengthFeet} ft` : t('postings.notSpecified')}
                  />
                </div>

                <div className="flex gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
                  <Info className="size-4 shrink-0 text-primary" />
                  {t('postings.summaryInfoHint')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <p className="text-sm font-semibold">{t('postings.tipsTitle')}</p>
                {(['tipLocations', 'tipLoadWeight', 'tipBudget', 'tipNotes'] as const).map((key) => (
                  <div key={key} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    <span>{t(`postings.${key}`)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        {previewDialog}
        {discardDialog}
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {session.userType === 'carrier' ? t('postings.postAsCarrierTruck') : t('postings.postAsShipperLoad')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {draftAlert}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{t('postings.originCity')}</Label>
            <PlaceAutocompleteInput
              value={originCity}
              onChange={(text) => {
                setOriginCity(text);
                setOriginPlace(null);
              }}
              onSelect={(place) => {
                setOriginPlace(place);
                setOriginCity(place.label);
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('postings.destinationCity')}</Label>
            <PlaceAutocompleteInput
              value={destCity}
              onChange={(text) => {
                setDestCity(text);
                setDestPlace(null);
              }}
              onSelect={(place) => {
                setDestPlace(place);
                setDestCity(place.label);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('postings.fromDate')}</Label>
              <DateField value={fromDate} min={minDate} max={maxDate} onChange={setFromDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('postings.toDate')}</Label>
              <DateField value={toDate} min={fromDate || minDate} max={deliveryMaxDate} onChange={setToDate} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('postings.priceAmount')}</Label>
            <Input type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('postings.loadType')}</Label>
            <Select value={loadType} onValueChange={(v) => v && setLoadType(v as 'full' | 'part_load_ok')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{t('postings.loadFull')}</SelectItem>
                <SelectItem value="part_load_ok">{t('postings.loadPartOk')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {session.userType === 'carrier' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selfDeclared}
                onChange={(e) => setSelfDeclared(e.target.checked)}
              />
              {t('postings.selfDeclared')}
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{t('postings.note')}</Label>
            <Textarea value={optionalNote} onChange={(e) => setOptionalNote(e.target.value)} />
          </div>

          <Button
            onClick={handlePreview}
            disabled={loading}
          >
            {t('postings.create')}
          </Button>
        </CardContent>
      </Card>
      {previewDialog}
        {discardDialog}
    </main>
  );
}
