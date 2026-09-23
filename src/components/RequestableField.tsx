'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { ChangeRequest } from '@/lib/api';

// A profile field the account holder can't edit directly — Aadhaar/PAN/GSTIN
// feed verification tier and matching trust, so instead of a plain Input
// this shows the current value plus a "Request change" control that files a
// ChangeRequest for admin review (see change-requests.service.ts on the
// backend). Shared across the Identity and Vehicles settings pages.
export function RequestableField({
  t,
  label,
  currentValue,
  pendingRequest,
  isOpen,
  onOpen,
  onCancel,
  value,
  onValueChange,
  reason,
  onReasonChange,
  onSubmit,
  submitting,
  error,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  label: string;
  currentValue: string | null;
  pendingRequest: ChangeRequest | undefined;
  isOpen: boolean;
  onOpen: () => void;
  onCancel: () => void;
  value: string;
  onValueChange: (v: string) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{currentValue || t('settingsPage.notSet')}</p>
        </div>
        {pendingRequest ? (
          <Badge variant="outline">{t('settingsPage.requestPending')}</Badge>
        ) : (
          !isOpen && (
            <Button variant="outline" size="sm" onClick={onOpen}>
              {t('settingsPage.requestChange')}
            </Button>
          )
        )}
      </div>

      {isOpen && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('settingsPage.newValue')}</Label>
            <Input value={value} onChange={(e) => onValueChange(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('settingsPage.requestReason')}</Label>
            <Textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={t('settingsPage.requestReasonPlaceholder')}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={submitting || !value || reason.length < 5}
            >
              {t('settingsPage.submitRequest')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              {t('settingsPage.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
