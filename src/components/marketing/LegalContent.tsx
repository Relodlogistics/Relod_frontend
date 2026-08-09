import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getServerLocale, createServerT } from '@/lib/server-i18n';

const DRAFT_DATE = '2026-08-02';

export async function LegalContent({ docKey, sectionCount }: { docKey: 'terms' | 'privacy'; sectionCount: number }) {
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

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((n) => (
          <div key={n} className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t(`marketing.legal.${docKey}.s${n}Title`)}
            </h2>
            <p className="text-muted-foreground">{t(`marketing.legal.${docKey}.s${n}Body`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
