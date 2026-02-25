/**
 * Centralized safe imports for native modules that may crash on certain devices.
 *
 * Every component should import from here instead of directly from expo packages.
 * This ensures the app never crashes due to a missing or broken native module.
 *
 * Exports use the SAME names as the original packages so existing JSX/code works
 * with only an import path change.
 */
import React from "react";
import { View, Platform } from "react-native";

// ─── LinearGradient ────────────────────────────────────────────
let _LinearGradientImpl: any = null;
try {
  _LinearGradientImpl = require("expo-linear-gradient").LinearGradient;
} catch {
  // expo-linear-gradient not available
}

/**
 * Safe LinearGradient wrapper — falls back to a plain View with the first color
 * as background if the native module is unavailable.
 * Same API as expo-linear-gradient's LinearGradient.
 */
export function LinearGradient(props: {
  colors: string[];
  style?: any;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  children?: React.ReactNode;
  [key: string]: any;
}) {
  if (_LinearGradientImpl) {
    try {
      const LG = _LinearGradientImpl;
      return <LG {...props} />;
    } catch {
      // Fall through to fallback
    }
  }
  const { colors: gradColors, children, style, start, end, ...rest } = props;
  return (
    <View style={[style, { backgroundColor: gradColors?.[0] || "transparent" }]} {...rest}>
      {children}
    </View>
  );
}

// ─── Haptics ───────────────────────────────────────────────────
let _Haptics: any = null;
try {
  _Haptics = require("expo-haptics");
} catch {
  // expo-haptics not available
}

function _safeImpact(style?: any) {
  if (Platform.OS === "web" || !_Haptics) return;
  try {
    _Haptics.impactAsync(style ?? _Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

function _safeNotification(type?: any) {
  if (Platform.OS === "web" || !_Haptics) return;
  try {
    _Haptics.notificationAsync(type ?? _Haptics.NotificationFeedbackType.Success);
  } catch {}
}

function _safeSelection() {
  if (Platform.OS === "web" || !_Haptics) return;
  try {
    _Haptics.selectionAsync();
  } catch {}
}

/**
 * Drop-in replacement for `import * as Haptics from "expo-haptics"`.
 * All methods are wrapped in try-catch and no-op on web or if module is missing.
 */
export const Haptics = {
  impactAsync: _safeImpact,
  notificationAsync: _safeNotification,
  selectionAsync: _safeSelection,
  ImpactFeedbackStyle: _Haptics?.ImpactFeedbackStyle ?? {
    Light: 0,
    Medium: 1,
    Heavy: 2,
  },
  NotificationFeedbackType: _Haptics?.NotificationFeedbackType ?? {
    Success: 0,
    Warning: 1,
    Error: 2,
  },
};

// ─── KeepAwake ─────────────────────────────────────────────────
let _useKeepAwake: (() => void) | null = null;
try {
  _useKeepAwake = require("expo-keep-awake").useKeepAwake;
} catch {
  // expo-keep-awake not available
}

/**
 * Drop-in replacement for `import { useKeepAwake } from "expo-keep-awake"`.
 * Must be called at top level of a component (unconditionally) for Rules of Hooks.
 */
export function useKeepAwake() {
  try {
    if (_useKeepAwake) _useKeepAwake();
  } catch {
    // Non-fatal
  }
}
