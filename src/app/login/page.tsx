'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';
import { PhoneInput } from '@/components/PhoneInput';
import { TurnstileWidget } from '@/components/TurnstileWidget';

type OtpStep = 'phone' | 'otp';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setSession } = useSession();

  const [loginTab, setLoginTab] = useState<'password' | 'otp'>('password');

  // Username & password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Phone OTP
  const [step, setStep] = useState<OtpStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Shared across both login methods — only one is active at a time, and
  // Turnstile tokens are single-use, so the widget remounts (fresh token)
  // after every attempt via turnstileKey, same pattern as register/phone.
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const resetTurnstile = () => {
    setTurnstileToken('');
    setTurnstileKey((k) => k + 1);
  };

  const fullPhone = `+91${phone}`;

  const handlePasswordLogin = async () => {
    setPasswordError(null);
    setPasswordLoading(true);
    try {
      const res = await api.loginPassword({ username, password, turnstileToken });
      const profile =
        res.userType === 'carrier'
          ? await api.getCarrierProfile(res.accessToken, res.accountId)
          : await api.getShipperProfile(res.accessToken, res.accountId);
      setSession({
        accessToken: res.accessToken,
        accountId: res.accountId,
        userType: res.userType,
        phone: profile.phone,
      });
      router.push('/dashboard');
    } catch (e) {
      setPasswordError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setPasswordLoading(false);
      resetTurnstile();
    }
  };

  const handleSendOtp = async () => {
    setOtpError(null);
    setOtpLoading(true);
    try {
      const res = await api.sendOtp(fullPhone, 'login', turnstileToken);
      setDevCode(res.devCode ?? null);
      setStep('otp');
    } catch (e) {
      setOtpError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setOtpLoading(false);
      resetTurnstile();
    }
  };

  const handleVerify = async () => {
    setOtpError(null);
    setNoAccount(false);
    setOtpLoading(true);
    try {
      const res = await api.verifyOtp(fullPhone, 'login', code);
      if (!res.accountFound || !res.accessToken || !res.accountId || !res.userType) {
        setNoAccount(true);
        return;
      }
      setSession({
        accessToken: res.accessToken,
        accountId: res.accountId,
        userType: res.userType,
        phone: fullPhone,
      });
      router.push('/dashboard');
    } catch (e) {
      setOtpError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setOtpLoading(false);
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
            <CardTitle>{t('login.title')}</CardTitle>
            <CardDescription>{t('login.subtitle')}</CardDescription>
          </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs value={loginTab} onValueChange={(v) => setLoginTab(v as 'password' | 'otp')}>
            <TabsList className="w-full">
              <TabsTrigger value="password">{t('login.passwordTab')}</TabsTrigger>
              <TabsTrigger value="otp">{t('login.otpTab')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <TurnstileWidget key={turnstileKey} onVerify={setTurnstileToken} />

          {loginTab === 'password' && (
            <div className="flex flex-col gap-4">
              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">{t('login.username')}</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={handlePasswordLogin}
                disabled={
                  passwordLoading ||
                  !username ||
                  !password ||
                  (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)
                }
              >
                {t('login.loginButton')}
              </Button>
              <div className="flex justify-center gap-4 text-sm">
                <Link href="/forgot-password" className="text-muted-foreground underline">
                  {t('login.forgotPassword')}
                </Link>
                <Link href="/forgot-username" className="text-muted-foreground underline">
                  {t('login.forgotUsername')}
                </Link>
              </div>
            </div>
          )}

          {loginTab === 'otp' && (
            <div className="flex flex-col gap-4">
              {otpError && (
                <Alert variant="destructive">
                  <AlertDescription>{otpError}</AlertDescription>
                </Alert>
              )}
              {noAccount && (
                <Alert variant="destructive">
                  <AlertDescription className="flex flex-col gap-2">
                    {t('login.noAccount')}
                    <Link href="/register/phone" className="underline">
                      {t('login.goSignUp')}
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              {devCode && step === 'otp' && (
                <Alert>
                  <AlertDescription>{t('phone.devCode', { code: devCode })}</AlertDescription>
                </Alert>
              )}

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
                      otpLoading ||
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
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleVerify} disabled={otpLoading || code.length !== 6}>
                    {t('phone.verify')}
                  </Button>
                </>
              )}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {t('login.newHere')}{' '}
            <Link href="/register/phone" className="text-foreground underline">
              {t('login.register')}
            </Link>
          </p>
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}
