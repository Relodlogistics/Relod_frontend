'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

// Module-level, not per-component state — registering twice for the same
// login would just mean two addListener calls firing the same API call
// redundantly, harmless but wasteful; this keeps it to once per app session.
let registeredForToken: string | null = null;

async function registerPushNotifications(accessToken: string): Promise<void> {
  if (!isNativeApp() || registeredForToken === accessToken) return;
  registeredForToken = accessToken;

  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
      registeredForToken = null;
      return;
    }

    await PushNotifications.addListener('registration', (fcmToken) => {
      api.registerPushToken(accessToken, fcmToken.value).catch(() => undefined);
    });
    await PushNotifications.addListener('registrationError', () => {
      registeredForToken = null;
    });

    await PushNotifications.register();
  } catch {
    registeredForToken = null;
  }
}

/**
 * Registers this device for push notifications the moment a shipper/carrier
 * is logged in, and navigates to the relevant page when a notification the
 * app was backgrounded/closed for gets tapped. No-ops entirely on plain web.
 */
export function usePushNotifications(accessToken: string | undefined): void {
  const router = useRouter();
  const tapListenerAttached = useRef(false);

  useEffect(() => {
    if (!accessToken) return;
    registerPushNotifications(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (!isNativeApp() || tapListenerAttached.current) return;
    tapListenerAttached.current = true;
    const handle = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const bookingId = action.notification.data?.bookingId;
      const postingId = action.notification.data?.postingId;
      if (bookingId) router.push(`/bookings/${bookingId}`);
      else if (postingId) router.push(`/postings/${postingId}`);
      else router.push('/notifications');
    });
    return () => {
      handle.then((h) => h.remove()).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
