'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

/**
 * A plain reload-the-page pull gesture, like Chrome's — no per-page data
 * refetching wired up, just window.location.reload(), which is enough since
 * this app's pages already load their data fresh on mount. Native app only:
 * a browser tab already has this gesture built in, and re-adding it would
 * just fight the real one.
 */
export function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const scrollTop = () => document.scrollingElement?.scrollTop ?? 0;

    const onTouchStart = (e: TouchEvent) => {
      if (scrollTop() > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      active.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || startY.current === null) return;
      if (scrollTop() > 0) {
        active.current = false;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      setPullDistance(Math.min(delta, MAX_PULL));
    };

    const onTouchEnd = () => {
      if (!active.current) return;
      active.current = false;
      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        window.location.reload();
      } else {
        setPullDistance(0);
      }
      startY.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDistance]);

  if (!Capacitor.isNativePlatform() || (pullDistance === 0 && !refreshing)) return null;

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center"
      style={{ paddingTop: Math.max(pullDistance - 24, 8) }}
    >
      <div className="flex size-8 items-center justify-center rounded-full bg-card shadow-md" style={{ opacity: progress }}>
        <RefreshCw
          className={refreshing ? 'size-4 animate-spin text-primary' : 'size-4 text-primary'}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}
