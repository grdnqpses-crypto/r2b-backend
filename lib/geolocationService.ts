/**
 * geolocationService.ts — Production-Grade Hybrid Geolocation Engine
 *
 * Architecture:
 *   Geofence (600m) = wake trigger ONLY. No notifications from ENTER events.
 *   GPS validation loop = source of truth. All notifications based on verified distance.
 *
 * Flow:
 *   1. Geofence ENTER fires → validateProximity() starts 90s GPS polling loop
 *   2. Every 5s: get Highest-accuracy GPS fix → compute Haversine distance via geolib
 *   3. ≤483m → "Approaching Store" notification (once per 30 min)
 *   4. ≤100m → start 6-minute arrival timer
 *   5. After 6 min: re-check distance → if still ≤100m → "Remember to buy" notification
 *   6. >100m before timer ends → cancel timer
 *
 * Fallback: checkAllStores() runs on every app launch to catch missed geofence events.
 * Backup: LOCATION_UPDATE_TASK runs a low-frequency background poll (2 min interval).
 *
 * CRITICAL: TaskManager.defineTask calls at module scope.
 * This file MUST be imported at the top of app/_layout.tsx.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDistance } from "geolib";
import { getSavedStores, getAllShoppingItems } from "@/lib/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

export const GEOFENCE_TASK = "r2b-geofence-v2";
export const LOCATION_UPDATE_TASK = "r2b-location-updates";

const APPROACH_DISTANCE_M = 483;        // 0.3 miles in meters
const ARRIVAL_DISTANCE_M = 100;         // "at the store" radius in meters
const VALIDATION_DURATION_MS = 90_000; // 90-second GPS polling window
const VALIDATION_INTERVAL_MS = 5_000;  // poll every 5 seconds
const ARRIVAL_DELAY_MS = 360_000;      // 6 minutes before "You're here" notification
const APPROACH_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between approach notifications

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeoStore = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

// In-memory arrival timers (survive for the life of the JS context)
const activeArrivalTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// ─── Store Lookup ─────────────────────────────────────────────────────────────

/**
 * Look up a store by ID from AsyncStorage.
 * SavedStore uses lat/lng — we map to latitude/longitude for geolib.
 */
export async function getStoreById(id: string): Promise<GeoStore | null> {
  try {
    const stores = await getSavedStores();
    const match = stores.find((s) => s.id === id);
    if (!match) return null;
    return {
      id: match.id,
      name: match.name,
      latitude: match.lat,
      longitude: match.lng,
    };
  } catch {
    return null;
  }
}

/**
 * Get all saved stores as GeoStore objects.
 */
export async function getAllGeoStores(): Promise<GeoStore[]> {
  try {
    const stores = await getSavedStores();
    return stores.map((s) => ({
      id: s.id,
      name: s.name,
      latitude: s.lat,
      longitude: s.lng,
    }));
  } catch {
    return [];
  }
}

// ─── Geofence Registration ────────────────────────────────────────────────────

/**
 * Register one 600m geofence per store.
 * The geofence is ONLY a wake trigger — no notifications fire from ENTER events.
 * All notification decisions are made inside validateProximity().
 */
export async function startGeofencingV2(stores: GeoStore[]): Promise<void> {
  if (stores.length === 0) return;

  const regions: Location.LocationRegion[] = stores.map((store) => ({
    identifier: store.id,
    latitude: store.latitude,
    longitude: store.longitude,
    radius: 600,
    notifyOnEnter: true,
    notifyOnExit: false, // Exit not needed — GPS loop handles departure
  }));

  // iOS hard limit: 20 geofences per app
  const limited = regions.slice(0, 20);

  await Location.startGeofencingAsync(GEOFENCE_TASK, limited);
  console.log(`[R2B Geo] Registered ${limited.length} geofence(s) on ${GEOFENCE_TASK}`);
}

export async function stopGeofencingV2(): Promise<void> {
  try {
    const active = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (active) await Location.stopGeofencingAsync(GEOFENCE_TASK);
  } catch {
    // Non-fatal
  }
}

export async function isGeofencingV2Active(): Promise<boolean> {
  try {
    return await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  } catch {
    return false;
  }
}

// ─── GPS Validation Loop ──────────────────────────────────────────────────────

/**
 * Core validation engine. Runs for up to 90 seconds, polling GPS every 5s.
 * All notification decisions are made here based on verified Haversine distance.
 */
export async function validateProximity(store: GeoStore): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < VALIDATION_DURATION_MS) {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const distance = getDistance(
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        { latitude: store.latitude, longitude: store.longitude }
      );

      console.log(`[R2B Geo] ${store.name}: ${Math.round(distance)}m away`);
      await handleDistanceLogic(store, distance);

      // If confirmed at store, no need to keep polling
      if (distance <= ARRIVAL_DISTANCE_M) return;
    } catch {
      // GPS unavailable — skip this poll cycle
    }

    await sleep(VALIDATION_INTERVAL_MS);
  }
}

// ─── Distance Logic ───────────────────────────────────────────────────────────

async function handleDistanceLogic(store: GeoStore, distance: number): Promise<void> {
  if (distance <= APPROACH_DISTANCE_M) {
    await triggerApproach(store);
  }

  if (distance <= ARRIVAL_DISTANCE_M) {
    await startArrivalTimer(store);
  } else {
    cancelArrivalTimer(store.id);
  }
}

// ─── Approach Notification ────────────────────────────────────────────────────

