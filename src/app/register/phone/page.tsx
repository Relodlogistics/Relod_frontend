'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useRegistration } from '@/lib/registration-context';
import { RegistrationStepper } from '@/components/RegistrationStepper';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';
import { PhoneInput } from '@/components/PhoneInput';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { Capacitor } from '@capacitor/core';

type Step = 'phone' | 'otp';

// Cloudflare Turnstile is unreliable inside an embedded Android WebView
// ("Unable to connect to website") — skip it entirely on native, matching
// the backend's isNativeAppRequest check (header sent by api.ts).
const isNative = Capacitor.isNativePlatform();

export default function PhonePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setState } = useRegistration();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  // Turnstile tokens are single-use — bumping this remounts the widget after
  // every send attempt (success or failure) so a fresh token is ready for a
  // resend, instead of silently reusing an already-consumed one.
  const [turnstileKey, setTurnstileKey] = useState(0);

  const fullPhone = `+91${phone}`;

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.sendOtp(fullPhone, 'signup', turnstileToken);
      setDevCode(res.devCode ?? null);
      setStep('otp');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
      setTurnstileToken('');
      setTurnstileKey((k) => k + 1);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp(fullPhone, 'signup', code);
      setState({ phone: fullPhone, token: res.token });
      router.push('/register/profile');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground
      imageSrc="/auth/register-bg.png"
      imageAlt="A truck following a winding road toward Mumbai"
    >
      <div className="mx-auto w-full max-w-sm">
        <Logo variant="auth" className="mb-6 justify-center" />
        <RegistrationStepper
          steps={[
            { key: 'phone', label: t('stepper.phone') },
            { key: 'profile', label: t('stepper.profile') },
          ]}
          currentIndex={0}
        />
        <Card>
          <CardHeader>
            <CardTitle>{step === 'phone' ? t('phone.title') : t('phone.otpLabel')}</CardTitle>
            <CardDescription>
              {step === 'phone' ? t('phone.subtitle') : t('phone.otpSent', { phone: fullPhone })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {devCode && step === 'otp' && (
              <Alert>
                <AlertDescription>{t('phone.devCode', { code: devCode })}</AlertDescription>
              </Alert>
            )}

            {/* Kept mounted across both steps (not just the phone-entry one) so
                the same widget instance is still available if the user hits
                "Resend" — Turnstile tokens are single-use, and re-rendering it
                fresh here gives a new token automatically after each solve. */}
            {!isNative && <TurnstileWidget key={turnstileKey} onVerify={setTurnstileToken} />}

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
                  disabled={loading || phone.length < 10 || (!isNative && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)}
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
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <Button onClick={handleVerify} disabled={loading || code.length !== 6}>
                  {t('phone.verify')}
                </Button>
                <div className="flex justify-between text-sm">
                  <button className="text-muted-foreground underline" onClick={() => setStep('phone')}>
                    {t('phone.changeNumber')}
                  </button>
                  <button className="text-muted-foreground underline" onClick={handleSendOtp}>
                    {t('phone.resend')}
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-muted-foreground underline"
        >
          {t('errors.logInInstead')}
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t('phone.legalPrefix')}{' '}
          <Link href="/terms" className="text-primary underline">
            {t('marketing.footer.terms')}
          </Link>{' '}
          {t('phone.legalAnd')}{' '}
          <Link href="/privacy" className="text-primary underline">
            {t('marketing.footer.privacy')}
          </Link>
        </p>
      </div>
    </AuthBackground>
  );
}
