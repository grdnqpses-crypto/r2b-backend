import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { Haptics, LinearGradient, useKeepAwake } from "@/lib/safe-imports";

interface ItemTimerProps {
  itemName: string;
  itemEmoji: string;
  score: number;
  onDismiss: () => void;
}

const TIMER_PRESETS = [
  { label: "15 min", minutes: 15, desc: "Quick magic activation" },
  { label: "30 min", minutes: 30, desc: "Standard bedtime window" },
  { label: "1 hour", minutes: 60, desc: "Deep magic activation" },
  { label: "2 hours", minutes: 120, desc: "Full dream cycle" },
];

export function ItemTimer({ itemName, itemEmoji, score, onDismiss }: ItemTimerProps) {
  useKeepAwake();
  const colors = useColors();
  const [phase, setPhase] = useState<"select" | "counting" | "complete">("select");
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const pulse = useSharedValue(1);
  const starTwinkle1 = useSharedValue(0.3);
  const starTwinkle2 = useSharedValue(0.7);
  const moonFloat = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    starTwinkle1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    starTwinkle2.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    moonFloat.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => {
    'worklet';
    const v = typeof pulse.value === 'number' && isFinite(pulse.value) ? pulse.value : 1;
    return { transform: [{ scale: v }] };
  });
  const star1Style = useAnimatedStyle(() => {
    'worklet';
    const v = typeof starTwinkle1.value === 'number' && isFinite(starTwinkle1.value) ? starTwinkle1.value : 0;
    return { opacity: v };
  });
  const star2Style = useAnimatedStyle(() => {
    'worklet';
    const v = typeof starTwinkle2.value === 'number' && isFinite(starTwinkle2.value) ? starTwinkle2.value : 0;
    return { opacity: v };
  });
  const moonStyle = useAnimatedStyle(() => {
    'worklet';
    const v = typeof moonFloat.value === 'number' && isFinite(moonFloat.value) ? moonFloat.value : 0;
    return { transform: [{ translateY: v }] };
  });

  // Countdown logic
  useEffect(() => {
    if (phase !== "counting") return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase("complete");
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const startTimer = useCallback((minutes: number) => {
    const secs = minutes * 60;
    setTotalSeconds(secs);
    setRemaining(secs);
    setPhase("counting");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = totalSeconds > 0 ? (totalSeconds - remaining) / totalSeconds : 0;

  // Phase messages based on progress
  const getPhaseMessage = () => {
    if (progress < 0.1) return "The magic is gathering energy...";
    if (progress < 0.25) return "Your belief field is settling into the room...";
    if (progress < 0.5) return "The sensors detected strong energy. Now it needs quiet...";
    if (progress < 0.75) return "The magic is almost ready. Stay cozy...";
    if (progress < 0.9) return "Just a little longer. The magic is nearly complete...";
    return "Almost there! The magic is activating...";
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0a2e", "#0d0830", "#0a0a1a"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Stars */}
      <Animated.Text style={[styles.star, { top: "8%", left: "10%" }, star1Style]}>✦</Animated.Text>
      <Animated.Text style={[styles.star, { top: "6%", right: "15%" }, star2Style]}>✧</Animated.Text>
      <Animated.Text style={[styles.star, { top: "14%", left: "55%" }, star1Style]}>✦</Animated.Text>
      <Animated.Text style={[styles.star, { top: "18%", right: "8%" }, star2Style]}>✧</Animated.Text>
      <Animated.Text style={[styles.star, { top: "10%", left: "35%" }, star2Style]}>⋆</Animated.Text>
      <Animated.Text style={[styles.star, { top: "22%", left: "18%" }, star1Style]}>⋆</Animated.Text>

      {/* Moon */}
      <Animated.Text style={[styles.moon, moonStyle]}>🌙</Animated.Text>

      {phase === "select" && (
        <View style={styles.content}>
          <Text style={styles.emoji}>{itemEmoji}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            item Timer
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Your {itemName} score: {score}!{"\n"}
            Set a timer for the magic to activate while you rest.
          </Text>

          {/* How it works */}
          <View style={[styles.howItWorks, { backgroundColor: "rgba(155,122,255,0.08)", borderColor: "rgba(155,122,255,0.25)" }]}>
            <Text style={[styles.howTitle, { color: colors.primary }]}>🔬 How It Works</Text>
            <Text style={[styles.howText, { color: colors.muted }]}>
              Your phone detected a strong item field. Science shows that during sleep, your brain processes and strengthens the neural pathways of item. The timer tracks this activation period — the longer you rest, the deeper the magic goes.
            </Text>
          </View>

          {/* Timer presets */}
          <Text style={[styles.chooseLabel, { color: colors.foreground }]}>
            Choose Activation Time
          </Text>
          {TIMER_PRESETS.map((preset) => (
            <Pressable
              key={preset.minutes}
              onPress={() => startTimer(preset.minutes)}
              style={({ pressed }) => [
                styles.presetBtn,
                {
                  backgroundColor: "rgba(155,122,255,0.08)",
                  borderColor: "rgba(155,122,255,0.3)",
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View style={styles.presetInfo}>
                <Text style={[styles.presetLabel, { color: colors.foreground }]}>{preset.label}</Text>
                <Text style={[styles.presetDesc, { color: colors.muted }]}>{preset.desc}</Text>
              </View>
              <Text style={[styles.presetArrow, { color: colors.primary }]}>→</Text>
            </Pressable>
          ))}

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Skip Timer</Text>
          </Pressable>
        </View>
      )}

      {phase === "counting" && (
        <View style={styles.countingContent}>
          <Animated.View style={pulseStyle}>
            <Text style={styles.countingEmoji}>{itemEmoji}</Text>
          </Animated.View>

          <Text style={[styles.countingTitle, { color: colors.foreground }]}>
            Magic Activating...
          </Text>

          {/* Timer display */}
          <View style={[styles.timerDisplay, { borderColor: "rgba(155,122,255,0.3)" }]}>
            <Text style={[styles.timerText, { color: colors.primary }]}>
              {formatTime(remaining)}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.muted }]}>remaining</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: "rgba(155,122,255,0.15)" }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: colors.muted }]}>
              {Math.round(progress * 100)}% complete
            </Text>
          </View>

          {/* Phase message */}
          <View style={[styles.phaseCard, { backgroundColor: "rgba(155,122,255,0.06)", borderColor: "rgba(155,122,255,0.2)" }]}>
            <Text style={[styles.phaseMessage, { color: colors.foreground }]}>
              ✨ {getPhaseMessage()}
            </Text>
          </View>

          <Text style={[styles.countingHint, { color: colors.muted }]}>
            Close your eyes and rest.{"\n"}The magic works best while you dream. 💤
          </Text>

          <Pressable
            onPress={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              onDismiss();
            }}
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.cancelText, { color: colors.muted }]}>End Timer</Text>
          </Pressable>
        </View>
      )}

      {phase === "complete" && (
        <View style={styles.completeContent}>
          <Text style={styles.completeEmoji}>🌟</Text>
          <Text style={[styles.completeTitle, { color: colors.foreground }]}>
            Magic Activated!
          </Text>
          <Text style={[styles.completeEmoji2]}>{itemEmoji}</Text>
          <Text style={[styles.completeMessage, { color: colors.muted }]}>
            Your {itemName} list is ready!{"\n"}
            The sensors confirmed strong energy throughout the entire rest period.
          </Text>

          <View style={[styles.completeCard, { backgroundColor: "rgba(74,222,128,0.08)", borderColor: "rgba(74,222,128,0.3)" }]}>
            <Text style={[styles.completeCardText, { color: colors.success }]}>
              🔬 Science Note: During rest, your brain consolidated the neural pathways activated during your item scan. Research shows that sleep strengthens memory and emotional connections — your item is now deeper than before.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              onDismiss();
            }}
            style={({ pressed }) => [
              styles.doneBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text style={styles.doneBtnText}>Wonderful! ✨</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24 },
  star: { position: "absolute", fontSize: 18, color: "rgba(255,255,200,0.6)" },
  moon: { position: "absolute", top: "5%", right: "10%", fontSize: 44 },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  howItWorks: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    width: "100%",
  },
  howTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  howText: { fontSize: 13, lineHeight: 20 },
  chooseLabel: { fontSize: 17, fontWeight: "700", marginBottom: 12, alignSelf: "flex-start" },
  presetBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
    width: "100%",
  },
  presetInfo: { flex: 1 },
  presetLabel: { fontSize: 17, fontWeight: "700" },
  presetDesc: { fontSize: 12, marginTop: 2 },
  presetArrow: { fontSize: 20, fontWeight: "700" },
  skipBtn: { marginTop: 16, padding: 12 },
  skipText: { fontSize: 15, fontWeight: "600" },

  // Counting phase
  countingContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  countingEmoji: { fontSize: 72, marginBottom: 16 },
  countingTitle: { fontSize: 24, fontWeight: "900", marginBottom: 24 },
  timerDisplay: {
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: 40,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  timerText: { fontSize: 52, fontWeight: "900", fontVariant: ["tabular-nums"] },
  timerLabel: { fontSize: 13, fontWeight: "600", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  progressContainer: { width: "100%", marginBottom: 24 },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  progressPercent: { fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 6 },
  phaseCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    width: "100%",
  },
  phaseMessage: { fontSize: 15, fontWeight: "600", textAlign: "center", lineHeight: 22 },
  countingHint: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  cancelBtn: { padding: 12 },
  cancelText: { fontSize: 14, fontWeight: "600" },

  // Complete phase
  completeContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  completeEmoji: { fontSize: 64, marginBottom: 8 },
  completeTitle: { fontSize: 28, fontWeight: "900", marginBottom: 8 },
  completeEmoji2: { fontSize: 48, marginBottom: 16 },
  completeMessage: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  completeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 32,
    width: "100%",
  },
  completeCardText: { fontSize: 13, lineHeight: 20 },
  doneBtn: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 20,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 18, fontWeight: "700", color: "#fff" },
});
