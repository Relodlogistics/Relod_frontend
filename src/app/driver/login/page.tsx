'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError } from '@/lib/api';
import { useDriverSession } from '@/lib/driver-session-context';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';
import { PhoneInput } from '@/components/PhoneInput';
import { TurnstileWidget } from '@/components/TurnstileWidget';

type Step = 'phone' | 'otp';

// Drivers never sign up separately — their login identity is the phone
// number the owner already WhatsApp-verified while onboarding their truck
// (Vehicle.driverPhone/driverWhatsappVerifiedAt). This page only ever sends
// an OTP to that already-known number; there's no account-creation path here.
export default function DriverLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setDriverSession } = useDriverSession();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const resetTurnstile = () => {
    setTurnstileToken('');
    setTurnstileKey((k) => k + 1);
  };

  const fullPhone = `+91${phone}`;

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.sendOtp(fullPhone, 'driver_login', turnstileToken);
      setDevCode(res.devCode ?? null);
      setStep('otp');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
      resetTurnstile();
    }
  };

  const handleVerify = async () => {
    setError(null);
    setNotFound(false);
    setLoading(true);
    try {
      const res = await api.verifyOtp(fullPhone, 'driver_login', code);
      if (!res.accountFound || !res.accessToken || !res.vehicleId) {
        setNotFound(true);
        return;
      }
      setDriverSession({
        accessToken: res.accessToken,
        vehicleId: res.vehicleId,
        phone: fullPhone,
        driverName: res.driverName ?? null,
      });
      router.push('/driver/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground
      imageSrc="/auth/login-bg.png"
      imageAlt="A truck on a highway at dusk, mountains in the distance"
    >
      <div className="w-full max-w-sm">
        <Logo variant="auth" className="mb-6 justify-center" />
        <Card>
          <CardHeader>
            <CardTitle>{t('driverLogin.title')}</CardTitle>
            <CardDescription>{t('driverLogin.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {notFound && (
              <Alert variant="destructive">
                <AlertDescription>{t('driverLogin.notFound')}</AlertDescription>
              </Alert>
            )}
            {devCode && step === 'otp' && (
              <Alert>
                <AlertDescription>{t('phone.devCode', { code: devCode })}</AlertDescription>
              </Alert>
            )}

            <TurnstileWidget key={turnstileKey} onVerify={setTurnstileToken} />

            {step === 'phone' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone">{t('phone.label')}</Label>
                  <PhoneInput
                    id="phone"
                    placeholder={t('phone.placeholder')}
                    value={phone}
                    onChange={setPhone}
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={
                    loading ||
                    phone.length < 10 ||
                    (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)
                  }
                >
                  {t('phone.sendOtp')}
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="code">{t('phone.otpLabel')}</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <Button onClick={handleVerify} disabled={loading || code.length !== 6}>
                  {t('phone.verify')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
