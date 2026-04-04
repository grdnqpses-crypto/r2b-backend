/**
 * PremiumPaywall — Subscription paywall for Remember 2 Buy.
 *
 * Pricing:
 *   - $1.99/week  auto-renewing  (SKU: premium_weekly_199)
 *   - $59.99/year auto-renewing  (SKU: premium_annual_5999)  ← save 42%
 */
import { useState } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet, Platform, Linking,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

type PlanType = "weekly" | "annual";

interface PremiumPaywallProps {
  reason: "store-limit" | "item-limit" | "locked-feature" | "general";
  itemName?: string;
  featureName?: string;
  scansRemaining?: number;
  iapReady?: boolean;
  purchaseError?: string | null;
  onActivate: (plan: PlanType) => void;
  onDismiss: () => void;
}

const PREMIUM_FEATURES = [
  { emoji: "♾️", title: "Unlimited Lists", desc: "Create as many shopping lists as you need" },
  { emoji: "🌍", title: "Unlimited Stores", desc: "Add as many stores as you need — grocery, pharmacy, hardware, and more" },
  { emoji: "⏱️", title: "Unlimited Items", desc: "Add unlimited items to any list" },
  { emoji: "🏷️", title: "Smart Savings", desc: "Find cash back and weekly deals for every item on your list with one tap" },
  { emoji: "🎭", title: "Smart Reminders", desc: "Get notified the moment you arrive at any store" },
  { emoji: "🔥", title: "Store Alerts", desc: "GPS alerts when you're 0.3 miles from any saved store" },
  { emoji: "📔", title: "Purchase History", desc: "Track what you've bought and how much you've spent" },
  { emoji: "📈", title: "Savings Tracker", desc: "See how much you save with coupons over time" },
  { emoji: "🎁", title: "Referral Rewards", desc: "Share with friends — you both get a free week" },
  { emoji: "🎤", title: "Voice Input", desc: "Add items to your list hands-free with voice" },
  { emoji: "🌙", title: "Barcode Scanner", desc: "Scan barcodes to quickly add items to your list" },
  { emoji: "🎨", title: "Custom Categories", desc: "Organize items into custom categories with your own labels" },
];

export function PremiumPaywall({
  reason,
  featureName,
  scansRemaining,
  iapReady = true,
  purchaseError,
  onActivate,
  onDismiss,
}: PremiumPaywallProps) {
  const colors = useColors();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");

  const getHeaderText = () => {
    switch (reason) {
      case "store-limit":
        return scansRemaining === 0
          ? "You've reached your free store limit"
          : "You have reached the free plan limit";
      case "item-limit":
        return "Unlock unlimited stores & items";
      case "locked-feature":
        return `${featureName} is a Premium feature`;
      default:
        return "Unlock the full Remember 2 Buy experience";
    }
  };

  const getSubtext = () => {
    switch (reason) {
      case "store-limit":
        return "Upgrade to Premium for unlimited stores, unlimited items, and Smart Savings.";
      case "item-limit":
        return "Free users get 1 store and 3 items. Upgrade to add unlimited stores and items.";
      case "locked-feature":
        return "This feature requires Premium. Upgrade to unlock it.";
      default:
        return "Get unlimited stores, unlimited items, Smart Savings deals, and much more.";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

        {/* Pricing cards */}
        <View style={styles.pricingSection}>

          {/* Annual plan — BEST VALUE */}
          <Pressable
            onPress={() => setSelectedPlan("annual")}
            style={({ pressed }) => [
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === "annual" ? "#22C55E" : colors.border,
                borderWidth: selectedPlan === "annual" ? 2 : 1,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.popularBadge, { backgroundColor: "#22C55E" }]}>
              <Text style={styles.popularText}>🏆 BEST VALUE — SAVE 42%</Text>
            </View>
            <Text style={[styles.planName, { color: colors.foreground }]}>Premium Annual</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: "#22C55E" }]}>$59.99</Text>
              <Text style={[styles.planPeriod, { color: colors.muted }]}>/year</Text>
            </View>
            <View style={[styles.trialBadge, { backgroundColor: "#22C55E20", borderColor: "#22C55E40" }]}>
              <Text style={[styles.trialText, { color: "#22C55E" }]}>
                ✓ Only $1.15/week · Cancel anytime
              </Text>
            </View>
            <Text style={[styles.planNote, { color: colors.muted }]}>
              ~$5.00/month · Auto-renews yearly
            </Text>

            {selectedPlan === "annual" && (
              <>
                {!!purchaseError && (
                  <View style={[styles.errorBanner, { backgroundColor: colors.error + "18", borderColor: colors.error + "40" }]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{purchaseError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    onActivate("annual");
                  }}
                  style={({ pressed }) => [
                    styles.ctaBtn,
                    {
                      backgroundColor: iapReady ? "#22C55E" : colors.muted,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={styles.ctaBtnText}>
                    {!iapReady ? "Connecting to store..." : "Start Annual — $59.99/year"}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>

          {/* Weekly plan */}
          <Pressable
            onPress={() => setSelectedPlan("weekly")}
            style={({ pressed }) => [
              styles.priceCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === "weekly" ? colors.primary : colors.border,
                borderWidth: selectedPlan === "weekly" ? 2 : 1,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.planName, { color: colors.foreground, marginTop: 4 }]}>Premium Weekly</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: colors.primary }]}>$1.99</Text>
              <Text style={[styles.planPeriod, { color: colors.muted }]}>/week</Text>
            </View>
            <View style={[styles.trialBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.trialText, { color: colors.primary }]}>
                ✓ Instant access — cancel anytime
              </Text>
            </View>
            <Text style={[styles.planNote, { color: colors.muted }]}>
              ~$8.63/month · Auto-renews weekly
            </Text>

            {selectedPlan === "weekly" && (
              <>
                {!!purchaseError && (
                  <View style={[styles.errorBanner, { backgroundColor: colors.error + "18", borderColor: colors.error + "40" }]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{purchaseError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    onActivate("weekly");
                  }}
                  style={({ pressed }) => [
                    styles.ctaBtn,
                    {
                      backgroundColor: iapReady ? colors.primary : colors.muted,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={styles.ctaBtnText}>
                    {!iapReady ? "Connecting to store..." : "Start Weekly — $1.99/week"}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>

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
            Subscriptions auto-renew unless cancelled.{"\n"}
            Manage or cancel in Google Play settings.
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
  headerTitle: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  headerReason: { fontSize: 15, fontWeight: "600", textAlign: "center", marginBottom: 8 },
  headerSubtext: {
    fontSize: 14, lineHeight: 22, textAlign: "center",
    marginBottom: 20, paddingHorizontal: 8,
  },
  pricingSection: { gap: 12, marginBottom: 24 },
  priceCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0, right: 0, left: 0,
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
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  trialText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  planNote: { fontSize: 12, marginTop: 6, textAlign: "center" },
  ctaBtn: {
    marginTop: 16,
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, alignItems: "center", width: "100%",
  },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
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
  errorBanner: {
    marginTop: 12, padding: 10,
    borderRadius: 10, borderWidth: 1, width: "100%",
  },
  errorText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});
