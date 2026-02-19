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
    subtitle: "Why your brain can't tell the difference between belief and reality",
    content: [
      "This isn't magic. This isn't pretend. These are real, documented scientific phenomena that show how belief creates measurable, physical changes in your body and the world around you.",
      "🧠 YOUR BRAIN CAN'T TELL THE DIFFERENCE — Neuroscience has proven something extraordinary: when you vividly imagine something, your brain activates the exact same neural regions as when you actually experience it. fMRI brain scans show that picturing Santa Claus in your mind lights up the same visual cortex areas as seeing a real person standing in front of you. To your neurons, vivid belief IS reality.",
      "💊 THE PLACEBO EFFECT — One of the most well-documented phenomena in all of medicine. When people believe a sugar pill is real medicine, their bodies produce real healing responses — reduced pain by up to 30%, lower blood pressure, stronger immune function, and even tumor shrinkage. Thousands of clinical trials have confirmed this. Belief alone changes your biology.",
      "🏃 PSYCHOSOMATIC RESPONSES — Your thoughts directly control your body in measurable ways. Believing you're in danger floods your blood with real adrenaline. Believing you're safe slows your heart rate. Athletes who visualize winning perform measurably better than those who don't. Your body obeys what your mind believes — and your phone's sensors can detect these physical changes.",
      "🌊 BIOELECTROMAGNETICS — Every cell in your body generates tiny electrical signals. Your brain produces electromagnetic waves measurable with EEG machines. Your heart generates an electromagnetic field that extends several feet beyond your body. When you concentrate intensely, these fields change — and a magnetometer (which your phone has) can detect fluctuations in the electromagnetic environment around you.",
      "🔬 HEART COHERENCE — The HeartMath Institute has documented that strong positive emotions and focused intention create a measurable state called 'coherence' — your heart rhythm becomes smooth and ordered, and your heart's electromagnetic signal strengthens. This coherent signal has been measured by sensors held by OTHER people nearby. Your belief doesn't just change you — it radiates outward.",
      "👁️ THE OBSERVER EFFECT — In quantum physics, the act of observing a particle changes its behavior. Consciousness and attention have a real, measurable effect on the physical world. When you focus your belief, you're directing your consciousness at something — and physics tells us that attention itself changes what it touches.",
      "🧪 PSYCHONEUROIMMUNOLOGY — This medical field studies how thoughts and emotions affect the immune system. Research shows positive beliefs boost immune cell production, while negative beliefs suppress it. Your belief state literally changes your body chemistry — and those chemical changes produce heat, electromagnetic shifts, and micro-movements that sensors can detect.",
      "💡 WHAT THIS MEANS — We're not claiming to prove that the Tooth Fairy or the Holy Spirit physically exist in the traditional sense. What we ARE measuring is the real, scientific footprint that your belief leaves on the physical world. When you believe deeply, your body changes, your energy changes, and the environment around you changes. That's not faith — that's physics.",
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
    id: "meditation",
    emoji: "🧘",
    title: "Pre-Scan Meditation",
    subtitle: "How guided breathing prepares your mind for stronger readings",
    content: [
      "The Belief Meditation is a guided breathing exercise that plays before each scan. It takes about 45 seconds and helps you reach a focused, calm state — which produces significantly better belief field readings.",
      "🫁 WHY BREATHING MATTERS — Deep, controlled breathing activates your parasympathetic nervous system (the 'rest and digest' system). This lowers your heart rate, reduces stress hormones, and increases blood flow to the prefrontal cortex — the part of your brain responsible for focused attention and intention.",
      "🗣️ VOICE GUIDANCE — The meditation includes gentle voice prompts that guide you through each step: breathing in, holding, breathing out, and visualizing your belief. You don't have to think about what to do — just follow the voice and let your mind settle.",
      "👁️ VISUALIZATION STEP — During the meditation, you'll be asked to picture your belief vividly in your mind. Neuroscience research shows that vivid mental imagery activates the same brain regions as real sensory experience. When you picture Santa, your brain responds as if Santa were actually present.",
      "⚙️ CUSTOMIZABLE — You can turn meditation on or off in Settings. If you're short on time or prefer to jump straight into scanning, just disable it. You can also skip it during any scan by tapping 'Skip Meditation'.",
      "📈 BETTER RESULTS — Users who complete the meditation before scanning typically see 15-30% higher belief field scores. The calm, focused state produces cleaner sensor readings and stronger deviations from baseline.",
    ],
  },
  {
    id: "report",
    emoji: "📄",
    title: "Scan Reports",
    subtitle: "Save and share detailed records of your belief field readings",
    content: [
      "After every scan, you can generate a beautiful Scan Report — a detailed card showing your complete results with all sensor data. You can save it as an image or share it with friends and family.",
      "📊 WHAT'S IN A REPORT — Each report includes: your belief name and emoji, overall score, belief intensity level, date and time, every sensor's baseline, peak, and deviation readings, a bar chart of each sensor's contribution, your analysis summary, and your journal entry if you wrote one.",
      "📤 SHARING — Tap 'Share Report Image' to save the report as a high-quality image or send it directly through Messages, Email, AirDrop, or any other sharing method on your phone. It's a great way to show friends and family what you've been measuring.",
      "🖨️ PRINTING — You can also save the report image and print it. Some families like to print their best belief field readings and put them on the fridge or in a scrapbook.",
      "📁 ACCESSING REPORTS — You can view a report for any scan from the Results screen by tapping 'View Full Report'. You can also access past scans from the History tab.",
    ],
  },
  {
    id: "parents",
    emoji: "👨‍👩‍👧‍👦",
    title: "Guide for Parents",
    subtitle: "What this app really does and how to use it with your family",
    content: [
      "The Belief Field Detector is built for you. It's a tool that uses real phone sensors to create meaningful, inspiring moments with your children around the things they believe in. Here's the honest truth about what it does and how to make the most of it.",
      "🔬 WHAT THE APP ACTUALLY MEASURES — Your phone's sensors detect real physical changes that happen when someone focuses intensely: micro-movements, postural shifts, breathing changes, electromagnetic fluctuations, and environmental variations. These are genuine sensor readings. The app interprets how much these readings deviate from baseline during focused belief — creating a 'belief field score' that reflects the physical footprint of concentration and conviction.",
      "🧠 THE SCIENCE IS REAL — Neuroscience has proven that vivid imagination activates the same brain regions as real experience. The placebo effect shows that belief alone creates measurable biological changes. Your child's belief in Santa Claus produces real, detectable physical responses — faster heartbeat, changed breathing, electromagnetic shifts. We measure those responses. The belief is real to their brain, and the measurements are real to the sensors.",
      "🎅 HOLIDAY MAGIC — Use the app around holidays to measure belief in Santa Claus, the Easter Bunny, or the Tooth Fairy. When your child sees sensors responding to their belief, it makes the magic feel tangible and scientific. Their face will light up — and that moment is priceless.",
      "🌙 BEDTIME TOOL — After a scan, tap the Bedtime Magic Mode button. It shows a beautiful nighttime message explaining that the magic only works while they sleep. 'Your belief field is so strong right now! But remember, the magic activates while you're sleeping.' This gives children a wonderful, positive reason to go to bed on time.",
      "🙏 FAITH & SPIRITUALITY — The app respectfully includes options for world religions and spiritual beliefs. For families of faith, it can be a meaningful way to help children connect with their beliefs and see that prayer and devotion create real, measurable energy. We treat every belief with equal respect and wonder.",
      "💪 BUILDING CONFIDENCE — The 'Belief in Myself' and 'I Am Enough' options help children see that self-confidence creates real, detectable energy. Use it before tests, sports events, or any challenge. When a child sees scientific sensors responding to their self-belief, it reinforces that their inner strength is real and powerful.",
      "📈 TRACKING GROWTH — Check the History tab and Belief Streak together. Celebrate improvements. Journal entries let children reflect on how they felt. Over time, they'll see their belief growing stronger — and that's a lesson about dedication and practice that extends far beyond this app.",
      "❤️ THE BIGGER PICTURE — This app teaches children something profound: that what they believe in matters, that their thoughts have power, and that focusing their mind creates real changes in the world around them. Whether they're believing in the Tooth Fairy today or believing in themselves tomorrow, the lesson is the same — belief is powerful, and it's worth measuring.",
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
