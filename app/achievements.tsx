/**
 * Achievements & Gamification Screen
 * Shopping streaks, badges, and progress tracking
 */
import { useCallback } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getAchievements, ACHIEVEMENT_DEFS, getShoppingStreak, getTotalCashback,
  getWeeklyChallenge, saveWeeklyChallenge,
  type Achievement, type WeeklyChallenge,
} from "@/lib/storage";

type AchievementDef = typeof ACHIEVEMENT_DEFS[number];

export default function AchievementsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<Record<string, Achievement>>({});
  const [streak, setStreak] = useState(0);
  const [cashbackTotals, setCashbackTotals] = useState({ week: 0, month: 0, year: 0, allTime: 0 });
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);

  const loadData = useCallback(async () => {
    const [achievementsData, streakData, cashback, challengeData] = await Promise.all([
      getAchievements(),
      getShoppingStreak(),
      getTotalCashback(),
      getWeeklyChallenge(),
    ]);
    setAchievements(achievementsData);
    setStreak(streakData);
    setCashbackTotals(cashback);
    // Auto-create weekly challenge if none exists or it's a new week
    const thisWeek = new Date();
    const weekStart = new Date(thisWeek);
    weekStart.setDate(thisWeek.getDate() - thisWeek.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];
    if (!challengeData || challengeData.weekStart !== weekStartStr) {
      const CHALLENGES = [
        { targetAmount: 10, label: "Save $10 this week" },
        { targetAmount: 15, label: "Save $15 this week" },
        { targetAmount: 20, label: "Save $20 this week" },
        { targetAmount: 5, label: "Save $5 this week" },
      ];
      const pick = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      const newChallenge: WeeklyChallenge = {
        weekStart: weekStartStr,
        targetAmount: pick.targetAmount,
        currentAmount: 0,
        isCompleted: false,
      };
      await saveWeeklyChallenge(newChallenge);
      setWeeklyChallenge(newChallenge);
    } else {
      setWeeklyChallenge(challengeData);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const unlockedCount = ACHIEVEMENT_DEFS.filter((def) => achievements[def.id]?.unlockedAt).length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  const renderAchievement = ({ item: def }: { item: AchievementDef }) => {
    const ach = achievements[def.id];
    const unlocked = !!ach?.unlockedAt;
    const progress = ach?.progress ?? 0;
    const pct = def.target > 0 ? Math.min(progress / def.target, 1) : 0;

    return (
      <View style={[
        styles.achCard,
        {
          backgroundColor: unlocked ? colors.primary + "12" : colors.surface,
          borderColor: unlocked ? colors.primary + "40" : colors.border,
          opacity: unlocked ? 1 : 0.7,
        }
      ]}>
        <View style={[styles.achEmoji, { backgroundColor: unlocked ? colors.primary + "20" : colors.border + "50" }]}>
          <Text style={styles.achEmojiText}>{def.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.achHeader}>
            <Text style={[styles.achTitle, { color: colors.foreground }]}>{def.title}</Text>
            {unlocked && <Text style={styles.achCheck}>✅</Text>}
          </View>
          <Text style={[styles.achDesc, { color: colors.muted }]}>{def.desc}</Text>
          {!unlocked && def.target > 1 && (
            <View style={{ marginTop: 6 }}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct * 100}%` as any }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.muted }]}>{progress} / {def.target}</Text>
            </View>
          )}
          {unlocked && ach.unlockedAt && (
            <Text style={[styles.unlockedDate, { color: colors.primary }]}>
              Unlocked {new Date(ach.unlockedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <IconSymbol name="arrow.left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>🏆 Achievements</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Week Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
            <Text style={styles.statEmoji}>🏅</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{unlockedCount}/{totalCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Badges</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>${cashbackTotals.allTime.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Saved</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.overallProgress, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.overallHeader}>
            <Text style={[styles.overallTitle, { color: colors.foreground }]}>Overall Progress</Text>
            <Text style={[styles.overallPct, { color: colors.primary }]}>{Math.round((unlockedCount / totalCount) * 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border, marginTop: 8 }]}>
            <View style={[styles.progressFill, {
              backgroundColor: colors.primary,
              width: `${(unlockedCount / totalCount) * 100}%` as any,
            }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.muted, marginTop: 4 }]}>
            {unlockedCount} of {totalCount} achievements unlocked
          </Text>
        </View>

        {/* Weekly Challenge */}
        {weeklyChallenge && (
          <View style={[styles.challengeCard, {
            backgroundColor: weeklyChallenge.isCompleted ? colors.success + "15" : colors.warning + "15",
            borderColor: weeklyChallenge.isCompleted ? colors.success + "40" : colors.warning + "40",
          }]}>
            <View style={styles.challengeHeader}>
              <Text style={[styles.challengeTitle, { color: colors.foreground }]}>
                {weeklyChallenge.isCompleted ? "🎉" : "🎯"} Weekly Challenge
              </Text>
              <Text style={[styles.challengeBadge, {
                backgroundColor: weeklyChallenge.isCompleted ? colors.success : colors.warning,
              }]}>
                {weeklyChallenge.isCompleted ? "DONE!" : "IN PROGRESS"}
              </Text>
            </View>
            <Text style={[styles.challengeGoal, { color: colors.foreground }]}>
              Save ${weeklyChallenge.targetAmount.toFixed(0)} this week
            </Text>
            <View style={{ marginTop: 8 }}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, {
                  backgroundColor: weeklyChallenge.isCompleted ? colors.success : colors.warning,
                  width: `${Math.min((weeklyChallenge.currentAmount / weeklyChallenge.targetAmount) * 100, 100)}%` as any,
                }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.muted, marginTop: 4 }]}>
                ${weeklyChallenge.currentAmount.toFixed(2)} / ${weeklyChallenge.targetAmount.toFixed(2)} saved
              </Text>
            </View>
          </View>
        )}
        {/* Achievement List */}
        <FlatList
          data={[...ACHIEVEMENT_DEFS].sort((a, b) => {
            const aUnlocked = !!achievements[a.id]?.unlockedAt;
            const bUnlocked = !!achievements[b.id]?.unlockedAt;
            if (aUnlocked && !bUnlocked) return -1;
            if (!aUnlocked && bUnlocked) return 1;
            return 0;
          })}
          keyExtractor={(item) => item.id}
          renderItem={renderAchievement}
          contentContainerStyle={{ paddingBottom: 80, gap: 10 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 11, textAlign: "center" },
  overallProgress: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  overallHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  overallTitle: { fontSize: 15, fontWeight: "600" },
  overallPct: { fontSize: 16, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12 },
  challengeCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  challengeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  challengeTitle: { fontSize: 15, fontWeight: "700" },
  challengeBadge: { fontSize: 10, fontWeight: "700", color: "#fff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  challengeGoal: { fontSize: 16, fontWeight: "600" },
  achCard: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, alignItems: "flex-start" },
  achEmoji: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  achEmojiText: { fontSize: 24 },
  achHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  achTitle: { fontSize: 15, fontWeight: "700" },
  achCheck: { fontSize: 14 },
  achDesc: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  unlockedDate: { fontSize: 12, marginTop: 4, fontWeight: "600" },
});
