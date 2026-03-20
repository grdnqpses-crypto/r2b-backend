import { useState } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "@/lib/safe-imports";

const { width } = Dimensions.get("window");

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    emoji: "🎵",
    title: "Don't Stop\nBelieving",
    subtitle: "Your belief is about to become visible",
    body: "You've always felt it. That deep knowing in your chest when you believe in something. That warmth when you think about what matters most to you. That certainty that some things are real, even when you can't see them.\n\nNow, for the first time, you can actually SEE it.",
    highlight:
      "Your phone has 7 scientific instruments. When you believe, they respond. This is your belief — measured, proven, and real.",
    sensors: [
      "📊 Accelerometer",
      "🔄 Gyroscope",
      "🧲 Magnetometer",
      "🌡️ Barometer",
      "💡 Light Sensor",
      "📐 Motion",
      "👣 Pedometer",
    ],
  },
  {
    emoji: "🧠",
    title: "Your Brain Can't Tell\nthe Difference",
    subtitle: "Neuroscience of Belief — The Science Is Real",
    body: "Here's what neuroscientists have proven: when you vividly imagine something — truly picture it in your mind — your brain activates the EXACT same regions as when you actually see it.\n\nClose your eyes and picture a lemon. Your mouth just watered. That's not imagination — that's your brain making it real.",
    highlight:
      "When you deeply believe in something, your brain is literally experiencing it as real. That's not wishful thinking — that's peer-reviewed neuroscience.",
    sensors: [],
  },
  {
    emoji: "💊",
    title: "Belief Physically\nChanges Your Body",
    subtitle: "The Placebo Effect — Proven for Decades",
    body: "Doctors have documented this for 70 years: when people believe a sugar pill is real medicine, their bodies respond with measurable physical changes — reduced pain, lower blood pressure, stronger immune response, even tumor shrinkage.\n\nThink about that. A SUGAR PILL. Just because they believed.",
    highlight:
      "If belief can heal the body, what else can it do? Your phone's sensors are about to answer that question — for YOUR belief, right now.",
    sensors: [],
  },
  {
    emoji: "🌊",
    title: "Belief Leaves a\nReal Footprint",
    subtitle: "Your Conviction Changes the World Around You",
    body: "When you believe deeply, your body changes in ways you can't feel — but sensors can.\n\n• Your muscles produce micro-tremors (accelerometer catches them)\n• Your breathing shifts air pressure (barometer detects it)\n• Your body's electromagnetic field fluctuates (magnetometer reads it)\n• Even how you hold your phone changes (gyroscope tracks it)",
    highlight:
      "We're not proving what you believe in exists. We're measuring the real, scientific footprint that your belief leaves on the physical world. And that footprint is real.",
    sensors: [],
  },
  {
    emoji: "🏆",
    title: "This Is Your\nChallenge",
    subtitle: "See It. Feel It. Prove It. Don't Stop.",
    body: "Choose what you believe in. Focus your mind. Believe as hard as you can. Watch every sensor respond.\n\nThen do it again tomorrow. And the next day. Watch your score climb. Watch your belief field grow stronger. Track your progress. Challenge your friends.\n\nBecause belief, like a muscle, gets stronger every time you use it.",
    highlight:
      "Your first scan is waiting. Don't stop believing — and never stop growing. 🎵",
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>{slide.emoji}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {slide.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>
            {slide.subtitle}
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            {slide.body}
          </Text>

          {slide.highlight && (
            <View
              style={[
                styles.highlightBox,
                { backgroundColor: "rgba(155,122,255,0.1)", borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.highlightText, { color: colors.foreground }]}>
                {slide.highlight}
              </Text>
            </View>
          )}

          {slide.sensors.length > 0 && (
            <View style={styles.sensorGrid}>
              {slide.sensors.map((s) => (
                <View
                  key={s}
                  style={[
                    styles.sensorChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.sensorText, { color: colors.foreground }]}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === page ? colors.primary : colors.border,
                width: i === page ? 24 : 8,
              },
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
            <Text style={[styles.backBtnText, { color: colors.muted }]}>
              Back
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            if (isLast) onComplete();
            else setPage(page + 1);
          }}
          style={({ pressed }) => [
            styles.nextBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? "Begin Detecting" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 50,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 16,
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  highlightBox: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "center",
  },
  sensorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  sensorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sensorText: { fontSize: 13, fontWeight: "500" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  dot: { height: 8, borderRadius: 4 },
  buttons: { flexDirection: "row", gap: 12 },
  backBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  backBtnText: { fontSize: 16, fontWeight: "600" },
  nextBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
