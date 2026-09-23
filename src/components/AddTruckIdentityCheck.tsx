'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError } from '@/lib/api';

type Step = 'phone' | 'aadhaar';

// Gate shown before a logged-in carrier can add a truck outside the
// continuous post-signup flow (see register/add-trucks for when this
// applies) — re-proves it's really them via a fresh phone OTP, then a fresh
// Aadhaar OTP sent to the number already on file. Neither step re-collects
// data, just re-confirms it.
export function AddTruckIdentityCheck({
  token,
  onVerified,
}: {
  token: string;
  onVerified: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [aadhaarReferenceId, setAadhaarReferenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const sendPhoneOtp = async () => {
    setError(null);
    setSending(true);
    try {
      const res = await api.sendAddTruckIdentityCheckOtp(token);
      setDevCode(res.devCode ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSending(false);
    }
  };

  const sendAadhaarOtp = async () => {
    setError(null);
    setSending(true);
    try {
      const res = await api.sendAddTruckAadhaarCheckOtp(token);
      setAadhaarReferenceId(res.referenceId);
      setDevCode(res.devCode ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSending(false);
    }
  };

  // Guards against React StrictMode's double-invoke in dev, which would
  // otherwise fire two send-otp requests and leave the displayed dev code
  // out of sync with whichever OTP record is actually most recent.
  const sentInitialOtp = useRef(false);
  useEffect(() => {
    if (sentInitialOtp.current) return;
    sentInitialOtp.current = true;
    sendPhoneOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      if (step === 'phone') {
        await api.verifyAddTruckIdentityCheckOtp(token, code);
        setCode('');
        setDevCode(null);
        setStep('aadhaar');
        await sendAadhaarOtp();
      } else {
        if (!aadhaarReferenceId) return;
        await api.verifyAddTruckAadhaarCheckOtp(token, aadhaarReferenceId, code);
        onVerified();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t('addTruckIdentityCheck.title')}</CardTitle>
          <CardDescription>
            {step === 'phone'
              ? t('addTruckIdentityCheck.phoneSubtitle')
              : t('addTruckIdentityCheck.aadhaarSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {devCode && (
            <Alert>
              <AlertDescription>{t('phone.devCode', { code: devCode })}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identityCheckCode">{t('phone.otpLabel')}</Label>
            <Input
              id="identityCheckCode"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <Button onClick={handleVerify} disabled={loading || sending || code.length < 4}>
            {t('phone.verify')}
          </Button>
          <button
            type="button"
            className="text-center text-sm text-muted-foreground underline"
            onClick={step === 'phone' ? sendPhoneOtp : sendAadhaarOtp}
            disabled={sending}
          >
            {t('phone.resend')}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
