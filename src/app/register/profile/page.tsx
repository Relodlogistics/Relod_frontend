'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('proprietorship');
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

  const steps =
    userType === 'carrier'
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
    (userType === 'shipper' || aadhaarNumber.length === 12) &&
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

            <Tabs value={userType} onValueChange={(v) => setUserType(v as 'carrier' | 'shipper')}>
              <TabsList className="w-full">
                <TabsTrigger value="carrier" className="flex-1">
                  {t('profile.carrier')}
                </TabsTrigger>
                <TabsTrigger value="shipper" className="flex-1">
                  {t('profile.shipper')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
                      <p className="text-xs text-muted-foreground">{t('profile.panHint')}</p>
                    </div>
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
                      <SelectTrigger>
                        <SelectValue />
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

            <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
              {t('profile.submit')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
