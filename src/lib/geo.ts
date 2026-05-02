/**
 * Geo helpers. Haversine in-process for clarity; SQL-side distance uses earth_distance via sin/cos.
 */
const R_KM = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

export function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}
export function isValidLng(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export type BBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };

export function bboxAround(lat: number, lng: number, radiusKm: number): BBox {
  const dLat = radiusKm / 111; // ~111 km per degree latitude
  const dLng = radiusKm / (111 * Math.max(0.0001, Math.cos((lat * Math.PI) / 180)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}
