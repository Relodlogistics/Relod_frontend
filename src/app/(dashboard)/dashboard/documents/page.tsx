'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { DocumentUploadField } from '@/components/DocumentUploadField';
import { VEHICLE_DOCUMENTS, DRIVER_DOCUMENTS } from '@/lib/document-types';

interface VehicleStatus {
  id: string;
  registrationNumber: string;
  verificationStatus: string;
}

function tierBadgeVariant(tier: string): 'default' | 'outline' | 'secondary' {
  if (tier === 'trust_boosted') return 'default';
  if (tier === 'verified') return 'secondary';
  return 'outline';
}

const TIER_LABEL_KEY: Record<string, string> = {
  basic: 'status.tierBasic',
  verified: 'status.tierVerified',
  trust_boosted: 'status.tierTrustBoosted',
};

export default function DocumentsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();
  const [vehicles, setVehicles] = useState<VehicleStatus[]>([]);
  const [tier, setTier] = useState<string>('basic');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  useEffect(() => {
    if (!session || session.userType !== 'carrier') return;
    api
      .getCarrierVerificationStatus(session.accountId)
      .then((res) => {
        setVehicles(res.vehicles);
        setTier(res.verificationTier);
      })
      .catch(() => undefined);
  }, [session]);

  if (!session) return null;

  if (session.userType === 'shipper') {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <h1 className="font-heading text-xl font-semibold">{t('documentsPage.title')}</h1>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">{t('documentsPage.shipperSubtitle')}</p>
            <p className="text-sm text-muted-foreground">{t('documentsPage.shipperEmpty')}</p>
            <Link href="/dashboard/settings">
              <Button variant="outline">{t('documentsPage.goToSettings')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">{t('documentsPage.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('documentsPage.carrierSubtitle')}</p>
        </div>
        <Badge variant={tierBadgeVariant(tier)}>{t(TIER_LABEL_KEY[tier] ?? tier)}</Badge>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">{t('documentsPage.noVehicles')}</p>
            <Link href="/register/vehicle">
              <Button variant="outline">{t('documentsPage.addVehicle')}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((v) => {
            const isOpen = expanded === v.id;
            return (
              <Card key={v.id}>
                <CardContent className="py-4">
                  <button
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setExpanded(isOpen ? null : v.id)}
                  >
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{v.registrationNumber}</p>
                      <Badge variant={v.verificationStatus === 'approved' ? 'default' : 'outline'}>
                        {v.verificationStatus}
                      </Badge>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[...VEHICLE_DOCUMENTS, ...DRIVER_DOCUMENTS].map((doc) => (
                        <DocumentUploadField
                          key={doc.docType}
                          docType={doc.docType}
                          labelKey={doc.labelKey}
                          accept={doc.accept}
                          token={session.accessToken}
                          vehicleId={v.id}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
