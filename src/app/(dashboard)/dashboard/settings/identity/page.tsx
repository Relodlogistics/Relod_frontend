'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, Carrier, Shipper } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { useChangeRequests } from '@/lib/use-change-requests';
import { RequestableField } from '@/components/RequestableField';
import { RecentActivityCard } from '@/components/RecentActivityCard';

// Everything that feeds verification tier / matching trust and so goes
// through admin review to change — phone (its own dedicated flow), WhatsApp,
// Aadhaar/PAN (carrier) or GSTIN/PAN (shipper), and business name.
export default function IdentitySettingsPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const cr = useChangeRequests(session, t);

  const [profile, setProfile] = useState<Carrier | Shipper | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = session.userType === 'carrier' ? api.getCarrierProfile : api.getShipperProfile;
    load(session.accessToken, session.accountId).then(setProfile);
  }, [session]);

  if (!session) return null;

  const isCarrier = session.userType === 'carrier';
  const carrier = isCarrier ? (profile as Carrier | null) : null;
  const shipper = !isCarrier ? (profile as Shipper | null) : null;

  const fieldProps = (field: Parameters<typeof cr.pendingRequestFor>[0]) => ({
    t,
    pendingRequest: cr.pendingRequestFor(field),
    lastReviewed: cr.lastReviewedRequestFor(field),
    isOpen: cr.openRequestField === field,
    onOpen: () => cr.handleOpenRequest(field),
    onCancel: cr.handleCancelRequest,
    value: cr.requestValue,
    onValueChange: cr.setRequestValue,
    reason: cr.requestReason,
    onReasonChange: cr.setRequestReason,
    onSubmit: cr.handleSubmitRequest,
    submitting: cr.requestSubmitting,
    error: cr.openRequestField === field ? cr.requestError : null,
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-heading text-xl font-semibold">{t('settingsPage.navIdentity')}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('settingsPage.identityDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-t pt-3 first:border-t-0 first:pt-0">
              <div>
                <p className="text-sm font-medium">{t('changePhone.currentPhone')}</p>
                <p className="text-sm text-muted-foreground">{session.phone}</p>
              </div>
              <Link href="/dashboard/settings/change-phone">
                <Button variant="outline" size="sm">
                  {t('changePhone.changeButton')}
                </Button>
              </Link>
            </div>
            <RequestableField
              label={t('profile.whatsappNumber')}
              currentValue={profile?.whatsappNumber ?? null}
              {...fieldProps('whatsappNumber')}
            />
            {carrier ? (
              <>
                <RequestableField
                  label={t('settingsPage.checklistAadhaar')}
                  currentValue={carrier.aadhaarNumber}
                  {...fieldProps('aadhaarNumber')}
                />
                <RequestableField
                  label={t('profile.panNumber')}
                  currentValue={carrier.panNumber}
                  {...fieldProps('panNumber')}
                />
                <RequestableField
                  label={t('profile.carrierBusinessName')}
                  currentValue={carrier.businessName}
                  {...fieldProps('businessName')}
                />
                {carrier.businessName && (
                  <p
                    className={
                      carrier.businessVerifiedAt
                        ? 'text-xs font-medium text-emerald-600'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    {carrier.businessVerifiedAt
                      ? `✓ ${t('settingsPage.businessVerified')}`
                      : t('settingsPage.businessUnverified')}
                  </p>
                )}
                <RequestableField
                  label={t('profile.gstin')}
                  currentValue={carrier.gstin}
                  {...fieldProps('gstin')}
                />
                <RequestableField
                  label={t('profile.businessPan')}
                  currentValue={carrier.businessPan}
                  {...fieldProps('businessPan')}
                />
              </>
            ) : (
              shipper && (
                <>
                  <RequestableField
                    label={t('profile.gstin')}
                    currentValue={shipper.gstin}
                    {...fieldProps('gstin')}
                  />
                  <RequestableField
                    label={t('profile.panNumber')}
                    currentValue={shipper.panNumber}
                    {...fieldProps('panNumber')}
                  />
                </>
              )
            )}
          </CardContent>
        </Card>
        <RecentActivityCard changeRequests={cr.changeRequests} />
      </div>
    </div>
  );
}
