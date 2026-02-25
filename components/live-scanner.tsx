import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useSensorEngine } from "@/hooks/use-sensors";
import { useScanAudio } from "@/hooks/use-scan-audio";
import { SensorCard } from "./sensor-card";
import { BeliefFieldOrb } from "./belief-field-orb";
import type { BeliefOption } from "@/constants/beliefs";
import type { ScanResult } from "@/hooks/use-scan-history";
import { generateInterpretation, generateSummary } from "@/hooks/use-scan-history";
import { getThemeForBelief, type BeliefTheme } from "@/constants/belief-themes";
import { getStoryForBelief } from "@/constants/belief-stories";
import { useBeliefStory } from "@/hooks/use-belief-story";
import { isFeatureHealthy, reportFeatureFailure } from "@/hooks/use-diagnostics";

// ─── Safe lazy imports ──────────────────────────────────────────
// Every optional native module is loaded in a try-catch so a missing
// or broken module never takes down the whole scanner.

let LinearGradient: any = null;
try {
  LinearGradient = require("expo-linear-gradient").LinearGradient;
} catch {
  // Will fall back to plain View
}

let useKeepAwake: (() => void) | null = null;
try {
  useKeepAwake = require("expo-keep-awake").useKeepAwake;
} catch {
  // Screen may sleep — non-fatal
}

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {
  // Haptics unavailable
}

// ─── Safe wrappers ──────────────────────────────────────────────

function safeHapticImpact(style?: any) {
  if (Platform.OS === "web" || !Haptics || !isFeatureHealthy("haptics")) return;
  try {
    Haptics.impactAsync(style || Haptics.ImpactFeedbackStyle.Light);
  } catch (err: any) {
    reportFeatureFailure("haptics", err?.message);
  }
}

function safeHapticNotification(type?: any) {
  if (Platform.OS === "web" || !Haptics || !isFeatureHealthy("haptics")) return;
  try {
    Haptics.notificationAsync(type || Haptics.NotificationFeedbackType.Success);
  } catch (err: any) {
    reportFeatureFailure("haptics", err?.message);
  }
}

