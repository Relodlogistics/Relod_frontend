'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
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
import { useSession } from '@/lib/session-context';
import { useRegistration } from '@/lib/registration-context';
import { VehicleVerificationStep } from '@/components/VehicleVerificationStep';
import { AddTruckIdentityCheck } from '@/components/AddTruckIdentityCheck';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';
import { OTHER_TRUCK_TYPE, TRUCK_TYPES } from '@/lib/truck-types';
import { TruckTypeCombobox } from '@/components/TruckTypeCombobox';
import { LENGTH_PRESETS, PresetChipField, TONNAGE_PRESETS } from '@/components/PresetChipField';

const CARGO_TYPES: { value: CargoType; labelKey: string }[] = [
  { value: 'general', labelKey: 'vehicle.cargoTypeGeneral' },
  { value: 'refrigerated', labelKey: 'vehicle.cargoTypeRefrigerated' },
  { value: 'hazardous', labelKey: 'vehicle.cargoTypeHazardous' },
  { value: 'fragile', labelKey: 'vehicle.cargoTypeFragile' },
  { value: 'livestock', labelKey: 'vehicle.cargoTypeLivestock' },
  { value: 'oversized', labelKey: 'vehicle.cargoTypeOversized' },
];

// Adds trucks to a carrier's fleet one at a time — each needs its own
// registration, driver, and a WhatsApp-verified driver number. Reached right
// after a non-owner-operator carrier account is created (see register/profile)
// to cover the fleet size they declared at signup, and any time after that
// from Settings > My Vehicles to add more (owner-operators included, once
// they're adding a truck beyond the one they drive themselves).
export default function AddTrucksPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();
  const { state, setState, clear } = useRegistration();

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);
  // null = not yet known, false = must pass the phone+Aadhaar re-check
  // before reaching the form, true = already cleared (or this is the
  // continuous flow right after signup, which skips the gate — see the
  // effect below).
  const [identityChecked, setIdentityChecked] = useState<boolean | null>(null);

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [truckType, setTruckType] = useState(TRUCK_TYPES[0]);
  const [truckTypeOther, setTruckTypeOther] = useState('');
  const [capacityTons, setCapacityTons] = useState('');
  const [lengthFeet, setLengthFeet] = useState('');
  const [numberOfAxles, setNumberOfAxles] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>(['general']);
  const [isEximCapable, setIsEximCapable] = useState(false);
  const [trailerType, setTrailerType] = useState('container_chassis');
  const [containerSizesSupported, setContainerSizesSupported] = useState<string[]>([]);
  const [hasReeferPower, setHasReeferPower] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverAuthorized, setDriverAuthorized] = useState(false);
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

  // The RC says this plate belongs to someone else (server answers
  // OWNER_MISMATCH): ask for that owner's phone so they can be invited, and
  // hold the truck as pending until they join.
  const [needsOwnerPhone, setNeedsOwnerPhone] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [invitedPlate, setInvitedPlate] = useState<string | null>(null);

  // Set once addVehicle succeeds — holds the checklist here on an RC+documents
  // step for that truck before letting the form reset for the next one.
  // Recovered from registration-context on refresh, see effect below.
  const [pendingRcVehicleId, setPendingRcVehicleId] = useState<string | null>(null);
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!session || session.userType !== 'carrier') {
      router.replace('/login');
      return;
    }
    if (state.pendingAddTruckVehicleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingRcVehicleId(state.pendingAddTruckVehicleId);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentityChecked(state.accountId === session.accountId);
    api
      .getCarrierProfile(session.accessToken, session.accountId)
      .then(() => setProfileLoaded(true))
      .catch(() => setInitError(t('errors.generic')));
    // Trucks still waiting for their owner don't count toward the declared total.
    api
      .listMyVehicles(session.accessToken)
      .then((vehicles) =>
        setAddedCount(vehicles.filter((v) => v.ownershipStatus === 'verified').length),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, session]);

  const fullDriverWhatsapp = driverPhone.startsWith('+') ? driverPhone : `+91${driverPhone}`;

  const resetTruckForm = () => {
    setRegistrationNumber('');
    setTruckType(TRUCK_TYPES[0]);
    setTruckTypeOther('');
    setCapacityTons('');
    setNumberOfAxles('');
    setUpiId('');
    setCargoTypes(['general']);
    setIsEximCapable(false);
    setTrailerType('container_chassis');
    setContainerSizesSupported([]);
    setHasReeferPower(false);
    setDriverName('');
    setDriverPhone('');
    setDriverAuthorized(false);
    setLanes([{ origin: '', destination: '' }]);
    setWhatsappStep('input');
    setWhatsappCode('');
    setWhatsappDevCode(null);
    setWhatsappToken(null);
    setWhatsappError(null);
    setNeedsOwnerPhone(false);
    setOwnerPhone('');
  };

  const toggleCargoType = (value: CargoType) => {
    setCargoTypes((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  const toggleContainerSize = (value: string) => {
    setContainerSizesSupported((prev) =>
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

  const fullOwnerPhone = ownerPhone.startsWith('+') ? ownerPhone : `+91${ownerPhone}`;

  const handleSubmit = async () => {
    if (!session || whatsappStep !== 'verified' || !whatsappToken) return;
    setError(null);
    setInvitedPlate(null);
    setLoading(true);
    try {
      const vehicle = await api.addVehicle(session.accessToken, {
        registrationNumber: registrationNumber.toUpperCase().replace(/[\s-]/g, ''),
        truckType,
        truckTypeOther: truckType === OTHER_TRUCK_TYPE ? truckTypeOther.trim() : undefined,
        capacityTons,
        lengthFeet: lengthFeet || undefined,
        cargoTypes,
        numberOfAxles: numberOfAxles ? Number(numberOfAxles) : undefined,
        upiId: upiId || undefined,
        isEximCapable,
        trailerType: isEximCapable ? trailerType : undefined,
        containerSizesSupported: isEximCapable ? containerSizesSupported : undefined,
        hasReeferPower: isEximCapable ? hasReeferPower : undefined,
        ownerPhone: needsOwnerPhone ? fullOwnerPhone : undefined,
        driverName,
        driverPhone: fullDriverWhatsapp,
        driverWhatsappVerificationToken: whatsappToken,
        driverAuthorized,
        preferredLanes: completeLanes.map((lane) => ({
          originLabel: lane.origin,
          destinationLabel: lane.destination,
        })),
      });
      if (vehicle.ownershipStatus !== 'verified') {
        // Listed for someone else's truck — nothing to verify here; the
        // owner takes it from their own account once they join.
        setInvitedPlate(vehicle.registrationNumber);
        resetTruckForm();
        return;
      }
      // Hold here on an RC+documents step for this truck before letting the
      // form move on to the next one — see pendingRcVehicleId below.
      setPendingRcVehicleId(vehicle.id);
      setState({ pendingAddTruckVehicleId: vehicle.id });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'OWNER_MISMATCH') setNeedsOwnerPhone(true);
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterVerification = () => {
    setAddedCount((prev) => prev + 1);
    setPendingRcVehicleId(null);
    setVerificationComplete(false);
    setState({ pendingAddTruckVehicleId: undefined });
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

  if (!profileLoaded || identityChecked === null) return null;

  if (!identityChecked && session) {
    return (
      <AuthBackground
        imageSrc="/auth/register-bg.png"
        imageAlt="A truck following a winding road toward Mumbai"
      >
        <div className="w-full max-w-md">
          <Logo variant="auth" className="mb-6 justify-center" />
          <AddTruckIdentityCheck
            token={session.accessToken}
            onVerified={() => setIdentityChecked(true)}
          />
        </div>
      </AuthBackground>
    );
  }

  if (pendingRcVehicleId && session) {
    return (
      <AuthBackground
        imageSrc="/auth/register-bg.png"
        imageAlt="A truck following a winding road toward Mumbai"
      >
        <div className="w-full max-w-md">
          <Logo variant="auth" className="mb-6 justify-center" />
          <Card>
            <CardHeader>
              <CardTitle>{t('addTrucks.rcTitle')}</CardTitle>
              <CardDescription>{t('addTrucks.rcSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <VehicleVerificationStep
                token={session.accessToken}
                vehicleId={pendingRcVehicleId}
                includeDriverDocs
                onComplete={setVerificationComplete}
              />
              <Button onClick={handleContinueAfterVerification} disabled={!verificationComplete}>
                {t('verify.continue')}
              </Button>
              {!verificationComplete && (
                <p className="text-center text-xs text-muted-foreground">{t('vehicle.finishHint')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthBackground>
    );
  }

  const canSubmit =
    registrationNumber.length >= 6 &&
    (truckType !== OTHER_TRUCK_TYPE || truckTypeOther.trim().length >= 2) &&
    !!capacityTons &&
    cargoTypes.length > 0 &&
    driverName.length >= 2 &&
    driverPhone.length >= 10 &&
    whatsappStep === 'verified' &&
    driverAuthorized &&
    completeLanes.length > 0 &&
    (!needsOwnerPhone || ownerPhone.length >= 10);

  return (
    <AuthBackground
      imageSrc="/auth/register-bg.png"
      imageAlt="A truck following a winding road toward Mumbai"
    >
      <div className="w-full max-w-md">
        <Logo variant="auth" className="mb-6 justify-center" />
        <Card>
          <CardHeader>
            <CardTitle>{t('addTrucks.title')}</CardTitle>
            <CardDescription>{t('addTrucks.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {invitedPlate && (
              <Alert>
                <AlertDescription>
                  {t('addTrucks.ownerInvited', { plate: invitedPlate })}
                </AlertDescription>
              </Alert>
            )}

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
                onChange={(e) => {
                  setRegistrationNumber(e.target.value);
                  // A different plate needs its own ownership check.
                  setNeedsOwnerPhone(false);
                }}
              />
            </div>
            {needsOwnerPhone && (
              <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3">
                <Label htmlFor="ownerPhone">{t('addTrucks.ownerPhone')}</Label>
                <Input
                  id="ownerPhone"
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t('addTrucks.ownerPhoneHint')}</p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>{t('vehicle.truckType')}</Label>
              <TruckTypeCombobox id="truckType" value={truckType} onValueChange={setTruckType} includeOther />
              {truckType === OTHER_TRUCK_TYPE && (
                <Input
                  id="truckTypeOther"
                  placeholder={t('vehicle.truckTypeOtherPlaceholder')}
                  value={truckTypeOther}
                  onChange={(e) => setTruckTypeOther(e.target.value)}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PresetChipField
                id="capacity"
                label={t('vehicle.capacityTons')}
                value={capacityTons}
                onChange={setCapacityTons}
                presets={TONNAGE_PRESETS}
                unit="t"
              />
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

            <PresetChipField
              id="lengthFeet"
              label={t('vehicle.lengthFeet')}
              hint={t('vehicle.lengthFeetHint')}
              value={lengthFeet}
              onChange={setLengthFeet}
              presets={LENGTH_PRESETS}
              unit="ft"
            />

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
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isEximCapable}
                  onChange={(e) => setIsEximCapable(e.target.checked)}
                />
                {t('vehicle.isEximCapable')}
              </label>
              <p className="text-xs text-muted-foreground">{t('vehicle.isEximCapableHint')}</p>
              {isEximCapable && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('vehicle.trailerType')}</Label>
                    <Select value={trailerType} onValueChange={(v) => v && setTrailerType(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(v: string | null) =>
                            v === 'skeletal_trailer'
                              ? t('vehicle.trailerTypeSkeletalTrailer')
                              : v === 'side_lifter'
                                ? t('vehicle.trailerTypeSideLifter')
                                : t('vehicle.trailerTypeContainerChassis')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="container_chassis">{t('vehicle.trailerTypeContainerChassis')}</SelectItem>
                        <SelectItem value="skeletal_trailer">{t('vehicle.trailerTypeSkeletalTrailer')}</SelectItem>
                        <SelectItem value="side_lifter">{t('vehicle.trailerTypeSideLifter')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('vehicle.containerSizesSupported')}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['20ft', '40ft', '40ft_hc'].map((size) => (
                        <label key={size} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={containerSizesSupported.includes(size)}
                            onChange={() => toggleContainerSize(size)}
                          />
                          {t(`vehicle.containerSize_${size}`)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasReeferPower}
                      onChange={(e) => setHasReeferPower(e.target.checked)}
                    />
                    {t('vehicle.hasReeferPower')}
                  </label>
                </>
              )}
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
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={driverAuthorized}
                  onChange={(e) => setDriverAuthorized(e.target.checked)}
                />
                <span>{t('vehicle.driverAuthorizeConsent')}</span>
              </label>
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
            {addedCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  // Leaving the continuous flow — a later "Add truck" visit
                  // from Settings should go through the identity check again.
                  clear();
                  router.push('/dashboard');
                }}
              >
                {t('addTrucks.skipForNow')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
