import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Accelerometer, Gyroscope, Magnetometer, Barometer } from "expo-sensors";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRAPH_WIDTH = SCREEN_WIDTH - 64;
const GRAPH_HEIGHT = 80;
const MAX_POINTS = 60;

interface SensorReading {
  label: string;
  value: number;
  unit: string;
}

interface GraphData {
  points: number[];
  min: number;
  max: number;
}

function MiniGraph({ data, color, bgColor }: { data: GraphData; color: string; bgColor: string }) {
  if (data.points.length < 2) return null;
  const range = data.max - data.min || 1;

  // Build SVG-like path using simple lines
  const points = data.points.map((val, i) => {
    const x = (i / (MAX_POINTS - 1)) * GRAPH_WIDTH;
    const y = GRAPH_HEIGHT - ((val - data.min) / range) * (GRAPH_HEIGHT - 8) - 4;
    return { x, y };
  });

  return (
    <View style={[styles.graphContainer, { backgroundColor: bgColor }]}>
      {/* Simple bar visualization */}
      <View style={styles.graphBars}>
        {data.points.slice(-30).map((val, i) => {
          const height = Math.max(2, ((val - data.min) / range) * (GRAPH_HEIGHT - 16));
          return (
            <View
              key={i}
              style={[
                styles.graphBar,
                {
                  height,
                  backgroundColor: color,
                  opacity: 0.3 + (i / 30) * 0.7,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.graphLabels}>
        <Text style={[styles.graphLabel, { color: color + "80" }]}>
          {data.max.toFixed(2)}
        </Text>
        <Text style={[styles.graphLabel, { color: color + "80" }]}>
          {data.min.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

export default function SensorLabScreen() {
  const colors = useColors();
  const [isRunning, setIsRunning] = useState(false);
  const [updateRate, setUpdateRate] = useState(100); // ms

  // Raw sensor values
  const [accel, setAccel] = useState({ x: 0, y: 0, z: 0 });
  const [gyro, setGyro] = useState({ x: 0, y: 0, z: 0 });
  const [mag, setMag] = useState({ x: 0, y: 0, z: 0 });
  const [pressure, setPressure] = useState(0);

  // Graph data
  const [accelGraph, setAccelGraph] = useState<GraphData>({ points: [], min: 0, max: 1 });
  const [gyroGraph, setGyroGraph] = useState<GraphData>({ points: [], min: 0, max: 1 });
  const [magGraph, setMagGraph] = useState<GraphData>({ points: [], min: 0, max: 1 });
  const [pressureGraph, setPressureGraph] = useState<GraphData>({ points: [], min: 1013, max: 1014 });

  const subsRef = useRef<Array<{ remove: () => void }>>([]);

  const addPoint = useCallback((prev: GraphData, value: number): GraphData => {
    const points = [...prev.points, value].slice(-MAX_POINTS);
    const min = Math.min(...points);
    const max = Math.max(...points);
    return { points, min, max };
  }, []);

  const startSensors = useCallback(() => {
    const interval = updateRate;
    Accelerometer.setUpdateInterval(interval);
    Gyroscope.setUpdateInterval(interval);
    Magnetometer.setUpdateInterval(interval);
    Barometer.setUpdateInterval(interval);

    const subs = [
      Accelerometer.addListener((data) => {
        setAccel(data);
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        setAccelGraph((prev) => addPoint(prev, magnitude));
      }),
      Gyroscope.addListener((data) => {
        setGyro(data);
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        setGyroGraph((prev) => addPoint(prev, magnitude));
      }),
      Magnetometer.addListener((data) => {
        setMag(data);
        const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
        setMagGraph((prev) => addPoint(prev, magnitude));
      }),
      Barometer.addListener((data) => {
        setPressure(data.pressure);
        setPressureGraph((prev) => addPoint(prev, data.pressure));
      }),
    ];

    subsRef.current = subs;
    setIsRunning(true);
  }, [updateRate, addPoint]);

  const stopSensors = useCallback(() => {
    subsRef.current.forEach((s) => s.remove());
    subsRef.current = [];
    setIsRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      subsRef.current.forEach((s) => s.remove());
    };
  }, []);

  const accelMag = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  const gyroMag = Math.sqrt(gyro.x ** 2 + gyro.y ** 2 + gyro.z ** 2);
  const magMag = Math.sqrt(mag.x ** 2 + mag.y ** 2 + mag.z ** 2);

  const renderSensorBlock = (
    emoji: string,
    name: string,
    description: string,
    readings: SensorReading[],
    graph: GraphData,
    graphColor: string,
  ) => (
    <View style={[styles.sensorBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sensorHeader}>
        <Text style={styles.sensorEmoji}>{emoji}</Text>
        <View style={styles.sensorHeaderText}>
          <Text style={[styles.sensorName, { color: colors.foreground }]}>{name}</Text>
          <Text style={[styles.sensorDesc, { color: colors.muted }]}>{description}</Text>
        </View>
      </View>

      {/* Raw readings */}
      <View style={styles.readingsGrid}>
        {readings.map((r) => (
          <View key={r.label} style={[styles.readingCell, { backgroundColor: colors.background }]}>
            <Text style={[styles.readingLabel, { color: colors.muted }]}>{r.label}</Text>
            <Text style={[styles.readingValue, { color: graphColor }]}>
              {r.value.toFixed(4)}
            </Text>
            <Text style={[styles.readingUnit, { color: colors.muted }]}>{r.unit}</Text>
          </View>
        ))}
      </View>

      {/* Live graph */}
      <MiniGraph data={graph} color={graphColor} bgColor={colors.background} />
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Sensor Lab</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Real-time raw data from every sensor in your phone. This is what your phone sees, measured scientifically.
        </Text>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={() => {
              if (isRunning) stopSensors();
              else startSensors();
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}
            style={({ pressed }) => [
              styles.controlBtn,
              {
                backgroundColor: isRunning ? colors.error : colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text style={styles.controlBtnText}>
              {isRunning ? "⏹ Stop Sensors" : "▶ Start Sensors"}
            </Text>
          </Pressable>

          <View style={styles.rateSelector}>
            <Text style={[styles.rateLabel, { color: colors.muted }]}>Update rate:</Text>
            {[50, 100, 250, 500].map((rate) => (
              <Pressable
                key={rate}
                onPress={() => {
                  setUpdateRate(rate);
                  if (isRunning) {
                    stopSensors();
                    setTimeout(() => startSensors(), 100);
                  }
                }}
                style={({ pressed }) => [
                  styles.rateBtn,
                  {
                    backgroundColor: updateRate === rate ? colors.primary + "30" : colors.surface,
                    borderColor: updateRate === rate ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rateBtnText,
                    { color: updateRate === rate ? colors.primary : colors.muted },
                  ]}
                >
                  {rate}ms
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Status indicator */}
        <View style={[styles.statusBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: isRunning ? colors.success : colors.error }]} />
          <Text style={[styles.statusText, { color: colors.foreground }]}>
            {isRunning ? "Sensors Active — Reading live data" : "Sensors Inactive — Tap Start to begin"}
          </Text>
        </View>

        {/* Sensor blocks */}
        {renderSensorBlock(
          "📊",
          "Accelerometer",
          "Measures acceleration forces in 3 axes (g-force). 1g = 9.81 m/s². Detects micro-movements, vibrations, and gravity.",
          [
            { label: "X-axis", value: accel.x, unit: "g" },
            { label: "Y-axis", value: accel.y, unit: "g" },
            { label: "Z-axis", value: accel.z, unit: "g" },
            { label: "Magnitude", value: accelMag, unit: "g" },
          ],
          accelGraph,
          "#4ECDC4",
        )}

        {renderSensorBlock(
          "🔄",
          "Gyroscope",
          "Measures rotational velocity in 3 axes (rad/s). Detects how the phone is rotating in 3D space.",
          [
            { label: "X-axis", value: gyro.x, unit: "rad/s" },
            { label: "Y-axis", value: gyro.y, unit: "rad/s" },
            { label: "Z-axis", value: gyro.z, unit: "rad/s" },
            { label: "Magnitude", value: gyroMag, unit: "rad/s" },
          ],
          gyroGraph,
          "#FFD93D",
        )}

        {renderSensorBlock(
          "🧲",
          "Magnetometer",
          "Measures magnetic field strength in 3 axes (μT). Detects electromagnetic fields from your body and environment.",
          [
            { label: "X-axis", value: mag.x, unit: "μT" },
            { label: "Y-axis", value: mag.y, unit: "μT" },
            { label: "Z-axis", value: mag.z, unit: "μT" },
            { label: "Magnitude", value: magMag, unit: "μT" },
          ],
          magGraph,
          "#FF6B9D",
        )}

        {renderSensorBlock(
          "🌡️",
          "Barometer",
          "Measures atmospheric pressure (hPa). Standard sea-level is ~1013.25 hPa. Detects breathing and temperature changes.",
          [
            { label: "Pressure", value: pressure, unit: "hPa" },
            { label: "Deviation", value: pressure - 1013.25, unit: "hPa" },
          ],
          pressureGraph,
          "#9B7AFF",
        )}

        {/* Explanation card */}
        <View style={[styles.explainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.explainTitle, { color: colors.foreground }]}>
            What Am I Looking At?
          </Text>
          <Text style={[styles.explainText, { color: colors.muted }]}>
            This is the raw data from your phone's sensors, updating in real time. Each sensor measures a different physical force. The bar graphs show how readings change over time.
          </Text>
          <Text style={[styles.explainText, { color: colors.muted, marginTop: 8 }]}>
            Try holding your phone still, then moving it. Watch how the accelerometer and gyroscope respond. Bring a magnet near your phone and watch the magnetometer spike. Breathe on your phone and watch the barometer shift.
          </Text>
          <Text style={[styles.explainText, { color: colors.muted, marginTop: 8 }]}>
            During a belief scan, the app watches for exactly these kinds of changes — subtle shifts that happen when you focus your mind. This lab lets you see the raw science behind every scan.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: "900", paddingTop: 12 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  controls: { marginBottom: 16, gap: 12 },
  controlBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  controlBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  rateSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rateLabel: { fontSize: 13, fontWeight: "500" },
  rateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  rateBtnText: { fontSize: 12, fontWeight: "600" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, fontWeight: "600" },
  sensorBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sensorHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  sensorEmoji: { fontSize: 24 },
  sensorHeaderText: { flex: 1 },
  sensorName: { fontSize: 16, fontWeight: "700" },
  sensorDesc: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  readingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  readingCell: {
    flex: 1,
    minWidth: 70,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  readingLabel: { fontSize: 10, fontWeight: "500", marginBottom: 2 },
  readingValue: { fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] },
  readingUnit: { fontSize: 9, marginTop: 1 },
  graphContainer: {
    height: GRAPH_HEIGHT,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  graphBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 2,
  },
  graphBar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
  graphLabels: {
    position: "absolute",
    right: 6,
    top: 4,
    bottom: 4,
    justifyContent: "space-between",
  },
  graphLabel: { fontSize: 8, fontWeight: "500", fontVariant: ["tabular-nums"] },
  explainCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  explainTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  explainText: { fontSize: 13, lineHeight: 20 },
});
