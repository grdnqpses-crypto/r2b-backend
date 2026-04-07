/**
 * usePermissions — R2B Permissions Engine (Phase 3 — Master Directive)
 *
 * Orchestrates the exact chronological permission flow:
 *
 *   Step 1 — Notifications (expo-notifications)
 *   Step 2 — Foreground Location (Location.requestForegroundPermissionsAsync)
 *   Step 3 — Background Location (two-step: LocationDisclosureModal → requestBackgroundPermissionsAsync)
 *   Step 4 — Battery Optimization (BatteryDisclosureModal → expo-intent-launcher intent)
 *
 * Battery optimization check:
 *   Android does not expose a JS API to query this directly. We track it via
 *   AsyncStorage. On first launch we assume it is NOT exempted (batteryOptimizationEnabled = true).
 *   After the user acts on the intent we persist "r2b_battery_exemption_granted" = "true".
 *
 * Package: com.remember2buy.shopping (used in the battery intent URI)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PermissionState {
  /** Foreground location ("While Using") */
  foreground: boolean;
  /** Background location ("Allow all the time") */
  background: boolean;
  /** POST_NOTIFICATIONS (Android 13+ / iOS) */
  notifications: boolean;
  /**
   * True when the OS has NOT exempted this app from battery optimization.
   * Only meaningful on Android; always false on iOS / web.
   */
  batteryOptimizationEnabled: boolean;
  /** True while any async permission check is in progress */
  loading: boolean;
}

export interface UsePermissionsReturn extends PermissionState {
  /** Re-check all permission states (call after returning from Settings) */
  refresh: () => Promise<void>;

  // ── Individual request methods ──────────────────────────────────────────

  /** Step 1 — Request notification permission. Returns true if granted. */
  requestNotifications: () => Promise<boolean>;

  /**
   * Step 2 — Request foreground location.
   * Returns true if granted. If denied, halts the flow.
   */
  requestForeground: () => Promise<boolean>;

  /**
   * Step 3 — Request background location.
   * Must be called AFTER LocationDisclosureModal "Got It".
   * Opens the OS "Allow all the time" dialog.
   */
  requestBackground: () => Promise<void>;

  /**
   * Step 4 — Request battery optimization exemption.
   * Must be called AFTER BatteryDisclosureModal "Got It".
   * Uses expo-intent-launcher to fire the Android intent.
   */
  requestBatteryOptimizationExemption: () => Promise<void>;

  /**
   * Run the full sequential permission flow (Steps 1–4).
   * Returns an object describing which steps were completed.
   * Callers should show disclosure modals between steps 2→3 and 3→4.
   */
  runFullFlow: () => Promise<{
    notifications: boolean;
    foreground: boolean;
    background: boolean;
    batteryExempted: boolean;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANDROID_PACKAGE = "com.remember2buy.shopping";
const BATTERY_EXEMPTION_KEY = "r2b_battery_exemption_granted";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions(): UsePermissionsReturn {
  const [state, setState] = useState<PermissionState>({
    foreground: false,
    background: false,
    notifications: false,
    batteryOptimizationEnabled: true, // assume not exempted until proven otherwise
    loading: true,
  });

  const refreshingRef = useRef(false);

  // ── Battery optimization check ────────────────────────────────────────────

  const checkBatteryOptimization = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") return false;
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const exempted = await AsyncStorage.getItem(BATTERY_EXEMPTION_KEY);
      // true = still optimized (not exempted), false = exempted
      return exempted !== "true";
    } catch {
      return true; // assume worst case
    }
  }, []);

  // ── Refresh all states ────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const [fgPerm, bgPerm, notifPerm, battOpt] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
        Notifications.getPermissionsAsync(),
        checkBatteryOptimization(),
      ]);

      setState({
        foreground: fgPerm.status === "granted",
        background: bgPerm.status === "granted",
        notifications: notifPerm.status === "granted",
        batteryOptimizationEnabled: battOpt,
        loading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    } finally {
      refreshingRef.current = false;
    }
  }, [checkBatteryOptimization]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Step 1: Notifications ─────────────────────────────────────────────────

  const requestNotifications = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") {
        setState((prev) => ({ ...prev, notifications: true }));
        return true;
      }
      if (existing === "denied") {
        Alert.alert(
          "Notifications Blocked",
          "To receive store arrival alerts, please enable notifications for Remember2Buy in your device Settings.",
          [
            { text: "Not Now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      const granted = status === "granted";
      setState((prev) => ({ ...prev, notifications: granted }));
      return granted;
    } catch {
      return false;
    }
  }, []);

  // ── Step 2: Foreground Location ───────────────────────────────────────────

  const requestForeground = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === "granted") {
        setState((prev) => ({ ...prev, foreground: true }));
        return true;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setState((prev) => ({ ...prev, foreground: granted }));
      return granted;
    } catch {
      return false;
    }
  }, []);

  // ── Step 3: Background Location (called after LocationDisclosureModal) ────

  const requestBackground = useCallback(async (): Promise<void> => {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      const granted = status === "granted";
      setState((prev) => ({ ...prev, background: granted }));
      if (!granted) {
        Alert.alert(
          "Background Location Needed",
          "Please open Settings and select \"Location → Allow all the time\" to enable store arrival alerts.",
          [
            { text: "Not Now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch {
      // requestBackgroundPermissionsAsync may throw on some Android versions
      // when foreground is not yet granted. Fall back to Settings.
      Linking.openSettings();
    }
  }, []);

  // ── Step 4: Battery Optimization (called after BatteryDisclosureModal) ────

  const requestBatteryOptimizationExemption = useCallback(async (): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
      // Use expo-intent-launcher to fire the exact intent per directive
      const IntentLauncher = await import("expo-intent-launcher");
      await IntentLauncher.startActivityAsync(
        "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
        { data: `package:${ANDROID_PACKAGE}` }
      );
      // Mark as exempted in AsyncStorage
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem(BATTERY_EXEMPTION_KEY, "true");
      setState((prev) => ({ ...prev, batteryOptimizationEnabled: false }));
    } catch {
      // Intent may not be available on all OEMs — fall back to Settings
      try {
        await Linking.openSettings();
      } catch {
        // Non-fatal
      }
    }
  }, []);

  // ── Full sequential flow ──────────────────────────────────────────────────

  const runFullFlow = useCallback(async () => {
    const result = {
      notifications: false,
      foreground: false,
      background: false,
      batteryExempted: false,
    };

    // Step 1 — Notifications
    result.notifications = await requestNotifications();

    // Step 2 — Foreground Location (halt if denied)
    result.foreground = await requestForeground();
    if (!result.foreground) return result;

    // Steps 3 & 4 are triggered by disclosure modals in the UI layer.
    // The caller (Settings screen / Onboarding) shows LocationDisclosureModal
    // and BatteryDisclosureModal, then calls requestBackground() and
    // requestBatteryOptimizationExemption() respectively.

    return result;
  }, [requestNotifications, requestForeground]);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    ...state,
    refresh,
    requestNotifications,
    requestForeground,
    requestBackground,
    requestBatteryOptimizationExemption,
    runFullFlow,
  };
}
