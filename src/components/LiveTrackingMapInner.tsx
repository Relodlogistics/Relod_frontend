'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';

export interface TrackingPoint {
  lat: number;
  lng: number;
  label?: string;
}

function dotIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.15)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function truckIcon() {
  return L.divIcon({
    className: '',
    html:
      '<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#7c3aed;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>' +
      '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>' +
      '<circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const originIcon = dotIcon('#10b981');
const destinationIcon = dotIcon('#f43f5e');
const currentIcon = truckIcon();

const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? '';
// MapTiler's free tier (100k tile loads/month, no card) is nicer/more
// reliable than the shared public OSM tile server — falls back to the raw
// OSM tiles when no key is configured, same env-var-driven pattern as the
// Google/Leaflet map component split one level up.
const TILE_URL = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = MAPTILER_API_KEY
  ? '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 12 });
  }, [map, points]);
  return null;
}

export default function LiveTrackingMapInner({
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
  const containerRef = useRef<HTMLDivElement>(null);

  const boundsPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];
    if (current) pts.push([current.lat, current.lng]);
    return pts;
  }, [origin, destination, current]);

  const routeLine: [number, number][] = [[origin.lat, origin.lng], [destination.lat, destination.lng]];
  const trailLine: [number, number][] = trail.map((p) => [p.lat, p.lng]);

  return (
    <div ref={containerRef} className={className ?? 'h-64 w-full overflow-hidden rounded-md'}>
      <MapContainer center={[origin.lat, origin.lng]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
        <Polyline positions={routeLine} pathOptions={{ color: '#a1a1aa', weight: 2, dashArray: '6 6' }} />
        {trailLine.length > 1 && <Polyline positions={trailLine} pathOptions={{ color: '#7c3aed', weight: 3 }} />}
        <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
        {current && <Marker position={[current.lat, current.lng]} icon={currentIcon} />}
        <FitBounds points={boundsPoints} />
      </MapContainer>
    </div>
  );
}
