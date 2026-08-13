'use client';

import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useRegistration } from '@/lib/registration-context';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { Logo } from '@/components/Logo';

const TIER_PROGRESS: Record<string, number> = {
  basic: 33,
  verified: 66,
  trust_boosted: 100,
};

function StatusContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { state } = useRegistration();
  const isShipper = state.userType === 'shipper';
  const carrierId =
    searchParams.get('carrierId') ?? (state.userType === 'carrier' ? state.accountId : undefined);

  const [tier, setTier] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<
    { id: string; registrationNumber: string; verificationStatus: string }[]
  >([]);

  useEffect(() => {
    if (!carrierId) return;
    api
      .getCarrierVerificationStatus(carrierId)
      .then((res) => {
        setTier(res.verificationTier);
        setVehicles(res.vehicles);
      })
      .catch(() => {
        // Carrier lookup failed (e.g. wrong id) — leave tier unset so the UI
        // doesn't show a misleading default tier badge.
      });
  }, [carrierId]);

  const tierLabelKey =
    tier === 'trust_boosted' ? 'status.tierTrustBoosted' : tier === 'verified' ? 'status.tierVerified' : 'status.tierBasic';
  const tierDescKey =
    tier === 'trust_boosted' ? 'status.trustBoostedDesc' : tier === 'verified' ? 'status.verifiedDesc' : 'status.basicDesc';

  return (
    <AuthBackground
      imageSrc="/auth/register-bg.png"
      imageAlt="A truck following a winding road toward Mumbai"
    >
      <div className="w-full max-w-md">
        <Logo variant="auth" className="mb-6 justify-center" />
        <Card>
        <CardHeader>
          <CardTitle>{t('status.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isShipper ? (
            <p className="text-sm text-muted-foreground">{t('status.shipperComplete')}</p>
          ) : carrierId && tier ? (
            <>
              <div className="flex items-center gap-3">
                <Badge className="text-base px-3 py-1">{t(tierLabelKey)}</Badge>
              </div>
              <Progress value={TIER_PROGRESS[tier]} />
              <p className="text-sm text-muted-foreground">{t(tierDescKey)}</p>

              {vehicles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{t('status.vehicles')}</p>
                  {vehicles.map((v) => (
                    <div
                      key={v.id}
                      className="flex justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{v.registrationNumber}</span>
                      <Badge variant="outline">{v.verificationStatus}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('status.basicDesc')}</p>
          )}
          <Button className="mt-2">{t('status.done')}</Button>
        </CardContent>
      </Card>
      </div>
    </AuthBackground>
  );
}

export default function StatusPage() {
  return (
    <Suspense>
      <StatusContent />
    </Suspense>
  );
}
