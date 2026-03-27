import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Animated, Easing } from "react-native";
// Safe lazy-load expo-speech to prevent crash if module unavailable
let Speech: any = null;
try {
  Speech = require("expo-speech");
} catch {
  Speech = { speak: () => {}, stop: () => {}, isSpeakingAsync: async () => false };
}
import { useColors } from "@/hooks/use-colors";
import type { ItemOption } from "@/constants/beliefs";
import { Haptics, LinearGradient, useKeepAwake } from "@/lib/safe-imports";

interface ItemMeditationProps {
  item: ItemOption;
  onComplete: () => void;
  onSkip: () => void;
}

// Meditation phases with voice guidance
const MEDITATION_STEPS = [
  {
    phase: "welcome",
    duration: 6000,
    title: "Prepare Your Mind",
    subtitle: "Find a comfortable position and hold your phone gently",
    voice: "Find a comfortable position. Hold your phone gently in both hands.",
    emoji: "🧘",
    breathe: false,
  },
  {
    phase: "breathe-in-1",
    duration: 5000,
    title: "Breathe In",
    subtitle: "Slowly breathe in through your nose... 4 seconds",
    voice: "Breathe in slowly through your nose.",
    emoji: "🌬️",
    breathe: true,
    breatheDirection: "in" as const,
  },
  {
    phase: "hold-1",
    duration: 4000,
    title: "Hold",
    subtitle: "Hold your breath gently... 4 seconds",
    voice: "Hold.",
    emoji: "⏸️",
    breathe: true,
    breatheDirection: "hold" as const,
  },
  {
    phase: "breathe-out-1",
    duration: 6000,
    title: "Breathe Out",
    subtitle: "Slowly breathe out through your mouth... 6 seconds",
    voice: "Breathe out slowly through your mouth.",
    emoji: "💨",
    breathe: true,
    breatheDirection: "out" as const,
  },
  {
    phase: "focus",
    duration: 6000,
    title: "Focus Your item",
    subtitle: "", // will be filled with item name
    voice: "", // will be filled dynamically
    emoji: "", // will be filled with item emoji
    breathe: false,
  },
  {
    phase: "breathe-in-2",
    duration: 5000,
    title: "Breathe In Again",
    subtitle: "Deep breath in... feel the energy building",
    voice: "Breathe in again. Feel the energy building inside you.",
    emoji: "🌬️",
    breathe: true,
    breatheDirection: "in" as const,
  },
  {
    phase: "hold-2",
    duration: 4000,
    title: "Hold",
    subtitle: "Hold that energy...",
    voice: "Hold that energy.",
    emoji: "✨",
    breathe: true,
    breatheDirection: "hold" as const,
  },
  {
    phase: "breathe-out-2",
    duration: 6000,
    title: "Breathe Out",
    subtitle: "Release slowly... let your item fill the space around you",
    voice: "Release slowly. Let your item fill the space around you.",
    emoji: "🌟",
    breathe: true,
    breatheDirection: "out" as const,
  },
  {
    phase: "ready",
    duration: 4000,
    title: "You Are Ready",
    subtitle: "Your mind is focused. Your item is strong. Let's begin the scan.",
    voice: "Your mind is focused. Your item is strong. Let's begin the scan.",
    emoji: "⚡",
    breathe: false,
  },
];

