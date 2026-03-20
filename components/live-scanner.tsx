import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useSensorEngine } from "@/hooks/use-sensors";
import { useScanAudio } from "@/hooks/use-scan-audio";
import { SensorCard } from "./sensor-card";
import { BeliefFieldOrb } from "./belief-field-orb";
import { SilentErrorBoundary } from "./error-boundary";
import type { BeliefOption } from "@/constants/beliefs";
import type { ScanResult } from "@/hooks/use-scan-history";
import { generateInterpretation, generateSummary } from "@/hooks/use-scan-history";
import { getThemeForBelief, type BeliefTheme } from "@/constants/belief-themes";
import { getStoryForBelief } from "@/constants/belief-stories";
import { useBeliefStory } from "@/hooks/use-belief-story";
import { isFeatureHealthy, reportFeatureFailure } from "@/hooks/use-diagnostics";

// ─── Safe lazy imports ──────────────────────────────────────────
let _LinearGradientImpl: any = null;
try {
  _LinearGradientImpl = require("expo-linear-gradient").LinearGradient;
} catch {}

let _useKeepAwakeImpl: (() => void) | null = null;
try {
  _useKeepAwakeImpl = require("expo-keep-awake").useKeepAwake;
} catch {}

let _Haptics: any = null;
try {
  _Haptics = require("expo-haptics");
} catch {}

// ─── Safe wrappers ──────────────────────────────────────────────
function safeHapticImpact(style?: any) {
  if (Platform.OS === "web" || !_Haptics || !isFeatureHealthy("haptics")) return;
  try {
    _Haptics.impactAsync(style || _Haptics.ImpactFeedbackStyle.Light);
  } catch (err: any) {
    reportFeatureFailure("haptics", err?.message);
  }
}

function safeHapticNotification(type?: any) {
  if (Platform.OS === "web" || !_Haptics || !isFeatureHealthy("haptics")) return;
  try {
    _Haptics.notificationAsync(type || _Haptics.NotificationFeedbackType.Success);
  } catch (err: any) {
    reportFeatureFailure("haptics", err?.message);
  }
}

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
  if (_LinearGradientImpl && isFeatureHealthy("linear-gradient")) {
    try {
      const LG = _LinearGradientImpl;
      return (
        <LG colors={gradColors} style={style} start={start} end={end}>
          {children}
        </LG>
      );
    } catch (err: any) {
      reportFeatureFailure("linear-gradient", err?.message);
    }
  }
  return (
    <View style={[style, { backgroundColor: gradColors[0] || "transparent" }]}>
      {children}
    </View>
  );
}

