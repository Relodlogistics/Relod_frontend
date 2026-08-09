'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, SupportTicket } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { statusBadge } from '@/lib/status-badge';

export default function SupportPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [issueSummary, setIssueSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!session) return;
    setTickets(await api.listMySupportTickets(session.accessToken));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSubmit = async () => {
    if (!session || !issueSummary) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await api.createSupportTicket(session.accessToken, { issueSummary });
      setIssueSummary('');
      setInfo(t('supportPage.submitted'));
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('supportPage.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('supportPage.raiseTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {info && (
            <Alert>
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}
          <Textarea
            placeholder={t('supportPage.issuePlaceholder')}
            value={issueSummary}
            onChange={(e) => setIssueSummary(e.target.value)}
          />
          <Button onClick={handleSubmit} disabled={loading || !issueSummary} className="w-fit">
            {t('supportPage.submit')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('supportPage.ticketsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {tickets.length === 0 && <p className="text-sm text-muted-foreground">{t('supportPage.empty')}</p>}
          {tickets.map((ticket) => {
            const badge = statusBadge(ticket.status);
            return (
              <Link
                key={ticket.id}
                href={`/dashboard/support/${ticket.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/40"
              >
                <p className="text-sm">{ticket.issueSummary}</p>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
