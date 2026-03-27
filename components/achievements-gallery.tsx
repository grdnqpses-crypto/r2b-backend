import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  ALL_ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  type Achievement,
} from "@/hooks/use-achievements";
import { Haptics, LinearGradient } from "@/lib/safe-imports";

interface Props {
  earned: { id: string; earnedAt: string }[];
  isEarned: (id: string) => boolean;
  getEarnedDate: (id: string) => string | null;
  totalEarned: number;
  totalAvailable: number;
  onDismiss: () => void;
}

export function AchievementsGallery({
  earned,
  isEarned,
  getEarnedDate,
  totalEarned,
  totalAvailable,
  onDismiss,
}: Props) {
  const colors = useColors();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredAchievements = useMemo(() => {
    if (activeCategory === "all") return ALL_ACHIEVEMENTS;
    return ALL_ACHIEVEMENTS.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  const progressPercent = totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Achievements</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              {totalEarned} / {totalAvailable} Earned
            </Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>{progressPercent}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <LinearGradient
              colors={["#9B7AFF", "#6B4FCC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPercent}%` as any }]}
            />
          </View>
          <Text style={[styles.progressDesc, { color: colors.muted }]}>
            Keep scanning to unlock more achievements. Each badge represents a milestone in your item journey.
          </Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilter}
        >
          <Pressable
            onPress={() => setActiveCategory("all")}
            style={({ pressed }) => [
              styles.categoryChip,
              {
                backgroundColor: activeCategory === "all" ? colors.primary + "20" : colors.surface,
                borderColor: activeCategory === "all" ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: activeCategory === "all" ? colors.primary : colors.muted },
              ]}
            >
              All ({totalAvailable})
            </Text>
          </Pressable>
          {ACHIEVEMENT_CATEGORIES.map((cat) => {
            const count = ALL_ACHIEVEMENTS.filter((a) => a.category === cat.id).length;
            const earnedCount = ALL_ACHIEVEMENTS.filter(
              (a) => a.category === cat.id && isEarned(a.id)
            ).length;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor:
                      activeCategory === cat.id ? colors.primary + "20" : colors.surface,
                    borderColor: activeCategory === cat.id ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: activeCategory === cat.id ? colors.primary : colors.muted },
                  ]}
                >
                  {cat.emoji} {cat.name} ({earnedCount}/{count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Badges Grid */}
        <View style={styles.badgeGrid}>
          {filteredAchievements.map((achievement) => {
            const unlocked = isEarned(achievement.id);
            return (
              <Pressable
                key={achievement.id}
                onPress={() => {
                  if (Platform.OS !== "web")
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedAchievement(achievement);
                }}
                style={({ pressed }) => [
                  styles.badgeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: unlocked ? achievement.colors[0] + "60" : colors.border,
                    opacity: pressed ? 0.8 : unlocked ? 1 : 0.5,
                  },
                ]}
              >
                {unlocked ? (
                  <LinearGradient
                    colors={achievement.colors}
                    style={styles.badgeIconBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.badgeEmoji}>{achievement.icon}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.badgeIconBg, { backgroundColor: colors.border + "40" }]}>
                    <Text style={[styles.badgeEmoji, { opacity: 0.3 }]}>🔒</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.badgeName,
                    { color: unlocked ? colors.foreground : colors.muted },
                  ]}
                  numberOfLines={2}
                >
                  {achievement.title}
                </Text>
                {unlocked && (
                  <Text style={[styles.badgeEarned, { color: achievement.colors[0] }]}>
                    Earned
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedAchievement} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {selectedAchievement && (
              <>
                {isEarned(selectedAchievement.id) ? (
                  <LinearGradient
                    colors={selectedAchievement.colors}
                    style={styles.modalBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.modalEmoji}>{selectedAchievement.icon}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.modalBadge, { backgroundColor: colors.border + "40" }]}>
                    <Text style={[styles.modalEmoji, { opacity: 0.3 }]}>🔒</Text>
                  </View>
                )}

                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {selectedAchievement.title}
                </Text>

                {isEarned(selectedAchievement.id) && (
                  <Text style={[styles.modalDate, { color: colors.primary }]}>
                    Earned {formatDate(getEarnedDate(selectedAchievement.id)!)}
                  </Text>
                )}

                <Text style={[styles.modalDesc, { color: colors.muted }]}>
                  {selectedAchievement.description}
                </Text>

                <View style={[styles.modalHow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.modalHowLabel, { color: colors.foreground }]}>How to earn:</Text>
                  <Text style={[styles.modalHowText, { color: colors.muted }]}>
                    {selectedAchievement.howToEarn}
                  </Text>
                </View>

                {selectedAchievement.premium && !isEarned(selectedAchievement.id) && (
                  <View style={[styles.premiumTag, { backgroundColor: "#9B7AFF20" }]}>
                    <Text style={styles.premiumTagText}>👑 Premium Achievement</Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setSelectedAchievement(null)}
                  style={({ pressed }) => [
                    styles.modalClose,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 70 },
  backText: { fontSize: 16, fontWeight: "600" },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: { fontSize: 18, fontWeight: "800" },
  progressPercent: { fontSize: 24, fontWeight: "900" },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressDesc: { fontSize: 13, lineHeight: 18 },
  categoryFilter: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 13, fontWeight: "600" },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  badgeCard: {
    width: "30%",
    flexGrow: 1,
    flexBasis: "28%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  badgeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEmoji: { fontSize: 28 },
  badgeName: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },
  badgeEarned: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  modalBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalEmoji: { fontSize: 40 },
  modalTitle: { fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 4 },
  modalDate: { fontSize: 13, fontWeight: "600", marginBottom: 12 },
  modalDesc: { fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 16 },
  modalHow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    width: "100%",
    marginBottom: 16,
  },
  modalHowLabel: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  modalHowText: { fontSize: 13, lineHeight: 18 },
  premiumTag: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  premiumTagText: { fontSize: 13, fontWeight: "600", color: "#9B7AFF" },
  modalClose: {
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  modalCloseText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
