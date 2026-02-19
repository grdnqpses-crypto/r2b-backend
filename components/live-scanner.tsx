import { useEffect, useState, useCallback } from "react";
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

interface LiveScannerProps {
  belief: BeliefOption;
  intensity: number;
  onComplete: (result: ScanResult) => void;
  onCancel: () => void;
}

const SCAN_DURATION = 60;

export function LiveScanner({ belief, intensity, onComplete, onCancel }: LiveScannerProps) {
  if (Platform.OS !== "web") {
    useKeepAwake();
  }
  const colors = useColors();
  const [countdown, setCountdown] = useState(5);
  const [started, setStarted] = useState(false);
  const [showSensors, setShowSensors] = useState(false);

  const sensorState = useSensorEngine(started, intensity, SCAN_DURATION);
  const scanAudio = useScanAudio();

  // 5-second countdown before scan
  useEffect(() => {
    if (countdown <= 0) {
      setStarted(true);
      scanAudio.start();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, scanAudio]);

  // Update audio intensity with score
  useEffect(() => {
    if (started && sensorState.phase === "scanning") {
      scanAudio.updateIntensity(sensorState.overallScore);
    }
  }, [sensorState.overallScore, sensorState.phase, started, scanAudio]);

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
      // Stop audio and play completion chime
      scanAudio.stop();
      scanAudio.playComplete();

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
    scanAudio.stop();
    onCancel();
  }, [scanAudio, onCancel]);

  const remaining = Math.max(0, SCAN_DURATION - Math.floor(sensorState.elapsed));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // Countdown overlay
  if (countdown > 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["rgba(155,122,255,0.2)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
        />
        <View style={styles.countdownContent}>
          <Text style={[styles.countdownLabel, { color: colors.muted }]}>
            Focus on your belief in
          </Text>
          <Text style={styles.countdownEmoji}>{belief.emoji}</Text>
          <Text style={[styles.countdownBelief, { color: colors.foreground }]}>
            {belief.name}
          </Text>
          <Text style={[styles.countdownHint, { color: colors.primary }]}>
            Close your eyes... breathe deeply... believe...
          </Text>
          <Text style={[styles.countdownNumber, { color: colors.primary }]}>
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

  // Audio indicator
  const audioActive = started && sensorState.phase === "scanning";

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Timer and belief */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.beliefLabel, { color: colors.muted }]}>Scanning belief in</Text>
          <Text style={[styles.beliefName, { color: colors.foreground }]}>
            {belief.emoji} {belief.name}
          </Text>
        </View>
        <View style={styles.timerContainer}>
          <Text style={[styles.timer, { color: colors.primary }]}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
          <Text style={[styles.timerLabel, { color: colors.muted }]}>remaining</Text>
        </View>
      </View>

      {/* Audio indicator */}
      {audioActive && (
        <View style={[styles.audioIndicator, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Text style={[styles.audioText, { color: colors.primary }]}>
            🔊 Audio field active — intensity responds to your belief score
          </Text>
        </View>
      )}

      {/* Orb */}
      <View style={styles.orbContainer}>
        <BeliefFieldOrb
          intensity={sensorState.apparitionIntensity}
          score={sensorState.overallScore}
          beliefEmoji={belief.emoji}
          phase={sensorState.phase}
        />
      </View>

      {/* Ticker */}
      <View style={[styles.ticker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.tickerText, { color: colors.foreground }]} numberOfLines={2}>
          {sensorState.ticker}
        </Text>
      </View>

      {/* Toggle */}
      <Pressable
        onPress={() => setShowSensors(!showSensors)}
        style={({ pressed }) => [
          styles.toggleBtn,
          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.toggleText, { color: colors.primary }]}>
          {showSensors ? "Hide Sensor Details ▲" : "Show All Sensor Details ▼"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.1)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
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
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.cancelText, { color: colors.error }]}>End Scan</Text>
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
  countdownHint: { fontSize: 15, fontStyle: "italic", marginTop: 8 },
  countdownNumber: { fontSize: 96, fontWeight: "900", marginTop: 20 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  listHeader: { marginBottom: 12 },
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
