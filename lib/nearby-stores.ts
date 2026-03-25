/**
 * Nearby store discovery using the Overpass API (OpenStreetMap).
 * No API key required. Free to use.
 *
 * Strategy:
 * 1. getNearbyStores() returns stores immediately with OSM addr: tags where available.
 *    Stores without addr: tags get address = "" initially.
 * 2. enrichStoreAddresses() can be called separately to fill in missing addresses
 *    via Expo reverseGeocodeAsync, updating the array in-place.
 *    The caller is responsible for triggering a re-render after this.
 */

import * as Location from "expo-location";

export interface NearbyStore {
  id: string;          // OSM node/way ID
  name: string;
  address: string;     // Formatted address string (may be empty until enriched)
  lat: number;
  lng: number;
  distanceMeters: number;
  category: string;   // e.g. "Grocery", "Pharmacy", etc.
  brand?: string;     // e.g. "Walmart", "CVS"
}

// Radius in meters for nearby search (5 km = ~3 miles)
const SEARCH_RADIUS_METERS = 5000;

// Overpass API public endpoints — tried in order until one succeeds
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// OSM tags that map to store categories
const SHOP_CATEGORY_MAP: Record<string, string> = {
  supermarket: "Grocery",
  grocery: "Grocery",
  convenience: "Convenience",
  department_store: "Department Store",
  mall: "Department Store",
  pharmacy: "Pharmacy",
  chemist: "Pharmacy",
  hardware: "Home Improvement",
  doityourself: "Home Improvement",
  electronics: "Electronics",
  clothes: "Clothing",
  fashion: "Clothing",
  shoes: "Clothing",
  pet: "Pet Store",
  "pet;veterinary": "Pet Store",
  stationery: "Office Supply",
  office_supplies: "Office Supply",
  sports: "Sporting Goods",
  outdoor: "Sporting Goods",
  car_parts: "Auto Parts",
  auto_parts: "Auto Parts",
  craft: "Craft & Hobby",
  hobby: "Craft & Hobby",
  furniture: "Furniture",
  books: "Bookstore",
  bookshop: "Bookstore",
  wholesale: "Warehouse Club",
  warehouse: "Warehouse Club",
  gas_station: "Gas Station",
  fuel: "Gas Station",
  dollar_store: "Dollar Store",
  variety_store: "Dollar Store",
  health_food: "Health & Wellness",
  nutrition_supplements: "Health & Wellness",
  bakery: "Grocery",
  butcher: "Grocery",
  seafood: "Grocery",
  deli: "Grocery",
  general: "Grocery",
};

const AMENITY_CATEGORY_MAP: Record<string, string> = {
  pharmacy: "Pharmacy",
  fuel: "Gas Station",
  supermarket: "Grocery",
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Build a formatted address from OSM addr: tags.
 * Returns empty string if no addr: tags are present.
 */
function formatAddressFromTags(tags: Record<string, string>): string {
  const parts: string[] = [];
  if (tags["addr:housenumber"] && tags["addr:street"]) {
    parts.push(`${tags["addr:housenumber"]} ${tags["addr:street"]}`);
  } else if (tags["addr:street"]) {
    parts.push(tags["addr:street"]);
  }
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  if (tags["addr:state"]) parts.push(tags["addr:state"]);
  if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  return parts.join(", ");
}

/**
 * Format an address from Expo's reverse geocode result.
 * Returns empty string if no useful data.
 */
function formatAddressFromGeocode(result: Location.LocationGeocodedAddress): string {
  const parts: string[] = [];
  if (result.streetNumber && result.street) {
    parts.push(`${result.streetNumber} ${result.street}`);
  } else if (result.street) {
    parts.push(result.street);
  }
  if (result.city) parts.push(result.city);
  if (result.region) parts.push(result.region);
  if (result.postalCode) parts.push(result.postalCode);
  return parts.join(", ");
}

function getCategory(tags: Record<string, string>): string {
  const shopType = tags["shop"];
  const amenityType = tags["amenity"];
  if (shopType && SHOP_CATEGORY_MAP[shopType]) return SHOP_CATEGORY_MAP[shopType];
  if (amenityType && AMENITY_CATEGORY_MAP[amenityType]) return AMENITY_CATEGORY_MAP[amenityType];
  return "Other";
}

function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  return `
[out:json][timeout:25];
(
  node["shop"](around:${radius},${lat},${lng});
  node["amenity"~"pharmacy|fuel|supermarket"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
  way["amenity"~"pharmacy|fuel|supermarket"](around:${radius},${lat},${lng});
);
out center;
`.trim();
}

interface OSMElement {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Fetch nearby stores from Overpass API.
 * Returns immediately with OSM address data where available.
 * Stores without OSM addr: tags will have address = "".
 * Call enrichStoreAddresses() afterwards to fill in missing addresses.
 */

/**
 * Try each Overpass mirror in order, returning the first successful response.
 * Throws an error with "Overpass" in the message if all mirrors fail.
 */
async function fetchOverpass(query: string): Promise<any> {
  let lastError: Error = new Error("Overpass API unreachable");
  for (const url of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s per mirror
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`Overpass API error: ${response.status}`);
    } catch (err: any) {
      lastError = new Error(`Overpass mirror failed: ${err?.message ?? err}`);
    }
  }
  throw lastError;
}

export async function getNearbyStores(
  lat: number,
  lng: number,
  radiusMeters: number = SEARCH_RADIUS_METERS
): Promise<NearbyStore[]> {
  const query = buildOverpassQuery(lat, lng, radiusMeters);

  const data = await fetchOverpass(query);
  const elements: OSMElement[] = data.elements ?? [];

  const stores: NearbyStore[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags["name"] ?? tags["brand"] ?? tags["operator"];
    if (!name) continue;

    // Skip fast food, cafes, restaurants
    const amenity = tags["amenity"];
    if (amenity && ["fast_food", "restaurant", "cafe", "bar", "pub"].includes(amenity)) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    const distance = haversineDistance(lat, lng, elLat, elLng);
    const address = formatAddressFromTags(tags);
    const category = getCategory(tags);

    // Deduplicate: same name within ~100m
    const dedupeKey = `${name.toLowerCase()}_${Math.round(elLat * 1000)}_${Math.round(elLng * 1000)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    stores.push({
      id: `osm_${el.type}_${el.id}`,
      name,
      address,
      lat: elLat,
      lng: elLng,
      distanceMeters: distance,
      category,
      brand: tags["brand"],
    });
  }

  // Sort by distance ascending
  stores.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return stores;
}

/**
 * Enrich stores that are missing addresses using Expo reverse geocoding.
 * Mutates the store objects in-place. Call setNearbyStores([...stores]) after this.
 *
 * Only processes the first `limit` stores without addresses to avoid rate limiting.
 * Returns true when done so the caller can trigger a re-render.
 */
export async function enrichStoreAddresses(
  stores: NearbyStore[],
  limit = 30
): Promise<void> {
  const missing = stores.filter((s) => !s.address);
  if (missing.length === 0) return;

  const toEnrich = missing.slice(0, limit);

  for (const store of toEnrich) {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: store.lat,
        longitude: store.lng,
      });
      if (results.length > 0) {
        const addr = formatAddressFromGeocode(results[0]);
        if (addr) store.address = addr;
      }
    } catch {
      // Non-fatal — leave address blank
    }
    // Small delay to avoid geocoder rate limiting
    await new Promise((r) => setTimeout(r, 80));
  }
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
