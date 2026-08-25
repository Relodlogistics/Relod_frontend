'use client';

import { useEffect, useState } from 'react';
import { SmartphoneNfc } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { isNativeApp } from '@/lib/carrier-live-tracking';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'relod_swipe_away_dismissed';

/**
 * Shown once per install, the first time a carrier logs in. Swiping the app
 * away from Recent Apps kills the location watcher outright — Android
 * treats that as "the user wants this app fully stopped," and no battery
 * or autostart permission changes that (see carrier-live-tracking.ts /
 * OemAutostartPrompt.tsx for the parts we *can* fix in code). The
 * persistent tracking notification also carries this warning, but it's
 * easy to swipe past without reading — this is the one moment we can be
 * sure the driver actually sees it.
 */
export function SwipeAwayWarningPrompt() {
  const { session } = useSession();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!session || session.userType !== 'carrier' || !isNativeApp()) return;
    if (typeof window !== 'undefined' && window.localStorage.getItem(DISMISSED_KEY) === '1') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
  }, [session]);

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!session || session.userType !== 'carrier' || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-lg">
        <SmartphoneNfc className="size-8 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Keep Relod running in the background</h2>
        <p className="text-sm text-muted-foreground">
          You can lock your phone or switch to other apps — Relod keeps sharing your location. But if you swipe
          Relod away from your Recent Apps list, it stops sharing your location completely until you reopen it.
        </p>
        <Button className="w-full" onClick={dismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