async function triggerApproach(store: GeoStore): Promise<void> {
  const key = `r2b_lastApproach_${store.id}`;
  const last = await AsyncStorage.getItem(key);
  const now = Date.now();

  // Cooldown: don't fire more than once per 30 minutes
  if (last && now - Number(last) < APPROACH_COOLDOWN_MS) return;

  const items = await getUncheckedItems();
  const body =
    items.length > 0
      ? `Don't forget: ${buildItemList(items)}`
      : "Your shopping list is empty — nothing to buy here!";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📍 You're near ${store.name}`,
      body,
      sound: true,
      data: { storeId: store.id, type: "geofence_approach" },
    },
    trigger: null,
  });

  await AsyncStorage.setItem(key, String(now));
  console.log(`[R2B Geo] Approach notification sent for ${store.name}`);
}

// ─── Arrival Timer ────────────────────────────────────────────────────────────

async function startArrivalTimer(store: GeoStore): Promise<void> {
  // Only one timer per store at a time
  if (activeArrivalTimers[store.id]) return;

  await AsyncStorage.setItem(`r2b_arrivalTimer_${store.id}`, String(Date.now()));

  const timer = setTimeout(async () => {
    try {
      // Re-verify GPS distance before firing notification
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const distance = getDistance(
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        { latitude: store.latitude, longitude: store.longitude }
      );

      if (distance <= ARRIVAL_DISTANCE_M) {
        const items = await getUncheckedItems();
        const body =
          items.length > 0
            ? `Remember to buy: ${buildItemList(items)}`
            : "You're at the store — check your list!";

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🛒 You're at ${store.name}`,
            body,
            sound: true,
            data: { storeId: store.id, type: "geofence_arrived" },
          },
          trigger: null,
        });
        console.log(`[R2B Geo] Arrival notification sent for ${store.name}`);
      }
    } catch {
      // GPS unavailable at timer fire time — non-fatal
    }

    delete activeArrivalTimers[store.id];
    await AsyncStorage.removeItem(`r2b_arrivalTimer_${store.id}`);
  }, ARRIVAL_DELAY_MS);

  activeArrivalTimers[store.id] = timer;
  console.log(`[R2B Geo] 6-min arrival timer started for ${store.name}`);
}

function cancelArrivalTimer(storeId: string): void {
  if (activeArrivalTimers[storeId]) {
    clearTimeout(activeArrivalTimers[storeId]);
    delete activeArrivalTimers[storeId];
    AsyncStorage.removeItem(`r2b_arrivalTimer_${storeId}`).catch(() => {});
  }
}

// ─── Fallback: Check All Stores on App Launch ─────────────────────────────────

/**
 * Run validateProximity for every saved store on app open.
 * Catches cases where the geofence event was missed (app killed, OS restart, etc.).
 */
export async function checkAllStores(stores?: GeoStore[]): Promise<void> {
  try {
    const allStores = stores ?? (await getAllGeoStores());
    if (allStores.length === 0) return;
    // Run sequentially to avoid GPS request collisions
    for (const store of allStores) {
      await validateProximity(store);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Backup: Low-Frequency Location Updates ───────────────────────────────────

/**
 * Register a background location update task that fires every ~2 minutes.
 * Acts as a backup trigger if geofence events fail (OEM restrictions, GPS off, etc.).
 */
export async function startLocationUpdates(): Promise<void> {
  try {
    const active = await Location.hasStartedLocationUpdatesAsync(LOCATION_UPDATE_TASK);
    if (active) return;

    await Location.startLocationUpdatesAsync(LOCATION_UPDATE_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 2 * 60 * 1000,  // 2 minutes
      distanceInterval: 200,          // or every 200m moved
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: "Remember 2 Buy",
        notificationBody: "Watching for nearby stores...",
        notificationColor: "#7c3aed",
      },
      pausesUpdatesAutomatically: true,
    });
    console.log("[R2B Geo] Background location updates started");
  } catch (err) {
    console.warn("[R2B Geo] Could not start location updates:", err);
  }
}

export async function stopLocationUpdates(): Promise<void> {
  try {
    const active = await Location.hasStartedLocationUpdatesAsync(LOCATION_UPDATE_TASK);
    if (active) await Location.stopLocationUpdatesAsync(LOCATION_UPDATE_TASK);
  } catch {
    // Non-fatal
  }
}

// ─── Geofence Background Task ─────────────────────────────────────────────────

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[R2B Geo] Geofence task error:", error.message);
    return;
  }
  if (!data) return;

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  // Only act on ENTER — EXIT is disabled (notifyOnExit: false)
  if (eventType !== Location.GeofencingEventType.Enter) return;

  const storeId = region.identifier ?? "";
  const store = await getStoreById(storeId);
  if (!store) {
    console.warn("[R2B Geo] Geofence fired for unknown store:", storeId);
    return;
  }

  console.log(`[R2B Geo] Geofence ENTER for ${store.name} — starting GPS validation`);
  await validateProximity(store);
});

// ─── Backup Location Update Task ─────────────────────────────────────────────

TaskManager.defineTask(LOCATION_UPDATE_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[R2B Geo] Location update task error:", error.message);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations[locations.length - 1];
  if (!latest) return;

  try {
    const stores = await getAllGeoStores();
    for (const store of stores) {
      const distance = getDistance(
        { latitude: latest.coords.latitude, longitude: latest.coords.longitude },
        { latitude: store.latitude, longitude: store.longitude }
      );
      await handleDistanceLogic(store, distance);
    }
  } catch (err) {
    console.error("[R2B Geo] Location update processing error:", err);
  }
});

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

async function getUncheckedItems(): Promise<Array<{ text: string }>> {
  try {
    const all = await getAllShoppingItems();
    return all.filter((i) => !i.checked);
  } catch {
    return [];
  }
}

function buildItemList(items: Array<{ text: string }>): string {
  const top3 = items.slice(0, 3).map((i) => i.text);
  const extra = items.length - top3.length;
  let result = top3.join(", ");
  if (extra > 0) result += ` (and ${extra} more)`;
  return result;
}
