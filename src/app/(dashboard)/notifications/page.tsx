'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, AppNotification } from '@/lib/api';
import { useSession } from '@/lib/session-context';

const LABEL_KEY: Record<AppNotification['type'], string> = {
  lane_match: 'notifications.laneMatch',
  broadcast: 'notifications.broadcast',
  booking_update: 'notifications.bookingUpdate',
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, loaded } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (loaded && !session) router.replace('/login');
  }, [loaded, session, router]);

  const refresh = async () => {
    if (!session) return;
    setNotifications(await api.listNotifications(session.accessToken));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleMarkRead = async (id: string) => {
    if (!session) return;
    await api.markNotificationRead(session.accessToken, id);
    await refresh();
  };

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
                    {n.payload.postingId ? (
                      <Link href={`/postings/${n.payload.postingId}`} className="text-sm font-medium hover:underline">
                        {t(LABEL_KEY[n.type])}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{t(LABEL_KEY[n.type])}</p>
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
                  {!n.readAt && <Badge>{t('notifications.new')}</Badge>}
                  {!n.readAt && (
                    <Button size="sm" variant="outline" onClick={() => handleMarkRead(n.id)}>
                      {t('notifications.markRead')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
