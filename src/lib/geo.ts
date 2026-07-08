/**
 * Geospatial helpers for duplicate/overlap detection.
 *
 * Relief operations get flooded with overlapping reports — several focal persons
 * describing the same disaster in the same area. Naive "same area string" checks
 * miss "Nowshera" vs "Nowshera City" vs "Nowshera Kalan". Using the GPS the app
 * already collects, we cluster reports by real distance instead.
 */

const EARTH_RADIUS_KM = 6371;

const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance between two lat/lng points in kilometres (Haversine). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoPoint {
  _id?: any;
  area?: string;
  district?: string;
  disasterType?: string;
  lat?: number;
  lng?: number;
  createdAt?: string | Date;
}

export interface NearbyOverlap {
  request: string; // id of the nearby request
  area: string;
  distanceKm: number;
}

/**
 * Find recent requests that geographically overlap `target` — same disaster type
 * within `radiusKm` and `withinDays`. Returned sorted nearest-first.
 *
 * When either side lacks GPS we fall back to a case-insensitive area/district
 * name match so text-only reports still get a duplicate signal.
 */
export function findNearbyOverlaps(
  target: GeoPoint,
  candidates: GeoPoint[],
  opts: { radiusKm?: number; withinDays?: number } = {}
): NearbyOverlap[] {
  const radiusKm = opts.radiusKm ?? 25;
  const withinDays = opts.withinDays ?? 7;
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  const targetHasGps = typeof target.lat === 'number' && typeof target.lng === 'number';
  const targetArea = (target.area || '').trim().toLowerCase();

  const out: NearbyOverlap[] = [];
  for (const c of candidates) {
    if (target._id && c._id && String(c._id) === String(target._id)) continue;
    if (target.disasterType && c.disasterType && c.disasterType !== target.disasterType) continue;
    if (c.createdAt && new Date(c.createdAt).getTime() < cutoff) continue;

    let distanceKm: number | null = null;
    if (targetHasGps && typeof c.lat === 'number' && typeof c.lng === 'number') {
      distanceKm = haversineKm(target.lat as number, target.lng as number, c.lat, c.lng);
      if (distanceKm > radiusKm) continue;
    } else {
      // No GPS on one side — fall back to area/district name overlap.
      const cArea = (c.area || '').trim().toLowerCase();
      const cDistrict = (c.district || '').trim().toLowerCase();
      const match =
        (!!targetArea && (cArea === targetArea || cArea.includes(targetArea) || targetArea.includes(cArea))) ||
        (!!targetArea && cDistrict === targetArea);
      if (!match) continue;
    }

    out.push({
      request: String(c._id),
      area: `${c.area || 'Unknown'}${c.district ? ', ' + c.district : ''}`,
      distanceKm: distanceKm === null ? -1 : Math.round(distanceKm * 10) / 10
    });
  }

  // Nearest first; name-only matches (distance -1) sink to the end.
  return out.sort((a, b) => {
    if (a.distanceKm < 0) return 1;
    if (b.distanceKm < 0) return -1;
    return a.distanceKm - b.distanceKm;
  });
}

/** Normalize a CNIC to digits only so "12345-6789012-3" == "1234567890123". */
export function normalizeCnic(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}
