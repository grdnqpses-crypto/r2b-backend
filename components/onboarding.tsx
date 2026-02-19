import { useState } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/use-colors";

const { width } = Dimensions.get("window");

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    emoji: "📱",
    title: "Your Phone Is a Lab",
    subtitle: "7 Scientific Instruments in Your Pocket",
    body: "Your phone contains an accelerometer, gyroscope, magnetometer, barometer, light sensor, motion detector, and pedometer. Each one measures a different aspect of your physical environment — just like real scientific instruments.",
    sensors: ["📊 Accelerometer", "🔄 Gyroscope", "🧲 Magnetometer", "🌡️ Barometer", "💡 Light Sensor", "📐 Motion", "👣 Pedometer"],
  },
  {
    emoji: "🧠",
    title: "Belief Creates Energy",
    subtitle: "Your Focus Changes Your Environment",
    body: "When you believe in something deeply, your body responds — your muscles tense slightly, your breathing changes, your posture shifts, even the electromagnetic field around you can change. Your phone's sensors can detect all of these subtle shifts.",
    sensors: [],
  },
  {
    emoji: "✨",
    title: "Measure Your Belief Field",
    subtitle: "See Your Belief Become Real",
    body: "Choose what you believe in, focus your mind, and watch as every sensor in your phone responds to your conviction. The stronger you believe, the stronger the field. See it. Feel it. Measure it. Scientifically.",
    sensors: [],
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const colors = useColors();
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      <LinearGradient
        colors={["rgba(155,122,255,0.15)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      <View style={styles.content}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: colors.primary }]}>{slide.subtitle}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{slide.body}</Text>

        {slide.sensors.length > 0 && (
          <View style={styles.sensorGrid}>
            {slide.sensors.map((s) => (
              <View key={s} style={[styles.sensorChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sensorText, { color: colors.foreground }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === page ? colors.primary : colors.border },
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        {page > 0 && (
          <Pressable
            onPress={() => setPage(page - 1)}
            style={({ pressed }) => [
              styles.backBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.backBtnText, { color: colors.muted }]}>Back</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            if (isLast) onComplete();
            else setPage(page + 1);
          }}
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text style={styles.nextBtnText}>{isLast ? "Begin Detecting" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 80, paddingBottom: 50 },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: "600", textAlign: "center", marginBottom: 20 },
  body: { fontSize: 15, lineHeight: 24, textAlign: "center", paddingHorizontal: 12 },
  sensorGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 24, gap: 8 },
  sensorChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  sensorText: { fontSize: 13, fontWeight: "500" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttons: { flexDirection: "row", gap: 12 },
  backBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  backBtnText: { fontSize: 16, fontWeight: "600" },
  nextBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
