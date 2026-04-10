import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Centralized haptic feedback utility.
 * All haptics are no-ops on web and handled gracefully on unsupported devices.
 */

function safe(fn: () => Promise<void>): void {
  if (Platform.OS === "web") return;
  fn().catch(() => {});
}

/** Light tap — list items, minor actions */
export function tapLight(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Medium tap — primary buttons, toggles */
export function tapMedium(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Heavy tap — destructive actions, confirmations */
export function tapHeavy(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** Success — item checked, trip completed, coupon saved */
export function success(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Warning — expiring coupon, low stock */
export function warning(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Error — permission denied, network failure */
export function error(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Double tap — geofence trigger, store arrival */
export async function doubleTap(): Promise<void> {
  if (Platform.OS === "web") return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  await new Promise((r) => setTimeout(r, 80));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Triple pulse — "It Works" celebration moment */
export async function celebrationPulse(): Promise<void> {
  if (Platform.OS === "web") return;
  const steps = [
    Haptics.ImpactFeedbackStyle.Light,
    Haptics.ImpactFeedbackStyle.Medium,
    Haptics.ImpactFeedbackStyle.Heavy,
  ];
  for (const style of steps) {
    await Haptics.impactAsync(style).catch(() => {});
    await new Promise((r) => setTimeout(r, 100));
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
