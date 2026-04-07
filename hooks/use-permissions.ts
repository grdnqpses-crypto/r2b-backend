/**
 * usePermissions — Centralized permission state and request flow for R2B.
 *
 * Handles three critical permission gates:
 *   1. Foreground Location ("While Using the App")
 *   2. Background Location ("Allow all the time") — two-step per Google Play policy
 *   3. Notifications (POST_NOTIFICATIONS on Android 13+)
 *
 * Also exposes battery optimization state and the intent to request exemption.
 *
 * Two-step background location flow (Android 11+ compliance):
 *   Step 1 → requestForegroundPermissionsAsync()
 *   Step 2 → Show LocationDisclosureModal (prominent disclosure)
 *   Step 3 → User taps "Got It" → requestBackgroundPermissionsAsync()
 *
 * Battery Optimization:
 *   Android kills background services unless the app is on the battery
 *   optimization whitelist. We detect this via the
 *   android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent and
 *   prompt the user to grant exemption.
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
  /**
   * Step 1 of the background location flow.
   * Requests foreground location. Returns true if granted.
   * Callers should show LocationDisclosureModal when this returns true
   * AND background is still false.
   */
  requestForeground: () => Promise<boolean>;
  /**
   * Step 3 of the background location flow.
   * Called after the user taps "Got It" on LocationDisclosureModal.
   * Opens the OS permission dialog (Android 11+) or Settings sheet.
   */
  requestBackground: () => Promise<void>;
  /** Request notification permission */
  requestNotifications: () => Promise<void>;
  /**
   * Opens the Android battery optimization exemption dialog.
   * On Android < 23 or iOS / web, this is a no-op.
   */
  requestBatteryOptimizationExemption: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions(): UsePermissionsReturn {
  const [state, setState] = useState<PermissionState>({
    foreground: false,
    background: false,
    notifications: false,
    batteryOptimizationEnabled: false,
    loading: true,
  });

  // Prevent duplicate concurrent refreshes
  const refreshingRef = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Check whether Android battery optimization is active for this app.
   * We cannot query this directly from JS, so we use a heuristic:
   * if the app is on Android and we have never successfully launched the
   * REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent, we assume it is enabled.
   * The flag is stored in AsyncStorage after the user acts on the prompt.
   */
  const checkBatteryOptimization = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") return false;
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const exempted = await AsyncStorage.getItem("r2b_battery_exemption_granted");
      return exempted !== "true";
    } catch {
      return false;
    }
  }, []);

  // ── Refresh ───────────────────────────────────────────────────────────────

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

  // Initial check on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Request Foreground ────────────────────────────────────────────────────

  const requestForeground = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setState((prev) => ({ ...prev, foreground: granted }));
      return granted;
    } catch {
      return false;
    }
  }, []);

  // ── Request Background (Step 3 — after prominent disclosure) ─────────────

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

  // ── Request Notifications ─────────────────────────────────────────────────

  const requestNotifications = useCallback(async (): Promise<void> => {
    if (Platform.OS === "web") return;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") {
        setState((prev) => ({ ...prev, notifications: true }));
        return;
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
        return;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      setState((prev) => ({ ...prev, notifications: status === "granted" }));
    } catch {
      // Non-fatal
    }
  }, []);

  // ── Battery Optimization Exemption ───────────────────────────────────────

  const requestBatteryOptimizationExemption = useCallback(async (): Promise<void> => {
    if (Platform.OS !== "android") return;
    try {
      const Constants = (await import("expo-constants")).default;
      const pkg =
        (Constants.expoConfig?.android?.package as string | undefined) ??
        "space.manus.belief.field.detector.t20250219030644";

      const intentUrl = `android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS?package=${pkg}`;

      const canOpen = await Linking.canOpenURL(intentUrl);
      if (canOpen) {
        await Linking.openURL(intentUrl);
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        await AsyncStorage.setItem("r2b_battery_exemption_granted", "true");
        setState((prev) => ({ ...prev, batteryOptimizationEnabled: false }));
      } else {
        await Linking.openSettings();
      }
    } catch {
      await Linking.openSettings();
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    ...state,
    refresh,
    requestForeground,
    requestBackground,
    requestNotifications,
    requestBatteryOptimizationExemption,
  };
}
