'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { getOemAutostartInfo, isNativeApp, openOemAutostartSettings } from '@/lib/carrier-live-tracking';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'relod_oem_autostart_dismissed';

/**
 * Shown once, the first time a carrier on a known-restrictive OEM (Xiaomi,
 * Vivo, Oppo/Realme, Huawei/Honor, Letv, Asus, OnePlus) opens the app.
 * Battery-optimization exemption (see carrier-live-tracking.ts) is a
 * standard Android permission we can request directly, but these OEMs
 * additionally gate background survival behind their own proprietary
 * "autostart" toggle with no public API — the best we can do is deep-link
 * straight to it instead of leaving the carrier to find it themselves.
 */
export function OemAutostartPrompt() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [manufacturer, setManufacturer] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!session || session.userType !== 'carrier' || !isNativeApp()) return;
    if (typeof window !== 'undefined' && window.localStorage.getItem(DISMISSED_KEY) === '1') return;
    getOemAutostartInfo().then((info) => {
      if (info?.isKnownRestrictive) {
        setManufacturer(info.manufacturer);
        setDismissed(false);
      }
    });
  }, [session]);

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!session || session.userType !== 'carrier' || dismissed || !manufacturer) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-lg">
        <ShieldAlert className="size-8 text-amber-500" />
        <h2 className="font-heading text-lg font-semibold">{t('tracking.oemAutostartTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('tracking.oemAutostartMessage', { manufacturer })}</p>
        <Button
          className="w-full"
          onClick={() => {
            openOemAutostartSettings();
            dismiss();
          }}
        >
          {t('tracking.oemAutostartButton')}
        </Button>
        <button type="button" className="text-xs text-muted-foreground underline" onClick={dismiss}>
          {t('tracking.notNow')}
        </button>
      </div>
    </div>
  );
}
