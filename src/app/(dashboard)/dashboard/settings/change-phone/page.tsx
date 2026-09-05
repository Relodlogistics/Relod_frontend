'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session-context';

type Step = 'enterDetails' | 'verifyCurrent' | 'verifyNew' | 'done';

// Multi-step, security-sensitive: a signed-in user changing their own phone
// number must prove they still hold the CURRENT phone (blocks a stolen
// access token from silently moving the account) before proving they hold
// the NEW phone (blocks a typo stranding the account on an unreachable
// number). See AuthService.requestPhoneChange for the backend flow doc.
export default function ChangePhonePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, setSession } = useSession();

  const [step, setStep] = useState<Step>('enterDetails');
  const [newPhone, setNewPhone] = useState('');
  const [reason, setReason] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [currentOtp, setCurrentOtp] = useState('');
  const [newOtp, setNewOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  const phonePattern = /^\+91[0-9]{10}$/;

  const submitRequest = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestPhoneChange(session.accessToken, newPhone, reason);
      setRequestId(res.requestId);
      setStep('verifyCurrent');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const submitCurrentOtp = async () => {
    if (!requestId) return;
    setError(null);
    setLoading(true);
    try {
      await api.verifyPhoneChangeCurrent(session.accessToken, requestId, currentOtp);
      setStep('verifyNew');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const submitNewOtp = async () => {
    if (!requestId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyPhoneChangeNew(session.accessToken, requestId, newOtp);
      setSession({ ...session, accessToken: res.accessToken, phone: res.newPhone });
      setStep('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <button
        onClick={() => router.push('/dashboard/settings')}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('settingsPage.backToSettings')}
      </button>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('changePhone.title')}</CardTitle>
          <CardDescription>
            {step === 'enterDetails' && t('changePhone.subtitleEnterDetails')}
            {step === 'verifyCurrent' &&
              t('changePhone.subtitleVerifyCurrent', { phone: session.phone })}
            {step === 'verifyNew' && t('changePhone.subtitleVerifyNew', { phone: newPhone })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'enterDetails' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentPhone">{t('changePhone.currentPhone')}</Label>
                <Input id="currentPhone" value={session.phone} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newPhone">{t('changePhone.newPhone')}</Label>
                <Input
                  id="newPhone"
                  placeholder="+91XXXXXXXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.trim())}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">{t('changePhone.reason')}</Label>
                <Textarea
                  id="reason"
                  rows={2}
                  placeholder={t('changePhone.reasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button
                onClick={submitRequest}
                disabled={
                  loading ||
                  !phonePattern.test(newPhone) ||
                  newPhone === session.phone ||
                  reason.trim().length < 5
                }
              >
                {t('changePhone.continue')}
              </Button>
            </>
          )}

          {step === 'verifyCurrent' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currentOtp">{t('phone.otpLabel')}</Label>
                <Input
                  id="currentOtp"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentOtp}
                  onChange={(e) => setCurrentOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <Button onClick={submitCurrentOtp} disabled={loading || currentOtp.length !== 6}>
                {t('phone.verify')}
              </Button>
            </>
          )}

          {step === 'verifyNew' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newOtp">{t('phone.otpLabel')}</Label>
                <Input
                  id="newOtp"
                  inputMode="numeric"
                  maxLength={6}
                  value={newOtp}
                  onChange={(e) => setNewOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <Button onClick={submitNewOtp} disabled={loading || newOtp.length !== 6}>
                {t('phone.verify')}
              </Button>
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="font-medium">{t('changePhone.successTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('changePhone.successBody', { phone: newPhone })}
              </p>
              <Button onClick={() => router.push('/dashboard/settings')}>
                {t('changePhone.done')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
