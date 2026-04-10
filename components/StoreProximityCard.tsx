import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated, Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { type SavedStore } from "@/lib/storage";

export type ProximityState = "far" | "getting-close" | "almost-there" | "at-store";

interface StoreProximityCardProps {
  store: SavedStore;
  distanceMeters: number | null; // null = unknown
  itemCount?: number;
  onPress?: () => void;
}

function getProximityState(meters: number | null): ProximityState {
  if (meters === null) return "far";
  if (meters <= 100) return "at-store";
  if (meters <= 483) return "almost-there"; // ~0.3 miles
  if (meters <= 1609) return "getting-close"; // ~1 mile
  return "far";
}

function formatDistance(meters: number, unit: "miles" | "km" = "miles"): string {
  if (unit === "km") {
    const km = meters / 1000;
    return km < 1 ? `${Math.round(meters)}m away` : `${km.toFixed(1)} km away`;
  }
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)}m away`;
  return `${miles.toFixed(2)} mi away`;
}

const PROXIMITY_CONFIG: Record<ProximityState, { label: string; color: string; emoji: string }> = {
  far: { label: "Far", color: "#9BA1A6", emoji: "📍" },
  "getting-close": { label: "Getting Close", color: "#F59E0B", emoji: "🚗" },
  "almost-there": { label: "Almost There", color: "#F97316", emoji: "🏃" },
  "at-store": { label: "At Store", color: "#22C55E", emoji: "🛒" },
};

export function StoreProximityCard({
  store,
  distanceMeters,
  itemCount = 0,
  onPress,
}: StoreProximityCardProps) {
  const colors = useColors();
  const state = getProximityState(distanceMeters);
  const config = PROXIMITY_CONFIG[state];
  const prevState = useRef<ProximityState>(state);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [showGlow, setShowGlow] = useState(false);

  // Trigger glow + haptic when transitioning to "almost-there" or "at-store"
  useEffect(() => {
    const prev = prevState.current;
    prevState.current = state;
    if (
      (state === "almost-there" && prev !== "almost-there" && prev !== "at-store") ||
      (state === "at-store" && prev !== "at-store")
    ) {
      setShowGlow(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start(() => setShowGlow(false));
    }
  }, [state]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: state !== "far" ? config.color : colors.border,
          borderWidth: state !== "far" ? 1.5 : 1,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Glow overlay */}
      {showGlow && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: config.color, opacity: glowOpacity, borderRadius: 14 },
          ]}
          pointerEvents="none"
        />
      )}

      <View style={styles.row}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <View style={styles.info}>
          <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
            {store.name}
          </Text>
          <Text style={[styles.distance, { color: colors.muted }]}>
            {distanceMeters !== null ? formatDistance(distanceMeters) : "Distance unknown"}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: config.color + "22" }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      {itemCount > 0 && (
        <View style={[styles.itemsRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.itemsText, { color: colors.muted }]}>
            🛍️ {itemCount} item{itemCount !== 1 ? "s" : ""} on your list
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  emoji: {
    fontSize: 24,
    width: 32,
    textAlign: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  distance: {
    fontSize: 12,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  itemsRow: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  itemsText: {
    fontSize: 12,
  },
});
