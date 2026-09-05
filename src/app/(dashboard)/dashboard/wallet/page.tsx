'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api, ApiError, WalletTransaction, WalletTopupRequest, WalletTopupMethod } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { useWalletBalance, refreshWalletBalance, balanceColorClass } from '@/lib/wallet-store';
import { formatMoney } from '@/lib/utils';

// Real values come from env once set on Vercel. Until then, these are
// OBVIOUSLY-placeholder strings (all X's — never plausible-looking digits)
// so the page reads as complete during testing without any risk of someone
// mistaking them for a real account and wiring money to it. Swap the env
// vars in, and these fallbacks stop being used automatically.
const BANK_NAME = process.env.NEXT_PUBLIC_RELOD_BANK_ACCOUNT_NAME ?? 'Relod Logistics Pvt Ltd';
const BANK_ACCOUNT_NUMBER = process.env.NEXT_PUBLIC_RELOD_BANK_ACCOUNT_NUMBER ?? 'XXXXXXXXXXXX';
const BANK_IFSC = process.env.NEXT_PUBLIC_RELOD_BANK_IFSC ?? 'XXXX0XXXXXX';

const TOPUP_METHODS: WalletTopupMethod[] = ['upi', 'netbanking', 'neft', 'rtgs', 'imps'];

function topupStatusVariant(status: WalletTopupRequest['status']) {
  if (status === 'credited') return 'secondary' as const;
  if (status === 'rejected' || status === 'failed') return 'destructive' as const;
  return 'outline' as const;
}

export default function WalletPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const balance = useWalletBalance(session?.accessToken);

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [topups, setTopups] = useState<WalletTopupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WalletTopupMethod>('upi');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = () => {
    if (!session) return;
    setLoading(true);
    // Refresh explicitly (not just relying on the shared store's
    // once-per-token fetch) so re-visiting this page always shows the
    // latest balance, e.g. after a booking debited it elsewhere.
    refreshWalletBalance(session.accessToken);
    Promise.all([
      api.listMyWalletTransactions(session.accessToken),
      api.listMyTopups(session.accessToken),
    ])
      .then(([tx, tr]) => {
        setTransactions(tx);
        setTopups(tr);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [session]);

  const submitTopup = async () => {
    if (!session) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(false);
    try {
      const request = await api.createManualTopup(session.accessToken, amount, method, utr);
      setTopups((prev) => [request, ...prev]);
      setAmount('');
      setUtr('');
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('walletPage.title')}</h1>

      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">{t('walletPage.balance')}</p>
          <p
            className={`font-heading text-2xl font-bold ${balance === null ? '' : balanceColorClass(Number(balance))}`}
          >
            {balance === null ? '—' : formatMoney(Number(balance))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('walletPage.rechargeTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('walletPage.rechargeSubtitle')}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{t('walletPage.bankDetailsTitle')}</p>
            <div className="text-sm text-muted-foreground">
              <p>
                {t('walletPage.bankAccountName')}: {BANK_NAME}
              </p>
              <p>
                {t('walletPage.bankAccountNumber')}: {BANK_ACCOUNT_NUMBER}
              </p>
              <p>
                {t('walletPage.bankIfsc')}: {BANK_IFSC}
              </p>
            </div>
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          {submitted && <p className="text-sm text-emerald-600">{t('walletPage.requestSubmitted')}</p>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topupAmount">{t('walletPage.amount')}</Label>
              <Input
                id="topupAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topupMethod">{t('walletPage.method')}</Label>
              <Select value={method} onValueChange={(v) => v && setMethod(v as WalletTopupMethod)}>
                <SelectTrigger id="topupMethod">{t(`walletPage.method_${method}`)}</SelectTrigger>
                <SelectContent>
                  {TOPUP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`walletPage.method_${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topupUtr">{t('walletPage.utr')}</Label>
              <Input id="topupUtr" value={utr} onChange={(e) => setUtr(e.target.value)} />
            </div>
          </div>
          <Button
            className="w-fit"
            disabled={submitting || !amount || !utr}
            onClick={submitTopup}
          >
            {t('walletPage.submitRequest')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('walletPage.myRequestsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('walletPage.loading')}</p>
          ) : topups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('walletPage.noRequests')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t('walletPage.colDate')}</th>
                    <th className="py-2 pr-3 font-medium">{t('walletPage.colAmount')}</th>
                    <th className="py-2 pr-3 font-medium">{t('walletPage.colMethod')}</th>
                    <th className="py-2 pr-3 font-medium">{t('walletPage.colUtr')}</th>
                    <th className="py-2 font-medium">{t('walletPage.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topups.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 pr-3">{formatMoney(Number(r.amount))}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {r.method ? t(`walletPage.method_${r.method}`) : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.utr ?? '—'}</td>
                      <td className="py-2.5">
                        <Badge variant={topupStatusVariant(r.status)}>
                          {t(`walletPage.topupStatus_${r.status}`)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('walletPage.transactionsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('walletPage.loading')}</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('walletPage.noTransactions')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t('walletPage.colDate')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.tableStatus')}</th>
                    <th className="py-2 font-medium">{t('walletPage.colAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const positive = Number(tx.amount) >= 0;
                    return (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-accent/40">
                        <td className="py-2.5 pr-3 text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 pr-3">{t(`walletPage.type_${tx.type}`)}</td>
                        <td className={`py-2.5 ${positive ? 'text-emerald-600' : 'text-foreground'}`}>
                          {positive ? '+' : ''}
                          {formatMoney(Number(tx.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
