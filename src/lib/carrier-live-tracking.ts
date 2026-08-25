'use client';

import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { api } from '@/lib/api';
import i18next from '@/lib/i18n';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
// Custom native plugin (android/app/.../LocationStatusPlugin.java) — reports
// the actual system Location toggle via LocationManagerCompat.isLocationEnabled.
// Neither the watcher's error callback nor a timed GPS-fix request could
// reliably tell "off" apart from "just slow" in both directions (that's what
// caused the status to get stuck wrong both ways); this asks Android
// directly instead of inferring it.
const LocationStatus = registerPlugin<{ isEnabled(): Promise<{ enabled: boolean }> }>('LocationStatus');
// Custom native plugin (android/app/.../BatteryOptimizationPlugin.java) —
// most Indian-market OEMs (Xiaomi, Vivo, Oppo, Realme) kill this foreground
// service within hours of the screen going off, despite its persistent
// notification, unless the app is explicitly exempted from battery
// optimization. Requesting this is what actually makes tracking survive the
// app being backgrounded for a whole shift, not just a few minutes.
const BatteryOptimization = registerPlugin<{
  isIgnoringBatteryOptimizations(): Promise<{ ignoring: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ requested: boolean }>;
}>('BatteryOptimization');
// Custom native plugin (android/app/.../OemAutostartPlugin.java) — beyond
// stock Android's battery-optimization exemption above, several OEMs layer
// their own proprietary "autostart" toggle on top with no public API, which
// is what actually lets tracking survive the phone sitting idle for hours.
const OemAutostart = registerPlugin<{
  getManufacturer(): Promise<{ manufacturer: string; isKnownRestrictive: boolean }>;
  openAutostartSettings(): Promise<{ opened: boolean }>;
}>('OemAutostart');

// Separate from the per-booking watcher in native-tracking.ts — this one
// runs for the whole time a carrier is logged into the app (not just while
// a booking is active), so shippers always see a fresh position when
// matching. Deliberately its own watcher/state rather than sharing
// native-tracking.ts's, so a booking page unmounting and calling
// stopNativeTracking() there can never accidentally kill this one.
const MIN_PING_INTERVAL_MS = 25000;
const OFF_REMINDER_INTERVAL_MS = 30 * 60 * 1000; // background nudge, at most once every 30 min
const HEALTH_CHECK_INTERVAL_MS = 5000; // cheap synchronous OS check, no GPS hardware involved
// The OS location toggle can stay "on" while the watcher's fix goes stale
// (weak signal, Doze/battery throttling killing updates without erroring) —
// without this, 'live' never reverts, so the pill lies indefinitely and
// shippers match against a truck's last-known spot from hours ago.
const STALE_FIX_MS = 3 * 60 * 1000;

export type LiveTrackingStatus = 'starting' | 'live' | 'off' | 'unsupported';

let status: LiveTrackingStatus = 'unsupported';
let watcherId: string | null = null;
let healthCheckId: ReturnType<typeof setInterval> | null = null;
let lastSentAt = 0;
let lastFixAt = 0;
let lastRestartAt = 0;
let lastOffNotifiedAt = 0;
let trackingCreds: { token: string; vehicleId: string } | null = null;
const listeners = new Set<(s: LiveTrackingStatus) => void>();

function setStatus(next: LiveTrackingStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((fn) => fn(status));
}

async function notifyLocationOff() {
  const now = Date.now();
  if (now - lastOffNotifiedAt < OFF_REMINDER_INTERVAL_MS) return;
  lastOffNotifiedAt = now;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title: i18next.t('tracking.locationOffNotifTitle'),
          body: i18next.t('tracking.locationOffNotifBody'),
        },
      ],
    });
  } catch {
    // best-effort — a missed reminder isn't worth surfacing further
  }
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

async function checkLocationHealth(): Promise<void> {
  try {
    const { enabled } = await LocationStatus.isEnabled();
    if (!enabled) {
      setStatus('off');
      notifyLocationOff();
      return;
    }
    if (status === 'off') {
      setStatus('starting'); // real GPS fix from the watcher flips this to 'live'
      return;
    }
    if (status === 'live' && lastFixAt > 0 && Date.now() - lastFixAt > STALE_FIX_MS) {
      // The provider is stuck on an old fix rather than erroring outright —
      // restarting the watcher is what actually unsticks it on Android.
      const now = Date.now();
      if (now - lastRestartAt < STALE_FIX_MS) return;
      lastRestartAt = now;
      setStatus('starting');
      const creds = trackingCreds;
      if (creds) {
        await stopLiveTracking();
        await startLiveTracking(creds.token, creds.vehicleId);
      }
    }
  } catch {
    // best-effort — if the native check itself fails, fall back to whatever
    // the watcher's own callback reports rather than guessing
  }
}

