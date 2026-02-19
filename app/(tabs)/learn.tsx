import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface Article {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  content: string[];
}

const ARTICLES: Article[] = [
  {
    id: "sensors",
    emoji: "📱",
    title: "How Your Phone Sensors Work",
    subtitle: "The 7 scientific instruments in your pocket",
    content: [
      "Your smartphone contains remarkable scientific instruments that were once only available in laboratories. Here's what each one does and how it connects to belief detection:",
      "📊 ACCELEROMETER — This sensor measures acceleration forces in three dimensions (X, Y, Z), measured in g-force (where 1g = 9.81 m/s²). It detects the tiniest movements, vibrations, and shifts in your body. When you focus deeply on a belief, your body produces micro-movements that the accelerometer can detect — even the subtle tremor of your hands holding the phone.",
      "🔄 GYROSCOPE — The gyroscope measures rotational velocity in radians per second. It knows exactly how the phone is rotating in 3D space. During deep belief focus, your postural stability changes — you may become more still or sway slightly differently. The gyroscope captures these orientation shifts.",
      "🧲 MAGNETOMETER — This sensor measures magnetic field strength in microteslas (μT). It's essentially a digital compass that detects electromagnetic fields around you. Every living thing generates a small electromagnetic field, and focused mental activity can create subtle variations in the local magnetic environment.",
      "🌡️ BAROMETER — The barometer measures atmospheric pressure in hectopascals (hPa). Standard sea-level pressure is about 1013.25 hPa. While large pressure changes indicate weather, micro-fluctuations can be influenced by temperature changes from your body and breathing patterns during focused belief.",
      "💡 LIGHT SENSOR — This sensor measures ambient light in lux (lumens per square meter). It detects how much light is in your environment. Your body position, hand placement, and even pupil dilation during intense focus can create subtle changes in the light readings around the phone.",
      "📐 DEVICE MOTION — This combines data from the accelerometer and gyroscope to give a complete picture of the phone's orientation, gravity vector, and user acceleration. It provides the most comprehensive view of how your physical state changes during belief focus.",
      "👣 PEDOMETER — The step counter detects walking and movement. During a belief scan, stillness is actually a positive signal — it indicates deep concentration and focus. Fewer steps during a scan means you're channeling more energy into your belief.",
    ],
  },
  {
    id: "science",
    emoji: "🧠",
    title: "The Science of Belief",
    subtitle: "How believing changes your body and environment",
    content: [
      "Scientists have studied the power of belief for centuries. Here are real scientific phenomena that show how belief creates measurable physical changes:",
      "💊 THE PLACEBO EFFECT — One of the most well-documented phenomena in medicine. When people believe a sugar pill is real medicine, their bodies actually produce healing responses. Studies show placebos can reduce pain by up to 30%, lower blood pressure, and even shrink tumors. The belief itself triggers real biological changes.",
      "🏃 PSYCHOSOMATIC RESPONSES — Your thoughts and beliefs directly affect your body. Believing you're in danger triggers real adrenaline. Believing you're safe lowers your heart rate. Believing you're strong actually makes your muscles perform better. Your body listens to what your mind believes.",
      "👁️ THE OBSERVER EFFECT — In quantum physics, the act of observing a particle actually changes its behavior. This suggests that consciousness and attention have a real, measurable effect on the physical world. When you focus your belief, you're directing your consciousness at something — and that attention matters.",
      "🧪 PSYCHONEUROIMMUNOLOGY — This field studies how thoughts and emotions affect the immune system. Research shows that positive beliefs and expectations can boost immune function, while negative beliefs can suppress it. Your belief state literally changes your body chemistry.",
      "🌊 BIOELECTROMAGNETICS — Every cell in your body generates tiny electrical signals. Your brain produces electromagnetic waves that can be measured with EEG machines. When you concentrate intensely, your brain wave patterns change — and these electromagnetic changes extend beyond your skull into the space around you.",
      "🔬 HEART COHERENCE — The HeartMath Institute has shown that strong positive emotions and focused intention create a measurable state called 'coherence' where your heart rhythm becomes smooth and ordered. This coherent heart signal is electromagnetic and can be detected several feet from your body.",
    ],
  },
  {
    id: "results",
    emoji: "📊",
    title: "Understanding Your Results",
    subtitle: "What your belief field score really means",
    content: [
      "Your Belief Field Score (0-100) represents how much your focused belief changed the sensor readings compared to your baseline environment. Here's how to interpret it:",
      "🟢 80-100: EXTRAORDINARY — Your belief created dramatic, measurable changes across multiple sensors. This level of focus and conviction is remarkable. The environment around you responded powerfully to your belief energy.",
      "🟣 60-79: POWERFUL — Strong and clear changes were detected. Multiple sensors showed significant deviation from baseline. Your belief is creating a real, detectable field around you.",
      "🟡 40-59: STRONG — Moderate but meaningful changes were recorded. Your belief field is building strength. With practice and deeper focus, you can push it even higher.",
      "🟠 20-39: GROWING — Subtle changes were detected. Your belief field is forming. Try closing your eyes, breathing deeply, and really immersing yourself in what you believe. The more you practice, the stronger it gets.",
      "⚪ 0-19: EMERGING — Very subtle readings. Don't be discouraged! Even the smallest change means something is happening. Belief fields grow with practice, just like muscles grow with exercise.",
      "TIPS FOR STRONGER READINGS: Close your eyes during the scan. Breathe slowly and deeply. Picture what you believe in as vividly as possible. Feel the emotion of your belief — joy, wonder, love, gratitude. Hold the phone still and let your inner energy do the work. Practice regularly — belief fields get stronger over time!",
      "IMPORTANT: Every person's belief field is unique. Don't compare your scores to others. What matters is your personal journey and how your scores change over time as you strengthen your belief.",
    ],
  },
  {
    id: "journal",
    emoji: "📔",
    title: "Your Belief Journal",
    subtitle: "Why writing about your beliefs makes them stronger",
    content: [
      "The Belief Journal is a powerful tool for deepening your connection to what you believe in. After each scan, you can write about how you felt, what you experienced, and what you were thinking.",
      "✍️ WHY JOURNALING WORKS — Research in psychology shows that writing about your experiences makes them more vivid and memorable. When you put your feelings into words, your brain processes them more deeply. This is called 'expressive writing' and it has been shown to reduce stress, improve mood, and strengthen emotional connections.",
      "🧠 THE REFLECTION EFFECT — When you reflect on a belief scan, you're reinforcing the neural pathways associated with that belief. Each time you think about and describe your experience, your brain treats it as a new experience — effectively doubling the impact of each scan.",
      "📈 TRACKING YOUR JOURNEY — Over time, your journal entries create a beautiful record of your belief journey. You can look back and see how your feelings, focus, and scores have evolved. Many people find that their belief grows stronger as they journal regularly.",
      "💡 TIPS FOR GREAT JOURNAL ENTRIES — Be honest about how you felt. Describe any physical sensations you noticed. Write about what you were picturing in your mind. Note any emotions that came up. There are no wrong answers — your journal is just for you.",
    ],
  },
  {
    id: "themes",
    emoji: "🎨",
    title: "Themed Scan Environments",
    subtitle: "How each belief category creates a unique atmosphere",
    content: [
      "Every belief category has its own unique visual environment during scans. This isn't just for looks — different themes help you get into the right mindset for different kinds of belief.",
      "✨ WONDER & MAGIC (Childhood) — A deep midnight blue with golden sparkles and magical symbols. Designed to evoke the wonder and imagination of childhood belief. Stars, wands, and fairy dust float around the orb.",
      "🕯️ SACRED LIGHT (Religion) — Warm golden tones with gentle amber light. This environment creates a reverent, peaceful atmosphere that mirrors the warmth of faith and spiritual devotion.",
      "🔮 ETHEREAL FLOW (Spiritual) — Soft purple and lavender hues with butterfly and moonlight symbols. This dreamy environment supports meditation, mindfulness, and connection to the unseen.",
      "💎 INNER STRENGTH (Personal) — Cool blue tones with electric energy symbols. This environment reflects the power that comes from within — confidence, determination, and self-belief.",
      "🌿 EARTH CONNECTION (Nature) — Deep greens with leaf and earth symbols. This grounding environment connects you to the natural world and the vast universe around you.",
      "👁️ BEYOND THE VEIL (Supernatural) — Deep indigo with fiery orange accents and cosmic symbols. This mysterious environment supports belief in the unexplained and the extraordinary.",
      "🎄 HOLIDAY SPIRIT (Seasonal) — Rich magenta and pink tones with holiday symbols from many traditions. This festive environment captures the special energy of holidays and celebrations.",
    ],
  },
  {
    id: "streak",
    emoji: "🔥",
    title: "Your Belief Streak",
    subtitle: "How daily practice strengthens your belief field",
    content: [
      "The Belief Streak tracker measures your consistency — how many days in a row you've practiced focusing your belief. Like any skill, belief gets stronger with regular practice.",
      "📅 HOW STREAKS WORK — Each day you complete at least one scan, your streak counter goes up by one. If you miss a day, the streak resets. But your total scans and personal best are never lost.",
      "🧠 WHY CONSISTENCY MATTERS — Neuroscience shows that repeated focused attention strengthens neural pathways. Each day you practice belief focus, you're literally building stronger connections in your brain. Over time, it becomes easier to reach deep states of belief.",
      "🏅 MILESTONES — As you scan regularly, you'll earn milestone badges: your first scan, 3-day streak, 7-day streak, and beyond. These aren't competitions — they're personal achievements that celebrate your dedication to your belief journey.",
      "📈 PERSONAL BEST — Your highest-ever belief field score is tracked. As you practice, you'll likely see this number climb. It's a beautiful way to see your growth over time.",
      "💡 TIPS — Try to scan at the same time each day to build a habit. Morning scans can set a positive tone for the day. Evening scans can help you reflect and wind down. The best time is whatever works for you.",
    ],
  },
  {
    id: "parents",
    emoji: "👨‍👩‍👧‍👦",
    title: "Guide for Parents",
    subtitle: "Using the Belief Field Detector with your kids",
    content: [
      "The Belief Field Detector is a wonderful tool for families. Here's how to make the most of it with your children:",
      "🎅 HOLIDAY MAGIC — Use the app around holidays to measure belief in Santa Claus, the Easter Bunny, or the Tooth Fairy. Kids love seeing 'scientific proof' that their belief is real. It makes the magic feel tangible and exciting.",
      "🌙 BEDTIME TOOL — After a scan, use the Bedtime Magic Mode button. It shows a beautiful nighttime message explaining that the magic only works while they sleep. This gives children a wonderful, positive reason to go to bed on time and fall asleep peacefully.",
      "🙏 FAITH & SPIRITUALITY — The app includes options for various world religions and spiritual beliefs. It can be a meaningful way to help children connect with their faith and see that their prayers and beliefs have power.",
      "💪 BUILDING CONFIDENCE — The 'Belief in Myself' option helps children see that self-confidence creates real energy. Use it before tests, sports events, or any challenge to boost their belief in themselves.",
      "📈 TRACKING GROWTH — Check the History tab together to see how belief scores change over time. Celebrate improvements and encourage kids to keep practicing their belief focus.",
      "💡 TEACHING MOMENT — Use the Learn section to teach kids about real science — how sensors work, what the placebo effect is, and how powerful the mind can be. It's a fun way to introduce scientific concepts.",
      "❤️ FAMILY BONDING — Do scans together as a family. Compare results, cheer each other on, and talk about what you believe in. It creates meaningful conversations about faith, hope, and the power of positive thinking.",
    ],
  },
];