// ─── Warm-up phases ─────────────────────────────────────────────
// Instead of starting everything at once when countdown hits 0,
// we stagger the startup to prevent overwhelming the device:
//
// Phase 0: "warmup"    — Static orb, no animations, no sensors (0-500ms)
// Phase 1: "animating" — Orb animations start, still no sensors (500ms-1.5s)
// Phase 2: "sensors"   — Sensors start subscribing (1.5s+)
// Phase 3: "audio"     — Audio and speech start (2.5s+)
type WarmUpPhase = "warmup" | "animating" | "sensors" | "audio" | "ready";

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
  try {
    if (_useKeepAwakeImpl) _useKeepAwakeImpl();
  } catch {}

  const colors = useColors();
  const [countdown, setCountdown] = useState(5);
  const [warmUpPhase, setWarmUpPhase] = useState<WarmUpPhase>("warmup");
  const [showSensors, setShowSensors] = useState(false);

  // Sensors only start when warmUpPhase reaches "sensors"
  const sensorsReady = warmUpPhase === "sensors" || warmUpPhase === "audio" || warmUpPhase === "ready";

  const theme: BeliefTheme = useMemo(
    () => getThemeForBelief(belief.category),
    [belief.category]
  );

  // Only pass isScanning=true when sensors are ready
  const sensorState = useSensorEngine(sensorsReady, intensity, scanDuration);
  const scanAudio = useScanAudio();
  const beliefStory = useBeliefStory();
  const story = useMemo(
    () => (storyEnabled ? getStoryForBelief(belief.id) : null),
    [belief.id, storyEnabled]
  );
  const [storyActive, setStoryActive] = useState(false);

  // 5-second countdown before scan
  useEffect(() => {
    if (countdown <= 0) return; // Countdown done, warm-up takes over
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ─── Phased warm-up after countdown ends ───────────────────────
  // This is the KEY fix: instead of starting everything at countdown=0,
  // we gradually bring features online over ~2.5 seconds.
  useEffect(() => {
    if (countdown > 0) return; // Still counting down

    // Phase 0: warmup (static orb) — immediate
    setWarmUpPhase("warmup");

    // Phase 1: start animations after 500ms
    const t1 = setTimeout(() => {
      try {
        setWarmUpPhase("animating");
      } catch {}
    }, 500);

    // Phase 2: start sensors after 1500ms
    const t2 = setTimeout(() => {
      try {
        setWarmUpPhase("sensors");
      } catch {}
    }, 1500);

    // Phase 3: start audio/speech after 2500ms
    const t3 = setTimeout(() => {
      try {
        setWarmUpPhase("audio");

        // Start audio
        if (soundEnabled) {
          try {
            scanAudio.start();
          } catch (err: any) {
            console.warn("[LiveScanner] Audio start error:", err);
          }
        }

        // Start story narration
        if (story && isFeatureHealthy("speech")) {
          try {
            beliefStory.startStory(story);
            setStoryActive(true);
          } catch (err: any) {
            reportFeatureFailure("speech", err?.message);
          }
        }
      } catch {}
    }, 2500);

    // Phase 4: fully ready after 3s
    const t4 = setTimeout(() => {
      try {
        setWarmUpPhase("ready");
      } catch {}
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [countdown]); // Only re-run when countdown changes

  // Update audio intensity with score and story progress
  useEffect(() => {
    if (sensorsReady && sensorState.phase === "scanning") {
      if (soundEnabled) {
        try {
          scanAudio.updateIntensity(sensorState.overallScore);
        } catch {}
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
    sensorsReady,
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
    try {
      if (soundEnabled) scanAudio.stop();
    } catch {}
    try {
      if (storyActive) beliefStory.stopStory();
    } catch {}
    onCancel();
  }, [scanAudio, onCancel, beliefStory, storyActive, soundEnabled]);

  // Elapsed time display (counts up)
  const elapsed = Math.floor(sensorState.elapsed);
  const elapsedMinutes = Math.floor(elapsed / 60);
  const elapsedSeconds = elapsed % 60;

  // Minimum warm-up before Stop button unlocks (15s after sensors start)
  const MIN_SCAN_SECONDS = 15;
  const canStop = sensorState.phase === "scanning" && elapsed >= MIN_SCAN_SECONDS;

  // Manual stop handler — triggers the same completion flow as auto-complete
  const handleStop = useCallback(() => {
    if (!canStop) return;
    safeHapticNotification();
    if (soundEnabled) {
      try { scanAudio.stop(); scanAudio.playComplete(); } catch {}
    }
    if (storyActive) {
      try { beliefStory.stopStory(); } catch {}
      setStoryActive(false);
    }
    const breakdown = sensorState.sensors
      .filter((s) => s.available)
      .map((s) => ({
        sensorId: s.id,
        sensorName: s.name,
        baseline: s.baseline,
        peak: s.history.length > 0 ? Math.max(...s.history, s.current) : s.current,
        deviation: s.deviation,
        deviationPercent: s.deviationPercent,
        unit: s.unit,
        interpretation: generateInterpretation(s.name, s.deviationPercent, s.unit, s.deviation),
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
    setTimeout(() => onComplete(result), 300);
  }, [canStop, sensorState, belief, intensity, soundEnabled, storyActive, scanAudio, beliefStory, onComplete]);

  const bgGradient = theme.gradientColors;
  const accentColor = theme.accent;

  // MUST be called before any early return to maintain consistent hook count
  const renderSensorItem = useCallback(
    ({ item }: { item: (typeof sensorState.sensors)[0] }) => (
      <SensorCard sensor={item} />
    ),
    []
  );

  // ─── Countdown screen ─────────────────────────────────────────
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

  // ─── Scan screen ──────────────────────────────────────────────
  const isWarmingUp = warmUpPhase === "warmup";
  const orbWarmUp = warmUpPhase === "warmup"; // Static orb during first 500ms

  const audioActive = sensorsReady && sensorState.phase === "scanning";

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Warm-up indicator */}
      {isWarmingUp && (
        <View
          style={[
            styles.themeIndicator,
            { backgroundColor: accentColor + "15", borderColor: accentColor + "40" },
          ]}
        >
          <Text style={[styles.themeIndicatorText, { color: accentColor }]}>
            ⏳ Initializing scan environment...
          </Text>
        </View>
      )}

      {/* Diagnostic summary */}
      {!isWarmingUp && sensorState.diagnosticSummary ? (
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
            {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, "0")}
          </Text>
          <Text style={[styles.timerLabel, { color: accentColor + "AA" }]}>
            elapsed
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

      {/* Orb — wrapped in SilentErrorBoundary so animation crashes don't kill the app */}
      <View style={styles.orbContainer}>
        <SilentErrorBoundary>
          <BeliefFieldOrb
            intensity={sensorState.apparitionIntensity}
            score={sensorState.overallScore}
            beliefEmoji={belief.emoji}
            phase={sensorState.phase}
            theme={theme}
            warmUp={orbWarmUp}
            maxParticles={warmUpPhase === "animating" ? 3 : undefined}
          />
        </SilentErrorBoundary>
      </View>

      {/* Ticker */}
      <View
        style={[
          styles.ticker,
          { backgroundColor: bgGradient[1] + "80", borderColor: accentColor + "30" },
        ]}
      >
        <Text style={[styles.tickerText, { color: "#fff" }]} numberOfLines={2}>
          {isWarmingUp ? "Preparing scan environment..." : sensorState.ticker}
        </Text>
      </View>

      {/* Toggle */}
      {!isWarmingUp && (
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
      )}
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

      {/* Stop & Reveal button (unlocks after 15s) */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={canStop ? handleStop : undefined}
          style={({ pressed }) => [
            styles.stopBtn,
            {
              backgroundColor: canStop ? accentColor : accentColor + "30",
              borderColor: canStop ? accentColor + "80" : accentColor + "30",
              opacity: canStop ? (pressed ? 0.85 : 1) : 0.6,
              transform: [{ scale: canStop && pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={[styles.stopBtnText, { color: canStop ? "#fff" : accentColor + "80" }]}>
            {canStop
              ? "⚡ Stop & Reveal My Score"
              : `🔒 Hold for ${Math.max(0, MIN_SCAN_SECONDS - elapsed)}s more...`}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.cancelSmallBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.cancelSmallText, { color: "#FF6B6B" }]}>Cancel</Text>
        </Pressable>
      </View>
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
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 8,
    alignItems: "center",
  },
  stopBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
  },
  stopBtnText: { fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  cancelSmallBtn: { paddingVertical: 8, paddingHorizontal: 20 },
  cancelSmallText: { fontSize: 14, fontWeight: "600" },
});