function startHealthCheck(): void {
  if (healthCheckId) return;
  healthCheckId = setInterval(checkLocationHealth, HEALTH_CHECK_INTERVAL_MS);
  checkLocationHealth();
}

function stopHealthCheck(): void {
  if (!healthCheckId) return;
  clearInterval(healthCheckId);
  healthCheckId = null;
}

export async function startLiveTracking(token: string, vehicleId: string): Promise<void> {
  if (!isNativeApp()) {
    setStatus('unsupported');
    return;
  }
  if (watcherId) return;
  setStatus('starting');
  trackingCreds = { token, vehicleId };

  try {
    await LocalNotifications.requestPermissions();
  } catch {
    // notifications are a nice-to-have here — tracking still proceeds without them
  }

  try {
    const { ignoring } = await BatteryOptimization.isIgnoringBatteryOptimizations();
    if (!ignoring) await BatteryOptimization.requestIgnoreBatteryOptimizations();
  } catch {
    // best-effort — tracking still starts even if this device/OS version
    // doesn't support the exemption dialog, or the carrier declines it
  }

  try {
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: i18next.t('tracking.liveNotifTitle'),
        // Swiping the app away from Recent Apps kills tracking outright —
        // this notification is the one thing still visible to the driver at
        // that moment, so it's the only place that warning can actually land.
        backgroundMessage: i18next.t('tracking.liveNotifMessage'),
        requestPermissions: true,
        distanceFilter: 25,
      },
      (position?: Location, error?: CallbackError) => {
        if (error) {
          setStatus('off');
          notifyLocationOff();
          return;
        }
        if (!position) return;
        setStatus('live');
        lastFixAt = Date.now();

        const now = Date.now();
        if (now - lastSentAt < MIN_PING_INTERVAL_MS) return;
        lastSentAt = now;

        const speedKmh = position.speed != null ? position.speed * 3.6 : undefined;
        api
          .sendLocationPing(token, vehicleId, {
            lat: position.latitude,
            lng: position.longitude,
            speedKmh,
          })
          .catch(() => {
            // best-effort — the next ping picks up from wherever the driver is by then
          });
      },
    );
    startHealthCheck();
  } catch {
    setStatus('off');
    notifyLocationOff();
  }
}

export async function stopLiveTracking(): Promise<void> {
  stopHealthCheck();
  trackingCreds = null;
  lastFixAt = 0;
  lastSentAt = 0;
  if (!watcherId) return;
  await BackgroundGeolocation.removeWatcher({ id: watcherId });
  watcherId = null;
  setStatus('unsupported');
}

export async function openLocationSettings(): Promise<void> {
  await BackgroundGeolocation.openSettings();
}

export async function getOemAutostartInfo(): Promise<{ manufacturer: string; isKnownRestrictive: boolean } | null> {
  if (!isNativeApp()) return null;
  try {
    return await OemAutostart.getManufacturer();
  } catch {
    return null;
  }
}

export async function openOemAutostartSettings(): Promise<void> {
  try {
    await OemAutostart.openAutostartSettings();
  } catch {
    // best-effort — worst case the carrier ends up on the app's own settings page
  }
}

// If the driver leaves the app to flip location back on in Settings, the
// watcher's error callback doesn't retry on its own — restart it when the
// app comes back to the foreground so recovery doesn't need a manual reopen.
let resumeListenerAttached = false;
function attachResumeListener(token: string, vehicleId: string) {
  if (resumeListenerAttached || !isNativeApp()) return;
  resumeListenerAttached = true;
  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) return;
    if (status === 'off') {
      stopLiveTracking().then(() => startLiveTracking(token, vehicleId));
    } else {
      // Coming back to the foreground is exactly when a driver is most
      // likely to have just flipped location on/off in Settings — check
      // right away instead of waiting for the next poll tick.
      checkLocationHealth();
    }
  });
}

export function useLiveTrackingStatus(token: string | undefined, vehicleId: string | undefined): LiveTrackingStatus {
  const [current, setCurrent] = useState<LiveTrackingStatus>(status);

  useEffect(() => {
    listeners.add(setCurrent);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);

  useEffect(() => {
    if (!token || !vehicleId || !isNativeApp()) return;
    startLiveTracking(token, vehicleId);
    attachResumeListener(token, vehicleId);
  }, [token, vehicleId]);

  return current;
}
