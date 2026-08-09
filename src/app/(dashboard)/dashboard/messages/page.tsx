'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, Booking } from '@/lib/api';
import { useSession } from '@/lib/session-context';
import { boardLocation } from '@/lib/utils';
import { statusBadge } from '@/lib/status-badge';

export default function MessagesPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    // Any booking (negotiated ones definitely have messages; instant-book
    // ones may too, since the thread stays open for coordination) — link
    // into each one's existing message thread on the booking detail page.
    if (session) api.listMyBookings(session.accessToken).then(setBookings).catch(() => undefined);
  }, [session]);

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">{t('messagesPage.title')}</h1>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{t('messagesPage.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {bookings.map((b) => {
            const badge = statusBadge(b.status);
            return (
              <Link key={b.id} href={`/bookings/${b.id}`}>
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                        <MessageSquare className="size-4" />
                      </div>
                      <p className="text-sm font-medium">
                        {b.posting
                          ? `${boardLocation(b.posting.originCityLabel, b.posting.originLabel)} → ${boardLocation(b.posting.destinations[0]?.cityLabel, b.posting.destinations[0]?.label)}`
                          : `RL-${b.id.slice(0, 6).toUpperCase()}`}
                      </p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
