'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <h2 className="font-heading text-lg font-semibold">{t('tracking.swipeAwayTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('tracking.swipeAwayMessage')}</p>
        <Button className="w-full" onClick={dismiss}>
          {t('tracking.swipeAwayButton')}
        </Button>
      </div>
    </div>
  );
}
