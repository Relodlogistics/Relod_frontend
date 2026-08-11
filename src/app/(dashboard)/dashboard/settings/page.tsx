'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, ApiError, ChangeRequest, Vehicle } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { truckTypeLabel } from '@/lib/truck-types';

type ChangeableFieldName = ChangeRequest['fieldName'];

// A profile field the account holder can't edit directly — Aadhaar/PAN/GSTIN
// feed verification tier and matching trust, so instead of a plain Input
// this shows the current value plus a "Request change" control that files a
// ChangeRequest for admin review (see change-requests.service.ts on the
// backend). Reused for both roles since the same UI applies to each field.
function RequestableField({
  t,
  label,
  currentValue,
  pendingRequest,
  lastReviewed,
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
  lastReviewed: ChangeRequest | undefined;
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
      <div className="flex items-center justify-between">
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

      {!pendingRequest && lastReviewed?.status === 'rejected' && (
        <p className="text-xs text-destructive">
          {t('settingsPage.requestRejected')}
          {lastReviewed.adminNote ? `: ${lastReviewed.adminNote}` : ''}
        </p>
      )}

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

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, clearSession } = useSession();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('proprietorship');
  const [gstin, setGstin] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [paymentUpiId, setPaymentUpiId] = useState('');
  const [industryType, setIndustryType] = useState('');
  const [shipmentVolume, setShipmentVolume] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [verificationTier, setVerificationTier] = useState<
    'basic' | 'verified' | 'trust_boosted' | null
  >(null);
  const [isShipperVerified, setIsShipperVerified] = useState(false);
  const [shipperPanNumber, setShipperPanNumber] = useState<string | null>(null);
  const [carrierPanNumber, setCarrierPanNumber] = useState<string | null>(null);
  const [carrierAadhaarNumber, setCarrierAadhaarNumber] = useState<string | null>(null);

  // Read-only registration-time details — shown so a user can see everything
  // that was collected at signup, not editable here (isOwnerOperator/
  // truckCount/vehicle specs are structural: changing them after vehicles
  // already exist needs the Documents/Post-a-truck flows, not a plain edit).
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [isOwnerOperator, setIsOwnerOperator] = useState(true);
  const [truckCount, setTruckCount] = useState<number | null>(null);
  const [wantsReturnLoads, setWantsReturnLoads] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [openRequestField, setOpenRequestField] = useState<ChangeableFieldName | null>(null);
  const [requestValue, setRequestValue] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = session.userType === 'carrier' ? api.getCarrierProfile : api.getShipperProfile;
    load(session.accessToken, session.accountId).then((profile) => {
      setFullName(profile.fullName);
      setEmail(profile.email ?? '');
      setPreferredLanguage(profile.preferredLanguage);
      setCreatedAt(profile.createdAt);
      setWhatsappNumber(profile.whatsappNumber);
      if ('businessName' in profile) {
        setBusinessName(profile.businessName ?? '');
        setBusinessType(profile.businessType ?? 'proprietorship');
        setGstin(profile.gstin ?? '');
        setBusinessAddress(profile.businessAddress ?? '');
        setPaymentUpiId(profile.paymentUpiId ?? '');
        setIndustryType(profile.industryType ?? '');
        setShipmentVolume(profile.shipmentVolume ?? '');
        setIsShipperVerified(profile.isVerified);
        setShipperPanNumber(profile.panNumber);
      } else {
        setVerificationTier(profile.verificationTier);
        setCarrierPanNumber(profile.panNumber);
        setCarrierAadhaarNumber(profile.aadhaarNumber);
        setIsOwnerOperator(profile.isOwnerOperator);
        setTruckCount(profile.truckCount);
        setWantsReturnLoads(profile.wantsReturnLoads);
      }
    });
    api.listMyChangeRequests(session.accessToken).then(setChangeRequests).catch(() => undefined);
    if (session.userType === 'carrier') {
      api.listMyVehicles(session.accessToken).then(setVehicles).catch(() => undefined);
    }
  }, [session]);

  const pendingRequestFor = (field: ChangeableFieldName) =>
    changeRequests.find((r) => r.fieldName === field && r.status === 'pending');

  const lastReviewedRequestFor = (field: ChangeableFieldName) =>
    changeRequests.find((r) => r.fieldName === field && r.status !== 'pending');

  const handleOpenRequest = (field: ChangeableFieldName) => {
    setOpenRequestField(field);
    setRequestValue('');
    setRequestReason('');
    setRequestError(null);
  };

  const handleSubmitRequest = async () => {
    if (!session || !openRequestField) return;
    setRequestError(null);
    setRequestSubmitting(true);
    try {
      const created = await api.createChangeRequest(session.accessToken, {
        fieldName: openRequestField,
        requestedValue: requestValue,
        reason: requestReason,
      });
      setChangeRequests((prev) => [created, ...prev]);
      setOpenRequestField(null);
    } catch (e) {
      setRequestError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!session) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      if (session.userType === 'carrier') {
        await api.updateCarrierProfile(session.accessToken, session.accountId, {
          fullName,
          email: email || undefined,
          preferredLanguage,
        });
      } else {
        await api.updateShipperProfile(session.accessToken, session.accountId, {
          fullName,
          email: email || undefined,
          businessName: businessName || undefined,
          businessType,
          businessAddress: businessAddress || undefined,
          paymentUpiId: paymentUpiId || undefined,
          industryType: industryType || undefined,
          shipmentVolume: shipmentVolume || undefined,
          preferredLanguage,
        });
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('settingsPage.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.overview')}</CardTitle>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('settingsPage.memberSince')}</span>
            <span>
              {createdAt
                ? new Date(createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>

          {session.userType === 'carrier' && verificationTier && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('settingsPage.verificationTier')}</span>
                <Badge variant={verificationTier === 'basic' ? 'secondary' : 'default'}>
                  {t(`settingsPage.tier_${verificationTier}`)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {carrierAadhaarNumber ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{t('settingsPage.checklistAadhaar')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {carrierPanNumber ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{t('settingsPage.checklistPan')}</span>
              </div>
              {verificationTier === 'basic' && (
                <p className="text-xs text-muted-foreground">{t('settingsPage.tierHintToVerified')}</p>
              )}
              {verificationTier === 'verified' && (
                <p className="text-xs text-muted-foreground">{t('settingsPage.tierHintToTrustBoosted')}</p>
              )}
            </>
          )}

          {session.userType === 'shipper' && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('settingsPage.verificationTier')}</span>
                <Badge variant={isShipperVerified ? 'default' : 'secondary'}>
                  {isShipperVerified ? t('settingsPage.verified') : t('settingsPage.notVerified')}
                </Badge>
              </div>
              {!isShipperVerified && (
                <div className="flex items-center gap-2 text-sm">
                  {businessName ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>{t('profile.businessName')}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.identityDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-3">
          {session.userType === 'carrier' ? (
            <>
              <RequestableField
                t={t}
                label={t('settingsPage.checklistAadhaar')}
                currentValue={carrierAadhaarNumber}
                pendingRequest={pendingRequestFor('aadhaarNumber')}
                lastReviewed={lastReviewedRequestFor('aadhaarNumber')}
                isOpen={openRequestField === 'aadhaarNumber'}
                onOpen={() => handleOpenRequest('aadhaarNumber')}
                onCancel={() => setOpenRequestField(null)}
                value={requestValue}
                onValueChange={setRequestValue}
                reason={requestReason}
                onReasonChange={setRequestReason}
                onSubmit={handleSubmitRequest}
                submitting={requestSubmitting}
                error={openRequestField === 'aadhaarNumber' ? requestError : null}
              />
              <RequestableField
                t={t}
                label={t('profile.panNumber')}
                currentValue={carrierPanNumber}
                pendingRequest={pendingRequestFor('panNumber')}
                lastReviewed={lastReviewedRequestFor('panNumber')}
                isOpen={openRequestField === 'panNumber'}
                onOpen={() => handleOpenRequest('panNumber')}
                onCancel={() => setOpenRequestField(null)}
                value={requestValue}
                onValueChange={setRequestValue}
                reason={requestReason}
                onReasonChange={setRequestReason}
                onSubmit={handleSubmitRequest}
                submitting={requestSubmitting}
                error={openRequestField === 'panNumber' ? requestError : null}
              />
            </>
          ) : (
            <>
              <RequestableField
                t={t}
                label={t('profile.gstin')}
                currentValue={gstin || null}
                pendingRequest={pendingRequestFor('gstin')}
                lastReviewed={lastReviewedRequestFor('gstin')}
                isOpen={openRequestField === 'gstin'}
                onOpen={() => handleOpenRequest('gstin')}
                onCancel={() => setOpenRequestField(null)}
                value={requestValue}
                onValueChange={setRequestValue}
                reason={requestReason}
                onReasonChange={setRequestReason}
                onSubmit={handleSubmitRequest}
                submitting={requestSubmitting}
                error={openRequestField === 'gstin' ? requestError : null}
              />
              <RequestableField
                t={t}
                label={t('profile.panNumber')}
                currentValue={shipperPanNumber}
                pendingRequest={pendingRequestFor('panNumber')}
                lastReviewed={lastReviewedRequestFor('panNumber')}
                isOpen={openRequestField === 'panNumber'}
                onOpen={() => handleOpenRequest('panNumber')}
                onCancel={() => setOpenRequestField(null)}
                value={requestValue}
                onValueChange={setRequestValue}
                reason={requestReason}
                onReasonChange={setRequestReason}
                onSubmit={handleSubmitRequest}
                submitting={requestSubmitting}
                error={openRequestField === 'panNumber' ? requestError : null}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.profile')}</CardTitle>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>{t('settingsPage.saved')}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t('profile.fullName')}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('profile.email')}</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('verify.whatsappLanguageQuestion')}</Label>
            <p className="text-xs text-muted-foreground">{t('verify.whatsappLanguageHint')}</p>
            <Select value={preferredLanguage} onValueChange={(v) => v && setPreferredLanguage(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {session.userType === 'shipper' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.businessName')}</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.businessType')}</Label>
                <Select value={businessType} onValueChange={(v) => v && setBusinessType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietorship">{t('profile.businessTypeProprietorship')}</SelectItem>
                    <SelectItem value="partnership">{t('profile.businessTypePartnership')}</SelectItem>
                    <SelectItem value="company">{t('profile.businessTypeCompany')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.businessAddress')}</Label>
                <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.paymentUpiId')}</Label>
                <Input value={paymentUpiId} onChange={(e) => setPaymentUpiId(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.industryType')}</Label>
                <Input value={industryType} onChange={(e) => setIndustryType(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('profile.shipmentVolume')}</Label>
                <Select value={shipmentVolume} onValueChange={(v) => v && setShipmentVolume(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.shipmentVolumePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">{t('profile.shipmentVolume1to5')}</SelectItem>
                    <SelectItem value="5-10">{t('profile.shipmentVolume5to10')}</SelectItem>
                    <SelectItem value="10+">{t('profile.shipmentVolume10plus')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <p className="text-sm text-muted-foreground">{session.phone}</p>
          <Button onClick={handleSave} disabled={loading || !fullName} className="w-fit">
            {t('settingsPage.save')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settingsPage.registrationDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="flex max-w-md flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('profile.whatsappNumber')}</span>
            <span>{whatsappNumber || t('settingsPage.notSet')}</span>
          </div>
          {session.userType === 'carrier' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('settingsPage.driverArrangement')}</span>
                <span>
                  {isOwnerOperator
                    ? t('settingsPage.ownerOperator')
                    : t('settingsPage.fleetOwner', { count: truckCount ?? 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('settingsPage.wantsReturnLoads')}</span>
                <span>{wantsReturnLoads ? t('settingsPage.yes') : t('settingsPage.no')}</span>
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">{t('settingsPage.registrationDetailsHint')}</p>
        </CardContent>
      </Card>

      {session.userType === 'carrier' && vehicles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settingsPage.myTrucks')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {vehicles.map((v) => (
              <div key={v.id} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{v.registrationNumber}</span>
                  <span className="text-muted-foreground">{truckTypeLabel(v.truckType)}</span>
                </div>
                <p className="text-muted-foreground">
                  {t('settingsPage.capacityTons', { tons: v.capacityTons })}
                  {v.numberOfAxles ? ` · ${t('settingsPage.axles', { count: v.numberOfAxles })}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {v.cargoTypes.map((c) => t(`vehicle.cargoType${c.charAt(0).toUpperCase()}${c.slice(1)}`)).join(', ')}
                </p>
              </div>
            ))}
            <Link href="/dashboard/documents" className="w-fit">
              <Button variant="outline" size="sm">
                {t('settingsPage.manageDocuments')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">
        {t('settingsPage.forgotPasswordHint')}{' '}
        <Link href="/forgot-password" className="text-primary hover:underline">
          {t('settingsPage.forgotPasswordLink')}
        </Link>
      </p>

      <Button variant="destructive" onClick={handleLogout} className="w-fit">
        {t('settingsPage.logout')}
      </Button>
    </div>
  );
}