export function ItemMeditation({ item, onComplete, onSkip }: ItemMeditationProps) {
  // Must call unconditionally (Rules of Hooks) — it no-ops on web internally
  useKeepAwake();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const breatheAnim = useRef(new Animated.Value(0.6)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const step = MEDITATION_STEPS[currentStep];

  // Customize the focus step with item info
  const getStepData = useCallback(() => {
    if (step.phase === "focus") {
      return {
        ...step,
        subtitle: `Picture ${item.name} in your mind. See it clearly. Feel it deeply. Focus with all your heart.`,
        voice: `Now picture ${item.name} in your mind. See it clearly. Feel it deeply. Focus with all your heart.`,
        emoji: item.emoji,
      };
    }
    return step;
  }, [step, item]);

  const currentData = getStepData();

  // Fade in each step
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  // Breathing animation
  useEffect(() => {
    if (!currentData.breathe) {
      // Gentle pulse for non-breathing steps
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }

    if (currentData.breatheDirection === "in") {
      Animated.timing(breatheAnim, {
        toValue: 1,
        duration: currentData.duration - 500,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start();
    } else if (currentData.breatheDirection === "out") {
      Animated.timing(breatheAnim, {
        toValue: 0.6,
        duration: currentData.duration - 500,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start();
    }
    // hold: keep current value
  }, [currentStep, currentData]);

  // Voice guidance
  useEffect(() => {
    if (currentData.voice && Speech) {
      try {
        Speech.speak(currentData.voice, {
          rate: 0.85,
          pitch: 1.0,
          volume: 0.9,
        });
      } catch (err) {
        console.warn("[Meditation] Speech.speak error:", err);
      }
    }
    return () => {
      try { Speech?.stop(); } catch {}
    };
  }, [currentStep]);

  // Haptic at each step
  useEffect(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentStep]);

  // Progress timer
  useEffect(() => {
    const duration = currentData.duration;
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(elapsed / duration);

      if (elapsed >= duration) {
        clearInterval(timer);
        if (currentStep < MEDITATION_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1);
          setProgress(0);
        } else {
          // Meditation complete
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          setTimeout(onComplete, 500);
        }
      }
    }, interval);

    return () => clearInterval(timer);
  }, [currentStep, currentData.duration, onComplete]);

  const overallProgress = (currentStep + progress) / MEDITATION_STEPS.length;

  return (
    <View style={[styles.container, { backgroundColor: "#0A0A1A" }]}>
      <LinearGradient
        colors={["rgba(100,80,200,0.15)", "transparent", "rgba(100,80,200,0.08)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Overall progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${overallProgress * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.muted }]}>
          Step {currentStep + 1} of {MEDITATION_STEPS.length}
        </Text>
      </View>

      {/* Main content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Breathing circle */}
        <View style={styles.circleContainer}>
          <Animated.View
            style={[
              styles.breatheCircleOuter,
              {
                backgroundColor: colors.primary + "08",
                borderColor: colors.primary + "30",
                transform: [{ scale: breatheAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.breatheCircleInner,
                {
                  backgroundColor: colors.primary + "15",
                  borderColor: colors.primary + "50",
                  transform: [{ scale: currentData.breathe ? breatheAnim : pulseAnim }],
                },
              ]}
            >
              <Text style={styles.stepEmoji}>{currentData.emoji}</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Text */}
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>
          {currentData.title}
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
          {currentData.subtitle}
        </Text>

        {/* Breathing indicator */}
        {currentData.breathe && (
          <View style={[styles.breatheIndicator, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.breatheText, { color: colors.primary }]}>
              {currentData.breatheDirection === "in"
                ? "🫁 Breathe In..."
                : currentData.breatheDirection === "out"
                ? "💨 Breathe Out..."
                : "⏸️ Hold..."}
            </Text>
          </View>
        )}

        {/* Step progress */}
        <View style={[styles.stepProgressBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.stepProgressFill,
              { backgroundColor: colors.primary + "80", width: `${progress * 100}%` },
            ]}
          />
        </View>
      </Animated.View>

      {/* What's happening explanation */}
      <View style={[styles.explainCard, { backgroundColor: colors.surface + "80", borderColor: colors.border }]}>
        <Text style={[styles.explainTitle, { color: colors.foreground }]}>
          🧠 Why This Helps
        </Text>
        <Text style={[styles.explainText, { color: colors.muted }]}>
          {currentData.breathe
            ? "Deep breathing activates your parasympathetic nervous system, calming your body and sharpening your focus. This helps your brain produce stronger, more coherent electromagnetic signals."
            : currentData.phase === "focus"
            ? "Visualization creates real neural activity. When you picture something vividly, your brain activates the same regions as if it were really happening. This is scientifically proven."
            : currentData.phase === "ready"
            ? "Your mind is now in an optimal state for item detection. Your focused, calm state will produce clearer sensor readings during the scan."
            : "Preparing your mind before a scan produces more accurate results. Studies show that focused intention creates measurable changes in the body's electromagnetic field."}
        </Text>
      </View>

      {/* Skip button */}
      <Pressable
        onPress={() => {
          try { Speech?.stop(); } catch {}
          onSkip();
        }}
        style={({ pressed }) => [
          styles.skipBtn,
          { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[styles.skipText, { color: colors.muted }]}>Skip Meditation</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  progressContainer: { paddingHorizontal: 20, marginBottom: 8 },
  progressBg: { height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 11, fontWeight: "500", textAlign: "center", marginTop: 6 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  circleContainer: { marginBottom: 30 },
  breatheCircleOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  breatheCircleInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepEmoji: { fontSize: 48 },
  stepTitle: { fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  stepSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24, paddingHorizontal: 10 },
  breatheIndicator: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  breatheText: { fontSize: 16, fontWeight: "700" },
  stepProgressBg: { height: 3, borderRadius: 1.5, width: "80%", marginTop: 20 },
  stepProgressFill: { height: 3, borderRadius: 1.5 },
  explainCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  explainTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  explainText: { fontSize: 12, lineHeight: 18 },
  skipBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 40,
    alignItems: "center",
  },
  skipText: { fontSize: 14, fontWeight: "500" },
});
