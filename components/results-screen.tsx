import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { Celebration } from "./celebration";
import { ImpactReveal } from "./impact-reveal";
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
  const [showImpact, setShowImpact] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "EXTRAORDINARY";
    if (score >= 60) return "POWERFUL";
    if (score >= 40) return "STRONG";
    if (score >= 20) return "GROWING";
    return "EMERGING";
  };

  const getEmotionalMessage = (score: number) => {
    if (score >= 80) return {
      headline: "Your belief just moved the world.",
      body: "The sensors didn't lie. Your conviction created a measurable field of energy around you. This is what it feels like to truly believe — and your phone just proved it.",
      cta: "🏆 Don't stop now. You're at the top.",
    };
    if (score >= 60) return {
      headline: "You can feel it, can't you?",
      body: "Something real happened just now. Your body changed. The air around you changed. Multiple sensors detected it. That feeling in your chest? That's your belief field — and it's powerful.",
      cta: "🔥 Push to 80. You're almost there.",
    };
    if (score >= 40) return {
      headline: "Your belief is waking up.",
      body: "The sensors picked it up. Your belief is real and it's building. Every scan makes it stronger — like a muscle you're training. You can feel the difference already.",
      cta: "⚡ Scan again. Push it higher.",
    };
    if (score >= 20) return {
      headline: "Something is stirring.",
      body: "The sensors caught a flicker. Your belief is there — it just needs more focus. Close your eyes next time. Breathe deeper. Picture it more vividly. The field is forming.",
      cta: "💪 Don't stop. It gets stronger with practice.",
    };
    return {
      headline: "Every legend starts here.",
      body: "Even the smallest reading means something happened. Your belief field is just getting started. The more you practice, the stronger it grows — just like a muscle on day one.",
      cta: "✨ Try again. Focus harder. Believe deeper.",
    };
  };

  const getTangibleAnalogy = (score: number) => {
    if (score >= 80) return "⚡ That's like a heartbeat — your belief field is as strong as your own pulse.";
    if (score >= 60) return "🌊 That's like a wave — your belief is creating real ripples in the physical world.";
    if (score >= 40) return "🕯️ That's like a candle flame — visible, warm, and real.";
    if (score >= 20) return "🌱 That's like a seed sprouting — something real is growing.";
    return "💧 That's like a single drop — every ocean started this way.";
  };

  const getWhatThisMeans = (score: number) => {
    if (score >= 80) return {
      title: "What This Score Means",
      points: [
        "🧠 Your brain was in a state of peak conviction — the same state documented in elite athletes and deep meditators",
        "🔬 Multiple sensors showed simultaneous deviation, which scientists call \"correlated response\" — the strongest possible reading",
        "💪 Your body physically changed during this scan. That change was real, measurable, and documented here",
        "🎵 Don't stop believing — you're in rare company",
      ],
    };
    if (score >= 60) return {
      title: "What This Score Means",
      points: [
        "🧠 Your brain entered a focused belief state — similar to what researchers see during prayer and deep visualization",
        "🔬 Your body's electromagnetic field showed measurable fluctuation during the scan",
        "💪 This score puts you in the top tier of belief field strength",
        "🎵 You can feel it. The sensors confirmed it. Keep going.",
      ],
    };
    if (score >= 40) return {
      title: "What This Score Means",
      points: [
        "🧠 Your brain produced measurable focus — the kind that changes how your body holds itself",
        "🔬 The sensors detected real physical changes, not random noise",
        "💪 Like a muscle on day 3 of training — you can already feel the difference",
        "🎵 Scan daily. Watch this number climb. The field is building.",
      ],
    };
    if (score >= 20) return {
      title: "What This Score Means",
      points: [
        "🧠 Your brain showed early signs of focused intention — the foundation of stronger belief",
        "🔬 The sensors caught something real — subtle, but there",
        "💪 Every expert started exactly here. The path forward is clear: practice.",
        "🎵 Close your eyes next time. Breathe deeper. Picture it more vividly.",
      ],
    };
    return {
      title: "What This Score Means",
      points: [
        "🧠 Your brain is learning a new skill — focused belief takes practice, just like any skill",
        "🔬 Even at this level, the sensors detected something. That something is real.",
        "💪 The placebo effect starts at 0% belief and grows with repetition. So does your field.",
        "🎵 Don't stop. Day 1 is always the hardest. Come back tomorrow.",
      ],
    };
  };

  const emotional = getEmotionalMessage(result.score);
  const analogy = getTangibleAnalogy(result.score);
  const whatThisMeans = getWhatThisMeans(result.score);

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
      {/* ImpactReveal — fires immediately on mount for ALL scores */}
      <ImpactReveal
        score={result.score}
        beliefEmoji={result.beliefEmoji}
        visible={showImpact}
        onComplete={() => {
          setShowImpact(false);
          // After impact, fire confetti for high scores
          if (result.score >= 40) setShowCelebration(true);
        }}
      />

      {/* Confetti celebration — fires after impact reveal for high scores */}
      <Celebration
        score={result.score}
        beliefEmoji={result.beliefEmoji}
        visible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
      <LinearGradient
        colors={["rgba(155,122,255,0.15)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.dontStopTagline, { color: colors.primary }]}>🎵 DON'T STOP BELIEVING</Text>
        <Text style={[styles.header, { color: colors.foreground }]}>Your Results</Text>

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
            {getScoreLabel(result.score)} BELIEF FIELD
          </Text>
          <Text style={[styles.beliefTitle, { color: colors.foreground }]}>
            {result.beliefEmoji} {result.beliefName}
          </Text>
          <Text style={[styles.intensityLabel, { color: colors.muted }]}>
            Belief intensity: {result.intensity}/10
          </Text>
          <Text style={[styles.scoreNumber, { color: getScoreColor(result.score) }]}>
            {result.score}
          </Text>
          <Text style={[styles.scoreNumberLabel, { color: colors.muted }]}>out of 100</Text>
        </View>

        {/* Emotional message card */}
        <View style={[styles.emotionalCard, { backgroundColor: getScoreColor(result.score) + "12", borderColor: getScoreColor(result.score) + "40" }]}>
          <Text style={[styles.emotionalHeadline, { color: colors.foreground }]}>
            {emotional.headline}
          </Text>
          <Text style={[styles.emotionalBody, { color: colors.muted }]}>
            {emotional.body}
          </Text>
          <Text style={[styles.emotionalAnalogy, { color: getScoreColor(result.score) }]}>
            {analogy}
          </Text>
          <Text style={[styles.emotionalCta, { color: getScoreColor(result.score) }]}>
            {emotional.cta}
          </Text>
        </View>

        {/* What This Means card */}
        <View style={[styles.whatMeansCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.whatMeansTitle, { color: colors.foreground }]}>
            💡 {whatThisMeans.title}
          </Text>
          {whatThisMeans.points.map((point, i) => (
            <Text key={i} style={[styles.whatMeansPoint, { color: colors.muted }]}>
              {point}
            </Text>
          ))}
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

        {/* Summary — science layer */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>🔬 The Science Behind Your Score</Text>
          <Text style={[styles.summaryText, { color: colors.muted }]}>{result.summary}</Text>
        </View>

        {/* Encouragement + challenge CTA */}
        {belief && (
          <View style={[styles.encourageCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
            <Text style={[styles.encourageText, { color: colors.primary }]}>
              ✨ {belief.encouragement}
            </Text>
          </View>
        )}

        {/* Scan again CTA */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDismiss();
          }}
          style={({ pressed }) => [styles.scanAgainBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <Text style={styles.scanAgainText}>🔄 Scan Again — Beat Your Score</Text>
        </Pressable>

        {/* Sensor Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📊 Sensor Breakdown</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Your phone's 7 scientific instruments detected these real, measurable changes in your body and environment during your belief focus:
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
  dontStopTagline: { fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", textAlign: "center", marginBottom: 4 },
  scoreNumber: { fontSize: 72, fontWeight: "900", marginTop: 8 },
  scoreNumberLabel: { fontSize: 13, fontWeight: "600", marginTop: -4, marginBottom: 4 },
  emotionalCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  emotionalHeadline: { fontSize: 22, fontWeight: "900", marginBottom: 10, lineHeight: 28 },
  emotionalBody: { fontSize: 15, lineHeight: 24, marginBottom: 12 },
  emotionalAnalogy: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  emotionalCta: { fontSize: 15, fontWeight: "800" },
  scanAgainBtn: { paddingVertical: 18, borderRadius: 16, alignItems: "center", marginBottom: 20 },
  scanAgainText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  whatMeansCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  whatMeansTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  whatMeansPoint: { fontSize: 13, lineHeight: 20 },
});
