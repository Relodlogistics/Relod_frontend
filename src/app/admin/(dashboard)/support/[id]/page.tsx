'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Paperclip, FileText, X, Check, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { api, ApiError, supportAttachmentUrl, AdminSupportTicket, SupportTicketMessage } from '@/lib/api';
import { useAdminSession } from '@/lib/admin-session-context';
import { timeAgo } from '@/lib/utils';

const STATUSES: AdminSupportTicket['status'][] = ['open', 'in_progress', 'resolved'];
const MESSAGE_POLL_INTERVAL_MS = 5000;
const ATTACHMENT_ACCEPT = 'image/*,.pdf,.doc,.docx';

function statusVariant(status: AdminSupportTicket['status']) {
  if (status === 'resolved') return 'secondary' as const;
  if (status === 'open') return 'destructive' as const;
  return 'outline' as const;
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Only ever rendered on the admin side — the raiser must never see whether the team has read anything. */
function SeenIndicator({ seen, label }: { seen: boolean; label: string }) {
  return seen ? (
    <CheckCheck className="size-3.5 text-primary" aria-label={label} />
  ) : (
    <Check className="size-3.5 text-muted-foreground" aria-label={label} />
  );
}

function MessageAttachment({ message, token }: { message: SupportTicketMessage; token: string }) {
  if (!message.attachmentUrl) return null;
  const url = supportAttachmentUrl(message.ticketId, message.id, token);
  const isImage = message.attachmentMimeType?.startsWith('image/');
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={message.attachmentName ?? 'attachment'}
          className="max-h-48 max-w-full rounded-md object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 rounded-md border bg-background/50 px-2 py-1.5 text-xs underline"
    >
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{message.attachmentName ?? 'attachment'}</span>
    </a>
  );
}

export default function AdminSupportTicketDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { adminSession } = useAdminSession();

  const [ticket, setTicket] = useState<AdminSupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    if (!adminSession) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.adminGetSupportTicket(adminSession.accessToken, params.id),
      api.adminListSupportTicketMessages(adminSession.accessToken, params.id),
    ])
      .then(([ticket, msgs]) => {
        setTicket(ticket);
        setNotes(ticket.notes ?? '');
        setMessages(msgs);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : t('errors.generic')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [adminSession, params.id, t]);

  const refreshMessages = async () => {
    if (!adminSession) return;
    setMessages(await api.adminListSupportTicketMessages(adminSession.accessToken, params.id));
  };

  // Separate from `load()` — keeps polling from clobbering the notes textarea mid-edit while
  // still picking up raiserLastReadAt changes so the seen indicator updates without a reload.
  const refreshTicket = async () => {
    if (!adminSession) return;
    setTicket(await api.adminGetSupportTicket(adminSession.accessToken, params.id));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessages().catch(() => undefined);
      refreshTicket().catch(() => undefined);
    }, MESSAGE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession, params.id]);

  const handleSendReply = async () => {
    if (!adminSession || (!reply.trim() && !attachedFile)) return;
    setSending(true);
    setError(null);
    try {
      await api.adminSendSupportTicketMessage(
        adminSession.accessToken,
        params.id,
        reply.trim(),
        attachedFile ?? undefined,
      );
      setReply('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshMessages();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setSending(false);
    }
  };

  const runUpdate = async (data: { status?: string; notes?: string; assignToSelf?: boolean }) => {
    if (!adminSession) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.adminUpdateSupportTicket(adminSession.accessToken, params.id, data);
      setTicket(updated);
      setNotes(updated.notes ?? '');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">{t('admin.loading')}</p>;
  if (error && !ticket) return <p className="text-sm text-destructive">{error}</p>;
  if (!ticket) return null;

  const isAssignedToMe = ticket.handledByAdminId === adminSession?.admin.id;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => router.push('/admin/support')}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('admin.backToSupport')}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{ticket.raiser?.fullName ?? '—'}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {t(`admin.role_${ticket.raiserType}`)} · {ticket.raiser?.phone ?? '—'} · {timeAgo(ticket.createdAt)}
            </p>
          </div>
          <Badge variant={statusVariant(ticket.status)}>{t(`admin.ticketStatus_${ticket.status}`)}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{ticket.issueSummary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.conversation')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-md border p-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('admin.noMessages')}</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex max-w-[80%] flex-col gap-0.5 ${m.senderType === 'admin' ? 'self-end items-end' : 'self-start items-start'}`}
              >
                <div
                  className={`flex flex-col gap-1.5 rounded-lg px-3 py-2 text-sm ${
                    m.senderType === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {adminSession && <MessageAttachment message={m} token={adminSession.accessToken} />}
                  {m.body && <span>{m.body}</span>}
                </div>
                <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                  {formatMessageTime(m.createdAt)}
                  {m.senderType === 'admin' &&
                    (() => {
                      const seen = !!ticket.raiserLastReadAt && new Date(ticket.raiserLastReadAt) >= new Date(m.createdAt);
                      return <SeenIndicator seen={seen} label={seen ? t('admin.seen') : t('admin.sent')} />;
                    })()}
                </span>
              </div>
            ))}
          </div>

          {attachedFile && (
            <div className="flex w-fit items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs">
              <Paperclip className="size-3.5 shrink-0" />
              <span className="max-w-48 truncate">{attachedFile.name}</span>
              <button type="button" onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              placeholder={t('admin.typeMessage')}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="flex-1"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              title={t('admin.attachFile')}
            >
              <Paperclip className="size-4" />
            </Button>
          </div>
          <Button
            size="sm"
            className="w-fit"
            disabled={sending || (!reply.trim() && !attachedFile)}
            onClick={handleSendReply}
          >
            {t('admin.sendMessage')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.manageTicket')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t('admin.colStatus')}</Label>
            <Select
              value={ticket.status}
              onValueChange={(v) => v && runUpdate({ status: v })}
            >
              <SelectTrigger className="w-48" disabled={busy}>
                {t(`admin.ticketStatus_${ticket.status}`)}
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`admin.ticketStatus_${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('admin.assignedTo')}</Label>
            {ticket.handledByAdminId ? (
              <Badge variant="outline" className="w-fit">
                {isAssignedToMe ? t('admin.assignedToYou') : t('admin.assigned')}
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="w-fit" disabled={busy} onClick={() => runUpdate({ assignToSelf: true })}>
                {t('admin.assignToMe')}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticketNotes">{t('admin.internalNotes')}</Label>
            <Textarea id="ticketNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            <Button
              size="sm"
              className="w-fit"
              disabled={busy || notes === (ticket.notes ?? '')}
              onClick={() => runUpdate({ notes })}
            >
              {t('admin.saveNotes')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
