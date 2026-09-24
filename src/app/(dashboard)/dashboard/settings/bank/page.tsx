'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Landmark, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError, Carrier } from '@/lib/api';
import { useSession } from '@/lib/session-context';

type PayoutMethod = 'bank' | 'upi';

// Where this carrier's payouts go after a delivery — a real-time check (does
// the account/UPI holder's name match this carrier's own verified identity?),
// not admin review, so it's self-serve. See CarriersService.setPayoutBank /
// setPayoutUpi for why: that's a stronger guarantee than a human eyeballing a
// request, and money-movement fields should demand it before accepting
// anything at all. A carrier can have both a bank account and a UPI ID on
// file; whichever was verified most recently is the one actually paid out to
// (currentPayoutMethod on the backend), which is what "current" below reflects.
export default function BankSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [method, setMethod] = useState<PayoutMethod>('bank');

  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!session || session.userType !== 'carrier') {
      router.replace('/dashboard/settings');
      return;
    }
    api.getCarrierProfile(session.accessToken, session.accountId).then((c) => {
      setCarrier(c);
      // Default the form to whichever route is currently active, so
      // "update" naturally edits the one actually in use.
      const upiIsCurrent =
        !!c.payoutUpiVerifiedAt &&
        (!c.payoutBankVerifiedAt || c.payoutUpiVerifiedAt > c.payoutBankVerifiedAt);
      setMethod(upiIsCurrent ? 'upi' : 'bank');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, session]);

  const currentMethod: PayoutMethod | null =
    carrier?.payoutUpiVerifiedAt &&
    (!carrier.payoutBankVerifiedAt || carrier.payoutUpiVerifiedAt > carrier.payoutBankVerifiedAt)
      ? 'upi'
      : carrier?.payoutBankVerifiedAt
        ? 'bank'
        : null;

  const handleSave = async () => {
    if (!session) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      if (method === 'bank') {
        const result = await api.setPayoutBank(session.accessToken, session.accountId, {
          accountNumber,
          ifsc: ifsc.toUpperCase(),
        });
        setCarrier((prev) => (prev ? { ...prev, ...result } : prev));
        setAccountNumber('');
        setConfirmAccountNumber('');
        setIfsc('');
      } else {
        const result = await api.setPayoutUpi(session.accessToken, session.accountId, {
          upiId,
        });
        setCarrier((prev) => (prev ? { ...prev, ...result } : prev));
        setUpiId('');
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (!session || session.userType !== 'carrier') return null;

  const canSave =
    !loading &&
    (method === 'bank'
      ? accountNumber.length >= 4 &&
        accountNumber === confirmAccountNumber &&
        ifsc.length >= 4
      : /^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(upiId));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-heading text-xl font-semibold">{t('settingsPage.navBank')}</h1>
      </div>

      {currentMethod === 'bank' && carrier?.payoutBankVerifiedAt && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <CardContent className="flex items-start gap-3 py-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                {t('bankPage.currentAccount')}
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                {t('bankPage.accountEnding', {
                  last4: carrier.payoutAccountNumber?.slice(-4) ?? '',
                })}{' '}
                · {carrier.payoutIfsc}
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                {t('bankPage.holderName', { name: carrier.payoutAccountHolderName })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentMethod === 'upi' && carrier?.payoutUpiVerifiedAt && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
          <CardContent className="flex items-start gap-3 py-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                {t('bankPage.currentUpi')}
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">{carrier.payoutUpiId}</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                {t('bankPage.holderName', { name: carrier.payoutUpiHolderName })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {method === 'bank' ? <Landmark className="size-4.5" /> : <Smartphone className="size-4.5" />}
            {currentMethod ? t('bankPage.updateTitle') : t('bankPage.addTitle')}
          </CardTitle>
          <CardDescription>{t('bankPage.hint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-3">
          <Tabs
            value={method}
            onValueChange={(v) => {
              if (!v) return;
              setMethod(v as PayoutMethod);
              setError(null);
              setSaved(false);
            }}
          >
            <TabsList>
              <TabsTrigger value="bank">{t('bankPage.methodBank')}</TabsTrigger>
              <TabsTrigger value="upi">{t('bankPage.methodUpi')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>
                {method === 'bank' ? t('bankPage.saved') : t('bankPage.savedUpi')}
              </AlertDescription>
            </Alert>
          )}

          {method === 'bank' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="accountNumber">{t('bankPage.accountNumber')}</Label>
                <Input
                  id="accountNumber"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmAccountNumber">{t('bankPage.confirmAccountNumber')}</Label>
                <Input
                  id="confirmAccountNumber"
                  inputMode="numeric"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                />
                {confirmAccountNumber.length > 0 && confirmAccountNumber !== accountNumber && (
                  <p className="text-xs text-destructive">{t('bankPage.accountMismatch')}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ifsc">{t('bankPage.ifsc')}</Label>
                <Input
                  id="ifsc"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upiId">{t('bankPage.upiId')}</Label>
              <Input
                id="upiId"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value.trim())}
                placeholder="yourname@okhdfcbank"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t('bankPage.nameMatchHint')}</p>
          <Button onClick={handleSave} disabled={!canSave} className="w-fit">
            {t('bankPage.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
