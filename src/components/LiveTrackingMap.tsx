'use client';

import dynamic from 'next/dynamic';

// Both map implementations touch `window`/`document` at import time, so
// neither can be server-rendered — load client-only either way.
//
// Which one loads is decided once, at build/boot time via the env var: set
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY once a real Google Maps key exists to
// switch every consumer of this component over; leave it empty to keep the
// free Leaflet/OpenStreetMap version. No call-site changes needed either way.
const LiveTrackingMap = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  ? dynamic(() => import('./LiveTrackingMapGoogleInner'), {
      ssr: false,
      loading: () => <div className="h-64 w-full animate-pulse rounded-md bg-muted" />,
    })
  : dynamic(() => import('./LiveTrackingMapInner'), {
      ssr: false,
      loading: () => <div className="h-64 w-full animate-pulse rounded-md bg-muted" />,
    });

export default LiveTrackingMap;
export type { TrackingPoint } from './LiveTrackingMapInner';
