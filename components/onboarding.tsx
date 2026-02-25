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
    emoji: "📱",
    title: "Your Phone Is a Lab",
    subtitle: "7 Scientific Instruments in Your Pocket",
    body: "Your phone contains the same kinds of sensors used in real scientific laboratories — an accelerometer, gyroscope, magnetometer, barometer, light sensor, motion detector, and pedometer. Each one measures a different physical force in the world around you. Together, they can detect things you can't see with your eyes.",
    highlight: null,
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
    subtitle: "Neuroscience of Belief",
    body: "Here's something remarkable that neuroscientists have proven: when you vividly imagine something — truly picture it in your mind — your brain activates the exact same regions as when you actually see it. To your brain, a vividly imagined experience and a real experience are physically identical.",
    highlight:
      "This means when you deeply believe in something, your brain is literally experiencing it as real. That's not imagination — that's neuroscience.",
    sensors: [],
  },
  {
    emoji: "💊",
    title: "Belief Changes\nYour Body",
    subtitle: "The Placebo Effect Is Real Science",
    body: "Doctors have documented for decades that when people believe a sugar pill is real medicine, their bodies respond with measurable physical changes — reduced pain, lower blood pressure, stronger immune response. This is called the placebo effect, and it proves that belief alone can change your physical reality.",
    highlight:
      "If belief can heal the body, what else can it do? Your phone's sensors are about to find out.",
    sensors: [],
  },
  {
    emoji: "🌊",
    title: "Belief Leaves a\nPhysical Footprint",
    subtitle: "Your Conviction Changes the Air Around You",
    body: "When you believe deeply, your body responds in ways you can't feel but sensors can detect. Your muscles produce micro-tremors. Your breathing shifts atmospheric pressure. Your body's electromagnetic field fluctuates. Even the way you hold your phone changes. Every sensor in your phone can pick up these subtle, real, physical shifts.",
    highlight:
      "We're not proving what you believe in exists. We're measuring the real, scientific footprint that your belief leaves on the physical world.",
    sensors: [],
  },
  {
    emoji: "✨",
    title: "Measure Your\nBelief Field",
    subtitle: "See It. Feel It. Know It's Real.",
    body: "Choose what you believe in — Santa Claus, the Tooth Fairy, the Holy Spirit, guardian angels, or anything else. Focus your mind. Believe as hard as you can. And watch as every sensor in your phone responds to your conviction.",
    highlight:
      "The stronger you believe, the stronger the field. This is your belief, measured scientifically.",
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
