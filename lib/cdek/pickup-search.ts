import type { CdekOffice, PickupSearchAddress } from "./types";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function hasCoordinates<T extends Partial<Coordinates>>(point: T): point is T & Coordinates {
  return typeof point.latitude === "number" && Number.isFinite(point.latitude) &&
    Math.abs(point.latitude) <= 90 && typeof point.longitude === "number" &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians;
  const dLon = (b.longitude - a.longitude) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * radians) *
    Math.cos(b.latitude * radians) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

function searchWords(value: string): string[] {
  return value.toLocaleLowerCase("ru").replace(/ё/g, "е")
    .replace(/(\d)([а-яa-z])/g, "$1 $2")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/)
    .filter(word => word && !["ул", "улица", "д", "дом", "г", "город"].includes(word));
}

export function filterPickupOffices(offices: CdekOffice[], query: string): CdekOffice[] {
  const words = searchWords(query);
  if (!words.length) return offices;
  return offices.filter(office => {
    const haystack = searchWords(`${office.address} ${office.name} ${office.code}`);
    return words.every(word => haystack.some(part => /^\d+$/.test(word) ? part === word : part.includes(word)));
  });
}

export function rankPickupOffices(offices: CdekOffice[], point: Coordinates) {
  return offices.filter(hasCoordinates)
    .map(office => ({ ...office, distanceKm: distanceKm(point, office) }))
    .sort((a, b) => a.distanceKm - b.distanceKm || a.code.localeCompare(b.code));
}

export function pickupSearchBounds(offices: CdekOffice[]): [number, number, number, number] | null {
  const points = offices.filter(hasCoordinates);
  if (!points.length) return null;
  // Include streets around the edge of a city, even when it has a single PVZ.
  return [Math.min(...points.map(p => p.longitude)) - 0.08,
    Math.min(...points.map(p => p.latitude)) - 0.05,
    Math.max(...points.map(p => p.longitude)) + 0.08,
    Math.max(...points.map(p => p.latitude)) + 0.05];
}

export interface PhotonFeature {
  geometry?: { coordinates?: number[] };
  properties?: {
    countrycode?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    type?: string;
  };
}

export function pickupAddressesFromFeatures(
  features: PhotonFeature[], bounds: [number, number, number, number]
): PickupSearchAddress[] {
  const addresses: PickupSearchAddress[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    const p = feature.properties;
    const [longitude, latitude] = feature.geometry?.coordinates ?? [];
    const point = { latitude, longitude };
    if (!hasCoordinates(point) || p?.countrycode?.toUpperCase() !== "RU" ||
      longitude < bounds[0] || longitude > bounds[2] || latitude < bounds[1] || latitude > bounds[3]) continue;
    const street = p.street || (p.type === "street" ? p.name : undefined);
    if (!street) continue; // Never rank by an unrelated POI or a city's centre.
    const label = [p.city, street, p.housenumber].filter(Boolean).join(", ");
    const key = `${label}:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push({ label, latitude, longitude, precision: p.housenumber ? "house" : "street" });
  }
  return addresses;
}
