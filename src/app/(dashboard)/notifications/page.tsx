'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, AppNotification } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { markAllNotificationsRead } from '@/lib/notifications-store';

const LABEL_KEY: Record<AppNotification['type'], string> = {
  lane_match: 'notifications.laneMatch',
  broadcast: 'notifications.broadcast',
  booking_update: 'notifications.bookingUpdate',
  driver_action: 'notifications.driverAction',
};

const BOOKING_EVENT_LABEL_KEY: Record<string, string> = {
  accepted: 'notifications.bookingAccepted',
  not_selected: 'notifications.bookingNotSelected',
  new_candidate: 'notifications.bookingNewCandidate',
  completed: 'notifications.bookingCompleted',
};

function labelKeyFor(n: AppNotification): string {
  if (n.type === 'booking_update' && n.payload.event && BOOKING_EVENT_LABEL_KEY[n.payload.event]) {
    return BOOKING_EVENT_LABEL_KEY[n.payload.event];
  }
  return LABEL_KEY[n.type];
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  // Captured once per visit so items stay tagged "New" for this viewing even
  // after they're marked read on the backend a moment later — otherwise the
  // badges would vanish out from under the user while they're still reading.
  const [wasUnreadIds, setWasUnreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const all = await api.listNotifications(session.accessToken);
      setNotifications(all);
      setWasUnreadIds(new Set(all.filter((n) => !n.readAt).map((n) => n.id)));
      // Opening this page is the "read" action — no more per-item button
      // needed, and the sidebar/bell badge should clear immediately.
      await markAllNotificationsRead(session.accessToken);
    })().catch(() => undefined);
  }, [session]);

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('notifications.title')}</h1>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <Bell className="size-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    {n.payload.bookingId ? (
                      <Link href={`/bookings/${n.payload.bookingId}`} className="text-sm font-medium hover:underline">
                        {t(labelKeyFor(n))}
                      </Link>
                    ) : n.payload.postingId ? (
                      <Link href={`/postings/${n.payload.postingId}`} className="text-sm font-medium hover:underline">
                        {t(labelKeyFor(n))}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{t(labelKeyFor(n))}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {wasUnreadIds.has(n.id) && <Badge>{t('notifications.new')}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
