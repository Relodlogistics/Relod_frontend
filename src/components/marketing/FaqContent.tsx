import Link from 'next/link';
import { Search, MessageCircle, MapPin, UserPlus, ShieldCheck, Smartphone, ChevronDown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getServerLocale, createServerT } from '@/lib/server-i18n';

const QUESTIONS = [
  { key: 'q1', icon: Search },
  { key: 'q2', icon: MessageCircle },
  { key: 'q3', icon: MapPin },
  { key: 'q4', icon: UserPlus },
  { key: 'q5', icon: ShieldCheck },
  { key: 'q6', icon: Smartphone },
];

export async function FaqContent() {
  const locale = await getServerLocale();
  const t = createServerT(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <span className="text-sm font-semibold tracking-wide text-primary uppercase">{t('marketing.faq.eyebrow')}</span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('marketing.faq.heroTitle')}
        </h1>
      </div>

      {/* Native <details>/<summary> instead of useState — gives the same
          accordion behavior with zero client JS, so this component can stay
          a server component (real HTML for crawlers/first paint) rather than
          needing 'use client' just for open/close state. */}
      <div className="mt-10 flex flex-col gap-3">
        {QUESTIONS.map(({ key, icon: Icon }, idx) => (
          <details key={key} className="group rounded-xl border bg-card" open={idx === 0}>
            <summary className="flex w-full cursor-pointer list-none items-center gap-3 p-5 text-left [&::-webkit-details-marker]:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 font-heading text-base font-semibold text-foreground">
                {t(`marketing.faq.${key}Title`)}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 pl-[4.25rem] text-sm text-muted-foreground">{t(`marketing.faq.${key}Body`)}</p>
          </details>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start gap-4 rounded-xl border bg-secondary/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <HelpCircle className="size-4" />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">{t('marketing.faq.stillTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('marketing.faq.stillBody')}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-fit shrink-0" nativeButton={false} render={<Link href="/contact">{t('marketing.faq.stillCta')}</Link>} />
      </div>
    </div>
  );
}
