'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError, CargoType } from '@/lib/api';
import { useRegistration } from '@/lib/registration-context';
import { useSession } from '@/lib/session-context';
import { DocumentUploadField } from '@/components/DocumentUploadField';
import { RegistrationStepper } from '@/components/RegistrationStepper';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { VEHICLE_DOCUMENTS, DRIVER_DOCUMENTS } from '@/lib/document-types';
import { TRUCK_TYPES, truckTypeLabel } from '@/lib/truck-types';

const CARGO_TYPES: { value: CargoType; labelKey: string }[] = [
  { value: 'general', labelKey: 'vehicle.cargoTypeGeneral' },
  { value: 'refrigerated', labelKey: 'vehicle.cargoTypeRefrigerated' },
  { value: 'hazardous', labelKey: 'vehicle.cargoTypeHazardous' },
  { value: 'fragile', labelKey: 'vehicle.cargoTypeFragile' },
  { value: 'livestock', labelKey: 'vehicle.cargoTypeLivestock' },
  { value: 'oversized', labelKey: 'vehicle.cargoTypeOversized' },
];

const MAX_LANES = 10;

const STEPS = [
  { key: 'phone', labelKey: 'stepper.phone' },
  { key: 'profile', labelKey: 'stepper.profile' },
  { key: 'verify', labelKey: 'stepper.verify' },
  { key: 'vehicle', labelKey: 'stepper.vehicle' },
  { key: 'documents', labelKey: 'stepper.documents' },
];

