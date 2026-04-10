import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export type TrackingStatus = "active" | "limited" | "disabled";

interface LiveTrackingIndicatorProps {
  status: TrackingStatus;
}

const STATUS_CONFIG: Record<TrackingStatus, { color: string; label: string; pulse: boolean }> = {
  active: { color: "#22C55E", label: "Tracking Active", pulse: true },
  limited: { color: "#F59E0B", label: "Tracking Limited", pulse: false },
  disabled: { color: "#EF4444", label: "Tracking Off", pulse: false },
};

export function LiveTrackingIndicator({ status }: LiveTrackingIndicatorProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const config = STATUS_CONFIG[status];

  useEffect(() => {
    if (!config.pulse) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [status]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: config.color, opacity: pulseAnim },
        ]}
      />
      <Text style={[styles.label, { color: colors.foreground }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
