'use client';

import { useState } from 'react';
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
}

type Status = 'idle' | 'uploading' | 'uploaded' | 'error';

export function DocumentUploadField({ docType, labelKey, token, vehicleId, accept }: Props) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const needsExpiry = EXPIRY_BEARING.includes(docType);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg(null);
    try {
      await api.uploadVehicleDocument(token, vehicleId, docType, file, expiryDate || undefined);
      setStatus('uploaded');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof ApiError ? e.message : t('vehicle.uploadFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label>{t(labelKey)}</Label>
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
