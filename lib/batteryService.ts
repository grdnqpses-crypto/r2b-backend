/**
 * batteryService.ts — Android Battery Optimization Enforcement
 *
 * Provides functions to check and request battery optimization exemption.
 * iOS is not affected — battery optimization is Android-only.
 *
 * Usage:
 *   const exempt = await isBatteryExempted();
 *   if (!exempt) showBatteryGate();
 */

import { Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const BATTERY_EXEMPTION_KEY = "r2b_battery_exempted";
const ANDROID_PACKAGE = "com.remember2buy.shopping";

/**
 * Check if the user has already completed the battery exemption flow.
 * Uses AsyncStorage as the source of truth (Android's PowerManager API
 * is not accessible from JS without a native module).
 */
export async function isBatteryExempted(): Promise<boolean> {
  if (Platform.OS !== "android") return true; // iOS: always exempt
  try {
    const val = await AsyncStorage.getItem(BATTERY_EXEMPTION_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

/**
 * Open the system battery optimization screen for this app.
 *
 * Primary intent: REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 *   → Takes user directly to the "Allow" dialog for this app.
 *   → Blocked by some OEMs (Samsung, Xiaomi, OPPO, Huawei).
 *
 * Fallback intent: APPLICATION_DETAILS_SETTINGS
 *   → Opens the app's system settings page where user can manually
 *     navigate to Battery → Unrestricted.
 *
 * Returns true if the primary intent succeeded, false if fallback was used.
 */
export async function requestDisableBatteryOptimization(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      { data: `package:${ANDROID_PACKAGE}` }
    );
    return true;
  } catch {
    // OEM blocks the direct intent — fall back to app settings
    try {
      await IntentLauncher.startActivityAsync(
        "android.settings.APPLICATION_DETAILS_SETTINGS",
        { data: `package:${ANDROID_PACKAGE}` }
      );
    } catch {
      // Last resort — open general app settings
      const { Linking } = await import("react-native");
      await Linking.openSettings();
    }
    return false;
  }
}

/**
 * Mark the battery exemption as completed in AsyncStorage.
 * Called when the user returns from the system settings screen.
 */
export async function markBatteryExempted(): Promise<void> {
  await AsyncStorage.setItem(BATTERY_EXEMPTION_KEY, "true");
}

/**
 * Clear the battery exemption flag (for testing/reset purposes).
 */
export async function clearBatteryExemption(): Promise<void> {
  await AsyncStorage.removeItem(BATTERY_EXEMPTION_KEY);
}
