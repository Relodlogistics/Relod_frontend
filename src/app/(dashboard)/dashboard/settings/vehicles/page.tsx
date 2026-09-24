'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, Vehicle } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { useChangeRequests } from '@/lib/use-change-requests';
import { RequestableField } from '@/components/RequestableField';
import { RecentActivityCard } from '@/components/RecentActivityCard';
import { vehicleTypeLabel } from '@/lib/truck-types';

// Per-truck registration number / truck type / capacity — each also goes
// through admin review, same ChangeRequest mechanism as the account-level
// identity fields, just scoped to one vehicleId at a time.
export default function VehiclesSettingsPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const cr = useChangeRequests(session, t);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.userType !== 'carrier') return;
    api.listMyVehicles(session.accessToken).then(setVehicles).catch(() => undefined);
  }, [session]);

  if (!session) return null;

  const fieldProps = (field: Parameters<typeof cr.pendingRequestFor>[0], vehicleId: string) => ({
    t,
    pendingRequest: cr.pendingRequestFor(field, vehicleId),
    isOpen: cr.openRequestField === field && cr.openRequestVehicleId === vehicleId,
    onOpen: () => cr.handleOpenRequest(field, vehicleId),
    onCancel: cr.handleCancelRequest,
    value: cr.requestValue,
    onValueChange: cr.setRequestValue,
    reason: cr.requestReason,
    onReasonChange: cr.setRequestReason,
    onSubmit: cr.handleSubmitRequest,
    submitting: cr.requestSubmitting,
    error:
      cr.openRequestField === field && cr.openRequestVehicleId === vehicleId ? cr.requestError : null,
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-heading text-xl font-semibold">{t('settingsPage.navVehicles')}</h1>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t('settingsPage.myTrucks')}</CardTitle>
            <Link href="/register/add-trucks">
              <Button size="sm" className="gap-1.5">
                <PlusCircle className="size-4" />
                {t('settingsPage.addTruck')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {vehicles.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('settingsPage.noTrucks')}</p>
            )}
            {vehicles.map((v, index) => {
              const isOpen = expanded === v.id;
              return (
                <div key={v.id} className="rounded-lg border p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setExpanded(isOpen ? null : v.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {t('settingsPage.truckLabel', { number: index + 1 })}
                      </p>
                      <p className="text-sm text-muted-foreground">{v.registrationNumber}</p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-3 flex flex-col gap-3 border-t pt-3">
                      <p className="text-sm text-muted-foreground">
                        {v.cargoTypes
                          .map((c) => t(`vehicle.cargoType${c.charAt(0).toUpperCase()}${c.slice(1)}`))
                          .join(', ')}
                        {v.numberOfAxles ? ` · ${t('settingsPage.axles', { count: v.numberOfAxles })}` : ''}
                      </p>
                      <RequestableField
                        label={t('settingsPage.vehicleRegNumber')}
                        currentValue={v.registrationNumber}
                        {...fieldProps('registrationNumber', v.id)}
                      />
                      <RequestableField
                        label={t('settingsPage.vehicleTruckType')}
                        currentValue={vehicleTypeLabel(v)}
                        {...fieldProps('truckType', v.id)}
                      />
                      <RequestableField
                        label={t('settingsPage.vehicleCapacity')}
                        currentValue={t('settingsPage.capacityTons', { tons: v.capacityTons })}
                        {...fieldProps('capacityTons', v.id)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <Link href="/dashboard/documents" className="w-fit">
              <Button variant="outline" size="sm">
                {t('settingsPage.manageDocuments')}
              </Button>
            </Link>
          </CardContent>
        </Card>
        <RecentActivityCard
          changeRequests={cr.changeRequests}
          registrationNumberFor={(vehicleId) =>
            vehicleId ? vehicles.find((v) => v.id === vehicleId)?.registrationNumber : undefined
          }
        />
      </div>
    </div>
  );
}
