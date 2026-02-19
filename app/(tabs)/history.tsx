import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Modal, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useScanHistory, type ScanResult } from "@/hooks/use-scan-history";
import { ResultsScreen } from "@/components/results-screen";
import { BedtimeMessage } from "@/components/bedtime-message";
import { getBeliefById } from "@/constants/beliefs";

export default function HistoryScreen() {
  const colors = useColors();
  const { history, getStats } = useScanHistory();
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [showBedtime, setShowBedtime] = useState(false);

  const stats = getStats();

  const getScoreColor = (score: number) => {
    if (score >= 70) return colors.success;
    if (score >= 40) return colors.primary;
    if (score >= 20) return colors.warning;
    return colors.muted;
  };

  if (selectedScan && showBedtime) {
    const belief = getBeliefById(selectedScan.beliefId);
    return (
      <Modal visible animationType="fade" statusBarTranslucent>
        <BedtimeMessage
          beliefName={selectedScan.beliefName}
          beliefEmoji={selectedScan.beliefEmoji}
          message={belief?.bedtimeMessage || "Time for bed! The magic works while you sleep."}
          score={selectedScan.score}
          onDismiss={() => {
            setShowBedtime(false);
            setSelectedScan(null);
          }}
        />
      </Modal>
    );
  }

  if (selectedScan && !showBedtime) {
    return (
      <Modal visible animationType="slide" statusBarTranslucent>
        <ResultsScreen
          result={selectedScan}
          onDismiss={() => setSelectedScan(null)}
          onBedtime={() => setShowBedtime(true)}
        />
      </Modal>
    );
  }

  const renderItem = ({ item }: { item: ScanResult }) => {
    const scoreColor = getScoreColor(item.score);
    return (
      <Pressable
        onPress={() => {
          setSelectedScan(item);
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        style={({ pressed }) => [
          styles.scanCard,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={styles.cardEmoji}>{item.beliefEmoji}</Text>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.foreground }]}>{item.beliefName}</Text>
          <Text style={[styles.cardDate, { color: colors.muted }]}>
            {new Date(item.date).toLocaleDateString()} · Intensity {item.intensity}/10
          </Text>
          <View style={styles.sensorSummary}>
            {item.sensorBreakdown.slice(0, 3).map((s) => (
              <Text key={s.sensorId} style={[styles.sensorTag, { color: colors.muted }]}>
                {s.sensorName}: {s.deviationPercent.toFixed(0)}%
              </Text>
            ))}
          </View>
        </View>
        <View style={styles.scoreCol}>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + "20" }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{item.score}</Text>
          </View>
          <Text style={[styles.tapHint, { color: colors.muted }]}>tap to view</Text>
        </View>
      </Pressable>
    );
  };

  const ListHeader = (
    <View>
      <Text style={[styles.title, { color: colors.foreground }]}>Scan History</Text>

      {/* Stats */}
      {history.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Scans</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.avgScore}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Avg Score</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.strongestBelief?.beliefEmoji || "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Strongest</Text>
          </View>
        </View>
      )}

      {history.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Scans Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            Go to the Detect tab to run your first belief field scan!
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <LinearGradient
        colors={["rgba(155,122,255,0.06)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: "900", paddingTop: 12, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardEmoji: { fontSize: 36 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700" },
  cardDate: { fontSize: 12, marginTop: 2 },
  sensorSummary: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  sensorTag: { fontSize: 10, fontWeight: "500" },
  scoreCol: { alignItems: "center", gap: 4 },
  scoreBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  scoreText: { fontSize: 22, fontWeight: "900" },
  tapHint: { fontSize: 10 },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, paddingHorizontal: 40 },
});
