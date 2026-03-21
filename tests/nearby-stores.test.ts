import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-location so the test runner doesn't try to parse native modules
vi.mock("expo-location", () => ({
  reverseGeocodeAsync: vi.fn().mockResolvedValue([]),
  LocationGeocodedAddress: {},
}));

import { getNearbyStores, formatDistance } from "../lib/nearby-stores";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_OSM_RESPONSE = {
  elements: [
    {
      type: "node",
      id: 123456,
      lat: 37.775,
      lon: -122.419,
      tags: {
        name: "Safeway",
        shop: "supermarket",
        "addr:housenumber": "123",
        "addr:street": "Market St",
        "addr:city": "San Francisco",
        "addr:state": "CA",
        brand: "Safeway",
      },
    },
    {
      type: "node",
      id: 234567,
      lat: 37.776,
      lon: -122.420,
      tags: {
        name: "CVS Pharmacy",
        amenity: "pharmacy",
        "addr:street": "Mission St",
        "addr:city": "San Francisco",
        "addr:state": "CA",
      },
    },
    {
      type: "node",
      id: 345678,
      lat: 37.777,
      lon: -122.421,
      tags: {
        // No name — should be filtered out
        shop: "supermarket",
      },
    },
    {
      type: "node",
      id: 456789,
      lat: 37.778,
      lon: -122.422,
      tags: {
        name: "McDonald's",
        amenity: "fast_food", // Should be filtered out
      },
    },
    {
      type: "way",
      id: 567890,
      center: { lat: 37.780, lon: -122.424 },
      tags: {
        name: "Target",
        shop: "department_store",
        "addr:housenumber": "456",
        "addr:street": "Valencia St",
        "addr:city": "San Francisco",
        "addr:state": "CA",
      },
    },
  ],
};

describe("getNearbyStores", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_OSM_RESPONSE,
    });
  });

  it("returns stores sorted by distance", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    expect(stores.length).toBeGreaterThan(0);
    // Verify sorted by distance
    for (let i = 1; i < stores.length; i++) {
      expect(stores[i].distanceMeters).toBeGreaterThanOrEqual(stores[i - 1].distanceMeters);
    }
  });

  it("filters out stores with no name", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    const unnamed = stores.find((s) => !s.name);
    expect(unnamed).toBeUndefined();
  });

  it("filters out fast food restaurants", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    const mcdonalds = stores.find((s) => s.name === "McDonald's");
    expect(mcdonalds).toBeUndefined();
  });

  it("correctly maps shop type to category", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    const safeway = stores.find((s) => s.name === "Safeway");
    expect(safeway?.category).toBe("Grocery");
  });

  it("correctly maps amenity pharmacy to category", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    const cvs = stores.find((s) => s.name === "CVS Pharmacy");
    expect(cvs?.category).toBe("Pharmacy");
  });

  it("correctly maps department store category", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    const target = stores.find((s) => s.name === "Target");
    expect(target?.category).toBe("Department Store");
  });

  it("formats addresses correctly", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    const safeway = stores.find((s) => s.name === "Safeway");
    expect(safeway?.address).toContain("123 Market St");
    expect(safeway?.address).toContain("San Francisco");
  });

  it("handles way elements using center coordinates", async () => {
    const stores = await getNearbyStores(37.7749, -122.4194);
    const target = stores.find((s) => s.name === "Target");
    expect(target?.lat).toBeCloseTo(37.780, 3);
    expect(target?.lng).toBeCloseTo(-122.424, 3);
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });
    await expect(getNearbyStores(37.7749, -122.4194)).rejects.toThrow("Overpass API error");
  });

  it("deduplicates stores at the same location", async () => {
    // Add a duplicate of Safeway
    const responseWithDupe = {
      elements: [
        ...MOCK_OSM_RESPONSE.elements,
        {
          type: "way",
          id: 999999,
          center: { lat: 37.775, lon: -122.419 },
          tags: { name: "Safeway", shop: "supermarket" },
        },
      ],
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => responseWithDupe });
    const stores = await getNearbyStores(37.7749, -122.4194);
    const safeways = stores.filter((s) => s.name === "Safeway");
    expect(safeways.length).toBe(1);
  });
});

describe("formatDistance", () => {
  it("shows < 0.1 mi for very close distances", () => {
    expect(formatDistance(50)).toBe("< 0.1 mi");
  });

  it("shows decimal miles for moderate distances", () => {
    expect(formatDistance(1609)).toBe("1.0 mi");
    expect(formatDistance(3218)).toBe("2.0 mi");
  });

  it("shows rounded miles for large distances", () => {
    // 20 miles = 32186.8 meters
    expect(formatDistance(32187)).toBe("20 mi");
  });
});
