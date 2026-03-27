/**
 * SubscriptionConsent
 *
 * Shown once, immediately after the onboarding slides complete, before the user
 * ever sees the home screen. The user MUST tap "Subscribe & Unlock Premium" to
 * proceed. There is no skip or dismiss option.
 *
 * Google Play Store requirements:
 *  - Price and billing period must be clearly stated
 *  - User must affirmatively consent before the subscription is initiated
 *  - Cancellation instructions must be visible
 */

import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "@/lib/safe-imports";

interface SubscriptionConsentProps {
  /** Called when the user taps "Agree & Start Free Trial" and the purchase flow completes */
  onAgree: () => Promise<void>;
  /** Optional error message to display (e.g. billing unavailable) */
  error?: string | null;
}

export function SubscriptionConsent({ onAgree, error }: SubscriptionConsentProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleAgree = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await onAgree();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      // Don't show error for user-cancelled
      if (!msg.toLowerCase().includes("cancel")) {
        setLocalError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError ?? error ?? null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.18)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
         {/* Icon */}
        <Text style={styles.icon}>🛒</Text>
        {/* Headline */}
        <Text style={[styles.headline, { color: colors.foreground }]}>
          Remember 2 Buy{"\n"}Premium
        </Text>
        <Text style={[styles.subheadline, { color: colors.primary }]}>
          Unlimited stores · Unlimited items · Coupons
        </Text>
        {/* Pricing box */}
        <View style={[styles.trialBox, { backgroundColor: colors.surface, borderColor: colors.primary + "50" }]}>
          <View style={styles.trialRow}>
            <Text style={[styles.trialLabel, { color: colors.muted }]}>Free Plan</Text>
            <Text style={[styles.trialValue, { color: colors.foreground }]}>1 store · 3 items</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.trialRow}>
            <Text style={[styles.trialLabel, { color: colors.muted }]}>Premium</Text>
            <Text style={[styles.trialValue, { color: colors.primary }]}>$1.99 / week, auto-renews</Text>
          </View>
        </View>

        {/* What's included */}
        <View style={[styles.featuresBox, { backgroundColor: colors.surface + "80", borderColor: colors.border }]}>
          <Text style={[styles.featuresTitle, { color: colors.muted }]}>EVERYTHING INCLUDED</Text>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Legal copy */}
        <Text style={[styles.legal, { color: colors.muted }]}>
          By tapping "Subscribe & Unlock Premium" you agree that your Google Play
          account will be charged{" "}
          <Text style={{ fontWeight: "700" }}>$1.99 per week</Text> automatically, starting today, until you cancel.
          Cancel anytime in the{" "}
          <Text style={{ fontWeight: "700" }}>Google Play Store → Subscriptions</Text>.
        </Text>

        {/* Error */}
        {displayError && (
          <View style={[styles.errorBox, { backgroundColor: colors.error + "20", borderColor: colors.error + "50" }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{displayError}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          onPress={handleAgree}
          disabled={loading}
          style={({ pressed }) => [
            styles.agreeBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed || loading ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.agreeBtnText}>Subscribe &amp; Unlock Premium</Text>
              <Text style={styles.agreeBtnSub}>$1.99/week · cancel anytime in Google Play</Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.cancelNote, { color: colors.muted }]}>
          Cancel anytime in Google Play Store → Subscriptions
        </Text>
      </View>
    </View>
  );
}

const FEATURES = [
  { emoji: "🏪", text: "Unlimited stores" },
  { emoji: "📋", text: "Unlimited items per store" },
  { emoji: "✂️", text: "Coupon section" },
  { emoji: "📍", text: "Location reminders" },
  { emoji: "📷", text: "Barcode scanner" },
  { emoji: "👨‍👩‍👧", text: "Family profiles" },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  icon: { fontSize: 64, marginBottom: 16 },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 28,
    letterSpacing: 0.3,
  },
  trialBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  trialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  trialLabel: { fontSize: 14, fontWeight: "500" },
  trialValue: { fontSize: 14, fontWeight: "700" },
  divider: { height: 1, width: "100%", marginVertical: 4 },
  featuresBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
    gap: 12,
  },
  featuresTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureEmoji: { fontSize: 20, width: 28, textAlign: "center" },
  featureText: { fontSize: 14, fontWeight: "500", flex: 1 },
  legal: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  errorBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  errorText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
    gap: 12,
  },
  agreeBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 4,
  },
  agreeBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  agreeBtnSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },
  cancelNote: {
    fontSize: 11,
    textAlign: "center",
    paddingBottom: 4,
  },
});