export default function VehiclePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { state } = useRegistration();
  const { session, setSession } = useSession();

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [truckType, setTruckType] = useState(TRUCK_TYPES[0]);
  const [capacityTons, setCapacityTons] = useState('');
  const [numberOfAxles, setNumberOfAxles] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isOwnerDriver, setIsOwnerDriver] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>(['general']);
  const [lanes, setLanes] = useState<{ origin: string; destination: string }[]>([
    { origin: '', destination: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [rcVerified, setRcVerified] = useState(false);
  const [rcLoading, setRcLoading] = useState(false);
  const [rcError, setRcError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.token || !state.phone || state.userType !== 'carrier' || !state.pendingCarrierProfile) {
      router.replace('/register/phone');
    }
  }, [state.token, state.phone, state.userType, state.pendingCarrierProfile, router]);

  const toggleCargoType = (value: CargoType) => {
    setCargoTypes((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  const updateLane = (index: number, field: 'origin' | 'destination', value: string) => {
    setLanes((prev) => prev.map((lane, i) => (i === index ? { ...lane, [field]: value } : lane)));
  };

  const addLane = () => {
    setLanes((prev) => (prev.length < MAX_LANES ? [...prev, { origin: '', destination: '' }] : prev));
  };

  const removeLane = (index: number) => {
    setLanes((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const completeLanes = lanes.filter((lane) => lane.origin && lane.destination);

  const handleVerifyRc = async () => {
    if (!session || !vehicleId) return;
    setRcError(null);
    setRcLoading(true);
    try {
      await api.verifyVehicleRc(session.accessToken, vehicleId);
      setRcVerified(true);
    } catch (e) {
      setRcError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setRcLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!state.token || !state.phone || !state.pendingCarrierProfile) return;
    setError(null);
    setShowLoginLink(false);
    setLoading(true);
    try {
      const preferredLanes = completeLanes.map((lane) => ({
        originLabel: lane.origin,
        destinationLabel: lane.destination,
      }));

      const res = await api.registerCarrier(state.token, {
        ...state.pendingCarrierProfile,
        phone: state.phone,
        vehicle: {
          registrationNumber: registrationNumber.toUpperCase().replace(/[\s-]/g, ''),
          truckType,
          capacityTons,
          cargoTypes,
          numberOfAxles: numberOfAxles ? Number(numberOfAxles) : undefined,
          upiId: upiId || undefined,
          isOwnerDriver,
          driverName: !isOwnerDriver ? driverName : undefined,
          driverPhone: !isOwnerDriver ? driverPhone : undefined,
          preferredLanes,
        },
      });
      // This is the first moment a carrier is actually logged in — everything
      // before this point (phone, profile, this form) was still provisional.
      setSession({ accessToken: res.accessToken, accountId: res.id, userType: 'carrier', phone: state.phone });
      if (res.alreadyRegistered) {
        // Already fully registered in a prior session — vehicle setup is done.
        router.push('/dashboard');
      } else {
        setVehicleId(res.vehicleId ?? null);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError(e.message);
        setShowLoginLink(true);
      } else {
        setError(e instanceof ApiError ? e.message : t('errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (vehicleId && state.token) {
    const documents = isOwnerDriver ? VEHICLE_DOCUMENTS : [...VEHICLE_DOCUMENTS, ...DRIVER_DOCUMENTS];
    return (
      <AuthBackground
        imageSrc="/auth/register-bg.png"
        imageAlt="A truck following a winding road toward Mumbai"
      >
        <div className="w-full max-w-md">
          <RegistrationStepper
            steps={STEPS.map((s) => ({ key: s.key, label: t(s.labelKey) }))}
            currentIndex={4}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t('vehicle.documentsTitle')}</CardTitle>
              <CardDescription>{t('vehicle.documentsSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">{t('addTrucks.rcTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('addTrucks.rcSubtitle')}</p>
                {rcError && (
                  <Alert variant="destructive">
                    <AlertDescription>{rcError}</AlertDescription>
                  </Alert>
                )}
                {rcVerified ? (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="size-4" />
                    {t('addTrucks.rcVerified')}
                  </p>
                ) : (
                  <Button size="sm" className="self-start" onClick={handleVerifyRc} disabled={rcLoading}>
                    {t('phone.verify')}
                  </Button>
                )}
              </div>
              {documents.map((doc) => (
                <DocumentUploadField
                  key={doc.docType}
                  docType={doc.docType}
                  labelKey={doc.labelKey}
                  accept={doc.accept}
                  token={state.token!}
                  vehicleId={vehicleId}
                />
              ))}
              <Button className="mt-2" onClick={() => router.push('/dashboard')}>
                {t('vehicle.finish')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground
      imageSrc="/auth/register-bg.png"
      imageAlt="A truck following a winding road toward Mumbai"
    >
      <div className="w-full max-w-md">
        <RegistrationStepper
          steps={STEPS.map((s) => ({ key: s.key, label: t(s.labelKey) }))}
          currentIndex={3}
        />
        <Card>
          <CardHeader>
            <CardTitle>{t('vehicle.title')}</CardTitle>
            <CardDescription>{t('vehicle.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="flex flex-col gap-2">
                  {error}
                  {showLoginLink && (
                    <Link href="/login" className="underline">
                      {t('errors.logInInstead')}
                    </Link>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regNumber">{t('vehicle.registrationNumber')}</Label>
              <Input
                id="regNumber"
                placeholder={t('vehicle.registrationNumberPlaceholder')}
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('vehicle.truckType')}</Label>
              <Select value={truckType} onValueChange={(v) => v && setTruckType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUCK_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {truckTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="capacity">{t('vehicle.capacityTons')}</Label>
                <Input
                  id="capacity"
                  type="number"
                  step="0.1"
                  value={capacityTons}
                  onChange={(e) => setCapacityTons(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="axles">{t('vehicle.numberOfAxles')}</Label>
                <Input
                  id="axles"
                  type="number"
                  min={2}
                  step="1"
                  value={numberOfAxles}
                  onChange={(e) => setNumberOfAxles(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('vehicle.cargoTypes')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {CARGO_TYPES.map((cargo) => (
                  <label key={cargo.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={cargoTypes.includes(cargo.value)}
                      onChange={() => toggleCargoType(cargo.value)}
                    />
                    {t(cargo.labelKey)}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upiId">{t('vehicle.upiId')}</Label>
              <Input id="upiId" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t('vehicle.upiHint')}</p>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isOwnerDriver}
                  onChange={(e) => setIsOwnerDriver(e.target.checked)}
                />
                {t('vehicle.isOwnerDriver')}
              </label>
              {!isOwnerDriver && (
                <>
                  <p className="text-sm font-medium">{t('vehicle.driverSection')}</p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="driverName">{t('vehicle.driverName')}</Label>
                    <Input id="driverName" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="driverPhone">{t('vehicle.driverPhone')}</Label>
                    <Input
                      id="driverPhone"
                      type="tel"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('vehicle.preferredLanes')} *</Label>
              <p className="text-xs text-muted-foreground">{t('vehicle.preferredLanesSubtitle')}</p>
              {lanes.map((lane, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{t('vehicle.laneNumber', { number: index + 1 })}</p>
                    {lanes.length > 1 && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        title={t('vehicle.removeLane')}
                        onClick={() => removeLane(index)}
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder={t('vehicle.laneOrigin')}
                      value={lane.origin}
                      onChange={(e) => updateLane(index, 'origin', e.target.value)}
                    />
                    <Input
                      placeholder={t('vehicle.laneDestination')}
                      value={lane.destination}
                      onChange={(e) => updateLane(index, 'destination', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              {lanes.length < MAX_LANES && (
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={addLane}>
                  {t('vehicle.addLane')}
                </Button>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                registrationNumber.length < 6 ||
                !capacityTons ||
                cargoTypes.length === 0 ||
                completeLanes.length === 0 ||
                (!isOwnerDriver && (driverName.length < 2 || driverPhone.length < 10))
              }
            >
              {t('vehicle.submit')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
