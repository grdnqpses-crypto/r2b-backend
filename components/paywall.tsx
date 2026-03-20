/**
 * Paywall screen for Belief Field Detector
 *
 * Shows the $0.99/week subscription offer with a 3-day free trial.
 * Displayed when a user tries to access a premium feature without a subscription.
 */

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { Haptics } from "@/lib/safe-imports";
import type { SubscriptionState } from "@/hooks/use-subscription";

interface PaywallProps {
  subscription: SubscriptionState;
  onDismiss?: () => void;
  /** If true, user cannot dismiss — they must subscribe or the app is unusable */
  required?: boolean;
}

const FEATURES = [
  { emoji: "⚗️", title: "Unlimited Belief Scans", desc: "Scan any belief, any time, as many times as you want" },
  { emoji: "📊", title: "Full Science Breakdown", desc: "See all 7 sensor readings and what they mean for your belief" },
  { emoji: "🏆", title: "Streak Tracking & Achievements", desc: "Build daily habits and unlock milestones as you grow" },
  { emoji: "📔", title: "Belief Journal", desc: "Record your thoughts after every scan and track your journey" },
  { emoji: "🎵", title: "Guided Meditation Mode", desc: "Prepare your mind before each scan for stronger results" },
  { emoji: "💫", title: "Daily Challenges", desc: "New belief challenges every day to keep you growing" },
  { emoji: "🌙", title: "Bedtime Belief Messages", desc: "End each day with a personalized belief affirmation" },
  { emoji: "📈", title: "Scan History & Reports", desc: "Full history of every scan with detailed analysis" },
];

export function Paywall({ subscription, onDismiss, required = false }: PaywallProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Pulse animation for the CTA button
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in on mount
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Gentle pulse on the CTA button
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleStartTrial = async () => {
    if (purchasing) return;
    setPurchasing(true);
    setMessage(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await subscription.purchase();
      // purchaseUpdatedListener in use-subscription handles success
      // Check if status changed after purchase
      setTimeout(() => {
        if (subscription.status === "active") {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          setMessage("🎉 Welcome! Subscription activated.");
          setTimeout(() => onDismiss?.(), 1500);
        } else if (subscription.error) {
          setMessage(subscription.error);
        }
      }, 500);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setMessage(null);
    try {
      await subscription.restore();
      setTimeout(() => {
        if (subscription.status === "active") {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          setMessage("✅ Subscription restored!");
          setTimeout(() => onDismiss?.(), 1500);
        } else {
          setMessage(subscription.error ?? "No active subscription found.");
        }
      }, 500);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeIn }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🎵</Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Don't Stop Believing
          </Text>
          <Text style={[styles.subheadline, { color: colors.primary }]}>
            Start your free 3-day trial
          </Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            Your phone has 7 scientific sensors that respond to belief. Unlock unlimited access to measure, track, and grow your belief every single day.
          </Text>
        </View>

        {/* Pricing card */}
        <View style={[styles.pricingCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <View style={styles.pricingRow}>
            <View>
              <Text style={[styles.pricingFree, { color: colors.primary }]}>FREE for 3 days</Text>
              <Text style={[styles.pricingThen, { color: colors.muted }]}>then $0.99 / week</Text>
            </View>
            <View style={[styles.pricingBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.pricingBadgeText}>TRIAL</Text>
            </View>
          </View>
          <View style={[styles.pricingDivider, { backgroundColor: colors.primary + "30" }]} />
          <Text style={[styles.pricingNote, { color: colors.muted }]}>
            Auto-renews weekly · Cancel anytime · No charge during trial
          </Text>
        </View>

        {/* Feature list */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>EVERYTHING INCLUDED</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
            <Text style={styles.featureEmoji}>{f.emoji}</Text>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>{f.desc}</Text>
            </View>
            <Text style={[styles.featureCheck, { color: colors.primary }]}>✓</Text>
          </View>
        ))}

        {/* Social proof */}
        <View style={[styles.proofCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.proofText, { color: colors.foreground }]}>
            "I've been using this every morning for 3 weeks. My belief scores have gone from 42 to 78. I can actually feel the difference."
          </Text>
          <Text style={[styles.proofAuthor, { color: colors.muted }]}>— Early tester, verified user</Text>
        </View>

        {/* Error/success message */}
        {message && (
          <View style={[styles.messageBox, {
            backgroundColor: message.startsWith("🎉") || message.startsWith("✅")
              ? colors.success + "20"
              : colors.error + "20",
            borderColor: message.startsWith("🎉") || message.startsWith("✅")
              ? colors.success + "50"
              : colors.error + "50",
          }]}>
            <Text style={[styles.messageText, {
              color: message.startsWith("🎉") || message.startsWith("✅") ? colors.success : colors.error
            }]}>{message}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.bottomBar, {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 16),
      }]}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            onPress={handleStartTrial}
            disabled={purchasing}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.ctaBtnText}>Start Free 3-Day Trial</Text>
                <Text style={styles.ctaBtnSub}>Then $0.99/week · Cancel anytime</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        <View style={styles.bottomLinks}>
          <Pressable onPress={handleRestore} disabled={restoring} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={[styles.linkText, { color: colors.muted }]}>
              {restoring ? "Restoring..." : "Restore purchases"}
            </Text>
          </Pressable>
          {!required && onDismiss && (
            <Pressable onPress={onDismiss} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={[styles.linkText, { color: colors.muted }]}>Maybe later</Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.legalText, { color: colors.muted }]}>
          Payment will be charged to your Google Play account. Subscription auto-renews at $0.99/week unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  pricingCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pricingFree: {
    fontSize: 20,
    fontWeight: "800",
  },
  pricingThen: {
    fontSize: 13,
    marginTop: 2,
  },
  pricingBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pricingBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pricingDivider: {
    height: 1,
  },
  pricingNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: -8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: "center",
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  featureCheck: {
    fontSize: 16,
    fontWeight: "800",
  },
  proofCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  proofText: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: "italic",
  },
  proofAuthor: {
    fontSize: 12,
  },
  messageBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  ctaBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    gap: 2,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  ctaBtnSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
  },
  bottomLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
});
