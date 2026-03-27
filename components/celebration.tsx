/**
 * Celebration Component
 *
 * Displays confetti and fireworks when a scan completes with a high item score.
 * - Score >= 80: Full confetti burst + success haptic
 * - Score >= 60: Moderate confetti + impact haptic
 * - Score >= 40: Light confetti
 * - Score < 40: No celebration (item is still growing)
 *
 * Uses react-native-confetti-cannon for the particle effect.
 * Falls back gracefully on web (no confetti, just a glow animation).
 */

import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions, Platform, Animated, Text } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useColors } from "@/hooks/use-colors";
import { Haptics } from "@/lib/safe-imports";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface CelebrationProps {
  score: number;
  itemEmoji?: string;
  visible: boolean;
  onComplete?: () => void;
}

export function Celebration({ score, itemEmoji, visible, onComplete }: CelebrationProps) {
  const colors = useColors();
  const cannon1Ref = useRef<ConfettiCannon>(null);
  const cannon2Ref = useRef<ConfettiCannon>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [emojiVisible, setEmojiVisible] = useState(false);
  const firedRef = useRef(false);

  const celebrationLevel = score >= 80 ? "extraordinary" : score >= 60 ? "powerful" : score >= 40 ? "strong" : "none";

  useEffect(() => {
    if (!visible || celebrationLevel === "none" || firedRef.current) return;
    firedRef.current = true;

    // Haptic feedback
    if (Platform.OS !== "web") {
      if (celebrationLevel === "extraordinary") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      } else if (celebrationLevel === "powerful") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    // Show emoji burst
    setEmojiVisible(true);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }),
      Animated.delay(1200),
      Animated.timing(scaleAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setEmojiVisible(false);
      onComplete?.();
    });

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      { iterations: 3 }
    ).start();

    // Fire confetti
    setTimeout(() => {
      cannon1Ref.current?.start();
    }, 100);

    if (celebrationLevel === "extraordinary") {
      setTimeout(() => {
        cannon2Ref.current?.start();
      }, 500);
    }
  }, [visible, celebrationLevel]);

  // Reset for next use
  useEffect(() => {
    if (!visible) {
      firedRef.current = false;
    }
  }, [visible]);

  if (!visible || celebrationLevel === "none") return null;

  const confettiCount = celebrationLevel === "extraordinary" ? 200 : celebrationLevel === "powerful" ? 120 : 60;
  const confettiColors = [
    colors.primary,
    colors.success,
    "#FFD700",
    "#FF69B4",
    "#00CED1",
    "#FF6347",
    "#9370DB",
    "#32CD32",
  ];

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            backgroundColor: colors.primary + "20",
          },
        ]}
      />

      {/* Primary confetti cannon — top center */}
      {Platform.OS !== "web" && (
        <ConfettiCannon
          ref={cannon1Ref}
          count={confettiCount}
          origin={{ x: SCREEN_WIDTH / 2, y: -20 }}
          autoStart={false}
          fadeOut
          fallSpeed={3500}
          explosionSpeed={350}
          colors={confettiColors}
        />
      )}

      {/* Secondary cannon for extraordinary — top right */}
      {Platform.OS !== "web" && celebrationLevel === "extraordinary" && (
        <ConfettiCannon
          ref={cannon2Ref}
          count={100}
          origin={{ x: SCREEN_WIDTH, y: -20 }}
          autoStart={false}
          fadeOut
          fallSpeed={4000}
          explosionSpeed={300}
          colors={confettiColors}
        />
      )}

      {/* Emoji burst overlay */}
      {emojiVisible && (
        <View style={styles.emojiContainer} pointerEvents="none">
          <Animated.View style={[styles.emojiWrap, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.emojiText}>{itemEmoji ?? "✨"}</Text>
            <Text style={styles.celebrationText}>
              {celebrationLevel === "extraordinary"
                ? "Extraordinary!"
                : celebrationLevel === "powerful"
                ? "Powerful item!"
                : "Strong item!"}
            </Text>
          </Animated.View>
        </View>
      )}

      {/* Web fallback: emoji-only celebration */}
      {Platform.OS === "web" && emojiVisible && (
        <View style={styles.webCelebration} pointerEvents="none">
          <Text style={styles.webEmoji}>🎉 {itemEmoji} 🎉</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  emojiContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiWrap: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  emojiText: {
    fontSize: 72,
    textAlign: "center",
  },
  celebrationText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFD700",
    marginTop: 8,
    textAlign: "center",
    letterSpacing: 1,
  },
  webCelebration: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  webEmoji: {
    fontSize: 48,
    textAlign: "center",
  },
});
