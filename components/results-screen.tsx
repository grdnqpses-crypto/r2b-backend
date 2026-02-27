import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useShareResults } from "@/hooks/use-share-results";
import { BeliefFieldOrb } from "./belief-field-orb";
import { getBeliefById } from "@/constants/beliefs";
import type { ScanResult } from "@/hooks/use-scan-history";
import { Haptics, LinearGradient } from "@/lib/safe-imports";

export interface ResultsScreenProps {
  result: ScanResult;
  onDismiss: () => void;
  onBedtime?: () => void;
  onJournal?: () => void;
  onReport?: () => void;
  onTimer?: () => void;
}

export function ResultsScreen({ result, onDismiss, onBedtime, onJournal, onReport, onTimer }: ResultsScreenProps) {
  const colors = useColors();
  const belief = getBeliefById(result.beliefId);
  const { shareAsText } = useShareResults();

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Extraordinary";
    if (score >= 60) return "Powerful";
    if (score >= 40) return "Strong";
    if (score >= 20) return "Growing";
    return "Emerging";
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.primary;
    if (score >= 20) return colors.warning;
    return colors.muted;
  };

  const handleShare = async () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await shareAsText(result);
    } catch (err) {
      console.warn("[ResultsScreen] Share error:", err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.15)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.header, { color: colors.foreground }]}>Scan Results</Text>

        {/* Orb */}
        <View style={styles.orbSection}>
          <BeliefFieldOrb
            intensity={result.score / 100}
            score={result.score}
            beliefEmoji={result.beliefEmoji}
            phase="complete"
          />
        </View>

        {/* Score */}
        <View style={styles.scoreSection}>
          <Text style={[styles.scoreLabel, { color: getScoreColor(result.score) }]}>
            {getScoreLabel(result.score)} Belief Field
          </Text>
          <Text style={[styles.beliefTitle, { color: colors.foreground }]}>
            {result.beliefEmoji} {result.beliefName}
          </Text>
          <Text style={[styles.intensityLabel, { color: colors.muted }]}>
            Belief intensity: {result.intensity}/10
          </Text>
        </View>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareBtn,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "50",
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={styles.shareIcon}>📤</Text>
          <View>
            <Text style={[styles.shareBtnTitle, { color: colors.primary }]}>Share Results</Text>
            <Text style={[styles.shareBtnSub, { color: colors.muted }]}>
              Send your belief field score to friends & family
            </Text>
          </View>
        </Pressable>

        {/* View Full Report */}
        {onReport && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onReport();
            }}
            style={({ pressed }) => [
              styles.reportBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary + "50",
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text style={styles.reportBtnEmoji}>📊</Text>
            <View style={styles.reportBtnTextWrap}>
              <Text style={[styles.reportBtnTitle, { color: colors.foreground }]}>View Full Report</Text>
              <Text style={[styles.reportBtnSub, { color: colors.muted }]}>
                Detailed scan card you can save or print
              </Text>
            </View>
          </Pressable>
        )}

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>📋 What This Means</Text>
          <Text style={[styles.summaryText, { color: colors.muted }]}>{result.summary}</Text>
        </View>

        {/* Encouragement */}
        {belief && (
          <View style={[styles.encourageCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
            <Text style={[styles.encourageText, { color: colors.primary }]}>
              ✨ {belief.encouragement}
            </Text>
          </View>
        )}

        {/* Sensor Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sensor Breakdown</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          How each sensor contributed to your belief field score
        </Text>

        {result.sensorBreakdown.map((sensor) => {
          const barWidth = Math.min(sensor.deviationPercent * 2, 100);
          const barColor = sensor.deviationPercent > 15 ? colors.success : sensor.deviationPercent > 5 ? colors.primary : colors.muted;

          return (
            <View
              key={sensor.sensorId}
              style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownName, { color: colors.foreground }]}>{sensor.sensorName}</Text>
                <Text style={[styles.breakdownPercent, { color: barColor }]}>
                  {sensor.deviationPercent.toFixed(1)}%
                </Text>
              </View>

              {/* Bar */}
              <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Baseline</Text>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {sensor.baseline.toFixed(2)} {sensor.unit}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Peak</Text>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {sensor.peak.toFixed(2)} {sensor.unit}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Change</Text>
                  <Text style={[styles.statValue, { color: barColor }]}>
                    {sensor.deviation > 0 ? "+" : ""}
                    {sensor.deviation.toFixed(3)} {sensor.unit}
                  </Text>
                </View>
              </View>

              {/* Interpretation */}
              <Text style={[styles.interpretation, { color: colors.muted }]}>
                {sensor.interpretation}
              </Text>
            </View>
          );
        })}

        {/* Journal button */}
        {onJournal && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onJournal();
            }}
            style={({ pressed }) => [
              styles.journalBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary + "50",
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text style={styles.journalBtnEmoji}>📔</Text>
            <View style={styles.journalBtnTextWrap}>
              <Text style={[styles.journalBtnTitle, { color: colors.foreground }]}>
                {result.journalEntry ? "Edit Journal Entry" : "Write in Your Belief Journal"}
              </Text>
              <Text style={[styles.journalBtnSub, { color: colors.muted }]}>
                {result.journalEntry
                  ? `"${result.journalEntry.slice(0, 50)}${result.journalEntry.length > 50 ? "..." : ""}"`
                  : "Record how you felt during this scan"}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Belief Timer */}
        {onTimer && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onTimer();
            }}
            style={({ pressed }) => [
              styles.timerBtn,
              { backgroundColor: "rgba(155,122,255,0.08)", borderColor: "rgba(155,122,255,0.3)", opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Text style={styles.timerBtnEmoji}>⏰</Text>
            <Text style={[styles.timerBtnTitle, { color: colors.foreground }]}>Start Belief Timer</Text>
            <Text style={[styles.timerBtnSub, { color: colors.muted }]}>
              Set a countdown for the magic to activate while you rest
            </Text>
          </Pressable>
        )}

        {/* Bedtime button for parents */}
        {onBedtime && belief && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              onBedtime();
            }}
            style={({ pressed }) => [
              styles.bedtimeBtn,
              { backgroundColor: "#1a1a3a", borderColor: colors.primary + "60", opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Text style={styles.bedtimeEmoji}>🌙</Text>
            <Text style={[styles.bedtimeBtnTitle, { color: colors.foreground }]}>Bedtime Magic Mode</Text>
            <Text style={[styles.bedtimeBtnSub, { color: colors.muted }]}>
              Tap to show a special bedtime message
            </Text>
          </Pressable>
        )}

        {/* Done button */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onDismiss();
          }}
          style={({ pressed }) => [
            styles.doneBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 2, textAlign: "center", marginBottom: 8 },
  orbSection: { alignItems: "center", marginVertical: 8 },
  scoreSection: { alignItems: "center", marginBottom: 16 },
  scoreLabel: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  beliefTitle: { fontSize: 24, fontWeight: "800" },
  intensityLabel: { fontSize: 14, marginTop: 4 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  shareIcon: { fontSize: 28 },
  shareBtnTitle: { fontSize: 16, fontWeight: "700" },
  shareBtnSub: { fontSize: 12, marginTop: 2 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  summaryText: { fontSize: 14, lineHeight: 22 },
  encourageCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  encourageText: { fontSize: 15, lineHeight: 22, fontWeight: "600", textAlign: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, marginBottom: 12 },
  breakdownCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  breakdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  breakdownName: { fontSize: 15, fontWeight: "700" },
  breakdownPercent: { fontSize: 18, fontWeight: "800" },
  barBg: { height: 6, borderRadius: 3, marginBottom: 10 },
  barFill: { height: 6, borderRadius: 3 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  stat: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"], marginTop: 2 },
  interpretation: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  bedtimeBtn: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  bedtimeEmoji: { fontSize: 36, marginBottom: 8 },
  bedtimeBtnTitle: { fontSize: 18, fontWeight: "700" },
  bedtimeBtnSub: { fontSize: 13, marginTop: 4 },
  journalBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  journalBtnEmoji: { fontSize: 28 },
  journalBtnTextWrap: { flex: 1 },
  journalBtnTitle: { fontSize: 16, fontWeight: "700" },
  journalBtnSub: { fontSize: 12, marginTop: 2 },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  reportBtnEmoji: { fontSize: 28 },
  reportBtnTextWrap: { flex: 1 },
  reportBtnTitle: { fontSize: 16, fontWeight: "700" },
  reportBtnSub: { fontSize: 12, marginTop: 2 },
  timerBtn: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  timerBtnEmoji: { fontSize: 36, marginBottom: 8 },
  timerBtnTitle: { fontSize: 18, fontWeight: "700" },
  timerBtnSub: { fontSize: 13, marginTop: 4, textAlign: "center" },
  doneBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  doneBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
