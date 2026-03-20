import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Haptics } from "@/lib/safe-imports";

interface DailyChallengeProps {
  currentStreak: number;
  totalScans: number;
  personalBest: number;
  scannedToday: boolean;
  todaysBestScore?: number;
  onStartChallenge: () => void;
}

function getDailyGoal(totalScans: number, personalBest: number): { target: number; label: string; description: string } {
  if (totalScans === 0) return { target: 30, label: "First Spark", description: "Hit 30 to prove your belief is real" };
  if (personalBest < 30) return { target: 30, label: "First Spark", description: "Hit 30 — your belief is waking up" };
  if (personalBest < 50) return { target: 50, label: "Growing Strong", description: "Push to 50 — you can feel it building" };
  if (personalBest < 65) return { target: 65, label: "Breakthrough", description: "65 is where belief becomes undeniable" };
  if (personalBest < 80) return { target: 80, label: "Extraordinary", description: "80+ — most people never get here. You will." };
  return { target: 90, label: "Legend", description: "90+ — this is what true believers feel" };
}

function getMotivationLine(streak: number, scannedToday: boolean, todaysBest: number, target: number): string {
  if (scannedToday && todaysBest >= target) return "🏆 CHALLENGE CRUSHED! You're unstoppable.";
  if (scannedToday && todaysBest >= target * 0.8) return "🔥 So close! One more scan and you've got it.";
  if (scannedToday) return "💪 You showed up today. Now push harder.";
  if (streak >= 7) return `🔥 ${streak} days straight. Don't break the chain.`;
  if (streak >= 3) return `⚡ ${streak}-day streak! The momentum is real.`;
  if (streak === 1) return "✨ Day 1 done. Come back tomorrow — it gets stronger.";
  return "🎯 Your belief is waiting. Don't stop now.";
}

function getProgressPercent(todaysBest: number, target: number): number {
  if (todaysBest <= 0) return 0;
  return Math.min(100, Math.round((todaysBest / target) * 100));
}

export function DailyChallenge({
  currentStreak,
  totalScans,
  personalBest,
  scannedToday,
  todaysBestScore = 0,
  onStartChallenge,
}: DailyChallengeProps) {
  const colors = useColors();
  const goal = getDailyGoal(totalScans, personalBest);
  const progress = getProgressPercent(todaysBestScore, goal.target);
  const motivation = getMotivationLine(currentStreak, scannedToday, todaysBestScore, goal.target);
  const challengeComplete = scannedToday && todaysBestScore >= goal.target;

  return (
    <View style={[styles.card, {
      backgroundColor: colors.surface,
      borderColor: challengeComplete ? colors.success + "60" : colors.primary + "40",
    }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.tagline, { color: colors.primary }]}>
            🎵 DON'T STOP BELIEVING
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Today's Challenge
          </Text>
        </View>
        <View style={[styles.goalBadge, { backgroundColor: challengeComplete ? colors.success + "20" : colors.primary + "15" }]}>
          <Text style={[styles.goalBadgeText, { color: challengeComplete ? colors.success : colors.primary }]}>
            {challengeComplete ? "✅ DONE" : `🎯 ${goal.target}`}
          </Text>
        </View>
      </View>

      {/* Goal description */}
      <Text style={[styles.goalLabel, { color: colors.foreground }]}>
        {goal.label}
      </Text>
      <Text style={[styles.goalDesc, { color: colors.muted }]}>
        {goal.description}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%` as any,
                backgroundColor: challengeComplete ? colors.success : colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLeft, { color: colors.muted }]}>
            {scannedToday ? `Today's best: ${todaysBestScore}` : "Not scanned yet today"}
          </Text>
          <Text style={[styles.progressRight, { color: colors.muted }]}>
            Goal: {goal.target}
          </Text>
        </View>
      </View>

      {/* Motivation line */}
      <Text style={[styles.motivation, { color: challengeComplete ? colors.success : colors.foreground }]}>
        {motivation}
      </Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{currentStreak}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{personalBest}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Personal Best</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{totalScans}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Total Scans</Text>
        </View>
      </View>

      {/* CTA Button */}
      {!challengeComplete && (
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            onStartChallenge();
          }}
          style={({ pressed }) => [
            styles.ctaBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={styles.ctaBtnText}>
            {scannedToday ? "🔥 Scan Again — Beat Your Score" : "⚡ Start Today's Challenge"}
          </Text>
        </Pressable>
      )}

      {challengeComplete && (
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onStartChallenge();
          }}
          style={({ pressed }) => [
            styles.ctaBtn,
            {
              backgroundColor: colors.success + "20",
              borderWidth: 1,
              borderColor: colors.success + "60",
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={[styles.ctaBtnText, { color: colors.success }]}>
            🏆 Challenge Done! Scan Again for Fun
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tagline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  goalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  goalBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  goalLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  goalDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressSection: {
    gap: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLeft: {
    fontSize: 11,
  },
  progressRight: {
    fontSize: 11,
  },
  motivation: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  ctaBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
