'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError, CargoType } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { TRUCK_TYPES, truckTypeLabel } from '@/lib/truck-types';

const CARGO_TYPES: { value: CargoType; labelKey: string }[] = [
  { value: 'general', labelKey: 'vehicle.cargoTypeGeneral' },
  { value: 'refrigerated', labelKey: 'vehicle.cargoTypeRefrigerated' },
  { value: 'hazardous', labelKey: 'vehicle.cargoTypeHazardous' },
  { value: 'fragile', labelKey: 'vehicle.cargoTypeFragile' },
  { value: 'livestock', labelKey: 'vehicle.cargoTypeLivestock' },
  { value: 'oversized', labelKey: 'vehicle.cargoTypeOversized' },
];

// Each truck this carrier declared at signup (Carrier.truckCount) needs its
// own registration, driver, and a WhatsApp-verified driver number — this
// page loops that one truck at a time. Reached right after a non-owner-operator
// carrier account is created (see register/profile), or later from the
// dashboard if they stopped partway through.
export default function AddTrucksPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [totalTrucks, setTotalTrucks] = useState<number | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [truckType, setTruckType] = useState(TRUCK_TYPES[0]);
  const [capacityTons, setCapacityTons] = useState('');
  const [numberOfAxles, setNumberOfAxles] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>(['general']);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [lanes, setLanes] = useState<{ origin: string; destination: string }[]>([
    { origin: '', destination: '' },
  ]);

  const [whatsappStep, setWhatsappStep] = useState<'input' | 'otp' | 'verified'>('input');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappDevCode, setWhatsappDevCode] = useState<string | null>(null);
  const [whatsappToken, setWhatsappToken] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set once addVehicle succeeds — holds the checklist here on an RC-check
  // step for that truck before letting the form reset for the next one.
  const [pendingRcVehicleId, setPendingRcVehicleId] = useState<string | null>(null);
  const [rcVerified, setRcVerified] = useState(false);
  const [rcError, setRcError] = useState<string | null>(null);
  const [rcLoading, setRcLoading] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!session || session.userType !== 'carrier') {
      router.replace('/login');
      return;
    }
    api
      .getCarrierProfile(session.accessToken, session.accountId)
      .then((carrier) => {
        if (carrier.isOwnerOperator) {
          router.replace('/dashboard');
          return;
        }
        setTotalTrucks(carrier.truckCount ?? 0);
      })
      .catch(() => setInitError(t('errors.generic')));
    api.listMyVehicles(session.accessToken).then((vehicles) => setAddedCount(vehicles.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, session]);

  const fullDriverWhatsapp = driverPhone.startsWith('+') ? driverPhone : `+91${driverPhone}`;

  const resetTruckForm = () => {
    setRegistrationNumber('');
    setTruckType(TRUCK_TYPES[0]);
    setCapacityTons('');
    setNumberOfAxles('');
    setUpiId('');
    setCargoTypes(['general']);
    setDriverName('');
    setDriverPhone('');
    setLanes([{ origin: '', destination: '' }]);
    setWhatsappStep('input');
    setWhatsappCode('');
    setWhatsappDevCode(null);
    setWhatsappToken(null);
    setWhatsappError(null);
  };

  const toggleCargoType = (value: CargoType) => {
    setCargoTypes((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  const updateLane = (index: number, field: 'origin' | 'destination', value: string) => {
    setLanes((prev) => prev.map((lane, i) => (i === index ? { ...lane, [field]: value } : lane)));
  };

  const completeLanes = lanes.filter((lane) => lane.origin && lane.destination);

  const handleSendWhatsappOtp = async () => {
    setWhatsappError(null);
    setWhatsappLoading(true);
    try {
      const res = await api.sendOtp(fullDriverWhatsapp, 'whatsapp_verify');
      setWhatsappDevCode(res.devCode ?? null);
      setWhatsappStep('otp');
    } catch (e) {
      setWhatsappError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleVerifyWhatsappOtp = async () => {
    setWhatsappError(null);
    setWhatsappLoading(true);
    try {
      const res = await api.verifyOtp(fullDriverWhatsapp, 'whatsapp_verify', whatsappCode);
      setWhatsappToken(res.token);
      setWhatsappStep('verified');
    } catch (e) {
      setWhatsappError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleChangeDriverWhatsapp = () => {
    setWhatsappStep('input');
    setWhatsappToken(null);
    setWhatsappCode('');
    setWhatsappDevCode(null);
    setWhatsappError(null);
  };

  const handleSubmit = async () => {
    if (!session || whatsappStep !== 'verified' || !whatsappToken) return;
    setError(null);
    setLoading(true);
    try {
      const vehicle = await api.addVehicle(session.accessToken, {
        registrationNumber: registrationNumber.toUpperCase().replace(/[\s-]/g, ''),
        truckType,
        capacityTons,
        cargoTypes,
        numberOfAxles: numberOfAxles ? Number(numberOfAxles) : undefined,
        upiId: upiId || undefined,
        driverName,
        driverPhone: fullDriverWhatsapp,
        driverWhatsappVerificationToken: whatsappToken,
        preferredLanes: completeLanes.map((lane) => ({
          originLabel: lane.origin,
          destinationLabel: lane.destination,
        })),
      });
      // Hold here on an RC-check step for this truck before letting the
      // form move on to the next one — see pendingRcVehicleId below.
      setPendingRcVehicleId(vehicle.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRc = async () => {
    if (!session || !pendingRcVehicleId) return;
    setRcError(null);
    setRcLoading(true);
    try {
      await api.verifyVehicleRc(session.accessToken, pendingRcVehicleId);
      setRcVerified(true);
    } catch (e) {
      setRcError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setRcLoading(false);
    }
  };

  const handleContinueAfterRc = () => {
    setAddedCount((prev) => prev + 1);
    setPendingRcVehicleId(null);
    setRcVerified(false);
    setRcError(null);
    resetTruckForm();
  };

  if (initError) {
    return (
      <AuthBackground
        imageSrc="/auth/register-bg.png"
        imageAlt="A truck following a winding road toward Mumbai"
      >
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      </AuthBackground>
    );
  }

  if (totalTrucks === null) return null;

  if (addedCount >= totalTrucks) {
    return (
      <AuthBackground
        imageSrc="/auth/register-bg.png"
        imageAlt="A truck following a winding road toward Mumbai"
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('addTrucks.allDone')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              {t('addTrucks.goToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </AuthBackground>
    );
  }

  if (pendingRcVehicleId) {
    return (
      <AuthBackground
        imageSrc="/auth/register-bg.png"
        imageAlt="A truck following a winding road toward Mumbai"
      >
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>{t('addTrucks.rcTitle')}</CardTitle>
              <CardDescription>{t('addTrucks.rcSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {rcError && (
                <Alert variant="destructive">
                  <AlertDescription>{rcError}</AlertDescription>
                </Alert>
              )}
              {rcVerified ? (
                <>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="size-4" />
                    {t('addTrucks.rcVerified')}
                  </p>
                  <Button onClick={handleContinueAfterRc}>{t('verify.continue')}</Button>
                </>
              ) : (
                <Button onClick={handleVerifyRc} disabled={rcLoading}>
                  {t('phone.verify')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthBackground>
    );
  }

  const canSubmit =
    registrationNumber.length >= 6 &&
    !!capacityTons &&
    cargoTypes.length > 0 &&
    driverName.length >= 2 &&
    driverPhone.length >= 10 &&
    whatsappStep === 'verified' &&
    completeLanes.length > 0;

  return (
    <AuthBackground
      imageSrc="/auth/register-bg.png"
      imageAlt="A truck following a winding road toward Mumbai"
    >
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{t('addTrucks.title')}</CardTitle>
            <CardDescription>{t('addTrucks.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">
                {t('addTrucks.progress', { current: addedCount + 1, total: totalTrucks })}
              </p>
              <Progress value={(addedCount / totalTrucks) * 100} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">{t('vehicle.driverSection')}</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="driverName">{t('vehicle.driverName')}</Label>
                <Input id="driverName" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="driverPhone">{t('addTrucks.driverWhatsapp')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="driverPhone"
                    type="tel"
                    value={driverPhone}
                    disabled={whatsappStep !== 'input'}
                    onChange={(e) => setDriverPhone(e.target.value)}
                  />
                  {whatsappStep === 'input' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendWhatsappOtp}
                      disabled={whatsappLoading || driverPhone.length < 10}
                    >
                      {t('phone.sendOtp')}
                    </Button>
                  )}
                  {whatsappStep === 'verified' && (
                    <Button type="button" variant="ghost" onClick={handleChangeDriverWhatsapp}>
                      {t('phone.changeNumber')}
                    </Button>
                  )}
                </div>
                {whatsappStep === 'verified' ? (
                  <p className="text-xs font-medium text-emerald-600">✓ {t('profile.whatsappVerified')}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t('addTrucks.driverWhatsappHint')}</p>
                )}
                {whatsappStep === 'otp' && (
                  <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      {t('phone.otpSent', { phone: fullDriverWhatsapp })}
                    </p>
                    {whatsappDevCode && (
                      <p className="text-xs text-muted-foreground">
                        {t('phone.devCode', { code: whatsappDevCode })}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        id="driverWhatsappOtp"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder={t('phone.otpLabel')}
                        value={whatsappCode}
                        onChange={(e) => setWhatsappCode(e.target.value.replace(/\D/g, ''))}
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyWhatsappOtp}
                        disabled={whatsappLoading || whatsappCode.length !== 6}
                      >
                        {t('phone.verify')}
                      </Button>
                    </div>
                    <div className="flex justify-between text-xs">
                      <button
                        type="button"
                        className="text-muted-foreground underline"
                        onClick={handleChangeDriverWhatsapp}
                      >
                        {t('phone.changeNumber')}
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground underline"
                        onClick={handleSendWhatsappOtp}
                      >
                        {t('phone.resend')}
                      </button>
                    </div>
                  </div>
                )}
                {whatsappError && <p className="text-xs text-destructive">{whatsappError}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('vehicle.preferredLanes')} *</Label>
              <p className="text-xs text-muted-foreground">{t('vehicle.preferredLanesSubtitle')}</p>
              {lanes.map((lane, index) => (
                <div key={index} className="grid grid-cols-2 gap-3">
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
              ))}
            </div>

            <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
              {t('addTrucks.submit')}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              {t('addTrucks.skipForNow')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
