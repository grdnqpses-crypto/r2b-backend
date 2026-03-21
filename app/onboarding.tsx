import { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { markOnboardingDone, applyReferralCode } from "@/lib/storage";
import { requestLocationPermissions } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";

const STEPS = [
  {
    emoji: "\uD83D\uDED2",
    title: "Welcome to Remember2Buy",
    subtitle: "The smart shopping reminder that alerts you when you're near a store.",
    action: null,
  },
  {
    emoji: "\uD83D\uDCCD",
    title: "Location Access",
    subtitle: "We need 'Always' location access to alert you when you're within 0.3 miles of a store — even when the app is closed.",
    action: "location",
  },
  {
    emoji: "\uD83D\uDD14",
    title: "Notifications",
    subtitle: "Enable notifications to receive store alerts. You'll get one when you approach and another 6 minutes after you arrive.",
    action: "notifications",
  },
  {
    emoji: "\uD83C\uDF81",
    title: "Have a Referral Code?",
    subtitle: "Enter a friend's referral code to get 1 week of Premium free. You can skip this.",
    action: "referral",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleAction = async () => {
    if (currentStep.action === "location") {
      setLoading(true);
      const perms = await requestLocationPermissions();
      setLocationGranted(perms.background);
      setLoading(false);
      if (!perms.background && !perms.foreground) {
        Alert.alert(
          "Location Needed",
          "For the best experience, please allow location access. You can change this later in Settings.",
          [{ text: "OK" }]
        );
      }
      nextStep();
    } else if (currentStep.action === "notifications") {
      setLoading(true);
      const granted = await setupNotifications();
      setNotifGranted(granted);
      setLoading(false);
      nextStep();
    } else if (currentStep.action === "referral") {
      if (referralCode.trim()) {
        setLoading(true);
        const success = await applyReferralCode(referralCode.trim());
        setLoading(false);
        if (success) {
          Alert.alert(
            "Referral Applied!",
            "You got 1 week of Premium free! Enjoy unlimited stores and items.",
            [{ text: "Let's Go!", onPress: finish }]
          );
        } else {
          Alert.alert("Invalid Code", "That referral code is invalid or has already been used.", [{ text: "OK", onPress: finish }]);
        }
      } else {
        finish();
      }
    } else {
      nextStep();
    }
  };

  const nextStep = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await markOnboardingDone();
    router.replace("/(tabs)");
  };

  const getButtonLabel = () => {
    if (loading) return "...";
    if (currentStep.action === "location") return locationGranted ? "Next" : "Allow Location";
    if (currentStep.action === "notifications") return notifGranted ? "Next" : "Allow Notifications";
    if (currentStep.action === "referral") return referralCode.trim() ? "Apply Code" : "Skip";
    if (isLast) return "Get Started";
    return "Next";
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === step ? colors.primary : colors.border },
                i === step && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.emoji}>{currentStep.emoji}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{currentStep.title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{currentStep.subtitle}</Text>

          {/* Referral input */}
          {currentStep.action === "referral" && (
            <View style={[styles.referralInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="gift.fill" size={18} color={colors.primary} />
              <Text
                style={[styles.referralText, { color: referralCode ? colors.foreground : colors.muted }]}
                onPress={() => {
                  Alert.prompt(
                    "Enter Referral Code",
                    "Enter your friend's referral code (e.g. R2B-ABC123):",
                    (text) => { if (text) setReferralCode(text.toUpperCase()); },
                    "plain-text",
                    referralCode
                  );
                }}
              >
                {referralCode || "Tap to enter code..."}
              </Text>
            </View>
          )}

          {/* Permission status indicators */}
          {currentStep.action === "location" && locationGranted && (
            <View style={[styles.grantedBadge, { backgroundColor: colors.success + "20" }]}>
              <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
              <Text style={[styles.grantedText, { color: colors.success }]}>Location access granted</Text>
            </View>
          )}
          {currentStep.action === "notifications" && notifGranted && (
            <View style={[styles.grantedBadge, { backgroundColor: colors.success + "20" }]}>
              <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
              <Text style={[styles.grantedText, { color: colors.success }]}>Notifications enabled</Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleAction}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{getButtonLabel()}</Text>
          </Pressable>

          {step > 0 && (
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
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emoji: { fontSize: 72, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", lineHeight: 32 },
  subtitle: { fontSize: 16, textAlign: "center", lineHeight: 24, maxWidth: 320 },
  referralInput: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, width: "100%", marginTop: 8 },
  referralText: { flex: 1, fontSize: 16, letterSpacing: 1 },
  grantedBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  grantedText: { fontSize: 14, fontWeight: "600" },
  buttons: { gap: 10, paddingBottom: 20 },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  skipBtn: { paddingVertical: 12, alignItems: "center" },
  skipBtnText: { fontSize: 14 },
});
