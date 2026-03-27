/**
 * PremiumPaywall — Subscription paywall for Remember 2 Buy.
 *
 * Pricing:
 *   - $1.99/week auto-renewing
 *   - Freemium: 1 store & 3 items free, Premium unlocks everything
 *
 * Google Play Billing integration note:
 *   In production, replace the `onActivate` mock with a real call to
 *   `expo-iap` or `react-native-purchases` (RevenueCat) to initiate
 *   the Play Store / App Store subscription purchase flow.
 *
 *   Recommended: RevenueCat (https://revenuecat.com)
 *   - Product ID: "premium_weekly_199"
 *   - No free trial
 *   - Price: $1.99/week
 *
 *   The `onActivate` callback is called after a successful purchase
 *   or free trial start, and should update the premium state.
 */
import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, Linking } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Haptics, LinearGradient } from "@/lib/safe-imports";
import { useReferral } from "@/hooks/use-referral";

interface PremiumPaywallProps {
  reason: "store-limit" | "item-limit" | "locked-feature" | "general";
  itemName?: string;
  featureName?: string;
  scansRemaining?: number;
  onActivate: (family: boolean) => void;
  onDismiss: () => void;
}

const PREMIUM_FEATURES = [
  { emoji: "♾️", title: "Unlimited Lists", desc: "Create as many shopping lists as you need" },
  { emoji: "🌍", title: "Unlimited Stores", desc: "Add as many stores as you need — grocery, pharmacy, hardware, and more" },
  { emoji: "⏱️", title: "Unlimited Items", desc: "Add unlimited items to any list" },
  { emoji: "🔬", title: "Coupon Section", desc: "Save and organize coupons alongside your shopping lists" },
  { emoji: "🎭", title: "Smart Reminders", desc: "Get notified the moment you arrive at any store" },
  { emoji: "🧘", title: "Family Sharing", desc: "Share lists with family members in real time" },
  { emoji: "📔", title: "Purchase History", desc: "Track what you've bought and how much you've spent" },
  { emoji: "📈", title: "Savings Tracker", desc: "See how much you save with coupons over time" },
  { emoji: "👥", title: "Multiple Profiles", desc: "Create separate shopping profiles for each family member" },
  { emoji: "🎁", title: "Referral Rewards", desc: "Share with friends — you both get a free week" },
  { emoji: "📄", title: "Scan Reports", desc: "Generate shareable image cards with full sensor data" },
  { emoji: "🔥", title: "Store Alerts", desc: "Get GPS alerts when you're near any store on your list" },
  { emoji: "🎨", title: "Custom Categories", desc: "Organize items into custom categories with your own labels" },
  { emoji: "🌙", title: "Barcode Scanner", desc: "Scan barcodes to quickly add items to your list" },
];

