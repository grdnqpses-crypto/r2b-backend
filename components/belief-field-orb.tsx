import { useEffect, useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";

export interface BeliefFieldOrbProps {
  intensity: number; // 0-1
  score: number; // 0-100
  beliefEmoji: string;
  phase: "idle" | "calibrating" | "scanning" | "complete";
  size?: number; // optional size override (default 140)
}

// Particle symbols themed to belief energy
const PARTICLE_SYMBOLS = ["✦", "✧", "⋆", "◦", "·", "✵", "❋", "✺"];

interface ParticleConfig {
  id: number;
  symbol: string;
  angle: number;
  distance: number;
  delay: number;
  speed: number;
  size: number;
}

function generateParticles(count: number): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      symbol: PARTICLE_SYMBOLS[i % PARTICLE_SYMBOLS.length],
      angle: (360 / count) * i + Math.random() * 30,
      distance: 0.5 + Math.random() * 0.5, // 50-100% of ring radius
      delay: i * 150,
      speed: 2000 + Math.random() * 2000,
      size: 8 + Math.random() * 10,
    });
  }
  return particles;
}

function Particle({
  config,
  orbColor,
  containerRadius,
  active,
}: {
  config: ParticleConfig;
  orbColor: string;
  containerRadius: number;
  active: boolean;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (active) {
      opacity.value = withDelay(
        config.delay,
        withRepeat(
          withSequence(
            withTiming(0.8, { duration: config.speed * 0.4, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: config.speed * 0.6, easing: Easing.in(Easing.ease) })
          ),
          -1,
          false
        )
      );
      scale.value = withDelay(
        config.delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: config.speed * 0.3, easing: Easing.out(Easing.ease) }),
            withTiming(0.3, { duration: config.speed * 0.7, easing: Easing.in(Easing.ease) })
          ),
          -1,
          false
        )
      );
      drift.value = withDelay(
        config.delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: config.speed, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        )
      );
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.3, { duration: 300 });
    }
  }, [active]);

  const angleRad = (config.angle * Math.PI) / 180;
  const baseX = Math.cos(angleRad) * containerRadius * config.distance;
  const baseY = Math.sin(angleRad) * containerRadius * config.distance;

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: baseX + drift.value * Math.cos(angleRad) * 20 },
      { translateY: baseY + drift.value * Math.sin(angleRad) * 20 - drift.value * 15 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Text
      style={[
        {
          position: "absolute",
          fontSize: config.size,
          color: orbColor,
          textShadowColor: orbColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 4,
        },
        animStyle,
      ]}
    >
      {config.symbol}
    </Animated.Text>
  );
}

export function BeliefFieldOrb({ intensity, score, beliefEmoji, phase, size }: BeliefFieldOrbProps) {
  const colors = useColors();
  const orbSize = size || 140;
  const scale = orbSize / 140;
  const ring1 = Math.round(190 * scale);
  const ring2 = Math.round(240 * scale);
  const ring3 = Math.round(290 * scale);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const rotate = useSharedValue(0);

  // Generate particles based on score — more particles for higher scores
  const particleCount = Math.min(Math.max(Math.floor(score / 8), 3), 16);
  const particles = useMemo(() => generateParticles(particleCount), [particleCount]);
  const particlesActive = phase === "scanning" || phase === "complete";

  useEffect(() => {
    if (phase === "scanning" || phase === "calibrating") {
      const speed = 2000 - intensity * 1200;
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
      glow.value = withTiming(phase === "complete" ? 0.6 : 0, { duration: 500 });
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
  const emojiSize = Math.round(40 * scale);
  const scoreSize = Math.round(28 * scale);

  return (
    <View style={[styles.container, { width: ring3, height: ring3 }]}>
      {/* Outer rings */}
      <Animated.View
        style={[
          styles.ring,
          { width: ring3, height: ring3, borderRadius: ring3 / 2 },
          ring3Style,
          { borderColor: orbColor },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: ring2, height: ring2, borderRadius: ring2 / 2 },
          ring2Style,
          { borderColor: orbColor },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: ring1, height: ring1, borderRadius: ring1 / 2 },
          ring1Style,
          { borderColor: orbColor },
        ]}
      />

      {/* Particles */}
      {particles.map((p) => (
        <Particle
          key={p.id}
          config={p}
          orbColor={orbColor}
          containerRadius={ring2 / 2}
          active={particlesActive}
        />
      ))}

      {/* Core orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
          },
          orbStyle,
          {
            backgroundColor: orbColor,
            shadowColor: orbColor,
          },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: emojiSize }]}>{beliefEmoji}</Text>
        {phase !== "idle" && (
          <Text style={[styles.score, { fontSize: scoreSize }]}>{score}</Text>
        )}
      </Animated.View>

      {/* Label */}
      {phase !== "idle" && (
        <Text style={[styles.label, { color: colors.muted, fontSize: Math.round(12 * scale) }]}>
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

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  orb: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    zIndex: 10,
  },
  emoji: {},
  score: {
    fontWeight: "900",
    color: "#fff",
    marginTop: 2,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  label: {
    position: "absolute",
    bottom: -8,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
