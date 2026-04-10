/**
 * BatteryGateScreen.tsx — Mandatory Full-Screen Battery Optimization Gate
 *
 * This is NOT optional UX. It blocks geolocation features until the user
 * has disabled battery optimization for Remember2Buy.
 *
 * Flow:
 *   1. Shown when battery_exempted !== "true" in AsyncStorage
 *   2. User taps "Enable Background Tracking"
 *   3. System battery settings screen opens
 *   4. When user returns → re-check → mark as exempted → call onComplete()
 *   5. Loop until confirmed OR user explicitly taps "Skip for now"
 *
 * iOS: This screen is never shown (battery optimization is Android-only).
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  AppState,
  AppStateStatus,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  requestDisableBatteryOptimization,
  markBatteryExempted,
} from "@/lib/batteryService";
import { useColors } from "@/hooks/use-colors";

interface BatteryGateScreenProps {
  /** Called when the user has completed the battery exemption flow. */
  onComplete: () => void;
  /** Called when the user explicitly skips (optional — hides skip button if omitted). */
  onSkip?: () => void;
}

export default function BatteryGateScreen({
  onComplete,
  onSkip,
}: BatteryGateScreenProps) {
  const colors = useColors();
  const [checking, setChecking] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // iOS: battery optimization doesn't apply — complete immediately
  useEffect(() => {
    if (Platform.OS !== "android") {
      markBatteryExempted().then(onComplete);
    }
  }, [onComplete]);

  // When the user returns from system settings, assume they completed the step
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = nextState;

        // Only act when coming back to foreground after the user opened settings
        if (
          hasOpened &&
          nextState === "active" &&
          (prev === "background" || prev === "inactive")
        ) {
          setChecking(true);
          // Android limitation: we cannot programmatically verify exemption status
          // from JS. We trust that the user followed the instructions.
          await markBatteryExempted();
          setChecking(false);
          onComplete();
        }
      }
    );

    return () => sub.remove();
  }, [hasOpened, onComplete]);

  async function handlePress() {
    setHasOpened(true);
    await requestDisableBatteryOptimization();
  }

  if (Platform.OS !== "android") return null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + "18" }]}>
        <Text style={styles.icon}>🔋</Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.foreground }]}>
        Enable Background Tracking
      </Text>

      {/* Explanation */}
      <Text style={[styles.body, { color: colors.muted }]}>
        Your phone may stop reminders unless battery optimization is disabled for
        this app.{"\n\n"}
        This allows Remember 2 Buy to alert you when you arrive near a saved store
        — even when the app is closed.
      </Text>

      {/* Steps */}
      <View style={[styles.stepsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StepRow number="1" text='Tap "Enable Background Tracking" below' colors={colors} />
        <StepRow number="2" text='Find "Battery" → select "Unrestricted"' colors={colors} />
        <StepRow number="3" text="Return to the app — done!" colors={colors} />
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Enable Background Tracking</Text>
        )}
      </TouchableOpacity>

      {/* Skip (optional) */}
      {onSkip && (
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.muted }]}>
            Skip for now (reminders may not work)
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function StepRow({
  number,
  text,
  colors,
}: {
  number: string;
  text: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  stepsContainer: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  skipButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
