'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, ApiError, AdminCarrierListItem, Shipper } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';

export default function AdminAccountsPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [tab, setTab] = useState<'carriers' | 'shippers'>('carriers');
  const [carriers, setCarriers] = useState<AdminCarrierListItem[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    Promise.all([api.adminListCarriers(adminSession.accessToken), api.adminListShippers(adminSession.accessToken)])
      .then(([c, s]) => {
        setCarriers(c);
        setShippers(s);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, t]);

  const toggleCarrierSuspend = async (id: string, isSuspended: boolean) => {
    if (!adminSession) return;
    setBusyId(id);
    try {
      await api.adminSuspendCarrier(adminSession.accessToken, id, !isSuspended);
      setCarriers((prev) => prev.map((c) => (c.id === id ? { ...c, isSuspended: !isSuspended } : c)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleShipperSuspend = async (id: string, isSuspended: boolean) => {
    if (!adminSession) return;
    setBusyId(id);
    try {
      await api.adminSuspendShipper(adminSession.accessToken, id, !isSuspended);
      setShippers((prev) => prev.map((s) => (s.id === id ? { ...s, isSuspended: !isSuspended } : s)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navAccounts')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.accountsSubtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => v && setTab(v as 'carriers' | 'shippers')}>
        <TabsList>
          <TabsTrigger value="carriers">{t('admin.tabCarriers', { count: carriers.length })}</TabsTrigger>
          <TabsTrigger value="shippers">{t('admin.tabShippers', { count: shippers.length })}</TabsTrigger>
        </TabsList>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && tab === 'carriers' && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colName')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colPhone')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colVehicles')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colTier')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {carriers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {carriers.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-accent/40">
                    <td className="py-3 pr-3 font-medium">
                      <Link href={`/admin/accounts/carriers/${c.id}`} className="hover:underline">
                        {c.fullName}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{c.phone}</td>
                    <td className="py-3 pr-3">{c._count.vehicles}</td>
                    <td className="py-3 pr-3">
                      <Badge variant="secondary">{t(`admin.tier_${c.verificationTier}`)}</Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant={c.isSuspended ? 'destructive' : 'outline'}>
                        {c.isSuspended ? t('admin.suspended') : t('admin.active')}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === c.id}
                        onClick={() => toggleCarrierSuspend(c.id, c.isSuspended)}
                      >
                        {c.isSuspended ? t('admin.unsuspend') : t('admin.suspend')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!loading && tab === 'shippers' && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colName')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colPhone')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colBusiness')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colVerified')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {shippers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {shippers.map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0 hover:bg-accent/40">
                    <td className="py-3 pr-3 font-medium">
                      <Link href={`/admin/accounts/shippers/${s.id}`} className="hover:underline">
                        {s.fullName}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{s.phone}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{s.businessName ?? '—'}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={s.isVerified ? 'secondary' : 'outline'}>
                        {s.isVerified ? t('admin.verified') : t('admin.notVerified')}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant={s.isSuspended ? 'destructive' : 'outline'}>
                        {s.isSuspended ? t('admin.suspended') : t('admin.active')}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === s.id}
                        onClick={() => toggleShipperSuspend(s.id, s.isSuspended)}
                      >
                        {s.isSuspended ? t('admin.unsuspend') : t('admin.suspend')}
                      </Button>
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
