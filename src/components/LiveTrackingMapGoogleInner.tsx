'use client';

import { useEffect, useRef } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import type { TrackingPoint } from './LiveTrackingMapInner';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

function dotIcon(color: string): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  };
}

/** Draws the dashed origin→destination line and the solid GPS trail, and fits the viewport — imperative google.maps.Polyline/LatLngBounds rather than JSX, since neither has a first-class declarative component in this library version. */
function RouteAndBounds({
  origin,
  destination,
  current,
  trail,
}: {
  origin: TrackingPoint;
  destination: TrackingPoint;
  current?: TrackingPoint | null;
  trail: TrackingPoint[];
}) {
  const map = useMap();
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const trailLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    routeLineRef.current = new google.maps.Polyline({
      path: [origin, destination],
      strokeColor: '#a1a1aa',
      strokeOpacity: 0,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '12px' }],
      map,
    });
    return () => routeLineRef.current?.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng]);

  useEffect(() => {
    if (!map) return;
    if (trailLineRef.current) trailLineRef.current.setMap(null);
    if (trail.length > 1) {
      trailLineRef.current = new google.maps.Polyline({
        path: trail,
        strokeColor: '#7c3aed',
        strokeWeight: 3,
        map,
      });
    }
    return () => trailLineRef.current?.setMap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, trail]);

  useEffect(() => {
    if (!map) return;
    const points = [origin, destination, ...(current ? [current] : [])];
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(11);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 32);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng, current?.lat, current?.lng]);

  return null;
}

function LiveTrackingMapGoogleInner({
  origin,
  destination,
  current,
  trail = [],
  className,
}: {
  origin: TrackingPoint;
  destination: TrackingPoint;
  current?: TrackingPoint | null;
  trail?: TrackingPoint[];
  className?: string;
}) {
  return (
    <div className={className ?? 'h-64 w-full overflow-hidden rounded-md'}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={origin}
          defaultZoom={11}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          fullscreenControl={false}
          streetViewControl={false}
        >
          <Marker position={origin} icon={dotIcon('#10b981')} />
          <Marker position={destination} icon={dotIcon('#f43f5e')} />
          {current && (
            <Marker
              position={current}
              icon={{
                path: 'M12 2 4 8v13a1 1 0 0 0 1 1h5v-6h4v6h5a1 1 0 0 0 1-1V8z',
                fillColor: '#7c3aed',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 1.5,
                scale: 1.2,
                anchor: new google.maps.Point(12, 16),
              }}
            />
          )}
          <RouteAndBounds origin={origin} destination={destination} current={current} trail={trail} />
        </Map>
      </APIProvider>
    </div>
  );
}

export default LiveTrackingMapGoogleInner;
