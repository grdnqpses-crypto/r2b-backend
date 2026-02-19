import { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
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

interface LiveScannerProps {
  belief: BeliefOption;
  intensity: number;
  scanDuration?: number;
  soundEnabled?: boolean;
  storyEnabled?: boolean;
  onComplete: (result: ScanResult) => void;
  onCancel: () => void;
}

export function LiveScanner({ belief, intensity, scanDuration = 60, soundEnabled = true, storyEnabled = true, onComplete, onCancel }: LiveScannerProps) {
  if (Platform.OS !== "web") {
    useKeepAwake();
  }
  const colors = useColors();
  const [countdown, setCountdown] = useState(5);
  const [started, setStarted] = useState(false);
  const [showSensors, setShowSensors] = useState(false);

  // Get the theme for this belief's category
  const theme: BeliefTheme = useMemo(() => getThemeForBelief(belief.category), [belief.category]);

  const sensorState = useSensorEngine(started, intensity, scanDuration);
  const scanAudio = useScanAudio();
  const beliefStory = useBeliefStory();
  const story = useMemo(() => storyEnabled ? getStoryForBelief(belief.id) : null, [belief.id, storyEnabled]);
  const [storyActive, setStoryActive] = useState(false);

  // 5-second countdown before scan
  useEffect(() => {
    if (countdown <= 0) {
      setStarted(true);
      if (soundEnabled) scanAudio.start();
      if (story) {
        beliefStory.startStory(story);
        setStoryActive(true);
      }
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, scanAudio]);

  // Update audio intensity with score and story progress
  useEffect(() => {
    if (started && sensorState.phase === "scanning") {
      if (soundEnabled) scanAudio.updateIntensity(sensorState.overallScore);
      if (storyActive) {
        const progress = sensorState.elapsed / scanDuration;
        beliefStory.updateProgress(progress);
      }
    }
  }, [sensorState.overallScore, sensorState.phase, sensorState.elapsed, started, scanAudio, scanDuration, beliefStory, storyActive]);

  // Haptic on phase change
  useEffect(() => {
    if (sensorState.phase === "scanning" && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [sensorState.phase]);

  // Haptic on score milestones
  const lastMilestone = useState(0);
  useEffect(() => {
    const milestone = Math.floor(sensorState.overallScore / 20) * 20;
    if (milestone > lastMilestone[0] && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      lastMilestone[0] = milestone;
    }
  }, [sensorState.overallScore]);

  // Auto-complete
  useEffect(() => {
    if (sensorState.phase === "complete") {
      if (soundEnabled) {
        scanAudio.stop();
        scanAudio.playComplete();
      }
      if (storyActive) {
        beliefStory.stopStory();
        setStoryActive(false);
      }

      const breakdown = sensorState.sensors
        .filter((s) => s.available)
        .map((s) => ({
          sensorId: s.id,
          sensorName: s.name,
          baseline: s.baseline,
          peak: Math.max(...s.history, s.current),
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

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setTimeout(() => onComplete(result), 500);
    }
  }, [sensorState.phase]);

  // Stop audio on cancel
  const handleCancel = useCallback(() => {
    if (soundEnabled) scanAudio.stop();
    if (storyActive) beliefStory.stopStory();
    onCancel();
  }, [scanAudio, onCancel, beliefStory, storyActive]);

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
        <LinearGradient
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
    ({ item }: { item: (typeof sensorState.sensors)[0] }) => <SensorCard sensor={item} />,
    []
  );

  const audioActive = started && sensorState.phase === "scanning";

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Theme indicator */}
      <View style={[styles.themeIndicator, { backgroundColor: accentColor + "15", borderColor: accentColor + "40" }]}>
        <Text style={[styles.themeIndicatorText, { color: accentColor }]}>
          {theme.ambientSymbols[0]} {theme.name} — {theme.atmosphereLabel}
        </Text>
      </View>

      {/* Timer and belief */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.beliefLabel, { color: accentColor + "AA" }]}>Scanning belief in</Text>
          <Text style={[styles.beliefName, { color: "#fff" }]}>
            {belief.emoji} {belief.name}
          </Text>
        </View>
        <View style={styles.timerContainer}>
          <Text style={[styles.timer, { color: accentColor }]}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
          <Text style={[styles.timerLabel, { color: accentColor + "AA" }]}>remaining</Text>
        </View>
      </View>

      {/* Audio indicator */}
      {audioActive && (
        <View style={[styles.audioIndicator, { backgroundColor: accentColor + "15", borderColor: accentColor + "40" }]}>
          <Text style={[styles.audioText, { color: accentColor }]}>
            🔊 Audio field active — intensity responds to your belief score
          </Text>
        </View>
      )}

      {/* Story narration indicator */}
      {storyActive && story && (
        <View style={[styles.audioIndicator, { backgroundColor: accentColor + "15", borderColor: accentColor + "40" }]}>
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
      <View style={[styles.ticker, { backgroundColor: bgGradient[1] + "80", borderColor: accentColor + "30" }]}>
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
      <LinearGradient
        colors={[bgGradient[0], bgGradient[1], bgGradient[2]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Accent glow overlay */}
      <LinearGradient
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
          { backgroundColor: bgGradient[1], borderColor: accentColor + "40", opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.cancelText, { color: "#FF6B6B" }]}>End Scan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  countdownContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  countdownLabel: { fontSize: 16, fontWeight: "500" },
  countdownEmoji: { fontSize: 64 },
  countdownBelief: { fontSize: 28, fontWeight: "800" },
  themeName: { fontSize: 14, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
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
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  beliefLabel: { fontSize: 12, fontWeight: "500", textTransform: "uppercase", letterSpacing: 1 },
  beliefName: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  timerContainer: { alignItems: "flex-end" },
  timer: { fontSize: 32, fontWeight: "900", fontVariant: ["tabular-nums"] },
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
