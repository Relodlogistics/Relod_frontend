'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError, ReverificationRequest } from '@/lib/api';

// Dropped next to any admin-visible field/document row (carrier/shipper
// profile fields, vehicle document rows) to let the team ask that specific
// item be reverified. Shows the current state (none / pending / awaiting
// review) instead of the button once a request exists for this exact
// (accountId, vehicleId, fieldName) combination — the caller passes down
// whichever request (if any) already matches, from a single per-page fetch,
// so this component itself never lists anything.
export function ReverifyButton({
  token,
  accountType,
  accountId,
  vehicleId,
  fieldName,
  existingRequest,
  onCreated,
}: {
  token: string;
  accountType: 'carrier' | 'shipper';
  accountId: string;
  vehicleId?: string;
  fieldName: string;
  existingRequest: ReverificationRequest | undefined;
  onCreated: (created: ReverificationRequest) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingRequest?.status === 'pending') {
    return <Badge variant="outline">{t('admin.reverificationPending')}</Badge>;
  }
  if (existingRequest?.status === 'user_completed') {
    return <Badge variant="secondary">{t('admin.reverificationAwaitingReview')}</Badge>;
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api.adminCreateReverification(token, {
        accountType,
        accountId,
        vehicleId,
        fieldName,
        reason: reason.trim() || undefined,
      });
      onCreated(created);
      setOpen(false);
      setReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t('admin.reverify')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Textarea
        className="w-56"
        rows={2}
        placeholder={t('admin.reverifyReasonPlaceholder')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-1.5">
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          {t('admin.cancel')}
        </Button>
        <Button size="sm" disabled={busy} onClick={submit}>
          {t('admin.sendRequest')}
        </Button>
      </div>
    </div>
  );
}
