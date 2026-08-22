'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useSession } from '@/lib/session-context';
import { useUnreadCount } from '@/lib/notifications-store';

export function NotificationBell() {
  const { session } = useSession();
  const unreadCount = useUnreadCount(session?.accessToken);

  if (!session) return null;

  return (
    <Link
      href="/notifications"
      className="relative flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
    >
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
