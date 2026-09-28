'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError, PlatformFeeBand } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { formatMoney } from '@/lib/utils';

function bandLabel(band: PlatformFeeBand) {
  const min = formatMoney(Number(band.minAmount));
  return band.maxAmount ? `${min} – ${formatMoney(Number(band.maxAmount))}` : `${min}+`;
}

export default function AdminFeeSettingsPage() {
  const { t } = useTranslation();
  const { adminSession } = useAdminSession();

  const [bands, setBands] = useState<PlatformFeeBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyed by band id — only the row being edited holds draft text, so typing
  // in one row never clobbers the others' saved values.
  const [drafts, setDrafts] = useState<Record<string, { baseFee: string; gainSharePercent: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    api
      .adminListFeeBands(adminSession.accessToken)
      .then((res) => {
        setBands(res);
        setDrafts(
          Object.fromEntries(
            res.map((b) => [b.id, { baseFee: b.baseFee, gainSharePercent: b.gainSharePercent }]),
          ),
        );
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, t]);

  const setDraft = (id: string, field: 'baseFee' | 'gainSharePercent', value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const isDirty = (band: PlatformFeeBand) => {
    const d = drafts[band.id];
    return !!d && (d.baseFee !== band.baseFee || d.gainSharePercent !== band.gainSharePercent);
  };

  const handleSave = async (band: PlatformFeeBand) => {
    if (!adminSession) return;
    const d = drafts[band.id];
    setSavingId(band.id);
    setError(null);
    try {
      const updated = await api.adminUpdateFeeBand(adminSession.accessToken, band.id, {
        baseFee: Number(d.baseFee),
        gainSharePercent: Number(d.gainSharePercent),
      });
      setBands((prev) => prev.map((b) => (b.id === band.id ? updated : b)));
      setSavedId(band.id);
      setTimeout(() => setSavedId((cur) => (cur === band.id ? null : cur)), 2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-bold">{t('admin.navFeeSettings')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin.feeSettingsSubtitle')}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && (
        <div className="grid gap-3">
          {bands.map((band) => {
            const d = drafts[band.id] ?? { baseFee: '', gainSharePercent: '' };
            const dirty = isDirty(band);
            return (
              <Card key={band.id}>
                <CardHeader>
                  <CardTitle className="text-base">{bandLabel(band)}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`base-${band.id}`}>{t('admin.baseFeeLabel')}</Label>
                    <p className="text-xs text-muted-foreground">{t('admin.baseFeeHint')}</p>
                    <Input
                      id={`base-${band.id}`}
                      type="number"
                      min={0}
                      value={d.baseFee}
                      onChange={(e) => setDraft(band.id, 'baseFee', e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`gain-${band.id}`}>{t('admin.gainShareLabel')}</Label>
                    <p className="text-xs text-muted-foreground">{t('admin.gainShareHint')}</p>
                    <Input
                      id={`gain-${band.id}`}
                      type="number"
                      min={0}
                      max={100}
                      value={d.gainSharePercent}
                      onChange={(e) => setDraft(band.id, 'gainSharePercent', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={!dirty || savingId === band.id}
                      onClick={() => handleSave(band)}
                    >
                      {savingId === band.id ? t('admin.saving') : t('admin.save')}
                    </Button>
                    {savedId === band.id && (
                      <span className="text-xs text-muted-foreground">{t('admin.saved')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
