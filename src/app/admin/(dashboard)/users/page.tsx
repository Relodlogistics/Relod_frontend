'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api, ApiError, AdminUser, AdminUserListItem } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { timeAgo } from '@/lib/utils';

const ROLES: AdminUser['role'][] = ['ceo', 'cto', 'cmo', 'coo', 'cfo', 'ops', 'support', 'super_admin'];

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminUser['role']>('support');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    api
      .adminListAdminUsers(adminSession.accessToken)
      .then(setUsers)
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, t]);

  const handleRoleChange = async (id: string, newRole: AdminUser['role']) => {
    if (!adminSession) return;
    setBusyId(id);
    try {
      await api.adminUpdateAdminUser(adminSession.accessToken, id, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    if (!adminSession) return;
    setBusyId(id);
    try {
      await api.adminUpdateAdminUser(adminSession.accessToken, id, { isActive: !isActive });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !isActive } : u)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!adminSession || resetPassword.length < 8) return;
    setBusyId(id);
    setResetError(null);
    try {
      await api.adminResetAdminPassword(adminSession.accessToken, id, resetPassword);
      setResettingId(null);
      setResetPassword('');
    } catch (e) {
      setResetError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    if (!adminSession) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.adminCreateAdminUser(adminSession.accessToken, { name, email, password, role });
      setUsers((prev) => [created, ...prev]);
      setName('');
      setEmail('');
      setPassword('');
      setRole('support');
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">{t('admin.navAdminUsers')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.usersSubtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? t('admin.cancel') : t('admin.addAdmin')}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.addAdmin')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAdminName">{t('admin.colName')}</Label>
                <Input id="newAdminName" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAdminEmail">{t('admin.colEmail')}</Label>
                <Input id="newAdminEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="newAdminPassword">{t('admin.password')}</Label>
                <Input
                  id="newAdminPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('admin.colRole')}</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v as AdminUser['role'])}>
                  <SelectTrigger>{t(`admin.role_${role}`)}</SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`admin.role_${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              className="w-fit"
              disabled={creating || !name || !email || password.length < 8}
              onClick={handleCreate}
            >
              {t('admin.createAdmin')}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colName')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colEmail')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colRole')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colLastLogin')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {users.map((u) => {
                  const isSelf = u.id === adminSession?.admin.id;
                  return (
                    <tr key={u.id} className="border-b last:border-b-0 hover:bg-accent/40">
                      <td className="py-3 pr-3 font-medium">
                        {u.name}
                        {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">{t('admin.you')}</span>}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-3">
                        <Select value={u.role} onValueChange={(v) => v && handleRoleChange(u.id, v as AdminUser['role'])}>
                          <SelectTrigger className="h-7 w-36 text-xs" disabled={busyId === u.id}>
                            {t(`admin.role_${u.role}`)}
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {t(`admin.role_${r}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={u.isActive ? 'outline' : 'destructive'}>
                          {u.isActive ? t('admin.active') : t('admin.deactivated')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {u.lastLoginAt ? timeAgo(u.lastLoginAt) : t('admin.never')}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setResettingId(resettingId === u.id ? null : u.id);
                              setResetPassword('');
                              setResetError(null);
                            }}
                          >
                            {t('admin.resetPassword')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === u.id || isSelf}
                            title={isSelf ? t('admin.cannotDeactivateSelf') : undefined}
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                          >
                            {u.isActive ? t('admin.deactivate') : t('admin.activate')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.map((u) =>
                  resettingId === u.id ? (
                    <tr key={`${u.id}-reset`} className="border-b bg-muted/30 last:border-b-0">
                      <td colSpan={6} className="py-3">
                        <div className="flex items-center gap-2 px-1">
                          <p className="text-sm text-muted-foreground">
                            {t('admin.resetPasswordFor', { name: u.name })}
                          </p>
                          <Input
                            type="password"
                            className="h-8 w-48"
                            placeholder={t('admin.newPasswordPlaceholder')}
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                          />
                          <Button
                            size="sm"
                            disabled={busyId === u.id || resetPassword.length < 8}
                            onClick={() => handleResetPassword(u.id)}
                          >
                            {t('admin.save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setResettingId(null);
                              setResetPassword('');
                            }}
                          >
                            {t('settingsPage.cancel')}
                          </Button>
                          {resetError && <p className="text-sm text-destructive">{resetError}</p>}
                        </div>
                      </td>
                    </tr>
                  ) : null,
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
