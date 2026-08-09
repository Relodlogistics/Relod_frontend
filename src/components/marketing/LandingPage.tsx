import Link from 'next/link';
import {
  ListOrdered,
  Navigation,
  MessageCircle,
  Route,
  FileText,
  Languages,
  ArrowRight,
  ShieldCheck,
  Zap,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackingIllustration } from './TrackingIllustration';
import { LoadboardPreview } from './LoadboardPreview';
import { FinalCta } from './FinalCta';
import { RedirectIfLoggedIn } from './RedirectIfLoggedIn';
import { HowItWorksTabs } from './HowItWorksTabs';
import { getServerLocale, createServerT } from '@/lib/server-i18n';

export async function LandingPage() {
  const locale = await getServerLocale();
  const t = createServerT(locale);

  // The hero headline used to swap to a truck-persona variant when the
  // header's role switcher was set to "I'm a Truck" — that required reading
  // client-side role state, which is exactly what kept this whole page (and
  // its LCP-critical H1) client-rendered. Server-rendering real HTML here is
  // the bigger SEO/Core Web Vitals win, so the H1 now always shows the
  // shipper-persona copy (already the code's own documented default) as
  // stable, crawlable content. Role-personalization is preserved everywhere
  // it still matters below the fold — the Loadboard preview and the
  // How-it-works tabs both still switch with the header's role switcher.
  const heroCopy = {
    line1: t('marketing.hero.headlineLine1'),
    line2Prefix: t('marketing.hero.headlineLine2Prefix'),
    line2Highlight: t('marketing.hero.headlineLine2Highlight'),
    line2Suffix: t('marketing.hero.headlineLine2Suffix'),
  };

  const features = [
    { icon: ListOrdered, title: t('marketing.features.matchingTitle'), desc: t('marketing.features.matchingDesc') },
    { icon: Navigation, title: t('marketing.features.trackingTitle'), desc: t('marketing.features.trackingDesc') },
    { icon: MessageCircle, title: t('marketing.features.whatsappTitle'), desc: t('marketing.features.whatsappDesc') },
    { icon: Route, title: t('marketing.features.bookingTitle'), desc: t('marketing.features.bookingDesc') },
    { icon: FileText, title: t('marketing.features.documentsTitle'), desc: t('marketing.features.documentsDesc') },
    { icon: Languages, title: t('marketing.features.languageTitle'), desc: t('marketing.features.languageDesc') },
  ];

  const shipperSteps = [
    { title: t('marketing.howItWorks.shipperStep1Title'), desc: t('marketing.howItWorks.shipperStep1Desc') },
    { title: t('marketing.howItWorks.shipperStep2Title'), desc: t('marketing.howItWorks.shipperStep2Desc') },
    { title: t('marketing.howItWorks.shipperStep3Title'), desc: t('marketing.howItWorks.shipperStep3Desc') },
  ];
  const carrierSteps = [
    { title: t('marketing.howItWorks.carrierStep1Title'), desc: t('marketing.howItWorks.carrierStep1Desc') },
    { title: t('marketing.howItWorks.carrierStep2Title'), desc: t('marketing.howItWorks.carrierStep2Desc') },
    { title: t('marketing.howItWorks.carrierStep3Title'), desc: t('marketing.howItWorks.carrierStep3Desc') },
  ];

  return (
    <div>
      <RedirectIfLoggedIn />

      {/* Hero */}
      {/* Background matches the hero illustration PNG's own sampled edge color
          (rgb(244,242,254)) exactly, rather than the page's #f9f8fc — a blurred
          patch in a *different* shade was still visible as a soft halo shape
          once you looked closely, because any flat-colored region has a
          silhouette no matter how gently it fades. Matching outright removes
          the seam by construction instead of trying to hide it. */}
      <section className="relative overflow-hidden bg-[rgb(244,242,254)]">
        <div
          className="pointer-events-none absolute top-[-15%] left-[-8%] size-[480px] rounded-full bg-primary/8 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-8 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
          <div className="flex flex-col gap-6">
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground">
              <Zap className="size-3.5 fill-current" />
              {t('marketing.hero.eyebrow')}
            </span>

            <h1 className="font-display text-[2.75rem] leading-[1.08] font-bold tracking-tight text-foreground sm:text-6xl">
              <span className="block">{heroCopy.line1}</span>
              <span className="block">
                {heroCopy.line2Prefix}
                <span className="text-primary">{heroCopy.line2Highlight}</span>
                {heroCopy.line2Suffix}
              </span>
              <span className="block">{t('marketing.hero.headlineLine3')}</span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              {t('marketing.hero.subheadline')}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                className="h-12 rounded-full px-7 text-[0.95rem] shadow-lg shadow-primary/25"
                nativeButton={false}
                render={
                  <Link href="/register/phone">
                    {t('marketing.hero.ctaPrimary')}
                    <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full px-7 text-[0.95rem] shadow-sm"
                nativeButton={false}
                render={
                  <Link href="#how-it-works">
                    <Play className="size-4 fill-current text-primary" />
                    {t('marketing.hero.ctaSecondary')}
                  </Link>
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.8rem] text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span>{t('marketing.hero.trust1')}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{t('marketing.hero.trust2')}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{t('marketing.hero.trust3')}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>{t('marketing.hero.trust4')}</span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <TrackingIllustration />
          </div>
        </div>
      </section>

      <LoadboardPreview />

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-primary">{t('marketing.features.eyebrow')}</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">
              {t('marketing.features.title')}
            </h2>
            <p className="mt-4 text-muted-foreground">{t('marketing.features.subtitle')}</p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon className="size-5" />
                </span>
                <p className="font-display text-lg font-bold text-foreground">{title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t bg-secondary/20 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-primary">{t('marketing.howItWorks.eyebrow')}</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">
              {t('marketing.howItWorks.title')}
            </h2>
          </div>

          <HowItWorksTabs
            shipperTabLabel={t('marketing.howItWorks.shipperTab')}
            carrierTabLabel={t('marketing.howItWorks.carrierTab')}
            shipperSteps={shipperSteps}
            carrierSteps={carrierSteps}
          />
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
