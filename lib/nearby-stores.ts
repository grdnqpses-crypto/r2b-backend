/**
 * Nearby store discovery using the Overpass API (OpenStreetMap).
 * No API key required. Free to use.
 *
 * Queries for shops, supermarkets, pharmacies, and other retail
 * within a configurable radius of the user's current location.
 */

export interface NearbyStore {
  id: string;          // OSM node/way ID
  name: string;
  address: string;     // Formatted address string
  lat: number;
  lng: number;
  distanceMeters: number;
  category: string;   // e.g. "Grocery", "Pharmacy", etc.
  brand?: string;     // e.g. "Walmart", "CVS"
}

// Radius in meters for nearby search (5 km = ~3 miles)
const SEARCH_RADIUS_METERS = 5000;

// Overpass API public endpoint
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatAddress(tags: Record<string, string>): string {
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

function getCategory(tags: Record<string, string>): string {
  const shopType = tags["shop"];
  const amenityType = tags["amenity"];
  if (shopType && SHOP_CATEGORY_MAP[shopType]) return SHOP_CATEGORY_MAP[shopType];
  if (amenityType && AMENITY_CATEGORY_MAP[amenityType]) return AMENITY_CATEGORY_MAP[amenityType];
  return "Other";
}

function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  // Query for nodes and ways that are shops or relevant amenities
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

export async function getNearbyStores(
  lat: number,
  lng: number,
  radiusMeters: number = SEARCH_RADIUS_METERS
): Promise<NearbyStore[]> {
  const query = buildOverpassQuery(lat, lng, radiusMeters);

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  const elements: OSMElement[] = data.elements ?? [];

  const stores: NearbyStore[] = [];
  const seen = new Set<string>(); // deduplicate by name+approx location

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags["name"] ?? tags["brand"] ?? tags["operator"];
    if (!name) continue; // Skip unnamed stores

    // Skip fast food, cafes, restaurants — focus on retail/grocery
    const amenity = tags["amenity"];
    if (amenity && ["fast_food", "restaurant", "cafe", "bar", "pub"].includes(amenity)) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    const distance = haversineDistance(lat, lng, elLat, elLng);
    const address = formatAddress(tags);
    const category = getCategory(tags);

    // Deduplicate: same name within 100m
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

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
