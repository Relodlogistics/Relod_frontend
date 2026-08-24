'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, AppNotification } from '@/lib/api';
import { useSession } from '@/lib/session-context';

const POLL_INTERVAL_MS = 30000;
// 'not_selected' already shows up in the notifications list/badge — not
// worth interrupting the user with a full popup for that one. These two are
// the ones worth surfacing immediately: your truck got picked, or someone
// accepted your load and needs a decision.
const POPUP_EVENTS = new Set(['accepted', 'new_candidate', 'completed']);
const LABEL_KEY: Record<string, string> = {
  accepted: 'notifications.bookingAccepted',
  new_candidate: 'notifications.bookingNewCandidate',
  completed: 'notifications.bookingCompleted',
};

/**
 * Surfaces booking_update notifications (truck accepted/selected) the
 * moment they happen, rather than making the user notice the bell badge —
 * this is the in-app equivalent of the dashboard's "Your Load is Live!"
 * banner, for the accept/select moment specifically. Only carrier/shipper
 * sessions have a notifications feed (drivers are scoped to one vehicle,
 * not an account — see AccessTokenGuard on the backend), so this doesn't
 * apply to the driver app.
 *
 * Polling (not a websocket) because the backend has no push channel yet;
 * this is also what lets it fire a real LocalNotification, which persists
 * in the OS notification tray even if the user isn't looking at the app —
 * closer to a push notification than the in-app popup alone, though it
 * still requires the app process to be alive to poll (a true
 * fully-closed-app push would need Firebase Cloud Messaging, not set up).
 */
export function BookingAlertPopup() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [popup, setPopup] = useState<AppNotification | null>(null);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !session) return;
    let cancelled = false;

    const poll = async () => {
      let all: AppNotification[];
      try {
        all = await api.listNotifications(session.accessToken);
      } catch {
        return;
      }
      if (cancelled) return;

      if (seenIds.current === null) {
        // First fetch just establishes the baseline — nothing already
        // sitting there before this session started should pop up now.
        seenIds.current = new Set(all.map((n) => n.id));
        return;
      }

      const fresh = all.filter(
        (n) =>
          !seenIds.current!.has(n.id) &&
          n.type === 'booking_update' &&
          n.payload.event &&
          POPUP_EVENTS.has(n.payload.event),
      );
      all.forEach((n) => seenIds.current!.add(n.id));
      if (fresh.length === 0) return;

      setPopup(fresh[0]);
      try {
        await LocalNotifications.schedule({
          notifications: fresh.map((n, i) => ({
            id: 5000 + i,
            title: t(LABEL_KEY[n.payload.event!]),
            body: t('notifications.tapToView'),
          })),
        });
      } catch {
        // best-effort — the in-app popup still shows regardless
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session, t]);

  if (!popup || !popup.payload.event) return null;

  const href = popup.payload.bookingId
    ? `/bookings/${popup.payload.bookingId}`
    : popup.payload.postingId
      ? `/postings/${popup.payload.postingId}`
      : '/notifications';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-lg">
        <PartyPopper className="size-8 text-primary" />
        <h2 className="font-heading text-lg font-semibold">{t(LABEL_KEY[popup.payload.event])}</h2>
        <Link href={href} className="w-full" onClick={() => setPopup(null)}>
          <Button className="w-full">{t('dashboard.viewDetails')}</Button>
        </Link>
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setPopup(null)}
        >
          {t('appUpdate.dismiss')}
        </button>
      </div>
    </div>
  );
}
