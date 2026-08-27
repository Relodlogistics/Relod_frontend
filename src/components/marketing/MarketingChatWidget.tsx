'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONTACT_EMAIL = 'team@relod.in';

// Scripted FAQ bot — no LLM, no backend call. Reuses the same six Q&As
// shown on /faq (marketing.faq.q1..q6) so the answers stay in one place.
// Each entry's keywords are matched (substring, case-insensitive) against
// whatever the visitor types; first match wins. No match falls back to a
// "reach out to the team" message instead of guessing.
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
];

type ChatMessage = { from: 'bot' | 'user'; text: string };

export function MarketingChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function answerFor(text: string): string {
    const lower = text.toLowerCase();
    const match = FAQ_ITEMS.find((item) =>
      item.keywords.some((kw) => lower.includes(kw.toLowerCase())),
    );
    return match ? t(`marketing.faq.${match.key}Body`) : t('marketing.chatWidget.fallback');
  }

  function ask(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { from: 'user', text },
      { from: 'bot', text: answerFor(text) },
    ]);
    setInput('');
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <div className="flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <p className="font-heading text-sm font-semibold">{t('marketing.chatWidget.title')}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('marketing.chatWidget.close')}
              className="rounded-md p-1 hover:bg-primary-foreground/10"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div className="max-w-[85%] rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              {t('marketing.chatWidget.greeting')}
            </div>

            {messages.length === 0 && (
              <div className="flex flex-col gap-2 pt-1">
                {FAQ_ITEMS.map(({ key }) => (
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

            {messages.some((m) => m.from === 'bot' && m.text === t('marketing.chatWidget.fallback')) && (
              <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <Mail className="size-4 shrink-0" />
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <Button variant="outline" size="sm" className="w-fit" nativeButton={false} render={<Link href="/contact">{t('marketing.faq.stillCta')}</Link>} />
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
