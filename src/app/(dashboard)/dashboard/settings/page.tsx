'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  UserCircle,
  ShieldCheck,
  Landmark,
  Truck,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, Carrier, Shipper } from '@/lib/api';
import { useSession } from '@/lib/session-context';

// The hub: an account-status summary plus links into each grouped
// sub-section (Profile / Identity & KYC / Bank & Payouts / My Vehicles) —
// replaces what used to be one long page with every field on it.
function SettingsLink({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 border-t px-4 py-3.5 first:border-t-0 hover:bg-accent/40">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <Icon className="size-4.5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, clearSession } = useSession();

  const [profile, setProfile] = useState<Carrier | Shipper | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = session.userType === 'carrier' ? api.getCarrierProfile : api.getShipperProfile;
    load(session.accessToken, session.accountId).then(setProfile);
  }, [session]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  if (!session) return null;

  const isCarrier = session.userType === 'carrier';
  const carrier = isCarrier ? (profile as Carrier | null) : null;
  const shipper = !isCarrier ? (profile as Shipper | null) : null;
  const businessName = carrier?.businessName ?? shipper?.businessName;

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
              {profile
                ? new Date(profile.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>

          {carrier && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('settingsPage.verificationTier')}</span>
                <Badge variant={carrier.verificationTier === 'basic' ? 'secondary' : 'default'}>
                  {t(`settingsPage.tier_${carrier.verificationTier}`)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {carrier.aadhaarNumber ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{t('settingsPage.checklistAadhaar')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {carrier.panNumber ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{t('settingsPage.checklistPan')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('settingsPage.driverArrangement')}</span>
                <span>
                  {carrier.isOwnerOperator
                    ? t('settingsPage.ownerOperator')
                    : t('settingsPage.fleetOwner', { count: carrier.truckCount ?? 0 })}
                </span>
              </div>
            </>
          )}

          {shipper && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('settingsPage.verificationTier')}</span>
              <Badge variant={shipper.isVerified ? 'default' : 'secondary'}>
                {shipper.isVerified ? t('settingsPage.verified') : t('settingsPage.notVerified')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardContent className="flex flex-col px-0 py-0">
          <SettingsLink
            href="/dashboard/settings/profile"
            icon={UserCircle}
            label={t('settingsPage.navProfile')}
            hint={t('settingsPage.navProfileHint')}
          />
          <SettingsLink
            href="/dashboard/settings/identity"
            icon={ShieldCheck}
            label={t('settingsPage.navIdentity')}
            hint={businessName || t('settingsPage.navIdentityHint')}
          />
          {isCarrier && (
            <SettingsLink
              href="/dashboard/settings/bank"
              icon={Landmark}
              label={t('settingsPage.navBank')}
              hint={
                carrier?.payoutBankVerifiedAt
                  ? t('settingsPage.navBankVerifiedHint')
                  : t('settingsPage.navBankHint')
              }
            />
          )}
          {isCarrier && (
            <SettingsLink
              href="/dashboard/settings/vehicles"
              icon={Truck}
              label={t('settingsPage.navVehicles')}
              hint={t('settingsPage.navVehiclesHint')}
            />
          )}
          <SettingsLink
            href="/dashboard/settings/change-phone"
            icon={Phone}
            label={t('changePhone.changeButton')}
            hint={session.phone}
          />
        </CardContent>
      </Card>

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
