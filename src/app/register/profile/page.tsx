'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useRegistration } from '@/lib/registration-context';
import { useSession } from '@/lib/session-context';
import { RegistrationStepper } from '@/components/RegistrationStepper';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';

type RoleValue = 'carrier' | 'shipper';

// What a shipper's business does. Only businesses whose main work is something
// other than transport (they hire trucks to move their goods) — transport
// brokers and 3PLs aren't onboarded here.
const SHIPPER_CATEGORY_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'manufacturer', labelKey: 'profile.categoryManufacturer' },
  { value: 'trader', labelKey: 'profile.categoryTrader' },
  { value: 'ecommerce_seller', labelKey: 'profile.categoryEcommerce' },
  { value: 'retailer', labelKey: 'profile.categoryRetailer' },
  { value: 'contractor', labelKey: 'profile.categoryContractor' },
  { value: 'agri_dealer', labelKey: 'profile.categoryAgri' },
  { value: 'exim_business', labelKey: 'profile.categoryExim' },
  { value: 'other', labelKey: 'profile.categoryOther' },
];

// The dispatch software for people who find loads for trucks (rather than
// hire trucks) — Relod itself is for the hiring side.
const TMS_URL = process.env.NEXT_PUBLIC_TMS_URL ?? 'https://syntheniumtms.com';

