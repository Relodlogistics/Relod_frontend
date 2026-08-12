'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api';

const EXPIRY_BEARING = ['insurance', 'fitness', 'puc', 'permit'];

interface Props {
  docType: string;
  labelKey: string;
  token: string;
  vehicleId: string;
  accept?: string;
  required?: boolean;
  // True when this doc was already uploaded in a prior session (e.g. after a
  // refresh) — skips straight to the "uploaded" state instead of showing the
  // file picker again.
  alreadyUploaded?: boolean;
  onUploaded?: () => void;
}

type Status = 'idle' | 'uploading' | 'uploaded' | 'error';

export function DocumentUploadField({
  docType,
  labelKey,
  token,
  vehicleId,
  accept,
  required,
  alreadyUploaded,
  onUploaded,
}: Props) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<Status>(alreadyUploaded ? 'uploaded' : 'idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const needsExpiry = EXPIRY_BEARING.includes(docType);

  useEffect(() => {
    if (alreadyUploaded) onUploaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg(null);
    try {
      await api.uploadVehicleDocument(token, vehicleId, docType, file, expiryDate || undefined);
      setStatus('uploaded');
      onUploaded?.();
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof ApiError ? e.message : t('vehicle.uploadFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label>
          {t(labelKey)}
          {required && status !== 'uploaded' && <span className="text-destructive"> *</span>}
        </Label>
        {status === 'uploaded' && <Badge>{t('vehicle.uploaded')}</Badge>}
      </div>

      {status !== 'uploaded' && (
        <>
          <Input
            type="file"
            accept={accept}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setStatus('idle');
            }}
          />
          {needsExpiry && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{t('vehicle.expiryDate')}</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          )}
          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          <Button
            size="sm"
            variant={status === 'error' ? 'destructive' : 'outline'}
            disabled={!file || status === 'uploading'}
            onClick={handleUpload}
          >
            {status === 'error' ? t('vehicle.retry') : t('vehicle.upload')}
          </Button>
        </>
      )}
    </div>
  );
}
