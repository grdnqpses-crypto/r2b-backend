/**
 * Nearby store discovery using the Overpass API (OpenStreetMap).
 * No API key required. Free to use.
 *
 * Performance strategy:
 * 1. On first call, show any persisted (AsyncStorage) results INSTANTLY while fetching fresh data.
 * 2. getNearbyStores() fetches from Overpass with a 20s timeout (down from 35s).
 * 3. enrichStoreAddresses() runs in parallel batches of 5 (down from serial with 80ms delay).
 * 4. Results are persisted to AsyncStorage so next open is instant.
 */

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Radius in meters for nearby search (15 miles)
const SEARCH_RADIUS_METERS = 24140;

// AsyncStorage key for persisted nearby stores (instant display on next open)
const PERSIST_KEY = "r2b_nearby_stores_cache";
const PERSIST_TTL_MS = 10 * 60 * 1000; // 10 minutes — persist longer than in-memory cache

// Overpass API public endpoints — tried in order until one succeeds
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// In-memory cache: keyed by "lat,lng,radius" rounded to 3 decimal places (~111m grid)
// Cache expires after 5 minutes to keep results fresh without hammering the API
const _cache = new Map<string, { data: NearbyStore[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(lat: number, lng: number, radius: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
}

// OSM tags that map to store categories
const SHOP_CATEGORY_MAP: Record<string, string> = {
  supermarket: "Grocery",
  grocery: "Grocery",
  convenience: "Convenience",
  convenience_store: "Convenience",
  general: "Grocery",
  deli: "Grocery",
  bakery: "Grocery",
  butcher: "Grocery",
  seafood: "Grocery",
  health_food: "Health & Wellness",
  nutrition_supplements: "Health & Wellness",
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
};

const AMENITY_CATEGORY_MAP: Record<string, string> = {
  pharmacy: "Pharmacy",
  fuel: "Gas Station",
  supermarket: "Grocery",
  convenience: "Convenience",
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
  // timeout reduced to 20s (was 30s) — Overpass usually responds in 3-8s for this query
  // Limit raised to 200 so dense areas don't cut off results
  return `
[out:json][timeout:20];
(
  node["shop"](around:${radius},${lat},${lng});
  node["amenity"~"^(pharmacy|fuel|supermarket|convenience)$"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
  way["amenity"~"^(pharmacy|fuel|supermarket|convenience)$"](around:${radius},${lat},${lng});
);
out center 200;
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
 * Try each Overpass mirror in order, returning the first successful response.
 * Per-mirror timeout reduced to 22s (was 35s).
 * Throws an error with "Overpass" in the message if all mirrors fail.
 */
async function fetchOverpass(query: string): Promise<any> {
  let lastError: Error = new Error("Overpass API unreachable");
  for (const url of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 22000); // 22s per mirror
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

/**
 * Load persisted nearby stores from AsyncStorage.
 * Returns null if no cache or cache is expired.
 */
export async function getPersistedNearbyStores(): Promise<NearbyStore[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed: { data: NearbyStore[]; ts: number } = JSON.parse(raw);
    if (Date.now() - parsed.ts > PERSIST_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Persist nearby stores to AsyncStorage for instant display on next open.
 */
async function persistNearbyStores(stores: NearbyStore[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify({ data: stores, ts: Date.now() }));
  } catch {
    // Non-fatal
  }
}

export async function getNearbyStores(
  lat: number,
  lng: number,
  radiusMeters: number = SEARCH_RADIUS_METERS
): Promise<NearbyStore[]> {
  // Check in-memory cache first — avoids repeat API calls on quick re-opens
  const key = cacheKey(lat, lng, radiusMeters);
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const query = buildOverpassQuery(lat, lng, radiusMeters);
  const data = await fetchOverpass(query);
  const elements: OSMElement[] = data.elements ?? [];

  const stores: NearbyStore[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags["name"] ?? tags["brand"] ?? tags["operator"];
    if (!name) continue;

    // Skip fast food, cafes, restaurants, bars
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

  // Sort by distance ascending by default
  stores.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Write to in-memory cache
  _cache.set(key, { data: stores, ts: Date.now() });

  // Persist to AsyncStorage for instant display on next app open
  persistNearbyStores(stores).catch(() => {});

  return stores;
}

/**
 * Enrich stores that are missing addresses using Expo reverse geocoding.
 * Mutates the store objects in-place. Call setNearbyStores([...stores]) after this.
 *
 * Runs in parallel batches of 5 (was serial with 80ms delay) for ~5x speed improvement.
 * Only processes the first `limit` stores without addresses to avoid rate limiting.
 */
export async function enrichStoreAddresses(
  stores: NearbyStore[],
  limit = 15
): Promise<void> {
  const missing = stores.filter((s) => !s.address);
  if (missing.length === 0) return;

  const toEnrich = missing.slice(0, limit);
  const BATCH_SIZE = 5;

  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const batch = toEnrich.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (store) => {
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
      })
    );
  }
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
