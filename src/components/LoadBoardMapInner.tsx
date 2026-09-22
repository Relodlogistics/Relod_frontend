'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/lib/utils';

export interface LoadBoardMapPin {
  id: string;
  lat: number;
  lng: number;
  originLabel: string;
  destinationLabel: string;
  priceAmount: string | null;
}

// Same free MapTiler-or-OSM fallback as LiveTrackingMapInner — kept as a
// separate, simpler component rather than generalizing that one, since this
// map plots many pins at once with no route line/trail, a different enough
// shape that sharing code would mean threading unused props through both.
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? '';
const TILE_URL = MAPTILER_API_KEY
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = MAPTILER_API_KEY
  ? '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const INDIA_CENTER: [number, number] = [22.9734, 78.6569];

function pinIcon() {
  return L.divIcon({
    className: '',
    html:
      '<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px 9999px 9999px 0;transform:rotate(45deg);background:#7c3aed;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35)">' +
      '<span style="transform:rotate(-45deg);width:8px;height:8px;border-radius:9999px;background:white"></span></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}
const PIN_ICON = pinIcon();

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
  }, [map, points]);
  return null;
}

/**
 * Plots every posting in the current results as a pin on one map — the
 * "loads near me" view. Clicking a pin opens a small popup card (matching
 * what the list/grid cards show) with a link to the same posting detail
 * page every other "View details" link on the board goes to.
 */
export default function LoadBoardMapInner({
  pins,
  center,
  className,
}: {
  pins: LoadBoardMapPin[];
  center?: { lat: number; lng: number } | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const points = useMemo<[number, number][]>(() => pins.map((p) => [p.lat, p.lng]), [pins]);
  const initialCenter: [number, number] = center
    ? [center.lat, center.lng]
    : points[0] ?? INDIA_CENTER;

  return (
    <div className={className ?? 'h-[28rem] w-full overflow-hidden rounded-lg border'}>
      <MapContainer center={initialCenter} zoom={points.length ? 11 : 5} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={PIN_ICON}>
            <Popup>
              <div className="flex flex-col gap-1.5 text-sm">
                <p className="font-medium">
                  {pin.originLabel} → {pin.destinationLabel}
                </p>
                <p className="text-muted-foreground">
                  {pin.priceAmount ? formatMoney(Number(pin.priceAmount)) : t('postings.notSpecified')}
                </p>
                <Link href={`/postings/${pin.id}`} className="text-primary underline">
                  {t('dashboard.viewDetails')}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
