'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, ChangeRequest } from '@/lib/api';
import { useSession } from '@/lib/session-context';

const VEHICLE_FIELD_NAMES = new Set(['registrationNumber', 'truckType', 'capacityTons']);

// Shown once, centered, the next time the user logs in after an admin
// approves or rejects one of their change requests — deliberately not a
// toast, since it shouldn't be possible to miss or have it vanish before
// they've actually read it. Closing it is what marks it seen server-side,
// so it won't come back next login.
export function ChangeRequestResultPopup() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [results, setResults] = useState<ChangeRequest[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!session) return;
    api
      .listUnseenResolvedChangeRequests(session.accessToken)
      .then(setResults)
      .catch(() => undefined);
  }, [session]);

  const handleClose = () => {
    if (!session) return;
    setDismissed(true);
    api.markResolvedChangeRequestsSeen(session.accessToken).catch(() => undefined);
  };

  if (!session || dismissed || results.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">{t('changeRequestPopup.title')}</h2>
          <button
            onClick={handleClose}
            aria-label={t('changeRequestPopup.close')}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {results.map((r) => {
            const label = t(`${VEHICLE_FIELD_NAMES.has(r.fieldName) ? 'vehicle' : 'profile'}.${r.fieldName}`);
            return (
              <div key={r.id} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{label}</span>
                  <Badge variant={r.status === 'approved' ? 'default' : 'destructive'}>
                    {r.status === 'approved' ? t('changeRequestPopup.approved') : t('changeRequestPopup.rejected')}
                  </Badge>
                </div>
                {r.status === 'approved' ? (
                  <p className="text-muted-foreground">
                    {t('changeRequestPopup.newValue')}: {r.requestedValue}
                  </p>
                ) : (
                  r.adminNote && (
                    <p className="text-muted-foreground">
                      {t('changeRequestPopup.adminNote')}: {r.adminNote}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={handleClose} className="w-fit self-end">
          {t('changeRequestPopup.close')}
        </Button>
      </div>
    </div>
  );
}
