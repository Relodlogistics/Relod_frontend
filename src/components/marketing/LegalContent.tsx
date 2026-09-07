import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getServerLocale, createServerT } from '@/lib/server-i18n';

const DRAFT_DATE = '2026-09-06';

// Bracketed spans like "[city to be finalised with legal counsel]" mark exactly
// what still needs a real value before this document is final — highlighted so
// legal counsel can spot every one of them at a glance instead of reading closely.
const PLACEHOLDER_PATTERN = /(\[[^\]]+\])/g;

function renderWithPlaceholders(text: string) {
  // split() with a capturing group interleaves plain text (even indices) with
  // the captured "[...]" matches themselves (odd indices) — no need to re-test.
  const parts = text.split(PLACEHOLDER_PATTERN);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="rounded bg-yellow-200 px-1 py-0.5 font-medium text-yellow-950 dark:bg-yellow-500/40 dark:text-yellow-100"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export async function LegalContent({ docKey, sectionCount }: { docKey: 'terms' | 'privacy' | 'agreement'; sectionCount: number }) {
  const locale = await getServerLocale();
  const t = createServerT(locale);
  const sections = Array.from({ length: sectionCount }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        {t(`marketing.legal.${docKey}.title`)}
      </h1>

      <Alert variant="destructive" className="mt-6">
        <AlertTriangle className="size-4" />
        <AlertDescription>{t('marketing.legal.draftNotice')}</AlertDescription>
      </Alert>

      <p className="mt-3 text-xs text-muted-foreground">
        {t('marketing.legal.lastUpdated', { date: DRAFT_DATE })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('marketing.legal.placeholderLegend')}{' '}
        <mark className="rounded bg-yellow-200 px-1 py-0.5 font-medium text-yellow-950 dark:bg-yellow-500/40 dark:text-yellow-100">
          {t('marketing.legal.placeholderExample')}
        </mark>
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((n) => (
          <div key={n} className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t(`marketing.legal.${docKey}.s${n}Title`)}
            </h2>
            <p className="text-muted-foreground">
              {renderWithPlaceholders(t(`marketing.legal.${docKey}.s${n}Body`))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
