import { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";

interface BeliefFieldOrbProps {
  intensity: number; // 0-1
  score: number; // 0-100
  beliefEmoji: string;
  phase: "idle" | "calibrating" | "scanning" | "complete";
}

export function BeliefFieldOrb({ intensity, score, beliefEmoji, phase }: BeliefFieldOrbProps) {
  const colors = useColors();
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (phase === "scanning" || phase === "calibrating") {
      const speed = 2000 - intensity * 1200; // faster pulse with higher intensity
      pulse.value = withRepeat(
        withSequence(
          withTiming(1 + intensity * 0.15, { duration: speed, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: speed, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: speed * 1.5, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: speed * 1.5, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      rotate.value = withRepeat(
        withTiming(360, { duration: 20000 - intensity * 12000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(1, { duration: 500 });
      glow.value = withTiming(0, { duration: 500 });
    }
  }, [phase, intensity]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + glow.value * 0.3 }, { rotate: `${rotate.value}deg` }],
    opacity: 0.15 + glow.value * 0.35,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + glow.value * 0.5 }, { rotate: `${-rotate.value * 0.7}deg` }],
    opacity: 0.1 + glow.value * 0.2,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + glow.value * 0.7 }],
    opacity: 0.05 + glow.value * 0.15,
  }));

  const getOrbColor = () => {
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.primary;
    if (score >= 20) return colors.warning;
    return colors.muted;
  };

  const orbColor = getOrbColor();

  return (
    <View style={styles.container}>
      {/* Outer rings */}
      <Animated.View
        style={[
          styles.ring,
          styles.ring3,
          ring3Style,
          { borderColor: orbColor },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.ring2,
          ring2Style,
          { borderColor: orbColor },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.ring1,
          ring1Style,
          { borderColor: orbColor },
        ]}
      />

      {/* Core orb */}
      <Animated.View
        style={[
          styles.orb,
          orbStyle,
          {
            backgroundColor: orbColor,
            shadowColor: orbColor,
          },
        ]}
      >
        <Text style={styles.emoji}>{beliefEmoji}</Text>
        {phase !== "idle" && (
          <Text style={styles.score}>{score}</Text>
        )}
      </Animated.View>

      {/* Label */}
      {phase !== "idle" && (
        <Text style={[styles.label, { color: colors.muted }]}>
          {phase === "calibrating"
            ? "Calibrating..."
            : phase === "complete"
            ? "Scan Complete"
            : "Belief Field Strength"}
        </Text>
      )}
    </View>
  );
}

const ORB_SIZE = 140;
const RING1 = 190;
const RING2 = 240;
const RING3 = 290;

const styles = StyleSheet.create({
  container: {
    width: RING3,
    height: RING3,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    zIndex: 10,
  },
  emoji: {
    fontSize: 40,
  },
  score: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginTop: 2,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 999,
  },
  ring1: {
    width: RING1,
    height: RING1,
    borderRadius: RING1 / 2,
  },
  ring2: {
    width: RING2,
    height: RING2,
    borderRadius: RING2 / 2,
  },
  ring3: {
    width: RING3,
    height: RING3,
    borderRadius: RING3 / 2,
  },
  label: {
    position: "absolute",
    bottom: -8,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
