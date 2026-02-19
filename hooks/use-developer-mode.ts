import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEV_MODE_KEY = "@belief_dev_mode";
const TAPS_REQUIRED = 11;
const TAP_TIMEOUT = 3000; // Reset tap counter after 3 seconds of inactivity

export interface DevModeData {
  enabled: boolean;
  showRawSensorData: boolean;
  showAlgorithmDetails: boolean;
  showPerformanceMetrics: boolean;
  bypassPremium: boolean;
  forceHighScore: boolean;
  debugLogging: boolean;
}

const DEFAULT_DEV: DevModeData = {
  enabled: false,
  showRawSensorData: false,
  showAlgorithmDetails: false,
  showPerformanceMetrics: false,
  bypassPremium: false,
  forceHighScore: false,
  debugLogging: false,
};

export function useDeveloperMode() {
  const [devMode, setDevMode] = useState<DevModeData>(DEFAULT_DEV);
  const [tapCount, setTapCount] = useState(0);
  const [showToast, setShowToast] = useState("");
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved state
  useEffect(() => {
    AsyncStorage.getItem(DEV_MODE_KEY).then((raw) => {
      if (raw) {
        try {
          setDevMode({ ...DEFAULT_DEV, ...JSON.parse(raw) });
        } catch {}
      }
    });
  }, []);

  /** Register a tap on the hidden activation area (e.g., version number or logo) */
  const registerTap = useCallback(() => {
    // Clear existing timer
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    setTapCount((prev) => {
      const next = prev + 1;

      if (next >= TAPS_REQUIRED) {
        // Activate developer mode!
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setDevMode((d) => {
          const updated = { ...d, enabled: true };
          AsyncStorage.setItem(DEV_MODE_KEY, JSON.stringify(updated));
          return updated;
        });
        setShowToast("Developer Mode Activated!");
        setTimeout(() => setShowToast(""), 3000);
        return 0;
      }

      // Show countdown hints
      const remaining = TAPS_REQUIRED - next;
      if (remaining <= 5 && remaining > 0) {
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setShowToast(`${remaining} more tap${remaining === 1 ? "" : "s"} to unlock developer mode`);
        setTimeout(() => setShowToast(""), 2000);
      }

      // Reset timer
      tapTimerRef.current = setTimeout(() => {
        setTapCount(0);
      }, TAP_TIMEOUT);

      return next;
    });
  }, []);

  /** Update a developer mode setting */
  const updateDevSetting = useCallback(
    async (partial: Partial<DevModeData>) => {
      setDevMode((prev) => {
        const next = { ...prev, ...partial };
        AsyncStorage.setItem(DEV_MODE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  /** Disable developer mode entirely */
  const disableDevMode = useCallback(async () => {
    const reset = { ...DEFAULT_DEV, enabled: false };
    setDevMode(reset);
    await AsyncStorage.setItem(DEV_MODE_KEY, JSON.stringify(reset));
    setShowToast("Developer Mode Disabled");
    setTimeout(() => setShowToast(""), 2000);
  }, []);

  return {
    devMode,
    tapCount,
    showToast,
    registerTap,
    updateDevSetting,
    disableDevMode,
  };
}
