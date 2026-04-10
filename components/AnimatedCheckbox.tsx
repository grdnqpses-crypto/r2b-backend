import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { tapLight, success } from "@/lib/hapticFeedback";

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

export function AnimatedCheckbox({ checked, onToggle, size = 24 }: AnimatedCheckboxProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fillAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const checkAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fillAnim, {
        toValue: checked ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(checkAnim, {
        toValue: checked ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [checked]);

  function handlePress() {
    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();

    if (!checked) {
      success();
    } else {
      tapLight();
    }
    onToggle();
  }

  const backgroundColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.primary ?? "#0a7ea4"],
  });

  const borderColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary ?? "#0a7ea4"],
  });

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: size * 0.25,
            backgroundColor,
            borderColor,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.check,
            {
              fontSize: size * 0.6,
              opacity: checkAnim,
              transform: [{ scale: checkAnim }],
            },
          ]}
        >
          ✓
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    color: "#fff",
    fontWeight: "700",
    lineHeight: undefined,
  },
});
