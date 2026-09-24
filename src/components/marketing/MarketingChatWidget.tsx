'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, X, Send, Mail, ArrowLeft,
  UserPlus, Search, CreditCard, MapPin, Smartphone, LifeBuoy, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { api, ApiError, SupportTicketMessage } from '@/lib/api';

const CONTACT_EMAIL = 'team@relod.in';
// Same browser only (no login involved) — good enough for a scripted-FAQ
// fallback ticket, not meant to survive a device switch. See
// SupportTicket.guestPhone's doc comment on the backend for the matching
// "phone doubles as ownership check" tradeoff.
const GUEST_TICKET_STORAGE_KEY = 'relod_guest_ticket';

function loadStoredTicket(): { id: string; phone: string } | null {
  try {
    const raw = localStorage.getItem(GUEST_TICKET_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { id: string; phone: string }) : null;
  } catch {
    return null;
  }
}

function storeTicket(ticket: { id: string; phone: string }) {
  try {
    localStorage.setItem(GUEST_TICKET_STORAGE_KEY, JSON.stringify(ticket));
  } catch {
    // Private window / blocked storage — the ticket still exists server-side,
    // it just won't be resumable from this tab. Not worth surfacing an error.
  }
}

// The *previous visit's* FAQ Q&A, kept entirely separate from the live
// `messages` state: "Ask Relod" always starts fresh at the category picker,
// and a past conversation is only ever reached through its own explicit
// "Previous conversation" entry point (banner + header icon) — never
// silently merged into the current one, so there's no ambiguity about
// which messages belong to which visit.
const CHAT_HISTORY_STORAGE_KEY = 'relod_chat_history';
const CHAT_HISTORY_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// Wrapped with a timestamp (rather than storing the bare array) so a stale
// conversation can expire — a visitor who asked something three days ago
// and forgot about it shouldn't see it resurface as if no time had passed;
// past that window it's cleared and "Previous conversation" simply doesn't
// appear, same as a first-time visitor.
function loadStoredHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { messages: ChatMessage[]; savedAt: number };
    if (Date.now() - parsed.savedAt > CHAT_HISTORY_MAX_AGE_MS) {
      localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
      return [];
    }
    return parsed.messages;
  } catch {
    return [];
  }
}

function storeHistory(messages: ChatMessage[]) {
  try {
    if (messages.length === 0) {
      localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    } else {
      localStorage.setItem(
        CHAT_HISTORY_STORAGE_KEY,
        JSON.stringify({ messages, savedAt: Date.now() }),
      );
    }
  } catch {
    // Private window / blocked storage — conversation just won't survive a reload.
  }
}

// Scripted FAQ bot — no LLM, no backend call. Reuses the same Q&As shown on
// /faq (marketing.faq.q1..q7) so the answers stay in one place. Each entry's
// keywords are matched (substring, case-insensitive) against whatever the
// visitor types; first match wins. No match falls back to a "reach out to
// the team" message instead of guessing.
const FAQ_ITEMS: { key: string; keywords: string[] }[] = [
  {
    key: 'q1',
    keywords: [
      'match', 'matching', 'find carrier', 'find truck', 'how does it work',
      'मैच', 'मिलान', 'ट्रक कैसे मिलेगा',
    ],
  },
  {
    key: 'q2',
    keywords: [
      'contact', 'reach carrier', 'whatsapp', 'message carrier',
      'संपर्क', 'व्हाट्सएप',
    ],
  },
  {
    key: 'q3',
    keywords: [
      'track', 'tracking', 'live location', 'gps',
      'ट्रैकिंग', 'लोकेशन', 'लाइव',
    ],
  },
  {
    key: 'q4',
    keywords: [
      'free', 'cost', 'price', 'registration fee', 'signup fee',
      'मुफ़्त', 'फ्री', 'शुल्क', 'पंजीकरण',
    ],
  },
  {
    key: 'q5',
    keywords: [
      'aadhaar', 'pan', 'gst', 'verify', 'verified', 'verification', 'kyc',
      'आधार', 'पैन', 'सत्यापन',
    ],
  },
  {
    key: 'q6',
    keywords: [
      'app', 'download', 'mobile app', 'play store', 'install',
      'ऐप', 'डाउनलोड', 'इंस्टॉल',
    ],
  },
  {
    key: 'q7',
    keywords: [
      'payment', 'pay', 'wallet', 'advance', 'balance', 'settlement',
      'invoice', 'upi', 'bank transfer', 'payout',
      'भुगतान', 'वॉलेट', 'एडवांस', 'बैलेंस',
    ],
  },
];