export default function LearnScreen() {
  const colors = useColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ScreenContainer>
      <LinearGradient
        colors={["rgba(155,122,255,0.06)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Learn</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Understand the science behind your belief field
        </Text>

        {ARTICLES.map((article) => {
          const isExpanded = expandedId === article.id;
          return (
            <View key={article.id}>
              <Pressable
                onPress={() => {
                  setExpandedId(isExpanded ? null : article.id);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={({ pressed }) => [
                  styles.articleCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isExpanded ? colors.primary + "60" : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={styles.articleEmoji}>{article.emoji}</Text>
                <View style={styles.articleInfo}>
                  <Text style={[styles.articleTitle, { color: colors.foreground }]}>
                    {article.title}
                  </Text>
                  <Text style={[styles.articleSub, { color: colors.muted }]}>
                    {article.subtitle}
                  </Text>
                </View>
                <Text style={[styles.expandIcon, { color: colors.muted }]}>
                  {isExpanded ? "▲" : "▼"}
                </Text>
              </Pressable>

              {isExpanded && (
                <View style={[styles.articleContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {article.content.map((paragraph, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.paragraph,
                        {
                          color: i === 0 ? colors.foreground : colors.muted,
                          fontWeight: i === 0 ? "600" : "400",
                        },
                      ]}
                    >
                      {paragraph}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: "900", paddingTop: 12 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 2,
    gap: 12,
  },
  articleEmoji: { fontSize: 32 },
  articleInfo: { flex: 1 },
  articleTitle: { fontSize: 16, fontWeight: "700" },
  articleSub: { fontSize: 13, marginTop: 2 },
  expandIcon: { fontSize: 12 },
  articleContent: {
    borderRadius: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
});