/** Render a gradient if available, otherwise a plain View */
function SafeGradient({
  colors: gradColors,
  style,
  start,
  end,
  children,
}: {
  colors: string[];
  style?: any;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  children?: React.ReactNode;
}) {
  if (LinearGradient && isFeatureHealthy("linear-gradient")) {
    try {
      return (
        <LinearGradient colors={gradColors} style={style} start={start} end={end}>
          {children}
        </LinearGradient>
      );
    } catch (err: any) {
      reportFeatureFailure("linear-gradient", err?.message);
    }
  }
  // Fallback: use first color as solid background
  return (
    <View style={[style, { backgroundColor: gradColors[0] || "transparent" }]}>
      {children}
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────

interface LiveScannerProps {
  belief: BeliefOption;
  intensity: number;
  scanDuration?: number;
  soundEnabled?: boolean;
  storyEnabled?: boolean;
  onComplete: (result: ScanResult) => void;
  onCancel: () => void;
}

export function LiveScanner({
  belief,
  intensity,
  scanDuration = 60,
  soundEnabled = true,
  storyEnabled = true,
  onComplete,
  onCancel,
}: LiveScannerProps) {
  // Always call hooks unconditionally (React Rules of Hooks)
  // useKeepAwake is safe — if module missing, we just skip
  try {
    if (useKeepAwake) useKeepAwake();
  } catch {
    // Non-fatal
  }

  const colors = useColors();
  const [countdown, setCountdown] = useState(5);
  const [started, setStarted] = useState(false);
  const [showSensors, setShowSensors] = useState(false);

  // Get the theme for this belief's category
  const theme: BeliefTheme = useMemo(
    () => getThemeForBelief(belief.category),
    [belief.category]
  );

  const sensorState = useSensorEngine(started, intensity, scanDuration);
  const scanAudio = useScanAudio();
  const beliefStory = useBeliefStory();
  const story = useMemo(
    () => (storyEnabled ? getStoryForBelief(belief.id) : null),
    [belief.id, storyEnabled]
  );
  const [storyActive, setStoryActive] = useState(false);

  // 5-second countdown before scan
  useEffect(() => {
    if (countdown <= 0) {
      setStarted(true);
      if (soundEnabled) {
        try { scanAudio.start(); } catch {}
      }
      if (story && isFeatureHealthy("speech")) {
        try {
          beliefStory.startStory(story);
          setStoryActive(true);
        } catch (err: any) {
          reportFeatureFailure("speech", err?.message);
        }
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, scanAudio]);

  // Update audio intensity with score and story progress
  useEffect(() => {
    if (started && sensorState.phase === "scanning") {
      if (soundEnabled) {
        try { scanAudio.updateIntensity(sensorState.overallScore); } catch {}
      }
      if (storyActive) {
        try {
          const progress = sensorState.elapsed / scanDuration;
          beliefStory.updateProgress(progress);
        } catch {}
      }
    }
  }, [
    sensorState.overallScore,
    sensorState.phase,
    sensorState.elapsed,
    started,
    scanAudio,
    scanDuration,
    beliefStory,
    storyActive,
  ]);

  // Haptic on phase change
  useEffect(() => {
    if (sensorState.phase === "scanning") {
      safeHapticImpact();
    }
  }, [sensorState.phase]);

  // Haptic on score milestones
  const lastMilestoneRef = useRef(0);
  useEffect(() => {
    const milestone = Math.floor(sensorState.overallScore / 20) * 20;
    if (milestone > lastMilestoneRef.current) {
      safeHapticNotification();
      lastMilestoneRef.current = milestone;
    }
  }, [sensorState.overallScore]);

  // Auto-complete
  useEffect(() => {
    if (sensorState.phase === "complete") {
      if (soundEnabled) {
        try {
          scanAudio.stop();
          scanAudio.playComplete();
        } catch {}
      }
      if (storyActive) {
        try {
          beliefStory.stopStory();
        } catch {}
        setStoryActive(false);
      }

      const breakdown = sensorState.sensors
        .filter((s) => s.available)
        .map((s) => ({
          sensorId: s.id,
          sensorName: s.name,
          baseline: s.baseline,
          peak:
            s.history.length > 0
              ? Math.max(...s.history, s.current)
              : s.current,
          deviation: s.deviation,
          deviationPercent: s.deviationPercent,
          unit: s.unit,
          interpretation: generateInterpretation(
            s.name,
            s.deviationPercent,
            s.unit,
            s.deviation
          ),
        }));

      const result: ScanResult = {
        id: Date.now().toString(),
        beliefId: belief.id,
        beliefName: belief.name,
        beliefEmoji: belief.emoji,
        intensity,
        score: sensorState.overallScore,
        date: new Date().toISOString(),
        sensorBreakdown: breakdown,
        summary: generateSummary(sensorState.overallScore, belief.name),
      };

      safeHapticNotification();
      setTimeout(() => onComplete(result), 500);
    }
  }, [sensorState.phase]);

  // Stop audio on cancel
  const handleCancel = useCallback(() => {
    try { if (soundEnabled) scanAudio.stop(); } catch {}
    try { if (storyActive) beliefStory.stopStory(); } catch {}
    onCancel();
  }, [scanAudio, onCancel, beliefStory, storyActive, soundEnabled]);

  const remaining = Math.max(0, scanDuration - Math.floor(sensorState.elapsed));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // Themed gradient colors
  const bgGradient = theme.gradientColors;
  const accentColor = theme.accent;

  // Countdown overlay — themed
  if (countdown > 0) {
    return (
      <View style={[styles.container, { backgroundColor: bgGradient[0] }]}>
        <SafeGradient
          colors={[accentColor + "30", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
        />
        <View style={styles.countdownContent}>
          <Text style={[styles.countdownLabel, { color: accentColor + "AA" }]}>
            Focus on your belief in
          </Text>
          <Text style={styles.countdownEmoji}>{belief.emoji}</Text>
          <Text style={[styles.countdownBelief, { color: "#fff" }]}>
            {belief.name}
          </Text>
          <Text style={[styles.themeName, { color: accentColor }]}>
            {theme.name} Environment
          </Text>
          <Text style={[styles.countdownHint, { color: accentColor + "CC" }]}>
            Close your eyes... breathe deeply... believe...
          </Text>
          <Text style={[styles.countdownNumber, { color: accentColor }]}>
            {countdown}
          </Text>
        </View>
      </View>
    );
  }

  const renderSensorItem = useCallback(
    ({ item }: { item: (typeof sensorState.sensors)[0] }) => (
      <SensorCard sensor={item} />
    ),
    []
  );

  const audioActive = started && sensorState.phase === "scanning";

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Diagnostic summary */}
      {sensorState.diagnosticSummary ? (
        <View
          style={[
            styles.themeIndicator,
            { backgroundColor: "#00FF0010", borderColor: "#00FF0040" },
          ]}
        >
          <Text style={[styles.themeIndicatorText, { color: "#00CC00" }]}>
            🩺 {sensorState.diagnosticSummary}
          </Text>
        </View>
      ) : null}

      {/* Theme indicator */}
      <View
        style={[
          styles.themeIndicator,
          { backgroundColor: accentColor + "15", borderColor: accentColor + "40" },
        ]}
      >
        <Text style={[styles.themeIndicatorText, { color: accentColor }]}>
          {theme.ambientSymbols[0]} {theme.name} — {theme.atmosphereLabel}
        </Text>
      </View>

      {/* Timer and belief */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.beliefLabel, { color: accentColor + "AA" }]}>
            Scanning belief in
          </Text>
          <Text style={[styles.beliefName, { color: "#fff" }]}>
            {belief.emoji} {belief.name}
          </Text>
        </View>
        <View style={styles.timerContainer}>
          <Text style={[styles.timer, { color: accentColor }]}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
          <Text style={[styles.timerLabel, { color: accentColor + "AA" }]}>
            remaining
          </Text>
        </View>
      </View>

      {/* Audio indicator */}
      {audioActive && (
        <View
          style={[
            styles.audioIndicator,
            { backgroundColor: accentColor + "15", borderColor: accentColor + "40" },
          ]}
        >
          <Text style={[styles.audioText, { color: accentColor }]}>
            🔊 Audio field active — intensity responds to your belief score
          </Text>
        </View>
      )}

      {/* Story narration indicator */}
      {storyActive && story && (
        <View
          style={[
            styles.audioIndicator,
            { backgroundColor: accentColor + "15", borderColor: accentColor + "40" },
          ]}
        >
          <Text style={[styles.audioText, { color: accentColor }]}>
            📖 "{story.title}" — narrated belief journey active
          </Text>
        </View>
      )}

      {/* Orb — with theme */}
      <View style={styles.orbContainer}>
        <BeliefFieldOrb
          intensity={sensorState.apparitionIntensity}
          score={sensorState.overallScore}
          beliefEmoji={belief.emoji}
          phase={sensorState.phase}
          theme={theme}
        />
      </View>

      {/* Ticker */}
      <View
        style={[
          styles.ticker,
          { backgroundColor: bgGradient[1] + "80", borderColor: accentColor + "30" },
        ]}
      >
        <Text style={[styles.tickerText, { color: "#fff" }]} numberOfLines={2}>
          {sensorState.ticker}
        </Text>
      </View>

      {/* Toggle */}
      <Pressable
        onPress={() => setShowSensors(!showSensors)}
        style={({ pressed }) => [
          styles.toggleBtn,
          { borderColor: accentColor + "50", opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.toggleText, { color: accentColor }]}>
          {showSensors ? "Hide Sensor Details ▲" : "Show All Sensor Details ▼"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgGradient[0] }]}>
      {/* Themed background gradient */}
      <SafeGradient
        colors={[bgGradient[0], bgGradient[1], bgGradient[2]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Accent glow overlay */}
      <SafeGradient
        colors={[accentColor + "20", "transparent", accentColor + "08"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <FlatList
        data={showSensors ? sensorState.sensors : []}
        keyExtractor={(item) => item.id}
        renderItem={renderSensorItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Cancel button */}
      <Pressable
        onPress={handleCancel}
        style={({ pressed }) => [
          styles.cancelBtn,
          {
            backgroundColor: bgGradient[1],
            borderColor: accentColor + "40",
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[styles.cancelText, { color: "#FF6B6B" }]}>End Scan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  countdownContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  countdownLabel: { fontSize: 16, fontWeight: "500" },
  countdownEmoji: { fontSize: 64 },
  countdownBelief: { fontSize: 28, fontWeight: "800" },
  themeName: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  countdownHint: { fontSize: 15, fontStyle: "italic", marginTop: 8 },
  countdownNumber: { fontSize: 96, fontWeight: "900", marginTop: 20 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  listHeader: { marginBottom: 12 },
  themeIndicator: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  themeIndicatorText: { fontSize: 12, fontWeight: "600" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  beliefLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  beliefName: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  timerContainer: { alignItems: "flex-end" },
  timer: {
    fontSize: 32,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  timerLabel: { fontSize: 11, fontWeight: "500", marginTop: -4 },
  audioIndicator: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  audioText: { fontSize: 12, fontWeight: "600" },
  orbContainer: { alignItems: "center", marginVertical: 8 },
  ticker: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  tickerText: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  toggleBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  toggleText: { fontSize: 14, fontWeight: "600" },
  cancelBtn: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: { fontSize: 16, fontWeight: "600" },
});
