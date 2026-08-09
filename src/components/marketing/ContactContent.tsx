import Link from 'next/link';
import { Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getServerLocale, createServerT } from '@/lib/server-i18n';

const CONTACT_EMAIL = 'team@relod.in';

export async function ContactContent() {
  const locale = await getServerLocale();
  const t = createServerT(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        {t('marketing.contact.heroTitle')}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t('marketing.contact.heroBody')}</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Mail className="size-5" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              {t('marketing.contact.emailLabel')}
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="font-display text-base font-semibold text-foreground">
              {t('marketing.contact.supportTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{t('marketing.contact.supportBody')}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              nativeButton={false}
              render={<Link href="/login">{t('marketing.contact.supportCta')}</Link>}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
