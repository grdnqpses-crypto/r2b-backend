import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getRetentionStats, type RetentionStats } from "@/lib/retentionStats";

export function WeeklySummaryCard() {
  const colors = useColors();
  const [stats, setStats] = useState<RetentionStats | null>(null);

  useEffect(() => {
    getRetentionStats().then(setStats);
  }, []);

  if (!stats || stats.totalRemindersTriggered === 0) return null;

  const metrics = [
    {
      icon: "🔔",
      value: stats.weeklyReminders,
      label: "Reminders\nThis Week",
    },
    {
      icon: "✅",
      value: stats.weeklyItemsChecked,
      label: "Items\nChecked",
    },
    {
      icon: "🛒",
      value: stats.totalTrips,
      label: "Total\nTrips",
    },
    {
      icon: "🔥",
      value: stats.streakDays,
      label: "Day\nStreak",
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>This Week</Text>
      <View style={styles.metricsRow}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metric}>
            <Text style={styles.metricIcon}>{m.icon}</Text>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>{m.value}</Text>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>{m.label}</Text>
          </View>
        ))}
      </View>
      {stats.totalRemindersTriggered > 0 && (
        <Text style={[styles.footer, { color: colors.muted }]}>
          {stats.totalRemindersTriggered} total reminder{stats.totalRemindersTriggered !== 1 ? "s" : ""} since you started
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },
  footer: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
});
