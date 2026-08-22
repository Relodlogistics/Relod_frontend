'use client';

import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { api } from '@/lib/api';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

// Separate from the per-booking watcher in native-tracking.ts — this one
// runs for the whole time a carrier is logged into the app (not just while
// a booking is active), so shippers always see a fresh position when
// matching. Deliberately its own watcher/state rather than sharing
// native-tracking.ts's, so a booking page unmounting and calling
// stopNativeTracking() there can never accidentally kill this one.
const MIN_PING_INTERVAL_MS = 25000;
const OFF_REMINDER_INTERVAL_MS = 2 * 60 * 60 * 1000; // background nudge, at most once every 2 hours
// The watcher's own error callback isn't reliable at catching the OS-level
// "Location" toggle being switched off — some Android versions keep
// delivering a stale cached fix instead of erroring, which left the status
// pill stuck on "Live". This polls a real GPS request on the side so "off"
// gets caught even when the passive watcher doesn't notice.
const HEALTH_CHECK_INTERVAL_MS = 30000;

export type LiveTrackingStatus = 'starting' | 'live' | 'off' | 'unsupported';

let status: LiveTrackingStatus = 'unsupported';
let watcherId: string | null = null;
let healthCheckId: ReturnType<typeof setInterval> | null = null;
let lastSentAt = 0;
let lastOffNotifiedAt = 0;
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
          title: 'Location is off',
          body: 'Turn on location so shippers can keep matching loads to you.',
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
    await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
    if (status === 'off') setStatus('live');
  } catch {
    setStatus('off');
    notifyLocationOff();
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

  try {
    await LocalNotifications.requestPermissions();
  } catch {
    // notifications are a nice-to-have here — tracking still proceeds without them
  }

  try {
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: 'Relod is sharing your location',
        backgroundMessage: 'Your live location helps shippers match loads to you.',
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
  if (!watcherId) return;
  await BackgroundGeolocation.removeWatcher({ id: watcherId });
  watcherId = null;
  setStatus('unsupported');
}

export async function openLocationSettings(): Promise<void> {
  await BackgroundGeolocation.openSettings();
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
