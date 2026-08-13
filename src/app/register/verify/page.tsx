'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
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
import { RegistrationStepper } from '@/components/RegistrationStepper';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';
import { api, ApiError, KycDocType, KycVerification } from '@/lib/api';
import { useRegistration } from '@/lib/registration-context';
import { useSession } from '@/lib/session-context';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  docType: KycDocType;
  titleKey: string;
  descKey: string;
}

export default function VerifyPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { state, setState } = useRegistration();
  const { setSession } = useSession();

  const isCarrier = state.userType === 'carrier';
  const carrierProfile = state.pendingCarrierProfile;
  const shipperProfile = state.pendingShipperProfile;
  const fullName = isCarrier ? carrierProfile?.fullName : shipperProfile?.fullName;
  const isOwnerOperator = isCarrier ? carrierProfile?.isOwnerOperator : undefined;
  const lang = i18n.language?.split('-')[0] ?? 'en';

  const [whatsappLanguage, setWhatsappLanguage] = useState(
    (isCarrier ? carrierProfile?.preferredLanguage : shipperProfile?.preferredLanguage) ?? lang,
  );

  const handleWhatsappLanguageChange = (value: string) => {
    setWhatsappLanguage(value);
    if (isCarrier && carrierProfile) {
      setState({ pendingCarrierProfile: { ...carrierProfile, preferredLanguage: value } });
    } else if (!isCarrier && shipperProfile) {
      setState({ pendingShipperProfile: { ...shipperProfile, preferredLanguage: value } });
    }
  };

  useEffect(() => {
    if (!state.token || !state.phone || !fullName) router.replace('/register/phone');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.token, state.phone, fullName]);

  // Same checklist for both sides, plus a role-specific item each: shippers
  // verify GSTIN, owner-operator carriers verify their own driving license
  // (a non-owner-operator's driver's license is checked per-truck later, in
  // register/add-trucks, since it belongs to the driver, not the account).
  const items: ChecklistItem[] = useMemo(() => {
    const base: ChecklistItem[] = [
      { docType: 'aadhaar', titleKey: 'verify.aadhaarTitle', descKey: 'verify.aadhaarDesc' },
      { docType: 'pan', titleKey: 'verify.panTitle', descKey: 'verify.panDesc' },
      { docType: 'face_match', titleKey: 'verify.faceMatchTitle', descKey: 'verify.faceMatchDesc' },
    ];
    if (isCarrier && isOwnerOperator) {
      base.push({ docType: 'driving_license', titleKey: 'verify.dlTitle', descKey: 'verify.dlDesc' });
    }
    base.push({ docType: 'bank_account', titleKey: 'verify.bankTitle', descKey: 'verify.bankDesc' });
    if (!isCarrier) {
      base.push({ docType: 'gstin', titleKey: 'verify.gstinTitle', descKey: 'verify.gstinDesc' });
    }
    return base;
  }, [isCarrier, isOwnerOperator]);

  const [verified, setVerified] = useState<Set<KycDocType>>(new Set());
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Resume progress on reload — a previous partial attempt's checks stay
  // verified server-side (keyed by phone), so don't make the user redo them.
  useEffect(() => {
    if (!state.token) return;
    api
      .kycStatus(state.token)
      .then((rows: KycVerification[]) => {
        const done = new Set(rows.filter((r) => r.status === 'verified').map((r) => r.docType));
         
        setVerified(done);
         
        setStatusLoaded(true);
      })
      .catch(() => setStatusLoaded(true));
     
  }, [state.token]);

  const currentIndex = items.findIndex((item) => !verified.has(item.docType));
  const allDone = statusLoaded && currentIndex === -1;

  const markVerified = (docType: KycDocType) => {
    setVerified((prev) => new Set(prev).add(docType));
  };

  const handleFinish = async () => {
    if (!state.token || !state.phone) return;
    setFinishing(true);
    setFinishError(null);
    try {
      if (isCarrier && carrierProfile) {
        if (carrierProfile.isOwnerOperator) {
          // The vehicle step (register/vehicle) still creates the account —
          // this just carries the already-verified profile forward.
          router.push('/register/vehicle');
          return;
        }
        const res = await api.registerCarrier(state.token, {
          ...carrierProfile,
          phone: state.phone,
        });
        setState({ userType: 'carrier', accountId: res.id });
        setSession({ accessToken: res.accessToken, accountId: res.id, userType: 'carrier', phone: state.phone });
        router.push(res.alreadyRegistered ? '/dashboard' : '/register/add-trucks');
      } else if (shipperProfile) {
        const res = await api.registerShipper(state.token, {
          ...shipperProfile,
          phone: state.phone,
        });
        setState({ userType: 'shipper', accountId: res.id });
        setSession({ accessToken: res.accessToken, accountId: res.id, userType: 'shipper', phone: state.phone });
        router.push('/dashboard');
      }
    } catch (e) {
      setFinishError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <AuthBackground
      imageSrc="/auth/register-bg.png"
      imageAlt="A truck following a winding road toward Mumbai"
    >
      <div className="w-full max-w-md">
        <Logo variant="auth" className="mb-6 justify-center" />
        <RegistrationStepper
          steps={
            isCarrier
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
                ]
          }
          currentIndex={2}
        />
        <Card>
          <CardHeader>
            <CardTitle>{t('verify.title')}</CardTitle>
            <CardDescription>{t('verify.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ol className="flex flex-col gap-1.5">
              {items.map((item, idx) => {
                const done = verified.has(item.docType);
                const active = idx === currentIndex;
                return (
                  <li
                    key={item.docType}
                    className={cn(
                      'flex items-center gap-2 text-sm',
                      done ? 'text-emerald-600' : active ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="size-4 shrink-0" />
                    ) : (
                      <Circle className={cn('size-4 shrink-0', active && 'text-primary')} />
                    )}
                    {t(item.titleKey)}
                  </li>
                );
              })}
            </ol>

            {!statusLoaded ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : allDone ? (
              <div className="flex flex-col gap-3 border-t pt-4">
                {finishError && (
                  <Alert variant="destructive">
                    <AlertDescription>{finishError}</AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-emerald-600">{t('verify.allDone')}</p>
                <div className="flex flex-col gap-1.5">
                  <Label>{t('verify.whatsappLanguageQuestion')}</Label>
                  <p className="text-xs text-muted-foreground">{t('verify.whatsappLanguageHint')}</p>
                  <Select value={whatsappLanguage} onValueChange={(v) => v && handleWhatsappLanguageChange(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleFinish} disabled={finishing}>
                  {t('verify.continue')}
                </Button>
              </div>
            ) : (
              state.token && (
                <VerificationStep
                  key={items[currentIndex].docType}
                  item={items[currentIndex]}
                  token={state.token}
                  fullName={fullName ?? ''}
                  preferredLanguage={lang}
                  onVerified={() => markVerified(items[currentIndex].docType)}
                />
              )
            )}
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}

function VerificationStep({
  item,
  token,
  fullName,
  onVerified,
}: {
  item: ChecklistItem;
  token: string;
  fullName: string;
  preferredLanguage: string;
  onVerified: () => void;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Aadhaar (two-step: send OTP, then verify it)
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [aadhaarReferenceId, setAadhaarReferenceId] = useState<string | null>(null);

  // PAN
  const [panNumber, setPanNumber] = useState('');

  // Face match
  const [selfie, setSelfie] = useState<File | null>(null);

  // Driving license
  const [dlNumber, setDlNumber] = useState('');
  const [dob, setDob] = useState('');

  // Bank account
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

  // GSTIN
  const [gstin, setGstin] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
      onVerified();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const sendAadhaarOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.sendAadhaarOtp(token, aadhaarNumber);
      setAadhaarReferenceId(res.referenceId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div>
        <p className="text-sm font-medium">{t(item.titleKey)}</p>
        <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {item.docType === 'aadhaar' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="aadhaarNumber">{t('verify.aadhaarNumber')}</Label>
          <div className="flex gap-2">
            <Input
              id="aadhaarNumber"
              inputMode="numeric"
              maxLength={12}
              value={aadhaarNumber}
              disabled={!!aadhaarReferenceId}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
            />
            {!aadhaarReferenceId && (
              <Button onClick={sendAadhaarOtp} disabled={loading || aadhaarNumber.length !== 12}>
                {t('phone.sendOtp')}
              </Button>
            )}
          </div>
          {aadhaarReferenceId && (
            <div className="flex gap-2">
              <Input
                id="aadhaarOtp"
                inputMode="numeric"
                maxLength={6}
                placeholder={t('phone.otpLabel')}
                value={aadhaarOtp}
                onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
              />
              <Button
                onClick={() => run(() => api.verifyAadhaarOtp(token, aadhaarReferenceId, aadhaarOtp))}
                disabled={loading || aadhaarOtp.length < 4}
              >
                {t('phone.verify')}
              </Button>
            </div>
          )}
        </div>
      )}

      {item.docType === 'pan' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="panNumber">{t('profile.panNumber')}</Label>
          <div className="flex gap-2">
            <Input
              id="panNumber"
              maxLength={10}
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
            />
            <Button
              onClick={() => run(() => api.verifyPan(token, panNumber, fullName))}
              disabled={loading || panNumber.length !== 10}
            >
              {t('phone.verify')}
            </Button>
          </div>
        </div>
      )}

      {item.docType === 'face_match' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="selfie">{t('verify.selfiePhoto')}</Label>
          <Input
            id="selfie"
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
          />
          <Button
            onClick={() => selfie && run(() => api.verifyFaceMatch(token, selfie))}
            disabled={loading || !selfie}
          >
            {t('phone.verify')}
          </Button>
        </div>
      )}

      {item.docType === 'driving_license' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="dlNumber">{t('verify.dlNumber')}</Label>
          <Input id="dlNumber" value={dlNumber} onChange={(e) => setDlNumber(e.target.value.toUpperCase())} />
          <Label htmlFor="dlDob">{t('verify.dob')}</Label>
          <Input id="dlDob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          <Button
            onClick={() => run(() => api.verifyDrivingLicense(token, dlNumber, dob))}
            disabled={loading || dlNumber.length < 6 || !dob}
          >
            {t('phone.verify')}
          </Button>
        </div>
      )}

      {item.docType === 'bank_account' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="accountNumber">{t('verify.accountNumber')}</Label>
          <Input
            id="accountNumber"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
          />
          <Label htmlFor="ifsc">{t('verify.ifsc')}</Label>
          <Input id="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
          <Button
            onClick={() => run(() => api.verifyBankAccount(token, accountNumber, ifsc, fullName))}
            disabled={loading || accountNumber.length < 4 || ifsc.length < 4}
          >
            {t('phone.verify')}
          </Button>
        </div>
      )}

      {item.docType === 'gstin' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="gstin">{t('profile.gstin')}</Label>
          <div className="flex gap-2">
            <Input id="gstin" maxLength={15} value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} />
            <Button onClick={() => run(() => api.verifyGstin(token, gstin))} disabled={loading || gstin.length !== 15}>
              {t('phone.verify')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
