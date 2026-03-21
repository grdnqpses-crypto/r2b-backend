import { useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Platform, Alert, Linking,
  Animated, Dimensions, TextInput, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { Image } from "expo-image";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { applyReferralCode, getSavedStores } from "@/lib/storage";
import { startGeofencing } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";
import { useOnboarding } from "@/lib/onboarding-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type PermStatus = "unknown" | "granted" | "denied";

interface Step {
  id: string;
  type: "ad" | "tutorial" | "permission" | "referral";
  action: null | "notifications" | "location_fg" | "location_bg" | "referral";
}

const STEPS: Step[] = [
  { id: "ad",          type: "ad",         action: null },
  { id: "tut_1",       type: "tutorial",   action: null },
  { id: "tut_2",       type: "tutorial",   action: null },
  { id: "tut_3",       type: "tutorial",   action: null },
  { id: "notif",       type: "permission", action: "notifications" },
  { id: "location_fg", type: "permission", action: "location_fg" },
  { id: "location_bg", type: "permission", action: "location_bg" },
  { id: "referral",    type: "referral",   action: "referral" },
];

const TUTORIAL_STEPS = [
  {
    emoji: "📝",
    title: "Add What You Need",
    subtitle: "Build your shopping list before you leave home. Add items by name — milk, batteries, birthday card — whatever you need.",
    tip: "Step 1 of 3",
  },
  {
    emoji: "🏪",
    title: "Pick Your Stores",
    subtitle: "Choose the stores you shop at. Remember2Buy finds them near you automatically — no typing addresses.",
    tip: "Step 2 of 3",
  },
  {
    emoji: "🔔",
    title: "Get Alerted Automatically",
    subtitle: "When you drive or walk near a store, your phone buzzes with a reminder. No more driving past the store and forgetting!",
    tip: "Step 3 of 3",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const { completeOnboarding } = useOnboarding();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState<PermStatus>("unknown");
  const [fgStatus, setFgStatus] = useState<PermStatus>("unknown");
  const [bgStatus, setBgStatus] = useState<PermStatus>("unknown");
  const [referralCode, setReferralCode] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentStep = STEPS[step];

  // Check existing permission status when arriving at a permission step (do NOT auto-request)
  useEffect(() => {
    if (currentStep.action === "notifications") {
      Notifications.getPermissionsAsync().then(({ status }) => {
        if (status === "granted") setNotifStatus("granted");
        else if (status === "denied") setNotifStatus("denied");
      });
    } else if (currentStep.action === "location_fg") {
      Location.getForegroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") setFgStatus("granted");
        else if (status === "denied") setFgStatus("denied");
      });
    } else if (currentStep.action === "location_bg") {
      Location.getBackgroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") setBgStatus("granted");
      });
    }
  }, [step]);

  const animateToNextStep = (nextStepIndex: number) => {
    // Set step immediately — do NOT rely on animation callback to set step.
    // Relying on the callback caused a blank screen when system dialogs
    // interrupted the animation chain (opacity stuck at 0).
    fadeAnim.setValue(0);
    setStep(nextStepIndex);
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  };

  const nextStep = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = step + 1;
    if (next >= STEPS.length) finish();
    else animateToNextStep(next);
  };

  /**
   * CRITICAL FIX: Do NOT call router.replace() here.
   *
   * router.replace() crashes on Android with Expo SDK 54 + newArchEnabled: true
   * (Expo Router 6 / bridgeless mode). See: https://github.com/expo/expo/issues/41030
   *
   * Instead, we call completeOnboarding() which:
   * 1. Persists the onboarding flag to AsyncStorage
   * 2. Updates the OnboardingContext state (isOnboardingComplete = true)
   * 3. Stack.Protected in _layout.tsx detects the state change and automatically
   *    redirects to (tabs) — zero navigation calls from our code.
   */
  const finish = async () => {
    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      if (bg.status === "granted") {
        const stores = await getSavedStores();
        if (stores.length > 0) await startGeofencing(stores);
      }
    } catch {}
    // This persists the flag AND updates context state, which triggers Stack.Protected redirect
    await completeOnboarding();
  };

  const requestNotifications = async () => {
    setLoading(true);
    try {
      await setupNotifications();
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") { setNotifStatus("granted"); setLoading(false); return; }
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      setNotifStatus(newStatus === "granted" ? "granted" : "denied");
    } catch { setNotifStatus("denied"); }
    finally { setLoading(false); }
  };

  const requestForegroundLocation = async () => {
    setLoading(true);
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === "granted") { setFgStatus("granted"); setLoading(false); return; }
      const { status } = await Location.requestForegroundPermissionsAsync();
      setFgStatus(status === "granted" ? "granted" : "denied");
    } catch { setFgStatus("denied"); }
    finally { setLoading(false); }
  };

  const requestBackgroundLocation = async () => {
    setLoading(true);
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status !== "granted") await Location.requestForegroundPermissionsAsync();
      const { status } = await Location.requestBackgroundPermissionsAsync();
      setBgStatus(status === "granted" ? "granted" : "denied");
    } catch { setBgStatus("denied"); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep.action === "notifications") {
      if (notifStatus !== "granted") {
        if (notifStatus === "denied") {
          Alert.alert("Notifications Blocked", "Please enable notifications for Remember2Buy in your device Settings.", [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Skip", onPress: () => nextStep() },
          ]);
          return;
        }
        await requestNotifications();
      }
      nextStep();
    } else if (currentStep.action === "location_fg") {
      if (fgStatus !== "granted") {
        if (fgStatus === "denied") {
          Alert.alert("Location Blocked", "Please enable location for Remember2Buy in your device Settings.", [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Skip", onPress: () => nextStep() },
          ]);
          return;
        }
        await requestForegroundLocation();
      }
      nextStep();
    } else if (currentStep.action === "location_bg") {
      if (bgStatus !== "granted") await requestBackgroundLocation();
      nextStep();
    } else if (currentStep.action === "referral") {
      if (referralCode.trim()) {
        setLoading(true);
        const success = await applyReferralCode(referralCode.trim());
        setLoading(false);
        if (success) {
          Alert.alert("Referral Applied!", "You got 1 week of Premium free! Enjoy unlimited stores and items.", [
            { text: "Let's Go!", onPress: finish },
          ]);
        } else {
          Alert.alert("Invalid Code", "That referral code is invalid or has already been used.", [
            { text: "OK", onPress: finish },
          ]);
        }
      } else {
        finish();
      }
    } else {
      nextStep();
    }
  };

  const getButtonLabel = () => {
    if (loading) return "Please wait...";
    if (currentStep.id === "ad") return "Show Me How →";
    if (currentStep.type === "tutorial") return step === 3 ? "Got It — Let's Set Up" : "Next →";
    if (currentStep.action === "notifications") {
      if (notifStatus === "granted") return "Continue →";
      if (notifStatus === "denied") return "Open Settings";
      return "Enable Notifications";
    }
    if (currentStep.action === "location_fg") {
      if (fgStatus === "granted") return "Continue →";
      if (fgStatus === "denied") return "Open Settings";
      return "Allow Location";
    }
    if (currentStep.action === "location_bg") {
      if (bgStatus === "granted") return "Continue →";
      return "Allow 'Always' Location";
    }
    if (currentStep.action === "referral") return referralCode.trim() ? "Apply Code" : "Skip for Now";
    return "Continue";
  };

  const getStatusBadge = () => {
    if (currentStep.action === "notifications" && notifStatus === "granted")
      return { label: "✓ Notifications enabled", color: colors.success };
    if (currentStep.action === "notifications" && notifStatus === "denied")
      return { label: "Notifications blocked — tap to open Settings", color: colors.warning };
    if (currentStep.action === "location_fg" && fgStatus === "granted")
      return { label: "✓ Location access granted", color: colors.success };
    if (currentStep.action === "location_fg" && fgStatus === "denied")
      return { label: "Location blocked — tap to open Settings", color: colors.warning };
    if (currentStep.action === "location_bg" && bgStatus === "granted")
      return { label: "✓ Background location granted", color: colors.success };
    return null;
  };

  const badge = getStatusBadge();
  const tutorialIndex = step - 1;
  const tutorialData = currentStep.type === "tutorial" ? TUTORIAL_STEPS[tutorialIndex] : null;
  const showDots = step > 0;
  const totalDots = STEPS.length - 1;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {showDots && (
          <View style={styles.dots}>
            {Array.from({ length: totalDots }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i < step ? colors.primary : colors.border },
                  i === step - 1 && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {currentStep.id === "ad" && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.adContainer}>
              <View style={[styles.adBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                <Text style={[styles.adBadgeText, { color: colors.primary }]}>💡 For the cost of a bottled soda</Text>
              </View>
              <Text style={[styles.adHeadline, { color: colors.foreground }]}>
                {"NEVER feel that\n"}
                <Text style={{ color: colors.primary }}>{"\"I FORGOT TO BUY\""}</Text>
                {"\nfeeling ever again!"}
              </Text>
              <View style={[styles.adDivider, { backgroundColor: colors.primary }]} />
              <Text style={[styles.adBody, { color: colors.muted }]}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>Remember2Buy</Text>
                {" reminds you what's on your shopping list when you are "}
                <Text style={{ fontWeight: "700", color: colors.foreground }}>actually in the store shopping!</Text>
              </Text>
              {/* App screenshots */}
              <View style={styles.screenshotsRow}>
                <Image
                  source="https://d2xsxph8kpxj0f.cloudfront.net/310519663348315388/3MWRPobTFfqJ6iFRe4j7At/screenshot_list_46a4faa7.png"
                  style={styles.screenshotImg}
                  contentFit="cover"
                />
                <Image
                  source="https://d2xsxph8kpxj0f.cloudfront.net/310519663348315388/3MWRPobTFfqJ6iFRe4j7At/screenshot_alert_2470ad55.png"
                  style={styles.screenshotImg}
                  contentFit="cover"
                />
              </View>
              <View style={styles.adFeatures}>
                {[
                  { icon: "🛒", text: "Your list, always ready" },
                  { icon: "📍", text: "Alerts when you're near a store" },
                  { icon: "🔕", text: "No more forgotten items" },
                ].map((f) => (
                  <View key={f.icon} style={[styles.adFeatureRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={styles.adFeatureIcon}>{f.icon}</Text>
                    <Text style={[styles.adFeatureText, { color: colors.foreground }]}>{f.text}</Text>
                    <Text style={{ color: colors.success, fontSize: 18, fontWeight: "700" }}>✓</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {currentStep.type === "tutorial" && tutorialData && (
            <View style={styles.tutorialContainer}>
              <Text style={styles.tutorialEmoji}>{tutorialData.emoji}</Text>
              <View style={[styles.tutorialTipBadge, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.tutorialTip, { color: colors.primary }]}>{tutorialData.tip}</Text>
              </View>
              <Text style={[styles.tutorialTitle, { color: colors.foreground }]}>{tutorialData.title}</Text>
              <Text style={[styles.tutorialSubtitle, { color: colors.muted }]}>{tutorialData.subtitle}</Text>
            </View>
          )}

          {currentStep.type === "permission" && (
            <View style={styles.permContainer}>
              <Text style={styles.permEmoji}>
                {currentStep.action === "notifications" ? "🔔" :
                 currentStep.action === "location_fg" ? "📍" : "🔍"}
              </Text>
              <Text style={[styles.permTitle, { color: colors.foreground }]}>
                {currentStep.action === "notifications" ? "Enable Alerts" :
                 currentStep.action === "location_fg" ? "Allow Location Access" :
                 "Allow 'Always' Location"}
              </Text>
              <Text style={[styles.permSubtitle, { color: colors.muted }]}>
                {currentStep.action === "notifications"
                  ? "Get notified the moment you arrive near a store with items on your list."
                  : currentStep.action === "location_fg"
                  ? "Remember2Buy needs your location to detect when you're near a store."
                  : "To alert you in the background, tap 'Allow all the time' on the next screen. This is how the app works when your phone is in your pocket."}
              </Text>
              {badge && (
                <View style={[styles.badge, { backgroundColor: badge.color + "20" }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              )}
            </View>
          )}

          {currentStep.type === "referral" && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%" }}
            >
              <View style={styles.permContainer}>
                <Text style={styles.permEmoji}>🎁</Text>
                <Text style={[styles.permTitle, { color: colors.foreground }]}>Have a Referral Code?</Text>
                <Text style={[styles.permSubtitle, { color: colors.muted }]}>
                  Enter a friend's code to get 1 week of Premium free.
                </Text>
                <View style={[styles.referralInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <IconSymbol name="gift.fill" size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.referralTextInput, { color: colors.foreground }]}
                    placeholder="Enter code (e.g. R2B-ABC123)"
                    placeholderTextColor={colors.muted}
                    value={referralCode}
                    onChangeText={(t) => setReferralCode(t.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleAction}
                    maxLength={12}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          )}
        </Animated.View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
            ]}
            onPress={handleAction}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{getButtonLabel()}</Text>
          </Pressable>
          {(currentStep.type === "permission" || currentStep.type === "referral") && (
            <Pressable
              style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={finish}
            >
              <Text style={[styles.skipBtnText, { color: colors.muted }]}>Skip setup</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 20 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  content: { flex: 1, justifyContent: "center" },
  adContainer: { alignItems: "center", gap: 20 },
  adBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  adBadgeText: { fontSize: 14, fontWeight: "700" },
  adHeadline: { fontSize: 30, fontWeight: "900", textAlign: "center", lineHeight: 38, letterSpacing: -0.5 },
  adDivider: { width: 48, height: 3, borderRadius: 2 },
  adBody: { fontSize: 16, textAlign: "center", lineHeight: 24, maxWidth: 320 },
  screenshotsRow: { flexDirection: "row", gap: 10, width: "100%", justifyContent: "center" },
  screenshotImg: { width: (SCREEN_WIDTH - 48 - 10) / 2, height: 180, borderRadius: 12, overflow: "hidden" },
  adFeatures: { width: "100%", gap: 10, marginTop: 4 },
  adFeatureRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  adFeatureIcon: { fontSize: 22 },
  adFeatureText: { flex: 1, fontSize: 15, fontWeight: "500" },
  tutorialContainer: { alignItems: "center", gap: 16 },
  tutorialEmoji: { fontSize: 80, marginBottom: 8 },
  tutorialTipBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tutorialTip: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  tutorialTitle: { fontSize: 26, fontWeight: "800", textAlign: "center", lineHeight: 32 },
  tutorialSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24, maxWidth: 320 },
  permContainer: { alignItems: "center", gap: 16 },
  permEmoji: { fontSize: 72, marginBottom: 8 },
  permTitle: { fontSize: 26, fontWeight: "800", textAlign: "center", lineHeight: 32 },
  permSubtitle: { fontSize: 16, textAlign: "center", lineHeight: 24, maxWidth: 320 },
  badge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  badgeText: { fontSize: 14, fontWeight: "600" },
  referralInput: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, width: "100%", marginTop: 8 },
  referralTextInput: { flex: 1, fontSize: 16, letterSpacing: 1, paddingVertical: 2 },
  buttons: { gap: 10, paddingBottom: 20 },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  skipBtn: { paddingVertical: 12, alignItems: "center" },
  skipBtnText: { fontSize: 14 },
});
