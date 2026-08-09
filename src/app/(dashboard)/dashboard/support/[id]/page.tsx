'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Paperclip, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, ApiError, supportAttachmentUrl, SupportTicket, SupportTicketMessage } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { statusBadge } from '@/lib/status-badge';

const MESSAGE_POLL_INTERVAL_MS = 5000;
const ATTACHMENT_ACCEPT = 'image/*,.pdf,.doc,.docx';

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

export default function SupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  const refreshMessages = async () => {
    if (!session) return;
    setMessages(await api.listSupportTicketMessages(session.accessToken, id));
  };

  const load = async () => {
    if (!session) return;
    const tickets = await api.listMySupportTickets(session.accessToken);
    const found = tickets.find((tk) => tk.id === id);
    if (!found) {
      setNotFound(true);
      return;
    }
    setTicket(found);
    await refreshMessages();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessages().catch(() => undefined);
    }, MESSAGE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  const handleSend = async () => {
    if (!session || (!body.trim() && !attachedFile)) return;
    setError(null);
    setLoading(true);
    try {
      await api.sendSupportTicketMessage(session.accessToken, id, body.trim(), attachedFile ?? undefined);
      setBody('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshMessages();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t('supportDetail.notFound')}</p>
      </div>
    );
  }

  if (!ticket) return null;

  const badge = statusBadge(ticket.status);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <button
        onClick={() => router.push('/dashboard/support')}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('supportDetail.back')}
      </button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{ticket.issueSummary}</CardTitle>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('supportDetail.conversation')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-md border p-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('supportDetail.noMessages')}</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex max-w-[80%] flex-col gap-0.5 ${
                  m.senderType === session.userType ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <div
                  className={`flex flex-col gap-1.5 rounded-lg px-3 py-2 text-sm ${
                    m.senderType === session.userType ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <MessageAttachment message={m} token={session.accessToken} />
                  {m.body && <span>{m.body}</span>}
                </div>
                <span className="text-[0.7rem] text-muted-foreground">{formatMessageTime(m.createdAt)}</span>
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
              placeholder={t('supportDetail.typeMessage')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
              title={t('supportDetail.attachFile')}
            >
              <Paperclip className="size-4" />
            </Button>
          </div>
          <Button onClick={handleSend} disabled={loading || (!body.trim() && !attachedFile)} className="w-fit">
            {t('supportDetail.send')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
