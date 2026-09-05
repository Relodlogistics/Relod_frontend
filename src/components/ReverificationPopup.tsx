'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, UserReverificationRequest } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { reverificationFieldLabel } from '@/lib/reverification-field-labels';

// Shown once per dashboard visit when the admin team has asked the user to
// reverify one or more specific items — never for the normal registration
// flow. Each item deep-links to /dashboard/reverify/[id], which shows only
// that one field. Dismissing the popup does NOT resolve anything server-side
// (unlike ChangeRequestResultPopup) — these stay open until the user
// actually acts, so it reappears on the next visit if ignored.
export function ReverificationPopup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const [requests, setRequests] = useState<UserReverificationRequest[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!session) return;
    api
      .listMyReverifications(session.accessToken)
      .then((rows) => setRequests(rows.filter((r) => r.status === 'pending')))
      .catch(() => undefined);
  }, [session]);

  if (!session || dismissed || requests.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">{t('reverificationPopup.title')}</h2>
          <button
            onClick={() => setDismissed(true)}
            aria-label={t('changeRequestPopup.close')}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{reverificationFieldLabel(t, r.fieldName)}</p>
                {r.vehicleRegistrationNumber && (
                  <p className="text-xs text-muted-foreground">{r.vehicleRegistrationNumber}</p>
                )}
                {r.reason && <p className="text-muted-foreground">{r.reason}</p>}
              </div>
              <Button size="sm" onClick={() => router.push(`/dashboard/reverify/${r.id}`)}>
                {t('reverificationPopup.fixThis')}
              </Button>
            </div>
          ))}
        </div>

        <Button variant="ghost" onClick={() => setDismissed(true)} className="w-fit self-end">
          {t('reverificationPopup.later')}
        </Button>
      </div>
    </div>
  );
}
