'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  api,
  ApiError,
  UserReverificationRequest,
  ChangeableFieldName,
} from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { reverificationFieldLabel } from '@/lib/reverification-field-labels';

const EXPIRY_BEARING_DOCS = new Set(['insurance', 'fitness', 'puc', 'permit']);

const CARRIER_DIRECT_EDIT_FIELDS = new Set(['fullName', 'email']);
const SHIPPER_DIRECT_EDIT_FIELDS = new Set([
  'fullName',
  'email',
  'businessName',
  'businessType',
  'gstin',
  'businessAddress',
  'paymentUpiId',
  'industryType',
  'shipmentVolume',
]);

type Kind = 'phone' | 'directEdit' | 'changeRequest' | 'vehicleDoc';

function classify(
  userType: 'carrier' | 'shipper',
  fieldName: string,
  hasVehicleId: boolean,
): Kind {
  if (fieldName === 'phone') return 'phone';
  if (hasVehicleId) {
    if (['registrationNumber', 'truckType', 'capacityTons'].includes(fieldName)) {
      return 'changeRequest';
    }
    return 'vehicleDoc';
  }
  const directEditFields =
    userType === 'carrier' ? CARRIER_DIRECT_EDIT_FIELDS : SHIPPER_DIRECT_EDIT_FIELDS;
  return directEditFields.has(fieldName) ? 'directEdit' : 'changeRequest';
}

// The screen a user lands on from the reverification popup's "Fix this"
// button — shows only the ONE field an admin asked to be reverified, using
// whichever mechanism that field already uses elsewhere in the app (direct
// profile edit, a change request for admin review, a vehicle document
// upload, or — for phone — a link into the dedicated change-phone flow).
// No new verification logic here; this just routes to the existing one.
export default function ReverifyFieldPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();

  const [request, setRequest] = useState<UserReverificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [changeRequestSubmitted, setChangeRequestSubmitted] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(null);
    api
      .getMyReverification(session.accessToken, params.id)
      .then(setRequest)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  }, [session, params.id, t]);

  if (!session) return null;
  if (loading) return <p className="text-sm text-muted-foreground">{t('walletPage.loading')}</p>;
  if (error || !request) {
    return <p className="text-sm text-destructive">{error ?? t('errors.generic')}</p>;
  }

  const kind = classify(session.userType, request.fieldName, !!request.vehicleId);
  const fieldLabel = reverificationFieldLabel(t, request.fieldName);

  const submitDirectEdit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (session.userType === 'carrier') {
        await api.updateCarrierProfile(session.accessToken, session.accountId, {
          [request.fieldName]: value,
        });
      } else {
        await api.updateShipperProfile(session.accessToken, session.accountId, {
          [request.fieldName]: value,
        });
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitChangeRequest = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createChangeRequest(session.accessToken, {
        fieldName: request.fieldName as ChangeableFieldName,
        vehicleId: request.vehicleId ?? undefined,
        requestedValue: value,
        reason: reason || t('reverifyPage.defaultReason', { field: fieldLabel }),
      });
      setChangeRequestSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitVehicleDoc = async () => {
    if (!file || !request.vehicleId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.uploadVehicleDocument(
        session.accessToken,
        request.vehicleId,
        request.fieldName,
        file,
        EXPIRY_BEARING_DOCS.has(request.fieldName) ? expiryDate || undefined : undefined,
      );
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('reverifyPage.backToDashboard')}
      </button>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('reverifyPage.title', { field: fieldLabel })}</CardTitle>
          {request.reason && <CardDescription>{request.reason}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {done && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="font-medium">{t('reverifyPage.doneTitle')}</p>
              <Button onClick={() => router.push('/dashboard')}>{t('reverifyPage.backToDashboard')}</Button>
            </div>
          )}

          {!done && changeRequestSubmitted && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-emerald-600" />
              <p className="font-medium">{t('reverifyPage.changeRequestSubmittedTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('reverifyPage.changeRequestSubmittedBody')}</p>
              <Button onClick={() => router.push('/dashboard')}>{t('reverifyPage.backToDashboard')}</Button>
            </div>
          )}

          {!done && !changeRequestSubmitted && kind === 'phone' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t('reverifyPage.phoneExplanation')}</p>
              <Button onClick={() => router.push('/dashboard/settings/change-phone')}>
                {t('reverifyPage.goToChangePhone')}
              </Button>
            </div>
          )}

          {!done && !changeRequestSubmitted && kind === 'directEdit' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="value">{fieldLabel}</Label>
                <Input id="value" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <Button onClick={submitDirectEdit} disabled={submitting || !value.trim()}>
                {t('reverifyPage.submit')}
              </Button>
            </>
          )}

          {!done && !changeRequestSubmitted && kind === 'changeRequest' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="value">{t('settingsPage.newValue')}</Label>
                <Input id="value" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">{t('settingsPage.requestReason')}</Label>
                <Textarea
                  id="reason"
                  rows={2}
                  placeholder={t('settingsPage.requestReasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button onClick={submitChangeRequest} disabled={submitting || !value.trim()}>
                {t('settingsPage.submitRequest')}
              </Button>
            </>
          )}

          {!done && !changeRequestSubmitted && kind === 'vehicleDoc' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="file">{fieldLabel}</Label>
                <Input
                  id="file"
                  type="file"
                  accept={request.fieldName === 'walkaround_video' ? 'video/*' : 'image/*,.pdf'}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {EXPIRY_BEARING_DOCS.has(request.fieldName) && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expiry">{t('vehicle.expiryDate')}</Label>
                  <Input
                    id="expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              )}
              <Button onClick={submitVehicleDoc} disabled={submitting || !file}>
                {t('reverifyPage.submit')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
