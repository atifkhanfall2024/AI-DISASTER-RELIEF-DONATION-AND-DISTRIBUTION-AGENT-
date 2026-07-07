'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';

// Urgency → marker color (same family as UrgencyBadge).
const URGENCY_COLOR: Record<string, string> = {
  low: '#047857',
  medium: '#BA7517',
  high: '#ea580c',
  critical: '#993C1D'
};

// Leaflet needs the browser — always load this component via next/dynamic
// with `ssr: false` (see /admin/map and the admin request detail page).
export default function RequestsMap({
  requests,
  height = 420,
  detailLinkBase = '/admin/requests'
}: {
  requests: any[];
  height?: number;
  detailLinkBase?: string;
}) {
  const mapped = requests.filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number');
  const single = mapped.length === 1;
  const center: [number, number] = single
    ? [mapped[0].lat, mapped[0].lng]
    : [30.2, 69.5]; // Pakistan-wide view

  return (
    <MapContainer
      center={center}
      zoom={single ? 11 : 5}
      style={{ height, width: '100%', borderRadius: 12, zIndex: 0 }}
      scrollWheelZoom={!single}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapped.map((r) => (
        <CircleMarker
          key={r._id}
          center={[r.lat, r.lng]}
          radius={single ? 12 : 9}
          pathOptions={{
            color: '#ffffff',
            weight: 2,
            fillColor: URGENCY_COLOR[r.urgency] || URGENCY_COLOR.medium,
            fillOpacity: 0.9
          }}
        >
          <Popup>
            <div style={{ fontSize: 13, minWidth: 170 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                {r.area}
                {r.district ? `, ${r.district}` : ''}
              </div>
              <div style={{ color: '#64748b', marginBottom: 6 }}>
                {String(r.disasterType || 'other')} · {r.urgency} urgency · {r.familiesAffected} families ·{' '}
                {String(r.status).replace('_', ' ')}
              </div>
              {!single && (
                <Link href={`${detailLinkBase}/${r._id}`} style={{ color: '#047857', fontWeight: 600 }}>
                  Open request →
                </Link>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
