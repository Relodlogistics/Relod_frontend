import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getServerLocale, createServerT } from '@/lib/server-i18n';

export async function FinalCta() {
  const locale = await getServerLocale();
  const t = createServerT(locale);

  return (
    <section className="border-t bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-24 text-center sm:px-6">
        <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
          {t('marketing.finalCta.title')}
        </h2>
        <p className="text-muted-foreground">{t('marketing.finalCta.subtitle')}</p>
        <Button
          size="lg"
          className="mt-2 h-12 rounded-xl px-8 text-[0.95rem] shadow-lg shadow-primary/25"
          nativeButton={false}
          render={<Link href="/register/phone">{t('marketing.finalCta.cta')}</Link>}
        />
      </div>
    </section>
  );
}