// The first thing a visitor sees is a category picker rather than all seven
// questions at once — easier to scan, and mirrors how the /faq page itself
// groups the same content by topic.
const CATEGORIES: { key: string; icon: typeof Search; items: string[] }[] = [
  { key: 'registration', icon: UserPlus, items: ['q4', 'q5'] },
  { key: 'loadboard', icon: Search, items: ['q1', 'q2'] },
  { key: 'payments', icon: CreditCard, items: ['q7'] },
  { key: 'tracking', icon: MapPin, items: ['q3'] },
  { key: 'mobileApp', icon: Smartphone, items: ['q6'] },
];

type ChatMessage = { from: 'bot' | 'user'; text: string };

export function MarketingChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // null = showing the category picker; a category key = showing that
  // category's questions. Only relevant before the first message is sent —
  // once a conversation starts, the normal message list takes over.
  const [category, setCategory] = useState<string | null>(null);
  const [lastUnansweredQuestion, setLastUnansweredQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Which screen the panel shows: the live FAQ flow, the human-support
  // ticket thread, or a read-only look back at the previous visit's FAQ Q&A.
  const [screen, setScreen] = useState<'faq' | 'ticket' | 'history'>('faq');

  // The "ask our team" form shown under a fallback answer.
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [ticketName, setTicketName] = useState('');
  const [ticketPhone, setTicketPhone] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketFormError, setTicketFormError] = useState<string | null>(null);

  // The resumable ticket thread — loaded from localStorage, one per browser.
  const [savedTicket, setSavedTicket] = useState<{ id: string; phone: string } | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportTicketMessage[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [ticketReplySending, setTicketReplySending] = useState(false);

  // The previous visit's FAQ conversation — read-only, shown only via its
  // own "Previous conversation" entry point. Empty means none exists (or it
  // expired), in which case that entry point simply doesn't render.
  const [priorConversation, setPriorConversation] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setSavedTicket(loadStoredTicket());
    setPriorConversation(loadStoredHistory());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, screen, ticketMessages]);

  const loadTicketMessages = async (ticket: { id: string; phone: string }) => {
    setTicketLoading(true);
    try {
      setTicketMessages(await api.listGuestSupportTicketMessages(ticket.id, ticket.phone));
    } catch {
      // Ticket may have been deleted or the stored phone stopped matching —
      // treat it as gone rather than showing a dead-end error.
    } finally {
      setTicketLoading(false);
    }
  };

  function openTicketScreen() {
    setScreen('ticket');
    if (savedTicket) void loadTicketMessages(savedTicket);
  }

  async function sendTicketReply() {
    if (!savedTicket || !ticketReply.trim()) return;
    setTicketReplySending(true);
    try {
      await api.sendGuestSupportTicketMessage(savedTicket.id, savedTicket.phone, ticketReply.trim());
      setTicketReply('');
      await loadTicketMessages(savedTicket);
    } catch {
      // Best-effort — the reply box just keeps the typed text so they can retry.
    } finally {
      setTicketReplySending(false);
    }
  }

  function answerFor(text: string): string {
    const lower = text.toLowerCase();
    const match = FAQ_ITEMS.find((item) =>
      item.keywords.some((kw) => lower.includes(kw.toLowerCase())),
    );
    return match ? t(`marketing.faq.${match.key}Body`) : t('marketing.chatWidget.fallback');
  }

  function ask(text: string) {
    if (!text.trim()) return;
    const answer = answerFor(text);
    const next: ChatMessage[] = [...messages, { from: 'user', text }, { from: 'bot', text: answer }];
    setMessages(next);
    // Becomes the *next* visit's "Previous conversation" — this visit's own
    // priorConversation (if any) stays exactly as loaded, untouched, until
    // this tab reloads and picks up whatever got saved here as new.
    storeHistory(next);
    if (answer === t('marketing.chatWidget.fallback')) {
      setLastUnansweredQuestion(text);
    }
    setInput('');
  }

  function resetToFreshChat() {
    setMessages([]);
    storeHistory([]);
    setCategory(null);
    setLastUnansweredQuestion('');
    setTicketFormOpen(false);
  }

  async function submitTicketForm(e: React.FormEvent) {
    e.preventDefault();
    setTicketFormError(null);
    setTicketSubmitting(true);
    try {
      const { ticketId } = await api.createGuestSupportTicket({
        name: ticketName.trim(),
        phone: ticketPhone.trim(),
        email: ticketEmail.trim() || undefined,
        question:
          lastUnansweredQuestion ||
          input.trim() ||
          [...messages].reverse().find((m) => m.from === 'user')?.text ||
          '',
        turnstileToken: turnstileToken || undefined,
      });
      const ticket = { id: ticketId, phone: ticketPhone.trim() };
      storeTicket(ticket);
      setSavedTicket(ticket);
      setTicketFormOpen(false);
      setTicketName('');
      setTicketPhone('');
      setTicketEmail('');
      setScreen('ticket');
      await loadTicketMessages(ticket);
    } catch (e) {
      setTicketFormError(e instanceof ApiError ? e.message : t('errors.generic'));
    } finally {
      setTicketSubmitting(false);
    }
  }

  const screenTitle =
    screen === 'ticket'
      ? t('marketing.chatWidget.ticketTitle')
      : screen === 'history'
        ? t('marketing.chatWidget.previousConversation')
        : t('marketing.chatWidget.title');

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <div className="flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              {screen !== 'faq' && (
                <button
                  type="button"
                  onClick={() => setScreen('faq')}
                  aria-label={t('marketing.chatWidget.backToChat')}
                  className="rounded-md p-1 hover:bg-primary-foreground/10"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <p className="font-heading text-sm font-semibold">{screenTitle}</p>
            </div>
            <div className="flex items-center gap-1">
              {screen === 'faq' && priorConversation.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScreen('history')}
                  aria-label={t('marketing.chatWidget.previousConversation')}
                  className="rounded-md p-1 hover:bg-primary-foreground/10"
                  title={t('marketing.chatWidget.previousConversation')}
                >
                  <History className="size-4" />
                </button>
              )}
              {screen === 'faq' && savedTicket && (
                <button
                  type="button"
                  onClick={openTicketScreen}
                  aria-label={t('marketing.chatWidget.ticketTitle')}
                  className="rounded-md p-1 hover:bg-primary-foreground/10"
                  title={t('marketing.chatWidget.myQuestion')}
                >
                  <LifeBuoy className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('marketing.chatWidget.close')}
                className="rounded-md p-1 hover:bg-primary-foreground/10"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {screen === 'faq' && (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <div className="max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                  {category === null
                    ? t('marketing.chatWidget.greeting')
                    : t('marketing.chatWidget.greetingAfterCategory')}
                </div>

                {messages.length === 0 && priorConversation.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScreen('history')}
                    className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10"
                  >
                    <History className="size-4 shrink-0 text-primary" />
                    {t('marketing.chatWidget.viewPreviousConversation')}
                  </button>
                )}

                {savedTicket && messages.length === 0 && (
                  <button
                    type="button"
                    onClick={openTicketScreen}
                    className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm text-foreground hover:bg-primary/10"
                  >
                    <LifeBuoy className="size-4 shrink-0 text-primary" />
                    {t('marketing.chatWidget.myQuestion')}
                  </button>
                )}

                {messages.length === 0 && category === null && (
                  <div className="flex flex-col gap-2 pt-1">
                    {CATEGORIES.map(({ key, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        {t(`marketing.chatWidget.categories.${key}`)}
                      </button>
                    ))}
                  </div>
                )}

                {messages.length === 0 && category !== null && (
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCategory(null)}
                      className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="size-3.5" />
                      {t('marketing.chatWidget.backToCategories')}
                    </button>
                    {CATEGORIES.find((c) => c.key === category)?.items.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => ask(t(`marketing.faq.${key}Title`))}
                        className="rounded-lg border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                      >
                        {t(`marketing.faq.${key}Title`)}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.from === 'user'
                        ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                        : 'max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground'
                    }
                  >
                    {m.text}
                  </div>
                ))}

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={resetToFreshChat}
                    className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                    {t('marketing.chatWidget.askAnother')}
                  </button>
                )}

                {messages.some((m) => m.from === 'bot' && m.text === t('marketing.chatWidget.fallback')) && (
                  <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
                    {!ticketFormOpen ? (
                      <>
                        <p className="flex items-center gap-2 text-sm text-foreground">
                          <Mail className="size-4 shrink-0" />
                          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                            {CONTACT_EMAIL}
                          </a>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="w-fit" onClick={() => setTicketFormOpen(true)}>
                            {t('marketing.chatWidget.askTeam')}
                          </Button>
                          <Button variant="outline" size="sm" className="w-fit" nativeButton={false} render={<Link href="/contact">{t('marketing.faq.stillCta')}</Link>} />
                        </div>
                      </>
                    ) : (
                      <form className="flex flex-col gap-2.5" onSubmit={submitTicketForm}>
                        <p className="text-xs text-muted-foreground">{t('marketing.chatWidget.askTeamHint')}</p>
                        {ticketFormError && <p className="text-xs text-destructive">{ticketFormError}</p>}
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="ticketName" className="text-xs">{t('marketing.chatWidget.yourName')}</Label>
                          <Input
                            id="ticketName"
                            required
                            value={ticketName}
                            onChange={(e) => setTicketName(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="ticketPhone" className="text-xs">{t('marketing.chatWidget.yourPhone')}</Label>
                          <Input
                            id="ticketPhone"
                            required
                            inputMode="tel"
                            value={ticketPhone}
                            onChange={(e) => setTicketPhone(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="ticketEmail" className="text-xs">{t('marketing.chatWidget.yourEmailOptional')}</Label>
                          <Input
                            id="ticketEmail"
                            type="email"
                            value={ticketEmail}
                            onChange={(e) => setTicketEmail(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <TurnstileWidget onVerify={setTurnstileToken} />
                        <Button type="submit" size="sm" className="w-fit" disabled={ticketSubmitting}>
                          {t('marketing.chatWidget.submitQuestion')}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              <form
                className="flex items-center gap-2 border-t p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('marketing.chatWidget.inputPlaceholder')}
                  className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <Button type="submit" size="icon" aria-label={t('marketing.chatWidget.send')}>
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}

          {screen === 'history' && (
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <div className="max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                {t('marketing.chatWidget.previousConversationHint')}
              </div>
              {priorConversation.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.from === 'user'
                      ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                      : 'max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground'
                  }
                >
                  {m.text}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  resetToFreshChat();
                  setScreen('faq');
                }}
                className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                {t('marketing.chatWidget.askAnother')}
              </button>
            </div>
          )}

          {screen === 'ticket' && (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <div className="max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                  {t('marketing.chatWidget.ticketGreeting')}
                </div>
                {ticketLoading && (
                  <p className="text-xs text-muted-foreground">{t('marketing.chatWidget.loading')}</p>
                )}
                {ticketMessages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.senderType === 'admin'
                        ? 'max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground'
                        : 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                    }
                  >
                    {m.body}
                  </div>
                ))}
              </div>
              <form
                className="flex items-center gap-2 border-t p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendTicketReply();
                }}
              >
                <input
                  value={ticketReply}
                  onChange={(e) => setTicketReply(e.target.value)}
                  placeholder={t('marketing.chatWidget.inputPlaceholder')}
                  className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <Button type="submit" size="icon" disabled={ticketReplySending} aria-label={t('marketing.chatWidget.send')}>
                  <Send className="size-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}

      <Button
        type="button"
        size="icon-lg"
        className="rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('marketing.chatWidget.title')}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}
