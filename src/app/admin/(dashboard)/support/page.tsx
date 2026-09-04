'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api, ApiError, AdminSupportTicket } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { timeAgo } from '@/lib/utils';

const STATUSES: AdminSupportTicket['status'][] = ['open', 'in_progress', 'resolved'];
const POLL_INTERVAL_MS = 20000;

function statusVariant(status: AdminSupportTicket['status']) {
  if (status === 'resolved') return 'secondary' as const;
  if (status === 'open') return 'destructive' as const;
  return 'outline' as const;
}

function lastActivityAt(ticket: AdminSupportTicket) {
  return ticket.lastMessageAt ?? ticket.createdAt;
}

export default function AdminSupportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { adminSession } = useAdminSession();

  const [status, setStatus] = useState<'all' | AdminSupportTicket['status']>('all');
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (silent = false) => {
    if (!adminSession) return;
    if (!silent) setLoading(true);
    setError(null);
    api
      .adminListSupportTickets(adminSession.accessToken, status === 'all' ? undefined : status)
      .then((res) => {
        setTickets([...res].sort((a, b) => Date.parse(lastActivityAt(b)) - Date.parse(lastActivityAt(a))));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, status, t]);

  useEffect(() => {
    const interval = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession, status]);

  // Marks the badge as seen for this admin, then tells AdminShell to clear
  // it immediately — see the identical effect in change-requests/page.tsx.
  useEffect(() => {
    if (!adminSession) return;
    api
      .adminMarkSupportTicketsSeen(adminSession.accessToken)
      .then(() => window.dispatchEvent(new Event('admin-support-seen')))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">{t('admin.navSupport')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.supportSubtitle')}</p>
        </div>
        <Select value={status} onValueChange={(v) => v && setStatus(v as typeof status)}>
          <SelectTrigger className="w-40">
            {status === 'all' ? t('admin.allStatuses') : t(`admin.ticketStatus_${status}`)}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`admin.ticketStatus_${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>}

      {!loading && (
        <Card>
          <CardContent className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('admin.colRaisedBy')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colIssue')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colStatus')}</th>
                  <th className="py-2 pr-3 font-medium">{t('admin.colLastActivity')}</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      {t('admin.noResults')}
                    </td>
                  </tr>
                )}
                {tickets.map((ticket) => {
                  const prefix = ticket.lastMessageSenderType === 'admin' ? t('admin.youPrefix') : '';
                  const preview = ticket.lastMessageBody
                    ? `${prefix}${ticket.lastMessageBody}`
                    : ticket.lastMessageAttachmentName
                      ? `${prefix}📎 ${ticket.lastMessageAttachmentName}`
                      : ticket.issueSummary;
                  return (
                    <tr
                      key={ticket.id}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-accent/40"
                      onClick={() => router.push(`/admin/support/${ticket.id}`)}
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1.5">
                          {ticket.needsReply && (
                            <span
                              className="size-2 shrink-0 rounded-full bg-primary"
                              title={t('admin.needsReply')}
                            />
                          )}
                          <div>
                            <div>{ticket.raiser?.fullName ?? '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {t(`admin.role_${ticket.raiserType}`)} · {ticket.raiser?.phone ?? '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs truncate py-3 pr-3 text-muted-foreground">{preview}</td>
                      <td className="py-3 pr-3">
                        <Badge variant={statusVariant(ticket.status)}>{t(`admin.ticketStatus_${ticket.status}`)}</Badge>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{timeAgo(lastActivityAt(ticket))}</td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/support/${ticket.id}`);
                          }}
                        >
                          <MessageCircle className="size-3.5" />
                          {t('admin.openChat')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
