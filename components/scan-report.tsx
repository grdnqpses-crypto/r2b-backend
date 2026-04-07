import { useRef, useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from "react-native";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";
import { useColors } from "@/hooks/use-colors";
import type { ScanResult } from "@/hooks/use-scan-history";
import { Haptics, LinearGradient } from "@/lib/safe-imports";

interface ScanReportProps {
  result: ScanResult;
  onDismiss: () => void;
}

export function ScanReport({ result, onDismiss }: ScanReportProps) {
  const colors = useColors();
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Extraordinary";
    if (score >= 60) return "Powerful";
    if (score >= 40) return "Strong";
    if (score >= 20) return "Growing";
    return "Emerging";
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#4ADE80";
    if (score >= 40) return "#9B7AFF";
    if (score >= 20) return "#FBBF24";
    return "#9BA1A6";
  };

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share Belief Field Report",
          });
        }
      }
    } catch (e) {
      // Fallback: just dismiss
    } finally {
      setSharing(false);
    }
  }, [sharing]);

  const scoreColor = getScoreColor(result.score);
  const dateStr = new Date(result.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Scan Report</Text>
        <Text style={[styles.pageSubtitle, { color: colors.muted }]}>
          A complete record of your item field scan with all sensor data
        </Text>

        {/* Shareable card */}
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={styles.viewShot}
        >
          <View style={[styles.reportCard, { backgroundColor: "#0D0D1A" }]}>
            <LinearGradient
              colors={[scoreColor + "15", "transparent", scoreColor + "08"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            {/* Title bar */}
            <View style={styles.reportHeader}>
              <Text style={styles.reportBrand}>item FIELD DETECTOR</Text>
              <Text style={styles.reportDate}>{dateStr}</Text>
            </View>

            {/* Score hero */}
            <View style={styles.scoreHero}>
              <Text style={styles.reportEmoji}>{result.itemEmoji}</Text>
              <Text style={styles.reportItemName}>{result.itemName}</Text>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor + "20", borderColor: scoreColor + "60" }]}>
                <Text style={[styles.scoreNumber, { color: scoreColor }]}>{result.score}</Text>
                <Text style={[styles.scoreMax, { color: scoreColor + "80" }]}>/100</Text>
              </View>
              <Text style={[styles.scoreLabel, { color: scoreColor }]}>
                {getScoreLabel(result.score)} item Field
              </Text>
              <Text style={styles.intensityText}>
                item Intensity: {result.intensity}/10
              </Text>
            </View>

            {/* Sensor grid */}
            <View style={styles.sensorGrid}>
              <Text style={styles.sensorGridTitle}>SENSOR READINGS</Text>
              {result.sensorBreakdown.map((sensor) => {
                const barWidth = Math.min(sensor.deviationPercent * 2, 100);
                const barColor = sensor.deviationPercent > 15 ? "#4ADE80" : sensor.deviationPercent > 5 ? "#9B7AFF" : "#6B7280";
                return (
                  <View key={sensor.sensorId} style={styles.sensorRow}>
                    <View style={styles.sensorRowHeader}>
                      <Text style={styles.sensorName}>{sensor.sensorName}</Text>
                      <Text style={[styles.sensorPercent, { color: barColor }]}>
                        {sensor.deviationPercent.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.sensorBar}>
                      <View style={[styles.sensorBarFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
                    </View>
                    <View style={styles.sensorStats}>
                      <Text style={styles.sensorStat}>
                        Base: {sensor.baseline.toFixed(2)} {sensor.unit}
                      </Text>
                      <Text style={styles.sensorStat}>
                        Peak: {sensor.peak.toFixed(2)} {sensor.unit}
                      </Text>
                      <Text style={[styles.sensorStat, { color: barColor }]}>
                        Δ {sensor.deviation > 0 ? "+" : ""}{sensor.deviation.toFixed(3)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Summary */}
            <View style={styles.reportSummary}>
              <Text style={styles.summaryLabel}>ANALYSIS</Text>
              <Text style={styles.summaryText}>{result.summary}</Text>
            </View>

            {/* Journal entry if exists */}
            {result.journalEntry && (
              <View style={styles.reportJournal}>
                <Text style={styles.journalLabel}>📔 JOURNAL ENTRY</Text>
                <Text style={styles.journalText}>"{result.journalEntry}"</Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.reportFooter}>
              <Text style={styles.footerText}>Measured with 7 scientific phone sensors</Text>
              <Text style={styles.footerText}>item Field Detector App</Text>
            </View>
          </View>
        </ViewShot>

        {/* Explanation */}
        <View style={[styles.explainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.explainTitle, { color: colors.foreground }]}>📋 What This Report Shows</Text>
          <Text style={[styles.explainText, { color: colors.muted }]}>
            This report contains a complete record of your item field scan. It shows your overall score, the item you focused on, and detailed readings from each sensor in your phone. The deviation percentage shows how much each sensor changed from its baseline during your focused item.
          </Text>
        </View>

        {/* Share button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed || sharing ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={styles.shareBtnText}>
            {sharing ? "Preparing..." : "📤 Share Report Image"}
          </Text>
          <Text style={styles.shareBtnSub}>
            Save or send this report as an image
          </Text>
        </Pressable>

        {/* Back button */}
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.backBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back to Results</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 60 },
  pageTitle: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 4 },
  pageSubtitle: { fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 18 },
  viewShot: { borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  reportCard: {
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  reportHeader: { alignItems: "center", marginBottom: 16 },
  reportBrand: { fontSize: 10, fontWeight: "800", color: "#9B7AFF", letterSpacing: 3, textTransform: "uppercase" },
  reportDate: { fontSize: 11, color: "#9BA1A6", marginTop: 4 },
  scoreHero: { alignItems: "center", marginBottom: 20 },
  reportEmoji: { fontSize: 48, marginBottom: 8 },
  reportItemName: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 12 },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  scoreNumber: { fontSize: 40, fontWeight: "900" },
  scoreMax: { fontSize: 18, fontWeight: "600", marginLeft: 2 },
  scoreLabel: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  intensityText: { fontSize: 12, color: "#9BA1A6" },
  sensorGrid: { marginBottom: 16 },
  sensorGridTitle: { fontSize: 10, fontWeight: "700", color: "#9BA1A6", letterSpacing: 2, marginBottom: 10 },
  sensorRow: { marginBottom: 10 },
  sensorRowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sensorName: { fontSize: 13, fontWeight: "600", color: "#E0E0E0" },
  sensorPercent: { fontSize: 14, fontWeight: "800" },
  sensorBar: { height: 4, borderRadius: 2, backgroundColor: "#1a1a2e", marginBottom: 4 },
  sensorBarFill: { height: 4, borderRadius: 2 },
  sensorStats: { flexDirection: "row", justifyContent: "space-between" },
  sensorStat: { fontSize: 10, color: "#6B7280", fontVariant: ["tabular-nums"] },
  reportSummary: { marginBottom: 12 },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: "#9BA1A6", letterSpacing: 2, marginBottom: 6 },
  summaryText: { fontSize: 13, color: "#D0D0D0", lineHeight: 20 },
  reportJournal: { marginBottom: 12 },
  journalLabel: { fontSize: 10, fontWeight: "700", color: "#9BA1A6", letterSpacing: 2, marginBottom: 6 },
  journalText: { fontSize: 13, color: "#D0D0D0", lineHeight: 20, fontStyle: "italic" },
  reportFooter: { alignItems: "center", paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#2a2a3e" },
  footerText: { fontSize: 10, color: "#6B7280" },
  explainCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  explainTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  explainText: { fontSize: 13, lineHeight: 20 },
  shareBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  shareBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  shareBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  backBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  backBtnText: { fontSize: 15, fontWeight: "600" },
});
