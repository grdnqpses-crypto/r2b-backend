import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Haptics, LinearGradient } from "@/lib/safe-imports";

interface PremiumPaywallProps {
  reason: "scan-limit" | "locked-belief" | "locked-feature" | "general";
  beliefName?: string;
  featureName?: string;
  scansRemaining?: number;
  onActivate: (family: boolean) => void;
  onDismiss: () => void;
}

const PREMIUM_FEATURES = [
  { emoji: "♾️", title: "Unlimited Scans", desc: "Scan as many times as you want, every day" },
  { emoji: "🌍", title: "All 45+ Beliefs", desc: "Every belief category — childhood, religion, spiritual, seasonal, supernatural, and more" },
  { emoji: "⏱️", title: "Extended Scans", desc: "Choose 30s, 60s, or 90s scan duration" },
  { emoji: "🔬", title: "Full Sensor Detail", desc: "See every sensor's baseline, peak, and deviation with scientific explanations" },
  { emoji: "🎭", title: "Belief Stories", desc: "Immersive narrated experiences during scans" },
  { emoji: "🧘", title: "Guided Meditation", desc: "Pre-scan breathing exercises with voice guidance" },
  { emoji: "📔", title: "Belief Journal", desc: "Write reflections after each scan with guided prompts" },
  { emoji: "📄", title: "Scan Reports", desc: "Generate shareable image cards with full sensor data" },
  { emoji: "🎨", title: "Themed Environments", desc: "Unique visual themes for each belief category" },
  { emoji: "🔥", title: "Belief Streaks", desc: "Track daily practice with milestones and personal bests" },
  { emoji: "🎨", title: "Custom Beliefs", desc: "Create your own beliefs with custom emoji and descriptions" },
  { emoji: "🌙", title: "Bedtime Magic Mode", desc: "Beautiful bedtime messages that help kids go to sleep" },
  { emoji: "🔬", title: "Sensor Lab", desc: "Real-time raw sensor data with live scientific graphs" },
];

export function PremiumPaywall({
  reason,
  beliefName,
  featureName,
  scansRemaining,
  onActivate,
  onDismiss,
}: PremiumPaywallProps) {
  const colors = useColors();

  const getHeaderText = () => {
    switch (reason) {
      case "scan-limit":
        return scansRemaining === 0
          ? "You've used all 3 free scans today"
          : `You have ${scansRemaining} free scan${scansRemaining === 1 ? "" : "s"} left today`;
      case "locked-belief":
        return `${beliefName} is a Premium belief`;
      case "locked-feature":
        return `${featureName} is a Premium feature`;
      default:
        return "Unlock the full Belief Field experience";
    }
  };

  const getSubtext = () => {
    switch (reason) {
      case "scan-limit":
        return "Upgrade to Believer for unlimited scans every day — measure your belief as often as you want.";
      case "locked-belief":
        return "Free users can scan 5 core beliefs. Upgrade to access all 45+ beliefs across every category.";
      case "locked-feature":
        return "This feature is available with a Believer subscription. Unlock it to deepen your belief experience.";
      default:
        return "Get unlimited scans, all beliefs, guided meditation, belief stories, and much more.";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.2)", "rgba(155,122,255,0.05)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [
            styles.closeBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
        </Pressable>

        {/* Header */}
        <Text style={styles.crownEmoji}>👑</Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Become a Believer
        </Text>
        <Text style={[styles.headerReason, { color: colors.primary }]}>
          {getHeaderText()}
        </Text>
        <Text style={[styles.headerSubtext, { color: colors.muted }]}>
          {getSubtext()}
        </Text>

        {/* Features list */}
        <View style={styles.featuresList}>
          <Text style={[styles.featuresTitle, { color: colors.foreground }]}>
            Everything in Premium:
          </Text>
          {PREMIUM_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={[styles.featureName, { color: colors.foreground }]}>
                  {f.title}
                </Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>
                  {f.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        <View style={styles.pricingSection}>
          {/* Individual plan */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              onActivate(false);
            }}
            style={({ pressed }) => [
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
            <Text style={[styles.planName, { color: colors.foreground }]}>
              Believer
            </Text>
            <Text style={[styles.planPrice, { color: colors.primary }]}>
              $4.99<Text style={styles.planPeriod}>/month</Text>
            </Text>
            <Text style={[styles.planAnnual, { color: colors.muted }]}>
              or $29.99/year (save 50%)
            </Text>
            <Text style={[styles.planCta, { color: colors.foreground }]}>
              Start 7-Day Free Trial
            </Text>
          </Pressable>

          {/* Family plan */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              onActivate(true);
            }}
            style={({ pressed }) => [
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.planName, { color: colors.foreground }]}>
              True Believers (Family)
            </Text>
            <Text style={[styles.planPrice, { color: colors.primary }]}>
              $7.99<Text style={styles.planPeriod}>/month</Text>
            </Text>
            <Text style={[styles.planAnnual, { color: colors.muted }]}>
              or $49.99/year — up to 6 family profiles
            </Text>
            <Text style={[styles.planSubDetail, { color: colors.muted }]}>
              That's just $1.39/person/month for a family of 6
            </Text>
            <Text style={[styles.planCta, { color: colors.foreground }]}>
              Start 7-Day Free Trial
            </Text>
          </Pressable>
        </View>

        {/* Trust signals */}
        <View style={styles.trustSection}>
          <Text style={[styles.trustText, { color: colors.muted }]}>
            ✓ Cancel anytime  ·  ✓ No commitment  ·  ✓ 7-day free trial
          </Text>
          <Text style={[styles.trustSubtext, { color: colors.muted }]}>
            Restore purchases available in Settings
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60 },
  closeBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 10,
  },
  closeBtnText: { fontSize: 24, fontWeight: "300" },
  crownEmoji: { fontSize: 56, textAlign: "center", marginBottom: 12 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  headerReason: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  headerSubtext: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  featuresList: { marginBottom: 28 },
  featuresTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, gap: 12 },
  featureEmoji: { fontSize: 22, width: 30, textAlign: "center" },
  featureText: { flex: 1 },
  featureName: { fontSize: 15, fontWeight: "700" },
  featureDesc: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  pricingSection: { gap: 12, marginBottom: 24 },
  priceCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    paddingVertical: 4,
    alignItems: "center",
  },
  popularText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  planName: { fontSize: 18, fontWeight: "800", marginTop: 16 },
  planPrice: { fontSize: 32, fontWeight: "900", marginTop: 4 },
  planPeriod: { fontSize: 16, fontWeight: "500" },
  planAnnual: { fontSize: 13, marginTop: 4 },
  planSubDetail: { fontSize: 12, marginTop: 2, fontStyle: "italic" },
  planCta: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(155,122,255,0.15)",
  },
  trustSection: { alignItems: "center", marginTop: 8 },
  trustText: { fontSize: 13, fontWeight: "500", textAlign: "center" },
  trustSubtext: { fontSize: 12, marginTop: 6, textAlign: "center" },
});
