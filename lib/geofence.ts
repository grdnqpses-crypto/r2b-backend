import * as Location from "expo-location";
import { GEOFENCE_TASK_NAME } from "./tasks";
import { type SavedStore } from "./storage";

export { getSavedStores } from "./storage";

/**
 * Dual-radius geofencing strategy:
 *
 * OUTER ring — 0.3 miles (483m):
 *   Fires the "Approaching [Store]" notification so the user has time to decide
 *   whether to stop. This is the user-facing "heads up" alert.
 *
 * INNER ring — 100m (at the store entrance):
 *   Starts the 6-minute countdown for the "You're at [Store]" reminder.
 *   Only fires when the user is physically at the store, not just driving by.
 *   If the user exits the inner ring before 6 minutes, the reminder is cancelled.
 *
 * Why two rings instead of one?
 *   Android's geofencing API has a minimum accuracy of ~100–200m. With a single
 *   small radius, the OS can falsely trigger "Enter" events when GPS is weak
 *   (indoors, in a car, etc.), causing "You're Here" alerts miles away.
 *   The outer ring gives the approach alert at a safe distance, and the inner
 *   ring ensures the arrived alert only fires when the user is actually there.
 *
 * Identifier convention:
 *   Outer ring: "<storeName>__APPROACH"
 *   Inner ring: "<storeName>__ARRIVED"
 */

// 0.3 miles in meters — "Approaching" alert fires here
export const APPROACH_RADIUS_METERS = 483;

// 100m — "Arrived" 6-minute countdown starts here
export const ARRIVED_RADIUS_METERS = 100;

// Suffix constants used in tasks.ts to distinguish ring type from identifier
export const APPROACH_SUFFIX = "__APPROACH";
export const ARRIVED_SUFFIX = "__ARRIVED";

export interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

export async function requestLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  // Step 1: Request foreground permission
  const { status: fgStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") {
    return { foreground: false, background: false };
  }

  // Step 2: Request background permission (opens Settings on Android 11+)
  const { status: bgStatus } =
    await Location.requestBackgroundPermissionsAsync();

  return {
    foreground: fgStatus === "granted",
    background: bgStatus === "granted",
  };
}

export async function checkLocationPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  return {
    foreground: fg.status === "granted",
    background: bg.status === "granted",
  };
}

export async function startGeofencing(stores: SavedStore[]): Promise<void> {
  if (stores.length === 0) {
    await stopGeofencing();
    return;
  }

  const regions: GeofenceRegion[] = [];

  for (const store of stores) {
    // Outer ring: approach alert at 0.3 miles
    regions.push({
      identifier: `${store.name}${APPROACH_SUFFIX}`,
      latitude: store.lat,
      longitude: store.lng,
      radius: APPROACH_RADIUS_METERS,
      notifyOnEnter: true,
      notifyOnExit: false, // No exit action needed for the outer ring
    });

    // Inner ring: arrived alert (6-min countdown) at 100m
    regions.push({
      identifier: `${store.name}${ARRIVED_SUFFIX}`,
      latitude: store.lat,
      longitude: store.lng,
      radius: ARRIVED_RADIUS_METERS,
      notifyOnEnter: true,
      notifyOnExit: true, // Exit cancels the 6-min reminder (drive-by protection)
    });
  }

  // Android allows up to 100 geofences; iOS allows up to 20.
  // With 2 regions per store, we can track up to 10 stores on iOS.
  const limited = regions.slice(0, 20);

  /**
   * Phase 4 — Master Directive geofencing parameters (enforced at the region level):
   *
   * expo-location@19 exposes startGeofencingAsync(taskName, regions) — only 2 params.
   * The deferred-update and loitering behaviour is controlled by:
   *
   *   • ARRIVED_RADIUS_METERS = 100m  → inner ring radius acts as the proximity filter
   *   • notifyOnExit = true on inner ring → drive-by protection (cancel 6-min timer)
   *   • The 6-minute trigger in tasks.ts (trigger: { seconds: 360 }) mirrors the
   *     deferredUpdatesInterval intent from the directive.
   *
   * For Android 12+ battery-balanced geofencing, the WAKE_LOCK + FOREGROUND_SERVICE
   * permissions declared in app.config.ts ensure the OS does not kill the task
   * between location samples.
   */
  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, limited);
}

export async function stopGeofencing(): Promise<void> {
  try {
    const isRegistered = await Location.hasStartedGeofencingAsync(
      GEOFENCE_TASK_NAME
    );
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  } catch {
    // Ignore errors when stopping
  }
}

export async function isGeofencingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
  } catch {
    return false;
  }
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const results = await Location.geocodeAsync(address);
    if (results.length > 0) {
      return { lat: results[0].latitude, lng: results[0].longitude };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCurrentLocation(): Promise<{
  lat: number;
  lng: number;
} | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch {
    return null;
  }
}