// Same shape the server enforces: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const ROLE_OPTIONS: { value: RoleValue; labelKey: string; descKey: string }[] = [
  { value: 'carrier', labelKey: 'profile.roleCarrier', descKey: 'profile.roleCarrierDesc' },
  { value: 'shipper', labelKey: 'profile.roleShipper', descKey: 'profile.roleShipperDesc' },
];

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { state, setState } = useRegistration();
  const { setSession } = useSession();

  const [userType, setUserType] = useState<'carrier' | 'shipper'>('carrier');
  const [isOwnerOperator, setIsOwnerOperator] = useState(true);
  const [truckCount, setTruckCount] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappStep, setWhatsappStep] = useState<'input' | 'otp' | 'verified'>('input');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappDevCode, setWhatsappDevCode] = useState<string | null>(null);
  const [whatsappToken, setWhatsappToken] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  // A carrier that trades as a company shows only its business name to
  // shippers. Kept apart from the shipper's businessName/gstin below so
  // switching roles can't leak one side's values into the other's payload.
  const [operatesAsBusiness, setOperatesAsBusiness] = useState(false);
  const [carrierBusinessName, setCarrierBusinessName] = useState('');
  const [carrierGstin, setCarrierGstin] = useState('');
  const [carrierBusinessPan, setCarrierBusinessPan] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('proprietorship');
  const [shipperCategory, setShipperCategory] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleValue | ''>('');

  const [otherIntent, setOtherIntent] = useState<'find_trucks' | 'find_loads' | ''>('');

  const chooseRole = (role: RoleValue) => {
    setSelectedRole(role);
    setUserType(role);
    setShipperCategory('');
    setOtherIntent('');
  };

  // The whole form (name, phone, business details…) only appears once the
  // person has told us enough to know which form to show.
  const isOther = shipperCategory === 'other';
  const roleReady =
    selectedRole === 'carrier' ||
    (selectedRole === 'shipper' && !!shipperCategory && (!isOther || otherIntent === 'find_trucks'));
  const [iec, setIec] = useState('');
  const [otherRole, setOtherRole] = useState('');
  const [otherDescription, setOtherDescription] = useState('');
  const [gstin, setGstin] = useState('');
  const [shipperPan, setShipperPan] = useState('');
  const [paymentUpiId, setPaymentUpiId] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [shipmentVolume, setShipmentVolume] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showLoginLink, setShowLoginLink] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state.token || !state.phone) router.replace('/register/phone');
  }, [state.token, state.phone, router]);

  useEffect(() => {
    if (state.phone && !whatsappNumber) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWhatsappNumber(state.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phone]);

  const fullWhatsapp = whatsappNumber.startsWith('+') ? whatsappNumber : `+91${whatsappNumber}`;

  const handleSendWhatsappOtp = async () => {
    setWhatsappError(null);
    setWhatsappLoading(true);
    try {
      const res = await api.sendOtp(fullWhatsapp, 'whatsapp_verify');
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
      const res = await api.verifyOtp(fullWhatsapp, 'whatsapp_verify', whatsappCode);
      setWhatsappToken(res.token);
      setWhatsappStep('verified');
    } catch (e) {
      setWhatsappError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleChangeWhatsappNumber = () => {
    setWhatsappStep('input');
    setWhatsappToken(null);
    setWhatsappCode('');
    setWhatsappDevCode(null);
    setWhatsappError(null);
  };

  const handleSubmit = () => {
    if (!state.token || !state.phone) return;
    const needsWhatsapp = userType === 'shipper' || isOwnerOperator;
    if (needsWhatsapp && (whatsappStep !== 'verified' || !whatsappToken)) return;
    setError(null);
    setShowLoginLink(false);
    try {
      const lang = i18n.language?.split('-')[0] ?? 'en';
      // No account is created yet for anyone at this point — that now only
      // happens once the KYC verification step also completes (see
      // register/verify), and for owner-operator carriers, the vehicle step
      // after that too. Stash these fields client-side in the meantime.
      if (userType === 'carrier') {
        setState({
          userType: 'carrier',
          pendingCarrierProfile: {
            fullName,
            isOwnerOperator,
            whatsappNumber: isOwnerOperator ? fullWhatsapp : undefined,
            whatsappVerificationToken: isOwnerOperator ? (whatsappToken ?? undefined) : undefined,
            truckCount: isOwnerOperator ? undefined : Number(truckCount),
            aadhaarNumber,
            panNumber: panNumber || undefined,
            businessName: operatesAsBusiness ? carrierBusinessName.trim() : undefined,
            gstin: operatesAsBusiness ? carrierGstin || undefined : undefined,
            businessPan: operatesAsBusiness ? carrierBusinessPan || undefined : undefined,
            email: email || undefined,
            preferredLanguage: lang,
          },
        });
      } else {
        setState({
          userType: 'shipper',
          pendingShipperProfile: {
            fullName,
            whatsappNumber: fullWhatsapp,
            whatsappVerificationToken: whatsappToken!,
            email: email || undefined,
            businessName: businessName || undefined,
            businessType,
            // "Other" people who hire trucks are stored as ordinary domestic
            // shippers, with their own words kept alongside.
            shipperCategory: isOther ? 'domestic' : shipperCategory,
            iec: shipperCategory === 'exim_business' ? iec || undefined : undefined,
            otherRole: isOther ? otherRole.trim() : undefined,
            otherDescription: isOther ? otherDescription.trim() : undefined,
            gstin: gstin || undefined,
            panNumber: shipperPan || undefined,
            paymentUpiId: paymentUpiId || undefined,
            industryType: industryType || undefined,
            shipmentVolume: shipmentVolume || undefined,
            businessAddress: businessAddress || undefined,
            preferredLanguage: lang,
          },
        });
      }
      router.push('/register/verify');
    } catch {
      setError(t('errors.generic'));
    }
  };

  // Until a role is chosen only the steps common to everyone are shown; the
  // vehicle/documents steps only apply to (and appear for) truck owners.
  const steps =
    selectedRole === 'carrier'
      ? [
          { key: 'phone', label: t('stepper.phone') },
          { key: 'profile', label: t('stepper.profile') },
          { key: 'verify', label: t('stepper.verify') },
          { key: 'vehicle', label: t('stepper.vehicle') },
          { key: 'documents', label: t('stepper.documents') },
        ]
      : [
          { key: 'phone', label: t('stepper.phone') },
          { key: 'profile', label: t('stepper.profile') },
          { key: 'verify', label: t('stepper.verify') },
        ];

  const canSubmit =
    fullName.length >= 2 &&
    roleReady &&
    (!isOther || (otherRole.trim().length >= 2 && otherDescription.trim().length >= 2)) &&
    (userType === 'shipper' || aadhaarNumber.length === 12) &&
    (userType === 'shipper' || PAN_PATTERN.test(panNumber)) &&
    (userType === 'shipper' ||
      !operatesAsBusiness ||
      (carrierBusinessName.trim().length >= 2 &&
        (carrierGstin === '' || carrierGstin.length === 15) &&
        (carrierBusinessPan === '' || PAN_PATTERN.test(carrierBusinessPan)))) &&
    (userType === 'shipper' || isOwnerOperator
      ? whatsappStep === 'verified'
      : Number(truckCount) >= 1);

  return (
    <AuthBackground
      imageSrc="/auth/register-bg.png"
      imageAlt="A truck following a winding road toward Mumbai"
    >
      <div className="w-full max-w-md">
        <Logo variant="auth" className="mb-6 justify-center" />
        <RegistrationStepper steps={steps} currentIndex={1} />
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.title')}</CardTitle>
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

            {selectedRole ? (
              <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{t('profile.roleYouAre')}</span>
                  <span className="text-sm font-medium">
                    {t(ROLE_OPTIONS.find((o) => o.value === selectedRole)!.labelKey)}
                    {selectedRole === 'shipper' && shipperCategory && (
                      <>
                        {' · '}
                        {t(SHIPPER_CATEGORY_OPTIONS.find((o) => o.value === shipperCategory)!.labelKey)}
                      </>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary underline"
                  onClick={() => {
                    setSelectedRole('');
                    setShipperCategory('');
                    setOtherIntent('');
                  }}
                >
                  {t('profile.roleChange')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>{t('profile.roleQuestion')}</Label>
                {ROLE_OPTIONS.map((opt) =>
                  opt.value === 'shipper' ? (
                    // The business-type dropdown lives right on the card so it's
                    // visible straight away — choosing from it picks the role too.
                    <div key={opt.value} className="flex flex-col gap-2 rounded-lg border p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{t(opt.labelKey)}</span>
                        <span className="text-xs text-muted-foreground">{t(opt.descKey)}</span>
                      </div>
                      <Select
                        value=""
                        onValueChange={(v) => {
                          if (!v) return;
                          setSelectedRole('shipper');
                          setUserType('shipper');
                          setShipperCategory(v);
                          setOtherIntent('');
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('profile.categoryPlaceholder')}>
                            {() => t('profile.categoryPlaceholder')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {SHIPPER_CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {t(c.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => chooseRole(opt.value)}
                      className="flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="text-sm font-medium">{t(opt.labelKey)}</span>
                      <span className="text-xs text-muted-foreground">{t(opt.descKey)}</span>
                    </button>
                  ),
                )}
              </div>
            )}

            {selectedRole === 'shipper' && isOther && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="otherRole">{t('profile.otherRoleLabel')}</Label>
                  <Input
                    id="otherRole"
                    placeholder={t('profile.otherRolePlaceholder')}
                    value={otherRole}
                    onChange={(e) => setOtherRole(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="otherDescription">{t('profile.otherDescriptionLabel')}</Label>
                  <textarea
                    id="otherDescription"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    placeholder={t('profile.otherDescriptionPlaceholder')}
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{t('profile.otherIntentQuestion')}</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="otherIntent"
                      checked={otherIntent === 'find_trucks'}
                      onChange={() => setOtherIntent('find_trucks')}
                    />
                    {t('profile.otherIntentFindTrucks')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="otherIntent"
                      checked={otherIntent === 'find_loads'}
                      onChange={() => setOtherIntent('find_loads')}
                    />
                    {t('profile.otherIntentFindLoads')}
                  </label>
                </div>
                {otherIntent === 'find_loads' && (
                  <Alert>
                    <AlertDescription className="flex flex-col gap-2">
                      {t('profile.otherFindLoadsNotice')}
                      <a
                        href={TMS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline"
                      >
                        {t('profile.otherGoToTms')}
                      </a>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {roleReady && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">{t('profile.fullName')}</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phoneDisplay">{t('profile.phoneNumber')}</Label>
                <Input id="phoneDisplay" value={state.phone ?? ''} disabled />
              </div>

              {userType === 'carrier' && (
                <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">{t('profile.isOwnerOperatorQuestion')}</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="isOwnerOperator"
                      checked={isOwnerOperator}
                      onChange={() => setIsOwnerOperator(true)}
                    />
                    {t('profile.ownerOperatorYes')}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="isOwnerOperator"
                      checked={!isOwnerOperator}
                      onChange={() => setIsOwnerOperator(false)}
                    />
                    {t('profile.ownerOperatorNo')}
                  </label>
                  {!isOwnerOperator && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <Label htmlFor="truckCount">{t('profile.truckCount')}</Label>
                      <Input
                        id="truckCount"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={truckCount}
                        onChange={(e) => setTruckCount(e.target.value.replace(/\D/g, ''))}
                      />
                      <p className="text-xs text-muted-foreground">{t('profile.truckCountHint')}</p>
                    </div>
                  )}
                </div>
              )}

              {(userType === 'shipper' || isOwnerOperator) && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="whatsappNumber">{t('profile.whatsappNumber')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="whatsappNumber"
                      type="tel"
                      value={whatsappNumber}
                      disabled={whatsappStep !== 'input'}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                    />
                    {whatsappStep === 'input' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendWhatsappOtp}
                        disabled={whatsappLoading || whatsappNumber.length < 10}
                      >
                        {t('phone.sendOtp')}
                      </Button>
                    )}
                    {whatsappStep === 'verified' && (
                      <Button type="button" variant="ghost" onClick={handleChangeWhatsappNumber}>
                        {t('phone.changeNumber')}
                      </Button>
                    )}
                  </div>

                  {whatsappStep === 'verified' ? (
                    <p className="text-xs font-medium text-emerald-600">✓ {t('profile.whatsappVerified')}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('profile.whatsappHint')}</p>
                  )}

                  {whatsappStep === 'otp' && (
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        {t('phone.otpSent', { phone: fullWhatsapp })}
                      </p>
                      {whatsappDevCode && (
                        <p className="text-xs text-muted-foreground">
                          {t('phone.devCode', { code: whatsappDevCode })}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Input
                          id="whatsappOtp"
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
                          onClick={handleChangeWhatsappNumber}
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
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              {userType === 'carrier' && (
                <>
                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium">{t('profile.kycSection')}</p>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="aadhaarNumber">{t('profile.aadhaarNumber')}</Label>
                      <Input
                        id="aadhaarNumber"
                        inputMode="numeric"
                        maxLength={12}
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                      />
                      <p className="text-xs text-muted-foreground">{t('profile.aadhaarHint')}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="panNumber">{t('profile.panNumber')}</Label>
                      <Input
                        id="panNumber"
                        maxLength={10}
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      />
                      {panNumber.length > 0 && !PAN_PATTERN.test(panNumber) && (
                        <p className="text-xs text-destructive">{t('profile.panInvalid')}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={operatesAsBusiness}
                        onChange={(e) => setOperatesAsBusiness(e.target.checked)}
                      />
                      {t('profile.operatesAsBusiness')}
                    </label>
                    <p className="text-xs text-muted-foreground">{t('profile.operatesAsBusinessHint')}</p>
                    {operatesAsBusiness && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="carrierBusinessName">{t('profile.carrierBusinessName')}</Label>
                          <Input
                            id="carrierBusinessName"
                            value={carrierBusinessName}
                            onChange={(e) => setCarrierBusinessName(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="carrierGstin">{t('profile.gstin')}</Label>
                          <Input
                            id="carrierGstin"
                            maxLength={15}
                            value={carrierGstin}
                            onChange={(e) => setCarrierGstin(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="carrierBusinessPan">{t('profile.businessPan')}</Label>
                          <Input
                            id="carrierBusinessPan"
                            maxLength={10}
                            value={carrierBusinessPan}
                            onChange={(e) => setCarrierBusinessPan(e.target.value.toUpperCase())}
                          />
                          {carrierBusinessPan.length > 0 && !PAN_PATTERN.test(carrierBusinessPan) && (
                            <p className="text-xs text-destructive">{t('profile.panInvalid')}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('profile.businessProofHint')}</p>
                      </>
                    )}
                  </div>
                </>
              )}

              {userType === 'shipper' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="businessName">{t('profile.businessName')}</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t('profile.businessType')}</Label>
                    <Select value={businessType} onValueChange={(v) => v && setBusinessType(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(v: string | null) =>
                            v === 'partnership'
                              ? t('profile.businessTypePartnership')
                              : v === 'company'
                                ? t('profile.businessTypeCompany')
                                : t('profile.businessTypeProprietorship')
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proprietorship">
                          {t('profile.businessTypeProprietorship')}
                        </SelectItem>
                        <SelectItem value="partnership">{t('profile.businessTypePartnership')}</SelectItem>
                        <SelectItem value="company">{t('profile.businessTypeCompany')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {shipperCategory === 'exim_business' && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="iec">{t('profile.iec')}</Label>
                      <Input id="iec" value={iec} onChange={(e) => setIec(e.target.value)} />
                      <p className="text-xs text-muted-foreground">{t('profile.iecHint')}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="gstin">{t('profile.gstin')}</Label>
                    <Input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="businessAddress">{t('profile.businessAddress')}</Label>
                    <Input
                      id="businessAddress"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium">{t('profile.businessKycSection')}</p>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="shipperPan">{t('profile.panNumber')}</Label>
                      <Input
                        id="shipperPan"
                        maxLength={10}
                        value={shipperPan}
                        onChange={(e) => setShipperPan(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="paymentUpiId">{t('profile.paymentUpiId')}</Label>
                      <Input
                        id="paymentUpiId"
                        value={paymentUpiId}
                        onChange={(e) => setPaymentUpiId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">{t('profile.paymentUpiHint')}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="industryType">{t('profile.industryType')}</Label>
                      <Input
                        id="industryType"
                        value={industryType}
                        onChange={(e) => setIndustryType(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>{t('profile.shipmentVolume')}</Label>
                      <Select value={shipmentVolume} onValueChange={(v) => v && setShipmentVolume(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('profile.shipmentVolumePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-5">{t('profile.shipmentVolume1to5')}</SelectItem>
                          <SelectItem value="5-10">{t('profile.shipmentVolume5to10')}</SelectItem>
                          <SelectItem value="10+">{t('profile.shipmentVolume10plus')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
            )}

            <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
              {t('profile.submit')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