export function PremiumPaywall({
  reason,
  itemName,
  featureName,
  scansRemaining,
  onActivate,
  onDismiss,
}: PremiumPaywallProps) {
  const colors = useColors();
  const { referral } = useReferral();
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "family">("weekly");

  const hasFreeWeeks = referral.freeWeeksRemaining > 0;

  const getHeaderText = () => {
    switch (reason) {
      case "store-limit":
        return scansRemaining === 0
          ? "You've reached your free store limit"
          : `You have reached the free plan limit`;
      case "item-limit":
        return `Unlock unlimited stores & items`;
      case "locked-feature":
        return `${featureName} is a Premium feature`;
      default:
        return "Unlock the full Remember 2 Buy experience";
    }
  };

  const getSubtext = () => {
    switch (reason) {
      case "store-limit":
        return "Upgrade to Premium for unlimited stores, unlimited items, and the coupon section.";
      case "item-limit":
        return "Free users get 1 store and 3 items. Upgrade to add unlimited stores and items.";
      case "locked-feature":
        return "This feature requires Premium. Upgrade to unlock it.";
      default:
        return "Get unlimited stores, unlimited items, the coupon section, and much more.";
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
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
        </Pressable>

        {/* Header */}
        <Text style={styles.crownEmoji}>👑</Text>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Unlock Remember 2 Buy Premium
        </Text>
        <Text style={[styles.headerReason, { color: colors.primary }]}>
          {getHeaderText()}
        </Text>
        <Text style={[styles.headerSubtext, { color: colors.muted }]}>
          {getSubtext()}
        </Text>

        {/* Free week from referral banner */}
        {hasFreeWeeks && (
          <View style={[styles.freeWeekBanner, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
            <Text style={styles.freeWeekEmoji}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.freeWeekTitle, { color: colors.success }]}>
                You have {referral.freeWeeksRemaining} free week{referral.freeWeeksRemaining !== 1 ? "s" : ""} from referrals!
              </Text>
              <Text style={[styles.freeWeekDesc, { color: colors.muted }]}>
                Start your subscription and your first {referral.freeWeeksRemaining} week{referral.freeWeeksRemaining !== 1 ? "s" : ""} will be free.
              </Text>
            </View>
          </View>
        )}

        {/* Pricing cards */}
        <View style={styles.pricingSection}>
          {/* Weekly plan — PRIMARY */}
          <Pressable
            onPress={() => setSelectedPlan("weekly")}
            style={({ pressed }) => [
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === "weekly" ? colors.primary : colors.border,
                borderWidth: selectedPlan === "weekly" ? 2 : 1,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.popularText}>⭐ MOST POPULAR</Text>
            </View>
            <Text style={[styles.planName, { color: colors.foreground }]}>Premium</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: colors.primary }]}>$1.99</Text>
              <Text style={[styles.planPeriod, { color: colors.muted }]}>/week, auto-renewing</Text>
            </View>
            <View style={[styles.trialBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.trialText, { color: colors.primary }]}>
                ✓ Instant access — cancel anytime
              </Text>
            </View>
            <Text style={[styles.planAnnual, { color: colors.muted }]}>
              ~$8.63/month · Auto-renews weekly
            </Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onActivate(false);
              }}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.ctaBtnText}>
                {hasFreeWeeks
                  ? `Start Free — ${referral.freeWeeksRemaining + 0} week${referral.freeWeeksRemaining !== 1 ? "s" : ""} free`
                  : "Start Premium — $1.99/week"}
              </Text>
            </Pressable>
          </Pressable>

          {/* Family plan */}
          <Pressable
            onPress={() => setSelectedPlan("family")}
            style={({ pressed }) => [
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === "family" ? colors.primary : colors.border,
                borderWidth: selectedPlan === "family" ? 2 : 1,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.planName, { color: colors.foreground }]}>
              Family Premium
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: colors.primary }]}>$1.99</Text>
              <Text style={[styles.planPeriod, { color: colors.muted }]}>/week, auto-renewing</Text>
            </View>
            <View style={[styles.trialBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.trialText, { color: colors.primary }]}>
                ✓ Up to 6 family profiles
              </Text>
            </View>
            <Text style={[styles.planAnnual, { color: colors.muted }]}>
              ~$8.63/month · Auto-renews weekly
            </Text>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onActivate(true);
              }}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.ctaBtnText}>Start Premium — $1.99/week</Text>
            </Pressable>
          </Pressable>
        </View>

        {/* Referral promo */}
        <View style={[styles.referralPromo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.referralPromoEmoji}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.referralPromoTitle, { color: colors.foreground }]}>
              Share & Get a Free Week
            </Text>
            <Text style={[styles.referralPromoDesc, { color: colors.muted }]}>
              Share your referral code with a friend. When they subscribe, you both get 1 free week added to your account.
            </Text>
          </View>
        </View>

        {/* Features list */}
        <View style={styles.featuresList}>
          <Text style={[styles.featuresTitle, { color: colors.foreground }]}>
            Everything in Premium:
          </Text>
          {PREMIUM_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={[styles.featureName, { color: colors.foreground }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Trust signals */}
        <View style={styles.trustSection}>
          <Text style={[styles.trustText, { color: colors.muted }]}>
            ✓ Cancel anytime  ·  ✓ No commitment  ·  ✓ Instant access
          </Text>
          <Text style={[styles.trustSubtext, { color: colors.muted }]}>
            Subscription auto-renews at $1.99/week unless cancelled.{"\n"}
            Manage or cancel in Google Play / App Store settings.
          </Text>
          <Pressable
            onPress={() => Linking.openURL("https://remember2buy.com/privacy")}
            style={{ marginTop: 8 }}
          >
            <Text style={[styles.legalLink, { color: colors.muted }]}>
              Privacy Policy · Terms of Service
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60 },
  closeBtn: { position: "absolute", top: 0, right: 0, padding: 8, zIndex: 10 },
  closeBtnText: { fontSize: 24, fontWeight: "300" },
  crownEmoji: { fontSize: 56, textAlign: "center", marginBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  headerReason: { fontSize: 15, fontWeight: "600", textAlign: "center", marginBottom: 8 },
  headerSubtext: { fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 20, paddingHorizontal: 8 },
  freeWeekBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  freeWeekEmoji: { fontSize: 28 },
  freeWeekTitle: { fontSize: 14, fontWeight: "700" },
  freeWeekDesc: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  pricingSection: { gap: 12, marginBottom: 16 },
  priceCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    paddingVertical: 5,
    alignItems: "center",
  },
  popularText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  planName: { fontSize: 18, fontWeight: "800", marginTop: 20 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 4 },
  planPrice: { fontSize: 40, fontWeight: "900" },
  planPeriod: { fontSize: 16, fontWeight: "500" },
  trialBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  trialText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  planAnnual: { fontSize: 12, marginTop: 6, textAlign: "center" },
  ctaBtn: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: "center",
    width: "100%",
  },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  referralPromo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  referralPromoEmoji: { fontSize: 28 },
  referralPromoTitle: { fontSize: 14, fontWeight: "700" },
  referralPromoDesc: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  featuresList: { marginBottom: 28 },
  featuresTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, gap: 12 },
  featureEmoji: { fontSize: 22, width: 30, textAlign: "center" },
  featureText: { flex: 1 },
  featureName: { fontSize: 15, fontWeight: "700" },
  featureDesc: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  trustSection: { alignItems: "center", marginTop: 8 },
  trustText: { fontSize: 13, fontWeight: "500", textAlign: "center" },
  trustSubtext: { fontSize: 11, marginTop: 8, textAlign: "center", lineHeight: 18 },
  legalLink: { fontSize: 11, textDecorationLine: "underline" },
});
