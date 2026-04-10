import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import { useColors } from "@/hooks/use-colors";
import { getDeviceOEM, OEM_GUIDES, type OEMBatteryGuide } from "@/lib/deviceDetection";

interface BatteryHelpScreenProps {
  onDone?: () => void;
  compact?: boolean; // show as compact card instead of full screen
}

export function BatteryHelpScreen({ onDone, compact = false }: BatteryHelpScreenProps) {
  const colors = useColors();
  const [guide, setGuide] = useState<OEMBatteryGuide | null>(null);

  useEffect(() => {
    getDeviceOEM().then((oem) => setGuide(OEM_GUIDES[oem]));
  }, []);

  async function openSettings() {
    if (Platform.OS !== "android" || !guide) return;
    try {
      if (guide.settingsAction === "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS") {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          { data: "package:space.manus.belief.field.detector" }
        );
      } else {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
          { data: "package:space.manus.belief.field.detector" }
        );
      }
    } catch {
      // Fallback: open general battery settings
      try {
        await IntentLauncher.startActivityAsync(
          "android.settings.BATTERY_SAVER_SETTINGS" as any
        );
      } catch {
        // ignore
      }
    }
  }

  if (!guide) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (Platform.OS !== "android") {
    return null; // iOS doesn't need battery optimization
  }

  const content = (
    <>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Fix Background Tracking
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Your {guide.displayName} phone may stop reminders unless you complete these steps.
      </Text>

      <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {guide.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={openSettings}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.buttonText}>Open Settings</Text>
      </Pressable>

      {onDone && (
        <Pressable onPress={onDone} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.muted }]}>I already did this</Text>
        </Pressable>
      )}
    </>
  );

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  compactContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    margin: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  stepsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  stepIcon: {
    fontSize: 18,
    width: 26,
    textAlign: "center",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
  },
});
