'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useDriverSession } from '@/lib/driver-session-context';
import { DriverShell } from '@/components/DriverShell';
import { PlaceAutocompleteInput, PlaceResult, cityLabel } from '@/components/PlaceAutocompleteInput';

export default function DriverNewPostingPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { driverSession, loaded } = useDriverSession();

  const [originCity, setOriginCity] = useState('');
  const [originPlace, setOriginPlace] = useState<PlaceResult | null>(null);
  const [destCity, setDestCity] = useState('');
  const [destPlace, setDestPlace] = useState<PlaceResult | null>(null);

  const today = new Date();
  const maxSelectableDate = new Date(today);
  maxSelectableDate.setDate(today.getDate() + 7);
  const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);
  const minDate = toDateInputValue(today);
  const maxDate = toDateInputValue(maxSelectableDate);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [loadType, setLoadType] = useState<'full' | 'part_load_ok'>('full');
  const [optionalNote, setOptionalNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loaded && !driverSession) router.replace('/driver/login');
  }, [loaded, driverSession, router]);

  const handleSubmit = async () => {
    if (!driverSession || !originPlace || !destPlace) return;
    setError(null);
    setLoading(true);
    try {
      await api.driverCreatePosting(driverSession.accessToken, {
        originLat: originPlace.lat,
        originLng: originPlace.lng,
        originLabel: originPlace.label,
        originCityLabel: cityLabel(originPlace),
        destinations: [
          {
            lat: destPlace.lat,
            lng: destPlace.lng,
            label: destPlace.label,
            cityLabel: cityLabel(destPlace),
          },
        ],
        availableFromDate: new Date(fromDate).toISOString(),
        availableToDate: new Date(toDate).toISOString(),
        priceType: 'fixed',
        priceAmount: priceAmount || undefined,
        loadType,
        optionalNote: optionalNote || undefined,
      });
      router.push('/driver/postings');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (!driverSession) return null;

  return (
    <DriverShell>
      <Card>
        <CardHeader>
          <CardTitle>{t('driverDashboard.postTruckTitle')}</CardTitle>
          <CardDescription>{t('driverDashboard.postTruckSubtitle')}</CardDescription>
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
              <Input
                type="date"
                value={fromDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('postings.toDate')}</Label>
              <Input
                type="date"
                value={toDate}
                min={fromDate || minDate}
                max={maxDate}
                onChange={(e) => setToDate(e.target.value)}
              />
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

          <div className="flex flex-col gap-1.5">
            <Label>{t('postings.note')}</Label>
            <Textarea value={optionalNote} onChange={(e) => setOptionalNote(e.target.value)} />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !originPlace || !destPlace || !fromDate || !toDate}
          >
            {t('postings.create')}
          </Button>
        </CardContent>
      </Card>
    </DriverShell>
  );
}
