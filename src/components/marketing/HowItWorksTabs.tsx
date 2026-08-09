'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useMarketingRole } from '@/lib/marketing-role-context';

interface Step {
  title: string;
  desc: string;
}

interface Props {
  shipperTabLabel: string;
  carrierTabLabel: string;
  shipperSteps: Step[];
  carrierSteps: Step[];
}

/**
 * The only piece of "How it works" that needs client JS — syncing the active
 * tab with the header's shared role switcher (useMarketingRole). Receives
 * already-translated strings as props from the server-rendered LandingPage
 * shell instead of calling useTranslation() itself, so this stays a small,
 * focused client island rather than pulling the whole page back into the
 * client bundle.
 */
export function HowItWorksTabs({ shipperTabLabel, carrierTabLabel, shipperSteps, carrierSteps }: Props) {
  const { role, setRole } = useMarketingRole();
  const tab = role === 'truck' ? 'carrier' : 'shipper';
  const setTab = (next: 'shipper' | 'carrier') => setRole(next === 'carrier' ? 'truck' : 'shipper');

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'shipper' | 'carrier')} className="mt-12">
      <TabsList className="mx-auto h-auto w-fit rounded-full bg-muted p-1">
        <TabsTrigger
          value="shipper"
          className="rounded-full border border-transparent px-5 py-2 data-active:border-border data-active:shadow-sm"
        >
          {shipperTabLabel}
        </TabsTrigger>
        <TabsTrigger
          value="carrier"
          className="rounded-full border border-transparent px-5 py-2 data-active:border-border data-active:shadow-sm"
        >
          {carrierTabLabel}
        </TabsTrigger>
      </TabsList>

      {/* Rendering only the active panel ourselves, rather than always
          mounting both and letting base-ui's Tabs.Panel hide the inactive
          one via its own open/close animation tracking — with no CSS
          transition defined on these panels, base-ui's animation-completion
          detection (useAnimationsFinished) never resolves, so the "closing"
          panel's `hidden` attribute never actually gets set and both panels
          stay visible stacked on top of each other. Conditionally rendering
          sidesteps that entirely; there's no exit animation to preserve. */}
      {tab === 'shipper' && (
        <TabsContent value="shipper" className="mt-14">
          <StepList steps={shipperSteps} />
        </TabsContent>
      )}
      {tab === 'carrier' && (
        <TabsContent value="carrier" className="mt-14">
          <StepList steps={carrierSteps} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-10 sm:grid-cols-3">
      {steps.map((step, idx) => (
        <li key={step.title} className="flex flex-col gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {idx + 1}
          </span>
          <p className="font-display text-lg font-bold text-foreground">{step.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
        </li>
      ))}
    </ol>
  );
}
