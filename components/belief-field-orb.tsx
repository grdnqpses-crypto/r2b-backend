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
import type { ItemTheme } from "@/constants/item-themes";

export interface ItemOrbProps {
  intensity: number; // 0-1
  score: number; // 0-100
  itemEmoji: string;
  phase: "idle" | "calibrating" | "scanning" | "complete";
  size?: number;
  theme?: ItemTheme;
  /** When true, render a static orb with no animations (warm-up phase) */
  warmUp?: boolean;
  /** Maximum number of particles to show (for gradual particle loading) */
  maxParticles?: number;
}

const DEFAULT_SYMBOLS = ["✦", "✧", "⋆", "◦", "·", "✵", "❋", "✺"];

interface ParticleConfig {
  id: number;
  symbol: string;
  angle: number;
  distance: number;
  delay: number;
  speed: number;
  size: number;
  colorIndex: number;
}

function generateParticles(count: number, symbols: string[]): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      symbol: symbols[i % symbols.length],
      angle: (360 / count) * i + Math.random() * 30,
      distance: 0.5 + Math.random() * 0.5,
      delay: i * 150,
      speed: 2000 + Math.random() * 2000,
      size: 8 + Math.random() * 10,
      colorIndex: i,
    });
  }
  return particles;
}

function Particle({
  config,
  particleColor,
  containerRadius,
  active,
}: {
  config: ParticleConfig;
  particleColor: string;
  containerRadius: number;
  active: boolean;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const drift = useSharedValue(0);

  useEffect(() => {
    try {
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
    } catch (err) {
      // Animation setup failed — particle just won't animate
      console.warn("[Particle] Animation error:", err);
    }
  }, [active]);

  const angleRad = (config.angle * Math.PI) / 180;
  const baseX = Math.cos(angleRad) * containerRadius * config.distance;
  const baseY = Math.sin(angleRad) * containerRadius * config.distance;

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const o = typeof opacity.value === 'number' && isFinite(opacity.value) ? opacity.value : 0;
    const d = typeof drift.value === 'number' && isFinite(drift.value) ? drift.value : 0;
    const s = typeof scale.value === 'number' && isFinite(scale.value) ? scale.value : 0.3;
    return {
      opacity: o,
      transform: [
        { translateX: baseX + d * Math.cos(angleRad) * 20 },
        { translateY: baseY + d * Math.sin(angleRad) * 20 - d * 15 },
        { scale: s },
      ],
    };
  });

  return (
    <Animated.Text
      style={[
        {
          position: "absolute",
          fontSize: config.size,
          color: particleColor,
          textShadowColor: particleColor,
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

export function ItemOrb({
  intensity,
  score,
  itemEmoji,
  phase,
  size,
  theme,
  warmUp = false,
  maxParticles,
}: ItemOrbProps) {
  const colors = useColors();
  const orbSize = size || 140;
  const scaleF = orbSize / 140;
  const ring1 = Math.round(190 * scaleF);
  const ring2 = Math.round(240 * scaleF);
  const ring3 = Math.round(290 * scaleF);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const rotate = useSharedValue(0);

  const particleSymbols = theme?.ambientSymbols || DEFAULT_SYMBOLS;
  const particleColors = theme?.particleColors || [];

  // Limit particle count — use maxParticles prop for gradual loading
  const rawParticleCount = Math.min(Math.max(Math.floor(score / 10), 3), 12);
  const particleCount = maxParticles != null ? Math.min(rawParticleCount, maxParticles) : rawParticleCount;
  const particles = useMemo(
    () => generateParticles(particleCount, particleSymbols),
    [particleCount, particleSymbols]
  );
  // Only show particles when NOT in warm-up mode
  const particlesActive = !warmUp && (phase === "scanning" || phase === "complete");

  useEffect(() => {
    try {
      // In warm-up mode, don't start any animations
      if (warmUp) {
        pulse.value = 1;
        glow.value = 0;
        rotate.value = 0;
        return;
      }

      if (phase === "scanning" || phase === "calibrating") {
        const speed = Math.max(2000 - intensity * 1200, 400);
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
        const rotateDuration = Math.max(20000 - intensity * 12000, 5000);
        rotate.value = withRepeat(
          withTiming(360, { duration: rotateDuration, easing: Easing.linear }),
          -1,
          false
        );
      } else {
        pulse.value = withTiming(1, { duration: 500 });
        glow.value = withTiming(phase === "complete" ? 0.6 : 0, { duration: 500 });
      }
    } catch (err) {
      // Animation setup failed — orb just won't animate
      console.warn("[ItemOrb] Animation error:", err);
    }
  }, [phase, intensity, warmUp]);

  const orbStyle = useAnimatedStyle(() => {
    'worklet';
    const s = typeof pulse.value === 'number' && isFinite(pulse.value) ? pulse.value : 1;
    return { transform: [{ scale: s }] };
  });

  const ring1Style = useAnimatedStyle(() => {
    'worklet';
    const g = typeof glow.value === 'number' && isFinite(glow.value) ? glow.value : 0;
    const r = typeof rotate.value === 'number' && isFinite(rotate.value) ? rotate.value : 0;
    return {
      transform: [{ scale: 1 + g * 0.3 }, { rotate: `${r}deg` }],
      opacity: 0.15 + g * 0.35,
    };
  });

  const ring2Style = useAnimatedStyle(() => {
    'worklet';
    const g = typeof glow.value === 'number' && isFinite(glow.value) ? glow.value : 0;
    const r = typeof rotate.value === 'number' && isFinite(rotate.value) ? rotate.value : 0;
    return {
      transform: [{ scale: 1 + g * 0.5 }, { rotate: `${-r * 0.7}deg` }],
      opacity: 0.1 + g * 0.2,
    };
  });

  const ring3Style = useAnimatedStyle(() => {
    'worklet';
    const g = typeof glow.value === 'number' && isFinite(glow.value) ? glow.value : 0;
    return {
      transform: [{ scale: 1 + g * 0.7 }],
      opacity: 0.05 + g * 0.15,
    };
  });

  const getOrbColor = () => {
    if (theme) return theme.orbGlow;
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.primary;
    if (score >= 20) return colors.warning;
    return colors.muted;
  };

  const getRingColor = () => {
    if (theme) return theme.orbRing;
    return getOrbColor();
  };

  const orbColor = getOrbColor();
  const ringColor = getRingColor();
  const emojiSize = Math.round(40 * scaleF);
  const scoreSize = Math.round(28 * scaleF);

  return (
    <View style={[styles.container, { width: ring3, height: ring3 }]}>
      {/* Outer rings — only render when NOT in warm-up */}
      {!warmUp && (
        <>
          <Animated.View
            style={[
              styles.ring,
              { width: ring3, height: ring3, borderRadius: ring3 / 2 },
              ring3Style,
              { borderColor: ringColor },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              { width: ring2, height: ring2, borderRadius: ring2 / 2 },
              ring2Style,
              { borderColor: ringColor },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              { width: ring1, height: ring1, borderRadius: ring1 / 2 },
              ring1Style,
              { borderColor: ringColor },
            ]}
          />
        </>
      )}

      {/* Static rings during warm-up */}
      {warmUp && (
        <>
          <View
            style={[
              styles.ring,
              { width: ring3, height: ring3, borderRadius: ring3 / 2, opacity: 0.15, borderColor: ringColor },
            ]}
          />
          <View
            style={[
              styles.ring,
              { width: ring2, height: ring2, borderRadius: ring2 / 2, opacity: 0.1, borderColor: ringColor },
            ]}
          />
          <View
            style={[
              styles.ring,
              { width: ring1, height: ring1, borderRadius: ring1 / 2, opacity: 0.15, borderColor: ringColor },
            ]}
          />
        </>
      )}

      {/* Particles — only when not in warm-up */}
      {!warmUp &&
        particles.map((p) => {
          const pColor =
            particleColors.length > 0
              ? particleColors[p.colorIndex % particleColors.length]
              : orbColor;
          return (
            <Particle
              key={p.id}
              config={p}
              particleColor={pColor}
              containerRadius={ring2 / 2}
              active={particlesActive}
            />
          );
        })}

      {/* Core orb */}
      {warmUp ? (
        <View
          style={[
            styles.orb,
            {
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize / 2,
              backgroundColor: orbColor,
              shadowColor: orbColor,
            },
          ]}
        >
          <Text style={[styles.emoji, { fontSize: emojiSize }]}>{itemEmoji}</Text>
          {phase !== "idle" && (
            <Text style={[styles.score, { fontSize: scoreSize }]}>{score}</Text>
          )}
        </View>
      ) : (
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
          <Text style={[styles.emoji, { fontSize: emojiSize }]}>{itemEmoji}</Text>
          {phase !== "idle" && (
            <Text style={[styles.score, { fontSize: scoreSize }]}>{score}</Text>
          )}
        </Animated.View>
      )}

      {/* Label */}
      {phase !== "idle" && (
        <Text
          style={[
            styles.label,
            { color: theme?.accent || colors.muted, fontSize: Math.round(12 * scaleF) },
          ]}
        >
          {warmUp
            ? "Initializing..."
            : phase === "calibrating"
            ? "Calibrating sensors..."
            : phase === "complete"
            ? "Scan Complete"
            : theme?.atmosphereLabel || "item Field Strength"}
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
