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
import { api, ApiError } from '@/lib/api';

type Step = 'phone' | 'code' | 'reset';

export default function ForgotUsernamePage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [confirmUsername, setConfirmUsername] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  const handleSendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.forgotUsername(fullPhone);
      setDevCode(res.devCode ?? null);
      setStep('code');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = () => {
    setError(null);
    setStep('reset');
  };

  const handleReset = async () => {
    setError(null);
    if (newUsername !== confirmUsername) {
      setError(t('forgotUsername.usernameMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.resetUsername({ phone: fullPhone, code, newUsername });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1200);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('forgotUsername.title')}</CardTitle>
          <CardDescription>{t('forgotUsername.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>{t('forgotUsername.success')}</AlertDescription>
            </Alert>
          )}
          {devCode && step !== 'phone' && (
            <Alert>
              <AlertDescription>{t('phone.devCode', { code: devCode })}</AlertDescription>
            </Alert>
          )}

          {step === 'phone' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">{t('phone.label')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('phone.placeholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button onClick={handleSendCode} disabled={loading || phone.length < 10}>
                {t('forgotUsername.sendCode')}
              </Button>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">{t('forgotUsername.codeLabel')}</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <Button onClick={handleConfirmCode} disabled={code.length !== 6}>
                {t('forgotUsername.confirmCode')}
              </Button>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newUsername">{t('forgotUsername.newUsername')}</Label>
                <Input
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmUsername">{t('forgotUsername.confirmUsername')}</Label>
                <Input
                  id="confirmUsername"
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                />
              </div>
              <Button
                onClick={handleReset}
                disabled={loading || newUsername.length < 3 || !confirmUsername}
              >
                {t('forgotUsername.resetButton')}
              </Button>
            </>
          )}

          <Link href="/login" className="text-center text-sm text-muted-foreground underline">
            {t('forgotUsername.backToLogin')}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
