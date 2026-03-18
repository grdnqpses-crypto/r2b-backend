/**
 * BeliefStrengthTracker — Visual progress chart showing belief strength over time.
 *
 * Displays a per-belief line chart of scan scores, showing how belief gets
 * stronger with repeated scanning. Includes trend analysis and encouragement.
 */
import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "@/lib/safe-imports";
import type { ScanResult } from "@/hooks/use-scan-history";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 120;

interface BeliefStrengthTrackerProps {
  history: ScanResult[];
  onDismiss: () => void;
}

interface BeliefProgress {
  beliefId: string;
  beliefName: string;
  beliefEmoji: string;
  scans: ScanResult[];
  latestScore: number;
  firstScore: number;
  peakScore: number;
  avgScore: number;
  trend: "rising" | "stable" | "falling";
  trendPercent: number;
}

function computeBeliefProgress(history: ScanResult[]): BeliefProgress[] {
  const byBelief: Record<string, ScanResult[]> = {};
  for (const scan of history) {
    if (!byBelief[scan.beliefId]) byBelief[scan.beliefId] = [];
    byBelief[scan.beliefId].push(scan);
  }

  return Object.values(byBelief)
    .map((scans) => {
      const sorted = [...scans].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const scores = sorted.map((s) => s.score);
      const firstScore = scores[0] ?? 0;
      const latestScore = scores[scores.length - 1] ?? 0;
      const peakScore = Math.max(...scores);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // Trend: compare last 3 vs first 3 scans
      const recent = scores.slice(-3);
      const early = scores.slice(0, 3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;
      const trendPercent = earlyAvg > 0 ? Math.round(((recentAvg - earlyAvg) / earlyAvg) * 100) : 0;
      const trend: "rising" | "stable" | "falling" =
        trendPercent > 5 ? "rising" : trendPercent < -5 ? "falling" : "stable";

      return {
        beliefId: sorted[0].beliefId,
        beliefName: sorted[0].beliefName,
        beliefEmoji: sorted[0].beliefEmoji,
        scans: sorted,
        latestScore,
        firstScore,
        peakScore,
        avgScore,
        trend,
        trendPercent,
      };
    })
    .sort((a, b) => b.latestScore - a.latestScore);
}

function MiniChart({
  scores,
  color,
}: {
  scores: number[];
  color: string;
}) {
  if (scores.length < 2) {
    // Single point — show a dot
    return (
      <View style={[miniChartStyles.container, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
        <View style={[miniChartStyles.singleDot, { backgroundColor: color }]} />
        <Text style={[miniChartStyles.singleLabel, { color }]}>
          Score: {scores[0] ?? 0}
        </Text>
      </View>
    );
  }

  const max = Math.max(...scores, 1);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  const pointSpacing = CHART_WIDTH / (scores.length - 1);

  // Build SVG-like path using View bars
  const points = scores.map((score, i) => ({
    x: i * pointSpacing,
    y: CHART_HEIGHT - ((score - min) / range) * (CHART_HEIGHT - 20) - 10,
    score,
  }));

  return (
    <View style={[miniChartStyles.container, { width: CHART_WIDTH, height: CHART_HEIGHT }]}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = CHART_HEIGHT - ((v - min) / range) * (CHART_HEIGHT - 20) - 10;
        if (y < 0 || y > CHART_HEIGHT) return null;
        return (
          <View
            key={v}
            style={[
              miniChartStyles.gridLine,
              { top: y, width: CHART_WIDTH },
            ]}
          />
        );
      })}

      {/* Connecting lines between points */}
      {points.slice(0, -1).map((pt, i) => {
        const next = points[i + 1];
        const dx = next.x - pt.x;
        const dy = next.y - pt.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={`line-${i}`}
            style={[
              miniChartStyles.line,
              {
                left: pt.x,
                top: pt.y,
                width: length,
                backgroundColor: color + "80",
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}

      {/* Data points */}
      {points.map((pt, i) => (
        <View
          key={`pt-${i}`}
          style={[
            miniChartStyles.point,
            {
              left: pt.x - 5,
              top: pt.y - 5,
              backgroundColor: color,
              borderColor: i === points.length - 1 ? "#fff" : color,
              borderWidth: i === points.length - 1 ? 2 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

const miniChartStyles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden" },
  gridLine: {
    position: "absolute",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  line: {
    position: "absolute",
    height: 2,
    transformOrigin: "0 50%",
    borderRadius: 1,
  },
  point: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  singleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: CHART_HEIGHT / 2 - 8,
  },
  singleLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
});

function getTrendIcon(trend: "rising" | "stable" | "falling") {
  if (trend === "rising") return "📈";
  if (trend === "falling") return "📉";
  return "➡️";
}

function getTrendMessage(trend: "rising" | "stable" | "falling", beliefName: string, trendPercent: number) {
  if (trend === "rising") {
    return `Your belief in ${beliefName} is growing stronger! Up ${trendPercent}% recently.`;
  }
  if (trend === "falling") {
    return `Your ${beliefName} belief needs more focus. Try scanning more often.`;
  }
  return `Your belief in ${beliefName} is holding steady. Keep practicing!`;
}

function getStrengthLabel(score: number) {
  if (score >= 80) return { label: "Legendary", color: "#FFD700" };
  if (score >= 60) return { label: "Strong", color: "#9B7AFF" };
  if (score >= 40) return { label: "Growing", color: "#4CAF50" };
  if (score >= 20) return { label: "Emerging", color: "#2196F3" };
  return { label: "Nascent", color: "#9E9E9E" };
}

export function BeliefStrengthTracker({ history, onDismiss }: BeliefStrengthTrackerProps) {
  const colors = useColors();
  const [selectedBelief, setSelectedBelief] = useState<string | null>(null);

  const beliefProgress = useMemo(() => computeBeliefProgress(history), [history]);

  const selected = beliefProgress.find((b) => b.beliefId === selectedBelief) ?? beliefProgress[0];

  if (history.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["rgba(155,122,255,0.12)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
        />
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Belief Strength</Text>
          <Pressable onPress={onDismiss} style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📈</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Data Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            Complete your first scan to start tracking how your belief strength grows over time.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Belief Strength</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {beliefProgress.length} belief{beliefProgress.length !== 1 ? "s" : ""} tracked
          </Text>
        </View>
        <Pressable onPress={onDismiss} style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Belief selector pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {beliefProgress.map((bp) => {
            const isActive = (selectedBelief ?? beliefProgress[0]?.beliefId) === bp.beliefId;
            return (
              <Pressable
                key={bp.beliefId}
                onPress={() => setSelectedBelief(bp.beliefId)}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={styles.pillEmoji}>{bp.beliefEmoji}</Text>
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? "#fff" : colors.foreground },
                  ]}
                >
                  {bp.beliefName}
                </Text>
                <Text
                  style={[
                    styles.pillCount,
                    { color: isActive ? "rgba(255,255,255,0.7)" : colors.muted },
                  ]}
                >
                  {bp.scans.length}×
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Selected belief detail */}
        {selected && (
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Belief header */}
            <View style={styles.detailHeader}>
              <Text style={styles.detailEmoji}>{selected.beliefEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailName, { color: colors.foreground }]}>
                  {selected.beliefName}
                </Text>
                <Text style={[styles.detailScanCount, { color: colors.muted }]}>
                  {selected.scans.length} scan{selected.scans.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View>
                {(() => {
                  const { label, color } = getStrengthLabel(selected.latestScore);
                  return (
                    <View style={[styles.strengthBadge, { backgroundColor: color + "20", borderColor: color + "50" }]}>
                      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {selected.latestScore}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Latest</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {selected.peakScore}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Peak</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {selected.avgScore}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Average</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {selected.firstScore}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>First</Text>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartContainer}>
              <Text style={[styles.chartTitle, { color: colors.muted }]}>
                Score over {selected.scans.length} scan{selected.scans.length !== 1 ? "s" : ""}
              </Text>
              <MiniChart
                scores={selected.scans.map((s) => s.score)}
                color={colors.primary}
              />
              {/* X-axis labels */}
              <View style={styles.xAxisRow}>
                <Text style={[styles.xAxisLabel, { color: colors.muted }]}>
                  {new Date(selected.scans[0]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Text>
                {selected.scans.length > 1 && (
                  <Text style={[styles.xAxisLabel, { color: colors.muted }]}>
                    {new Date(selected.scans[selected.scans.length - 1]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </Text>
                )}
              </View>
            </View>

            {/* Trend */}
            <View
              style={[
                styles.trendBox,
                {
                  backgroundColor:
                    selected.trend === "rising"
                      ? "rgba(76,175,80,0.1)"
                      : selected.trend === "falling"
                      ? "rgba(244,67,54,0.1)"
                      : "rgba(33,150,243,0.1)",
                  borderColor:
                    selected.trend === "rising"
                      ? "rgba(76,175,80,0.3)"
                      : selected.trend === "falling"
                      ? "rgba(244,67,54,0.3)"
                      : "rgba(33,150,243,0.3)",
                },
              ]}
            >
              <Text style={styles.trendIcon}>{getTrendIcon(selected.trend)}</Text>
              <Text
                style={[
                  styles.trendText,
                  {
                    color:
                      selected.trend === "rising"
                        ? "#4CAF50"
                        : selected.trend === "falling"
                        ? "#F44336"
                        : "#2196F3",
                  },
                ]}
              >
                {getTrendMessage(selected.trend, selected.beliefName, selected.trendPercent)}
              </Text>
            </View>

            {/* Improvement from first */}
            {selected.scans.length > 1 && (
              <View style={styles.improvementRow}>
                <Text style={[styles.improvementLabel, { color: colors.muted }]}>
                  Growth since first scan:
                </Text>
                <Text
                  style={[
                    styles.improvementValue,
                    {
                      color:
                        selected.latestScore >= selected.firstScore
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {selected.latestScore >= selected.firstScore ? "+" : ""}
                  {selected.latestScore - selected.firstScore} pts
                </Text>
              </View>
            )}
          </View>
        )}

        {/* All beliefs summary */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>ALL BELIEFS</Text>
        {beliefProgress.map((bp) => {
          const { label, color } = getStrengthLabel(bp.latestScore);
          return (
            <Pressable
              key={bp.beliefId}
              onPress={() => setSelectedBelief(bp.beliefId)}
              style={({ pressed }) => [
                styles.beliefRow,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.beliefRowEmoji}>{bp.beliefEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.beliefRowName, { color: colors.foreground }]}>
                  {bp.beliefName}
                </Text>
                <View style={styles.beliefRowBar}>
                  <View
                    style={[
                      styles.beliefRowBarFill,
                      { width: `${bp.latestScore}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.beliefRowRight}>
                <Text style={[styles.beliefRowScore, { color }]}>{bp.latestScore}</Text>
                <Text style={[styles.beliefRowLabel, { color }]}>{label}</Text>
              </View>
              <Text style={[styles.beliefRowTrend, { color: colors.muted }]}>
                {getTrendIcon(bp.trend)}
              </Text>
            </Pressable>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 20, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  pillRow: { paddingBottom: 16, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pillEmoji: { fontSize: 16 },
  pillText: { fontSize: 13, fontWeight: "600" },
  pillCount: { fontSize: 11 },
  detailCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  detailEmoji: { fontSize: 36 },
  detailName: { fontSize: 18, fontWeight: "800" },
  detailScanCount: { fontSize: 12, marginTop: 2 },
  strengthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  strengthLabel: { fontSize: 12, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: 36, marginHorizontal: 4 },
  chartContainer: { marginBottom: 12 },
  chartTitle: { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  xAxisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  xAxisLabel: { fontSize: 10 },
  trendBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  trendIcon: { fontSize: 20 },
  trendText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  improvementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  improvementLabel: { fontSize: 13 },
  improvementValue: { fontSize: 16, fontWeight: "800" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  beliefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  beliefRowEmoji: { fontSize: 28 },
  beliefRowName: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  beliefRowBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  beliefRowBarFill: { height: 6, borderRadius: 3 },
  beliefRowRight: { alignItems: "flex-end" },
  beliefRowScore: { fontSize: 20, fontWeight: "900" },
  beliefRowLabel: { fontSize: 10, fontWeight: "600" },
  beliefRowTrend: { fontSize: 18 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  emptyDesc: { fontSize: 15, textAlign: "center", lineHeight: 24 },
});
