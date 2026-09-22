'use client';

import dynamic from 'next/dynamic';

// Leaflet touches `window`/`document` at import time, so it can't be
// server-rendered — same client-only dynamic-import pattern as LiveTrackingMap.
const LoadBoardMap = dynamic(() => import('./LoadBoardMapInner'), {
  ssr: false,
  loading: () => <div className="h-[28rem] w-full animate-pulse rounded-lg bg-muted" />,
});

export default LoadBoardMap;
export type { LoadBoardMapPin } from './LoadBoardMapInner';
