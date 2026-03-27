/**
 * ImpactReveal
 *
 * Full-screen dramatic score reveal that fires when a scan completes.
 * - Flashes the screen with a color burst
 * - Animates the score number counting up from 0
 * - Pulses expanding rings outward from center
 * - Shows floating item emoji particles
 * - Plays an intensity-based sound (emerging → extraordinary)
 * - Triggers haptics scaled to score
 *
 * Tiers:
 *   0-19  : Emerging   — soft blue glow, gentle hum
 *   20-39 : Growing    — warm amber, rising tone
 *   40-59 : Strong     — bright purple, bell chime
 *   60-79 : Powerful   — electric green, crystal bowl
 *   80+   : Extraordinary — gold/white explosion, epic chime burst
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Haptics } from "@/lib/safe-imports";

const { width: W, height: H } = Dimensions.get("window");

// ─── Sound assets ─────────────────────────────────────────────────────────────
const SOUNDS = {
  emerging:      require("@/assets/sounds/emerging.mp3"),
  growing:       require("@/assets/sounds/growing.mp3"),
  strong:        require("@/assets/sounds/strong.mp3"),
  powerful:      require("@/assets/sounds/powerful.mp3"),
  extraordinary: require("@/assets/sounds/extraordinary.mp3"),
} as const;

type SoundKey = keyof typeof SOUNDS;

// ─── Tier config ──────────────────────────────────────────────────────────────
interface Tier {
  sound: SoundKey;
  label: string;
  color: string;
  glowColor: string;
  ringCount: number;
  particleCount: number;
  flashOpacity: number;
  labelColor: string;
}

function getTier(score: number): Tier {
  if (score >= 80) return {
    sound: "extraordinary",
    label: "EXTRAORDINARY",
    color: "#FFD700",
    glowColor: "#FFD70040",
    ringCount: 5,
    particleCount: 12,
    flashOpacity: 0.55,
    labelColor: "#FFD700",
  };
  if (score >= 60) return {
    sound: "powerful",
    label: "POWERFUL",
    color: "#4ADE80",
    glowColor: "#4ADE8040",
    ringCount: 4,
    particleCount: 8,
    flashOpacity: 0.4,
    labelColor: "#4ADE80",
  };
  if (score >= 40) return {
    sound: "strong",
    label: "STRONG",
    color: "#9B7AFF",
    glowColor: "#9B7AFF35",
    ringCount: 3,
    particleCount: 6,
    flashOpacity: 0.3,
    labelColor: "#9B7AFF",
  };
  if (score >= 20) return {
    sound: "growing",
    label: "GROWING",
    color: "#FBBF24",
    glowColor: "#FBBF2430",
    ringCount: 2,
    particleCount: 4,
    flashOpacity: 0.2,
    labelColor: "#FBBF24",
  };
  return {
    sound: "emerging",
    label: "EMERGING",
    color: "#60A5FA",
    glowColor: "#60A5FA25",
    ringCount: 1,
    particleCount: 2,
    flashOpacity: 0.15,
    labelColor: "#60A5FA",
  };
}

// ─── Ring component ───────────────────────────────────────────────────────────
function PulseRing({ color, delay, size }: { color: string; delay: number; size: number }) {
  const scale = useRef(new Animated.Value(0.1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: 100, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1300, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ─── Floating particle ────────────────────────────────────────────────────────
function FloatingParticle({ emoji, index, total }: { emoji: string; index: number; total: number }) {
  const angle = (index / total) * 2 * Math.PI;
  const radius = 80 + Math.random() * 60;
  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius - 40;

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 80;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: tx, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: ty, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]),
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        fontSize: 28,
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export interface ImpactRevealProps {
  score: number;
  itemEmoji: string;
  visible: boolean;
  onComplete?: () => void;
}

export function ImpactReveal({ score, itemEmoji, visible, onComplete }: ImpactRevealProps) {
  const tier = getTier(score);
  const firedRef = useRef(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showRings, setShowRings] = useState(false);

  // Animations
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;
  const scoreOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  // Audio player — load the right sound for this tier
  const player = useAudioPlayer(SOUNDS[tier.sound]);

  const playSound = useCallback(async () => {
    try {
      if (Platform.OS !== "web") {
        await setAudioModeAsync({ playsInSilentMode: true });
      }
      player.seekTo(0);
      player.play();
    } catch (e) {
      // Silent fail — sound is enhancement only
    }
  }, [player]);

  useEffect(() => {
    if (!visible || firedRef.current) return;
    firedRef.current = true;

    // 1. Fade in container
    Animated.timing(containerOpacity, {
      toValue: 1, duration: 150, useNativeDriver: true,
    }).start();

    // 2. Flash
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: tier.flashOpacity, duration: 80, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // 3. Play sound + haptics
    playSound();
    if (Platform.OS !== "web") {
      if (score >= 80) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 600);
      } else if (score >= 60) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
      } else if (score >= 40) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (score >= 20) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    // 4. Show rings
    setShowRings(true);

    // 5. Count up score
    const duration = 1200;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = Math.pow(step / steps, 0.5); // ease-out
      setDisplayScore(Math.round(eased * score));
      if (step >= steps) clearInterval(timer);
    }, interval);

    // 6. Score pop-in
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(scoreScale, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
        Animated.timing(scoreOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
    ]).start();

    // 7. Label fade in
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(labelOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // 8. Particles burst
    setTimeout(() => setShowParticles(true), 200);

    // 9. Auto-dismiss after 2.8s
    const dismissTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(containerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(scoreOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        onComplete?.();
      });
    }, 2800);

    return () => {
      clearInterval(timer);
      clearTimeout(dismissTimer);
    };
  }, [visible]);

  // Reset on hide
  useEffect(() => {
    if (!visible) {
      firedRef.current = false;
      setShowParticles(false);
      setShowRings(false);
      setDisplayScore(0);
      scoreScale.setValue(0);
      scoreOpacity.setValue(0);
      labelOpacity.setValue(0);
      containerOpacity.setValue(0);
      flashOpacity.setValue(0);
    }
  }, [visible]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      try { player.remove(); } catch (_) {}
    };
  }, []);

  if (!visible) return null;

  const ringBaseSize = Math.min(W, H) * 0.7;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, { opacity: containerOpacity }]}
      pointerEvents="none"
    >
      {/* Dark overlay */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Color flash */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tier.color, opacity: flashOpacity },
        ]}
      />

      {/* Glow background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tier.glowColor }]} />

      {/* Pulse rings */}
      {showRings && (
        <View style={styles.center} pointerEvents="none">
          {Array.from({ length: tier.ringCount }).map((_, i) => (
            <PulseRing
              key={i}
              color={tier.color}
              delay={i * 220}
              size={ringBaseSize * (0.5 + i * 0.18)}
            />
          ))}
        </View>
      )}

      {/* Center content */}
      <View style={styles.center} pointerEvents="none">
        {/* Particles */}
        {showParticles &&
          Array.from({ length: tier.particleCount }).map((_, i) => (
            <FloatingParticle key={i} emoji={itemEmoji} index={i} total={tier.particleCount} />
          ))}

        {/* Score number */}
        <Animated.View
          style={{
            transform: [{ scale: scoreScale }],
            opacity: scoreOpacity,
            alignItems: "center",
          }}
        >
          <Text style={[styles.scoreNumber, { color: tier.color }]}>
            {displayScore}
          </Text>
          <Text style={styles.scoreUnit}>out of 100</Text>
        </Animated.View>

        {/* Tier label */}
        <Animated.Text
          style={[styles.tierLabel, { color: tier.labelColor, opacity: labelOpacity }]}
        >
          {tier.label} item FIELD
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 96,
    fontWeight: "900",
    letterSpacing: -2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginTop: -8,
    letterSpacing: 1,
  },
  tierLabel: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 16,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
