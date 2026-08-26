'use client';

import { useSession } from '@/lib/session-context';
import { usePushNotifications } from '@/lib/push-notifications';

/** Renders nothing — just registers this device for push notifications for whichever shipper/carrier is logged in. */
export function PushNotificationRegistrar() {
  const { session } = useSession();
  usePushNotifications(session?.accessToken);
  return null;
}
