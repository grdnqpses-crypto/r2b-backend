import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { SensorReading } from "@/hooks/use-sensors";

interface SensorCardProps {
  sensor: SensorReading;
}

export function SensorCard({ sensor }: SensorCardProps) {
  const colors = useColors();

  const statusColor =
    sensor.status === "shifting"
      ? colors.success
      : sensor.status === "active"
      ? colors.warning
      : sensor.status === "calibrating"
      ? colors.primary
      : colors.muted;

  const statusLabel =
    sensor.status === "shifting"
      ? "RESPONDING"
      : sensor.status === "active"
      ? "ACTIVE"
      : sensor.status === "calibrating"
      ? "CALIBRATING"
      : "BASELINE";

  // Mini sparkline using simple bar chart
  const maxHist = sensor.history.length > 0 ? Math.max(...sensor.history) : 0.001;
  const minHist = sensor.history.length > 0 ? Math.min(...sensor.history) : 0;
  const range = maxHist - minHist || 1;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.sensorName, { color: colors.foreground }]}>{sensor.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: colors.foreground }]}>
            {sensor.available ? sensor.value : "—"}
          </Text>
          <Text style={[styles.unit, { color: colors.muted }]}>{sensor.unit}</Text>
        </View>
      </View>

      {/* What it measures */}
      <Text style={[styles.description, { color: colors.muted }]}>
        📊 {sensor.whatItMeasures}
      </Text>

      {/* Why it matters */}
      <Text style={[styles.whyMatters, { color: colors.primary }]}>
        💡 {sensor.whyItMatters}
      </Text>

      {/* Mini sparkline */}
      {sensor.history.length > 2 && (
        <View style={styles.sparkline}>
          {sensor.history.slice(-20).map((val, i) => {
            const height = Math.max(((val - minHist) / range) * 24, 2);
            return (
              <View
                key={i}
                style={[
                  styles.sparkBar,
                  {
                    height,
                    backgroundColor:
                      i === sensor.history.slice(-20).length - 1
                        ? statusColor
                        : statusColor + "60",
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* Deviation */}
      {sensor.status !== "calibrating" && sensor.available && (
        <View style={styles.deviationRow}>
          <Text style={[styles.deviationLabel, { color: colors.muted }]}>Deviation from baseline:</Text>
          <Text
            style={[
              styles.deviationValue,
              { color: sensor.deviationPercent > 5 ? colors.success : colors.muted },
            ]}
          >
            {sensor.deviation > 0 ? "+" : ""}
            {sensor.deviation.toFixed(3)} {sensor.unit} ({sensor.deviationPercent.toFixed(1)}%)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: { flex: 1, gap: 6 },
  sensorName: { fontSize: 15, fontWeight: "700" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  valueContainer: { alignItems: "flex-end" },
  value: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  unit: { fontSize: 11, fontWeight: "500", marginTop: -2 },
  description: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  whyMatters: { fontSize: 12, lineHeight: 18, marginBottom: 8, fontStyle: "italic" },
  sparkline: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 28,
    gap: 2,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sparkBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 3,
  },
  deviationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviationLabel: { fontSize: 11 },
  deviationValue: { fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] },
});
