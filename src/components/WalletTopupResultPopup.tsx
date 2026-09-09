'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, WalletTopupRequest } from '@/lib/api';
import { useSession } from '@/lib/session-context';

// Shown once, centered, the next time a shipper logs in after their wallet
// top-up gets credited or rejected — same treatment as
// ChangeRequestResultPopup, and for the same reason: this shouldn't be
// possible to miss the way a dismissable toast could be. Closing it is what
// marks it seen server-side, so it won't come back next login.
export function WalletTopupResultPopup() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [results, setResults] = useState<WalletTopupRequest[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!session || session.userType !== 'shipper') return;
    api
      .listUnseenResolvedWalletTopups(session.accessToken)
      .then(setResults)
      .catch(() => undefined);
  }, [session]);

  const handleClose = () => {
    if (!session) return;
    setDismissed(true);
    api.markResolvedWalletTopupsSeen(session.accessToken).catch(() => undefined);
  };

  if (!session || dismissed || results.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">{t('walletTopupPopup.title')}</h2>
          <button
            onClick={handleClose}
            aria-label={t('walletTopupPopup.close')}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {results.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">₹{r.amount}</span>
                <Badge variant={r.status === 'credited' ? 'default' : 'destructive'}>
                  {r.status === 'credited' ? t('walletTopupPopup.credited') : t('walletTopupPopup.rejected')}
                </Badge>
              </div>
              {r.status === 'rejected' && r.rejectionReason && (
                <p className="text-muted-foreground">
                  {t('walletTopupPopup.reason')}: {r.rejectionReason}
                </p>
              )}
            </div>
          ))}
        </div>

        <Button onClick={handleClose} className="w-fit self-end">
          {t('walletTopupPopup.close')}
        </Button>
      </div>
    </div>
  );
}
