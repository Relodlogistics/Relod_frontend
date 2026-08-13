'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';
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
import { VehicleVerificationStep } from '@/components/VehicleVerificationStep';
import { RegistrationStepper } from '@/components/RegistrationStepper';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';
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
  const { state, setState } = useRegistration();
  const { session, setSession, loaded: sessionLoaded } = useSession();

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [truckType, setTruckType] = useState(TRUCK_TYPES[0]);
  const [capacityTons, setCapacityTons] = useState('');
  const [numberOfAxles, setNumberOfAxles] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isOwnerDriver, setIsOwnerDriver] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverAuthorized, setDriverAuthorized] = useState(false);
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>(['general']);
  const [lanes, setLanes] = useState<{ origin: string; destination: string }[]>([
    { origin: '', destination: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [whatsappStep, setWhatsappStep] = useState<'input' | 'otp' | 'verified'>('input');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappDevCode, setWhatsappDevCode] = useState<string | null>(null);
  const [whatsappToken, setWhatsappToken] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Recovers from a mid-upload refresh: the carrier account + vehicle already
  // exist (session is set, pendingVehicleId is persisted) so there's no
  // reason to send them back to /register/phone — jump straight back to the
  // document-upload step instead.
  useEffect(() => {
    if (!sessionLoaded) return;
    if (session && state.pendingVehicleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVehicleId(state.pendingVehicleId);
      return;
    }
    if (!state.token || !state.phone || state.userType !== 'carrier' || !state.pendingCarrierProfile) {
      router.replace('/register/phone');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoaded, session, state.pendingVehicleId, state.token, state.phone, state.userType, state.pendingCarrierProfile]);

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
  const fullDriverWhatsapp = driverPhone.startsWith('+') ? driverPhone : `+91${driverPhone}`;

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
          driverPhone: !isOwnerDriver ? fullDriverWhatsapp : undefined,
          driverWhatsappVerificationToken: !isOwnerDriver ? whatsappToken! : undefined,
          driverAuthorized: !isOwnerDriver ? driverAuthorized : undefined,
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
        setState({
          pendingVehicleId: res.vehicleId ?? undefined,
          pendingVehicleIncludesDriverDocs: !isOwnerDriver,
        });
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

  const handleFinish = () => {
    setFinishing(true);
    router.push('/dashboard');
  };

  if (vehicleId && session) {
    return (
      <AuthBackground
        imageSrc="/auth/register-bg.png"
        imageAlt="A truck following a winding road toward Mumbai"
      >
        <div className="w-full max-w-md">
          <Logo variant="auth" className="mb-6 justify-center" />
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
              <VehicleVerificationStep
                token={session.accessToken}
                vehicleId={vehicleId}
                includeDriverDocs={state.pendingVehicleIncludesDriverDocs ?? !isOwnerDriver}
                onComplete={setVerificationComplete}
              />
              <Button
                className="mt-2"
                onClick={handleFinish}
                disabled={!verificationComplete || finishing}
              >
                {t('vehicle.finish')}
              </Button>
              {!verificationComplete && (
                <p className="text-center text-xs text-muted-foreground">
                  {t('vehicle.finishHint')}
                </p>
              )}
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
        <Logo variant="auth" className="mb-6 justify-center" />
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
                  onChange={(e) => {
                    setIsOwnerDriver(e.target.checked);
                    if (e.target.checked) {
                      handleChangeDriverWhatsapp();
                      setDriverAuthorized(false);
                    }
                  }}
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
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={driverAuthorized}
                      onChange={(e) => setDriverAuthorized(e.target.checked)}
                    />
                    <span>{t('vehicle.driverAuthorizeConsent')}</span>
                  </label>
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
                (!isOwnerDriver &&
                  (driverName.length < 2 || whatsappStep !== 'verified' || !driverAuthorized))
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
