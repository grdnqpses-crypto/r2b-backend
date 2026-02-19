import { useCallback } from "react";
import { Platform, Alert } from "react-native";
import type { ScanResult } from "./use-scan-history";

/**
 * Share scan results as text via the system share sheet.
 * Uses expo-sharing on native, Web Share API / clipboard on web.
 */
export function useShareResults() {
  const shareAsText = useCallback(async (result: ScanResult) => {
    const text = [
      `✨ Belief Field Detector Results ✨`,
      ``,
      `${result.beliefEmoji} ${result.beliefName}`,
      `Belief Field Score: ${result.score}/100`,
      `Intensity: ${result.intensity}/10`,
      ``,
      `Sensor Readings:`,
      ...result.sensorBreakdown.map(
        (s) => `  ${s.sensorName}: ${s.deviationPercent.toFixed(1)}% deviation`
      ),
      ``,
      result.summary,
      ``,
      `Measured with Belief Field Detector 📱`,
    ].join("\n");

    if (Platform.OS === "web") {
      // Use Web Share API or clipboard
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title: "Belief Field Results", text });
        } else if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          Alert.alert("Copied!", "Results copied to clipboard");
        }
      } catch {
        // User cancelled or not available
      }
      return;
    }

    // Native: write to temp file and share
    try {
      const FileSystem = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
      const Sharing = require("expo-sharing") as typeof import("expo-sharing");

      const fileUri = FileSystem.documentDirectory + "belief-field-results.txt";
      await FileSystem.writeAsStringAsync(fileUri, text);

      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: "Share Your Belief Field Results",
        });
      } else {
        Alert.alert("Sharing not available", "Sharing is not supported on this device.");
      }
    } catch {
      Alert.alert("Error", "Could not share results. Please try again.");
    }
  }, []);

  return { shareAsText };
}
