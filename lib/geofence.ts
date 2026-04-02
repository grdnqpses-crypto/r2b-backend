import * as Location from "expo-location";
import { GEOFENCE_TASK_NAME } from "./tasks";
import { type SavedStore } from "./storage";

export { getSavedStores } from "./storage";

// 15 miles in meters
const GEOFENCE_RADIUS_METERS = 24140;

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
    // Stop geofencing if no stores
    await stopGeofencing();
    return;
  }

  const regions: GeofenceRegion[] = stores.map((store) => ({
    identifier: store.name,
    latitude: store.lat,
    longitude: store.lng,
    radius: GEOFENCE_RADIUS_METERS,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  // Android allows up to 100 geofences; iOS allows up to 20
  const limited = regions.slice(0, 20);

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
  } catch (err) {
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
