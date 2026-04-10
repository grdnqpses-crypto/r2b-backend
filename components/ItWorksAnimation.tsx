import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

interface ItWorksAnimationProps {
  storeName: string;
  onDismiss: () => void;
}

export function ItWorksAnimation({ storeName, onDismiss }: ItWorksAnimationProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Haptic celebration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animate checkmark
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const checkScale = checkAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.2, 1] });

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: opacityAnim },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: "#22C55E",
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.Text style={[styles.checkmark, { transform: [{ scale: checkScale }] }]}>
          ✅
        </Animated.Text>

        <Text style={[styles.title, { color: colors.foreground }]}>
          It Works! 🎉
        </Text>

        <Text style={[styles.body, { color: colors.muted }]}>
          You're near{" "}
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>{storeName}</Text>
          {"\n"}and your reminder just fired.{"\n"}
          Remember2Buy is tracking you in the background.
        </Text>

        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: "#22C55E", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Got it!</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 32,
  },
  card: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    gap: 12,
  },
  checkmark: {
    fontSize: 56,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
