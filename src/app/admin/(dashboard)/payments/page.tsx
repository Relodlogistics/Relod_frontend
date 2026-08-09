'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api, ApiError, AdminPaymentTrackingLog } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { boardLocation, formatMoney } from '@/lib/utils';

const STATUSES: AdminPaymentTrackingLog['status'][] = [
  'awaiting_advance',
  'advance_settled',
  'awaiting_balance',
  'fully_settled',
];

function statusVariant(status: AdminPaymentTrackingLog['status']) {
  if (status === 'fully_settled') return 'secondary' as const;
  return 'outline' as const;
}

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [view, setView] = useState<'queue' | 'all'>('queue');
  const [logs, setLogs] = useState<AdminPaymentTrackingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyType, setPartyType] = useState<'all' | 'carrier' | 'shipper'>('all');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [shipperFilter, setShipperFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminPaymentTrackingLog['status']>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    const loader =
      view === 'queue'
        ? api.adminListPaymentQueue(adminSession.accessToken)
        : api.adminListPayments(adminSession.accessToken);
    loader
      .then(setLogs)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, view, t]);

  const handleViewChange = (v: 'queue' | 'all') => {
    setView(v);
    setPartyType('all');
    setCarrierFilter('all');
    setShipperFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handlePartyTypeChange = (v: 'all' | 'carrier' | 'shipper') => {
    setPartyType(v);
    setCarrierFilter('all');
    setShipperFilter('all');
  };

  const carriers = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => l.carrier && map.set(l.carrier.id, l.carrier.fullName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const shippers = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => l.shipper && map.set(l.shipper.id, l.shipper.fullName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const filteredLogs = logs.filter((l) => {
    if (carrierFilter !== 'all' && l.carrier?.id !== carrierFilter) return false;
    if (shipperFilter !== 'all' && l.shipper?.id !== shipperFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (dateFrom && new Date(l.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(l.createdAt) > new Date(`${dateTo}T23:59:59.999`)) return false;
    return true;
  });

  const hasActiveFilters =
    partyType !== 'all' ||
    carrierFilter !== 'all' ||
    shipperFilter !== 'all' ||
    statusFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const clearFilters = () => {
    setPartyType('all');
    setCarrierFilter('all');
    setShipperFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navPayments')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.paymentsSubtitle')}</p>
      </div>

      <Tabs value={view} onValueChange={(v) => v && handleViewChange(v as 'queue' | 'all')}>
        <TabsList>
          <TabsTrigger value="queue">{t('admin.tabQueue')}</TabsTrigger>
          <TabsTrigger value="all">{t('admin.tabAllPayments')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={statusFilter === 'all' ? 'secondary' : 'outline'}
          onClick={() => setStatusFilter('all')}
        >
          {t('admin.allStatuses')}
        </Button>
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'secondary' : 'outline'}
            onClick={() => setStatusFilter(s)}
          >
            {t(`admin.paymentStatus_${s}`)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={partyType === 'all' ? 'secondary' : 'outline'}
          onClick={() => handlePartyTypeChange('all')}
        >
          {t('admin.partyAll')}
        </Button>
        <Button
          size="sm"
          variant={partyType === 'carrier' ? 'secondary' : 'outline'}
          onClick={() => handlePartyTypeChange('carrier')}
        >
          {t('admin.partyCarriers')}
        </Button>
        <Button
          size="sm"
          variant={partyType === 'shipper' ? 'secondary' : 'outline'}
          onClick={() => handlePartyTypeChange('shipper')}
        >
          {t('admin.partyShippers')}
        </Button>

        {partyType === 'carrier' && (
          <Select value={carrierFilter} onValueChange={(v) => v && setCarrierFilter(v)}>
            <SelectTrigger className="w-44">
              {carrierFilter === 'all' ? t('admin.allCarriers') : (carriers.find((c) => c[0] === carrierFilter)?.[1] ?? '')}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allCarriers')}</SelectItem>
              {carriers.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {partyType === 'shipper' && (
          <Select value={shipperFilter} onValueChange={(v) => v && setShipperFilter(v)}>
            <SelectTrigger className="w-44">
              {shipperFilter === 'all' ? t('admin.allShippers') : (shippers.find((s) => s[0] === shipperFilter)?.[1] ?? '')}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allShippers')}</SelectItem>
              {shippers.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{t('admin.dateFrom')}</span>
          <Input type="date" className="w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">{t('admin.dateTo')}</span>
          <Input type="date" className="w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            {t('admin.clearFilters')}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colRoute')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colCarrier')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colShipper')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colAdvance')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colBalance')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b last:border-b-0 hover:bg-accent/40">
                    <td className="py-3 pr-3">
                      {boardLocation(log.booking.posting?.originCityLabel, log.booking.posting?.originLabel)} →{' '}
                      {boardLocation(log.booking.posting?.destinations?.[0]?.cityLabel, log.booking.posting?.destinations?.[0]?.label)}
                    </td>
                    <td className="py-3 pr-3">{log.carrier?.fullName ?? '—'}</td>
                    <td className="py-3 pr-3">{log.shipper?.fullName ?? '—'}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {log.advanceReceivedAt
                        ? formatMoney(Number(log.advanceAmount))
                        : t('admin.notReceived')}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {log.balanceReceivedAt
                        ? formatMoney(Number(log.balanceAmount))
                        : t('admin.notReceived')}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={statusVariant(log.status)}>{t(`admin.paymentStatus_${log.status}`)}</Badge>
                        {log.discrepancyFlag && <Badge variant="destructive">{t('admin.discrepancy')}</Badge>}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/payments/${log.id}`} className="text-sm text-primary hover:underline">
                        {t('admin.manage')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
