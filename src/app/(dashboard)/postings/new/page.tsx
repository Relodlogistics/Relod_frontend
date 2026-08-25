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
import { TRUCK_TYPES, truckTypeLabel } from '@/lib/truck-types';
import { LENGTH_PRESETS, PresetChipField } from '@/components/PresetChipField';
import { cn } from '@/lib/utils';
import { PlaceAutocompleteInput, PlaceResult, cityLabel } from '@/components/PlaceAutocompleteInput';

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
  const [stops, setStops] = useState<{ city: string; place: PlaceResult | null }[]>([{ city: '', place: null }]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  const updateStopCity = (index: number, city: string) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, city, place: null } : s)));
  };
  const selectStopPlace = (index: number, place: PlaceResult) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, city: place.label, place } : s)));
  };
  const addStop = () => setStops((prev) => [...prev, { city: '', place: null }]);
  const removeStop = (index: number) => setStops((prev) => prev.filter((_, i) => i !== index));

  const today = new Date();
  const maxSelectableDate = new Date(today);
  maxSelectableDate.setDate(today.getDate() + 7);
  const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);
  const minDate = toDateInputValue(today);
  const maxDate = toDateInputValue(maxSelectableDate);
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

  const handleSubmit = async () => {
    if (!session) return;
    setError(null);
    const isShipper = session.userType === 'shipper';

    // Places are resolved to coordinates at selection time (autocomplete),
    // not re-geocoded here — a typed-but-never-selected city name leaves
    // originPlace/destPlace/stop.place null. Previously this only blocked
    // submission via a silently disabled button with zero explanation —
    // now it's a specific, visible error either way.
    if (!originPlace) {
      setError(t('postings.selectFromDropdown', { field: t(isShipper ? 'postings.pickupLocation' : 'postings.originCity') }));
      return;
    }
    if (isShipper && stops.some((s) => !s.place)) {
      setError(t('postings.selectFromDropdown', { field: t('postings.deliveryLocation') }));
      return;
    }
    if (!isShipper && !destPlace) {
      setError(t('postings.selectFromDropdown', { field: t('postings.destinationCity') }));
      return;
    }

    const missing: string[] = [];
    if (!fromDate) missing.push(t('postings.pickupDate'));
    if (!toDate) missing.push(t('postings.deliveryDate'));
    if (!priceAmount) missing.push(isShipper ? t('postings.minimumBudget') : t('postings.priceAmount'));
    if (isShipper && !actualBudget) missing.push(t('postings.actualBudget'));
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
      const destinations = isShipper
        ? stops.map((s) => ({
            lat: s.place!.lat,
            lng: s.place!.lng,
            label: s.place!.label,
            cityLabel: cityLabel(s.place),
          }))
        : [
            {
              lat: destPlace!.lat,
              lng: destPlace!.lng,
              label: destPlace!.label,
              cityLabel: cityLabel(destPlace),
            },
          ];
      const posting = await api.createPosting(session.accessToken, {
        originLat: originPlace.lat,
        originLng: originPlace.lng,
        originLabel: originPlace.label,
        originCityLabel: cityLabel(originPlace),
        destinations,
        availableFromDate: new Date(pickupTime ? `${fromDate}T${pickupTime}:00` : fromDate).toISOString(),
        availableToDate: new Date(deliveryTime ? `${toDate}T${deliveryTime}:00` : toDate).toISOString(),
        priceType,
        priceAmount,
        priceMax: session.userType === 'shipper' ? actualBudget : undefined,
        loadType,
        optionalNote: optionalNote || undefined,
        requiredTruckType:
          session.userType === 'shipper' && requiredTruckType !== 'any' ? requiredTruckType : undefined,
        requiredCapacityTons:
          session.userType === 'shipper' && requiredCapacityTons ? requiredCapacityTons : undefined,
        requiredLengthFeet:
          session.userType === 'shipper' && requiredLengthFeet ? requiredLengthFeet : undefined,
        selfDeclared: session.userType === 'carrier' ? selfDeclared : undefined,
      });
      router.push(
        session.userType === 'shipper' ? `/postings/${posting.id}/find-carriers` : `/postings/${posting.id}`,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

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
                  <Label>{t('postings.pickupLocation')} *</Label>
                  <PlaceAutocompleteInput
                    placeholder={t('postings.pickupLocationPlaceholder')}
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
                  <div key={i} className="flex flex-col gap-1.5 border-t-2 border-primary/20 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-end gap-2">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Label>
                          {stops.length > 1
                            ? t('postings.stopNumber', { number: i + 1 })
                            : `${t('postings.deliveryLocation')} *`}
                        </Label>
                        <PlaceAutocompleteInput
                          placeholder={t('postings.deliveryLocationPlaceholder')}
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
                    {i === 0 && <p className="text-xs text-muted-foreground">{t('postings.deliveryLocationHint')}</p>}
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addStop}>
                  <Plus className="size-3.5" />
                  {t('postings.addStop')}
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('postings.deliveryDate')} *</Label>
                    <DateField value={toDate} min={fromDate || minDate} max={maxDate} onChange={setToDate} />
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
                    <Select value={requiredTruckType} onValueChange={(v) => v && setRequiredTruckType(v)}>
                      <SelectTrigger>
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
              <Button type="button" variant="outline" disabled title={t('postings.saveDraftComingSoon')}>
                {t('postings.saveDraft')}
              </Button>
              <Button onClick={handleSubmit} disabled={shipperDisabled}>
                <TruckIcon className="size-4" />
                {t('postings.postLoadButton')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
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
                      <p className="text-sm font-medium">{originPlace?.label || t('postings.notSelected')}</p>
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
                        <p className="text-sm font-medium">{stop.place?.label || t('postings.notSelected')}</p>
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
              <DateField value={toDate} min={fromDate || minDate} max={maxDate} onChange={setToDate} />
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
            onClick={handleSubmit}
            disabled={loading}
          >
            {t('postings.create')}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
