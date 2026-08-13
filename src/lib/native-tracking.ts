'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation';
import { api } from '@/lib/api';

// This plugin ships no JS runtime entry point — only native (Android/iOS)
// code plus type definitions — so it must be registered like this rather
// than imported as a value. See the package's own README.
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

// Matches MIN_PING_INTERVAL_MS in (dashboard)/bookings/[id]/page.tsx — same
// ping cadence whether the update came from the web's foreground-only
// watchPosition() or this native background watcher, so a booking's
// tracking history looks consistent regardless of which path sent it.
const MIN_PING_INTERVAL_MS = 25000;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

let watcherId: string | null = null;
let lastSentAt = 0;

/**
 * Starts a background location watcher inside the native app shell. Unlike
 * the web's navigator.geolocation.watchPosition() (see the booking detail
 * page), this keeps reporting after the app is backgrounded or the screen
 * is off — Android requires a persistent notification to allow that, which
 * is what backgroundMessage/backgroundTitle below produce.
 *
 * No-ops on web — callers should check isNativeApp() first and fall back
 * to the existing watchPosition() path there instead.
 */
export async function startNativeTracking(token: string, vehicleId: string): Promise<void> {
  if (!isNativeApp() || watcherId) return;

  watcherId = await BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: 'Relod is tracking your trip',
      backgroundMessage: 'Location is shared with the shipper until this trip ends.',
      requestPermissions: true,
      distanceFilter: 25,
    },
    (position?: Location, error?: CallbackError) => {
      if (error || !position) return;
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
          // Best-effort — a dropped ping isn't worth surfacing to the driver
          // mid-trip; the next successful one just picks up from wherever
          // they are by then.
        });
    },
  );
}

export async function stopNativeTracking(): Promise<void> {
  if (!watcherId) return;
  await BackgroundGeolocation.removeWatcher({ id: watcherId });
  watcherId = null;
}
