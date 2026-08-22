'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type UpdateState =
  | { kind: 'none' }
  | { kind: 'nudge'; versionName: string; downloadUrl: string }
  | { kind: 'forced'; versionName: string; downloadUrl: string };

/**
 * This app ships as a sideloaded APK, not through the Play Store — there's
 * no automatic update mechanism, so the app has to check for one itself.
 * Only relevant to the native shell (a browser tab is always on the latest
 * deployed site already); no-ops on web. Checked once per app launch against
 * a backend-controlled endpoint (not GitHub's API directly — the repo is
 * private, and this way the APK can be republished anywhere without the
 * client needing credentials).
 */
export function AppUpdateBanner() {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdateState>({ kind: 'none' });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const [info, current] = await Promise.all([
          api.getAndroidVersionInfo(),
          App.getInfo(),
        ]);
        if (!info.downloadUrl) return;
        const currentCode = Number(current.build);
        if (Number.isNaN(currentCode)) return;

        if (currentCode < info.minSupportedVersionCode) {
           
          setState({ kind: 'forced', versionName: info.latestVersionName, downloadUrl: info.downloadUrl });
        } else if (currentCode < info.latestVersionCode) {
           
          setState({ kind: 'nudge', versionName: info.latestVersionName, downloadUrl: info.downloadUrl });
        }
      } catch {
        // Best-effort — an unreachable version-check endpoint shouldn't block app usage.
      }
    })();
  }, []);

  const handleDownload = (url: string) => {
    // Opens the device's default browser to download the APK — Capacitor
    // routes an external-origin window.open through the system browser
    // rather than the app's own WebView, so no extra plugin is needed just
    // for this.
    window.open(url, '_system');
  };

  if (state.kind === 'none') return null;

  if (state.kind === 'forced') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-lg">
          <Download className="size-8 text-primary" />
          <h2 className="font-heading text-lg font-semibold">{t('appUpdate.forcedTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('appUpdate.forcedBody', { version: state.versionName })}
          </p>
          <Button className="w-full" onClick={() => handleDownload(state.downloadUrl)}>
            {t('appUpdate.updateNow')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-3 top-3 z-[100] flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
      <Download className="size-4 shrink-0 text-primary" />
      <p className="flex-1 text-xs">
        {t('appUpdate.nudgeBody', { version: state.versionName })}
      </p>
      <Button size="sm" onClick={() => handleDownload(state.downloadUrl)}>
        {t('appUpdate.updateNow')}
      </Button>
      <button
        type="button"
        aria-label={t('appUpdate.dismiss')}
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setState({ kind: 'none' })}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
