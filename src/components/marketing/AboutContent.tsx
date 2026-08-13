import Link from 'next/link';
import Image from 'next/image';
import { getServerLocale, createServerT } from '@/lib/server-i18n';
import {
  X,
  Check,
  Building2,
  User,
  Phone,
  Truck,
  Route,
  IndianRupee,
  Clock,
  ShieldCheck,
  Headphones,
  PackageSearch,
  RotateCcw,
  Handshake,
  FileText,
  Globe2,
  Lock,
  Layers3,
  Languages,
  Rocket,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Icon = typeof Building2;

type T = ReturnType<typeof createServerT>;

/** A row of circular icon nodes joined by dashed connectors, with labels beneath. */
function NodeFlow({ nodes, tone, t }: { nodes: { key: string; icon: Icon }[]; tone: 'old' | 'new'; t: T }) {
  const ring = tone === 'old' ? 'border-border text-muted-foreground' : 'border-primary/30 text-primary';
  return (
    <div className="flex items-start justify-between gap-1">
      {nodes.map(({ key, icon: NodeIcon }, idx) => (
        <div key={key} className="flex flex-1 items-start">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 bg-card ${ring}`}>
              <NodeIcon className="size-4.5" />
            </span>
            <span className="text-center text-[11px] leading-tight text-muted-foreground">{t(key)}</span>
          </div>
          {idx < nodes.length - 1 && (
            <span
              className={
                'mt-[22px] h-0 w-full flex-1 border-t-2 border-dashed ' +
                (tone === 'old' ? 'border-border' : 'border-primary/30')
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FlowPanel({
  titleKey,
  subtitleKey,
  nodes,
  tagKeys,
  tone,
  t,
}: {
  titleKey: string;
  subtitleKey: string;
  nodes: { key: string; icon: Icon }[];
  tagKeys: string[];
  tone: 'old' | 'new';
  t: T;
}) {
  const TagIcon = tone === 'old' ? X : Check;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="text-center">
        <p className={tone === 'old' ? 'text-sm font-semibold text-rose-500' : 'text-sm font-semibold text-primary'}>
          {t(titleKey)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t(subtitleKey)}</p>
      </div>

      <NodeFlow nodes={nodes} tone={tone} t={t} />

      <div className="flex flex-wrap justify-center gap-1.5">
        {tagKeys.map((key) => (
          <span
            key={key}
            className={
              'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ' +
              (tone === 'old'
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300')
            }
          >
            <TagIcon className="size-3" />
            {t(key)}
          </span>
        ))}
      </div>
    </div>
  );
}

function BenefitsPanel({
  titleKey,
  items,
  tone,
  t,
}: {
  titleKey: string;
  items: { icon: Icon; titleKey: string; descKey: string }[];
  tone: 'purple' | 'green';
  t: T;
}) {
  return (
    <div
      className={
        'flex flex-1 flex-col gap-6 rounded-2xl border p-6 ' +
        (tone === 'purple'
          ? 'border-primary/15 bg-secondary/40'
          : 'border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]')
      }
    >
      <div className="flex flex-col items-center gap-1.5">
        <h2 className="font-display text-base font-bold text-foreground">{t(titleKey)}</h2>
        <span className={'h-0.5 w-8 rounded-full ' + (tone === 'purple' ? 'bg-primary' : 'bg-emerald-500')} />
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {items.map(({ icon: ItemIcon, titleKey: tk, descKey }) => (
          <div key={tk} className="flex flex-col items-center gap-2 text-center">
            <span
              className={
                'flex size-9 items-center justify-center rounded-full ' +
                (tone === 'purple'
                  ? 'bg-primary/12 text-primary'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300')
              }
            >
              <ItemIcon className="size-4" />
            </span>
            <p className="text-[11px] font-semibold text-foreground">{t(tk)}</p>
            <p className="text-[10px] leading-snug text-muted-foreground">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function AboutContent() {
  const locale = await getServerLocale();
  const t = createServerT(locale);

  const oldNodes = [
    { key: 'marketing.about.diagram.oldNode1', icon: Building2 },
    { key: 'marketing.about.diagram.oldNode2', icon: User },
    { key: 'marketing.about.diagram.oldNode3', icon: Phone },
    { key: 'marketing.about.diagram.oldNode4', icon: User },
    { key: 'marketing.about.diagram.oldNode5', icon: Truck },
  ];
  const newNodes = [
    { key: 'marketing.about.diagram.newNode1', icon: Building2 },
    { key: 'marketing.about.diagram.newNode2', icon: Route },
    { key: 'marketing.about.diagram.newNode3', icon: Truck },
  ];

  const shipperBenefits = [
    { icon: IndianRupee, titleKey: 'marketing.about.shipperBenefit1Title', descKey: 'marketing.about.shipperBenefit1Desc' },
    { icon: Clock, titleKey: 'marketing.about.shipperBenefit2Title', descKey: 'marketing.about.shipperBenefit2Desc' },
    { icon: ShieldCheck, titleKey: 'marketing.about.shipperBenefit3Title', descKey: 'marketing.about.shipperBenefit3Desc' },
    { icon: Headphones, titleKey: 'marketing.about.shipperBenefit4Title', descKey: 'marketing.about.shipperBenefit4Desc' },
  ];
  const carrierBenefits = [
    { icon: PackageSearch, titleKey: 'marketing.about.carrierBenefit1Title', descKey: 'marketing.about.carrierBenefit1Desc' },
    { icon: RotateCcw, titleKey: 'marketing.about.carrierBenefit2Title', descKey: 'marketing.about.carrierBenefit2Desc' },
    { icon: Handshake, titleKey: 'marketing.about.carrierBenefit3Title', descKey: 'marketing.about.carrierBenefit3Desc' },
    { icon: FileText, titleKey: 'marketing.about.carrierBenefit4Title', descKey: 'marketing.about.carrierBenefit4Desc' },
  ];
  const featureGrid = [
    { icon: Globe2, titleKey: 'marketing.about.gridIndiaTitle', descKey: 'marketing.about.gridIndiaDesc' },
    { icon: Lock, titleKey: 'marketing.about.gridSecureTitle', descKey: 'marketing.about.gridSecureDesc' },
    { icon: Layers3, titleKey: 'marketing.about.gridTwoSidedTitle', descKey: 'marketing.about.gridTwoSidedDesc' },
    { icon: Languages, titleKey: 'marketing.about.gridBilingualTitle', descKey: 'marketing.about.gridBilingualDesc' },
  ];

  return (
    <div className="pb-4">
      {/* Hero + comparison diagram */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
              {t('marketing.about.eyebrow')}
            </span>
            <h1 className="font-display text-3xl leading-[1.15] font-bold tracking-tight text-foreground sm:text-[2.6rem]">
              <span className="block">{t('marketing.about.heroTitleLine1')}</span>
              <span className="block">
                {t('marketing.about.heroTitleLine2Prefix')}
                <span className="text-primary">{t('marketing.about.heroTitleLine2Mid')}</span>
                {t('marketing.about.heroTitleLine2Suffix')}
              </span>
              <span className="block">
                <span className="text-primary underline decoration-primary/40 decoration-2 underline-offset-[6px]">
                  {t('marketing.about.heroTitleLine3')}
                </span>
                {t('marketing.about.heroTitleLine3Suffix')}
              </span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {t('marketing.about.heroBody')}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-8 md:flex-row md:gap-6">
              <FlowPanel
                tone="old"
                titleKey="marketing.about.diagram.oldWayTitle"
                subtitleKey="marketing.about.diagram.oldWaySubtitle"
                nodes={oldNodes}
                tagKeys={[
                  'marketing.about.diagram.oldCon1',
                  'marketing.about.diagram.oldCon2',
                  'marketing.about.diagram.oldCon3',
                ]}
                t={t}
              />
              <span className="hidden w-px shrink-0 self-stretch bg-border md:block" />
              <FlowPanel
                tone="new"
                titleKey="marketing.about.diagram.newWayTitle"
                subtitleKey="marketing.about.diagram.newWaySubtitle"
                nodes={newNodes}
                tagKeys={[
                  'marketing.about.diagram.newPro1',
                  'marketing.about.diagram.newPro2',
                  'marketing.about.diagram.newPro3',
                ]}
                t={t}
              />
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-secondary/50 px-4 py-2.5 text-center text-[11px] text-muted-foreground">
              <Route className="size-3.5 shrink-0 text-primary" />
              {t('marketing.about.diagram.footnote')}
            </p>
          </div>
        </div>
      </section>

      {/* Benefits, with the brand mark straddling the two panels */}
      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row">
          <BenefitsPanel titleKey="marketing.about.benefitsShippersTitle" items={shipperBenefits} tone="purple" t={t} />
          <BenefitsPanel titleKey="marketing.about.benefitsCarriersTitle" items={carrierBenefits} tone="green" t={t} />
        </div>
        <span className="absolute top-1/2 left-1/2 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-background shadow-lg lg:flex">
          <Image src="/logo.png" alt="" width={44} height={44} />
        </span>
      </section>

      {/* Feature strip */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureGrid.map(({ icon: GridIcon, titleKey, descKey }) => (
            <div key={titleKey} className="flex items-start gap-3 rounded-2xl border bg-card p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <GridIcon className="size-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{t(titleKey)}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inline CTA banner */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/15 bg-secondary/40 p-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Rocket className="size-5" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-foreground">{t('marketing.about.ctaTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('marketing.about.ctaBody')}</p>
            </div>
          </div>
          <Button
            className="h-11 shrink-0 rounded-full px-6"
            nativeButton={false}
            render={
              <Link href="/register/phone">
                {t('marketing.about.ctaButton')}
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </section>

      {/* Longer-form context, kept below the visual summary */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-bold text-foreground">{t('marketing.about.missionTitle')}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('marketing.about.missionBody')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-bold text-foreground">{t('marketing.about.todayTitle')}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('marketing.about.todayBody')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
