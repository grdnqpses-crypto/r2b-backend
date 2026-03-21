import { useEffect, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Platform, Alert, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  markOnboardingDone, applyReferralCode, getReferralCode,
  getSavedStores,
} from "@/lib/storage";
import { startGeofencing } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";

type PermStatus = "unknown" | "granted" | "denied";

const STEPS = [
  {
    id: "welcome",
    emoji: "\uD83D\uDED2",
    title: "Welcome to Remember2Buy",
    subtitle: "The smart shopping reminder that alerts you when you\u2019re near a store.",
    action: null as null | "notifications" | "location_fg" | "location_bg" | "referral",
  },
  {
    id: "notifications",
    emoji: "\uD83D\uDD14",
    title: "Enable Alerts",
    subtitle: "Get notified the moment you arrive near a store with items on your list.",
    action: "notifications" as const,
  },
  {
    id: "location_fg",
    emoji: "\uD83D\uDCCD",
    title: "Allow Location Access",
    subtitle: "Remember2Buy needs your location to detect when you\u2019re near a store.",
    action: "location_fg" as const,
  },
  {
    id: "location_bg",
    emoji: "\uD83D\uDD0D",
    title: "Allow \u201CAlways\u201D Location",
    subtitle: "To alert you in the background, tap \u201CAllow all the time\u201D on the next screen. This is how the app works when your phone is in your pocket.",
    action: "location_bg" as const,
  },
  {
    id: "referral",
    emoji: "\uD83C\uDF81",
    title: "Have a Referral Code?",
    subtitle: "Enter a friend\u2019s code to get 1 week of Premium free.",
    action: "referral" as const,
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState<PermStatus>("unknown");
  const [fgStatus, setFgStatus] = useState<PermStatus>("unknown");
  const [bgStatus, setBgStatus] = useState<PermStatus>("unknown");
  const [referralCode, setReferralCode] = useState("");

  const currentStep = STEPS[step];

  // Auto-request permissions as soon as the relevant step appears
  useEffect(() => {
    if (currentStep.action === "notifications") {
      requestNotifications();
    } else if (currentStep.action === "location_fg") {
      requestForegroundLocation();
    } else if (currentStep.action === "location_bg") {
      // Check current bg status first — if already granted, skip
      Location.getBackgroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") {
          setBgStatus("granted");
        }
      });
    }
  }, [step]);

  const requestNotifications = async () => {
    setLoading(true);
    try {
      // Set up Android channel first
      await setupNotifications();
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        setNotifStatus("granted");
        setLoading(false);
        return;
      }
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      setNotifStatus(newStatus === "granted" ? "granted" : "denied");
    } catch {
      setNotifStatus("denied");
    } finally {
      setLoading(false);
    }
  };

  const requestForegroundLocation = async () => {
    setLoading(true);
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === "granted") {
        setFgStatus("granted");
        setLoading(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      setFgStatus(status === "granted" ? "granted" : "denied");
    } catch {
      setFgStatus("denied");
    } finally {
      setLoading(false);
    }
  };

  const requestBackgroundLocation = async () => {
    setLoading(true);
    try {
      // Must have foreground first
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status !== "granted") {
        await Location.requestForegroundPermissionsAsync();
      }
      // On Android 11+, this opens the system Settings page directly
      const { status } = await Location.requestBackgroundPermissionsAsync();
      setBgStatus(status === "granted" ? "granted" : "denied");
    } catch {
      setBgStatus("denied");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep.action === "notifications") {
      if (notifStatus !== "granted") {
        // Permission was denied — open Settings
        if (notifStatus === "denied") {
          Alert.alert(
            "Notifications Blocked",
            "Please enable notifications for Remember2Buy in your device Settings.",
            [
              { text: "Open Settings", onPress: () => Linking.openSettings() },
              { text: "Skip", onPress: () => nextStep() },
            ]
          );
          return;
        }
        await requestNotifications();
      }
      nextStep();

    } else if (currentStep.action === "location_fg") {
      if (fgStatus !== "granted") {
        if (fgStatus === "denied") {
          Alert.alert(
            "Location Blocked",
            "Please enable location for Remember2Buy in your device Settings.",
            [
              { text: "Open Settings", onPress: () => Linking.openSettings() },
              { text: "Skip", onPress: () => nextStep() },
            ]
          );
          return;
        }
        await requestForegroundLocation();
      }
      nextStep();

    } else if (currentStep.action === "location_bg") {
      if (bgStatus !== "granted") {
        await requestBackgroundLocation();
      }
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
            [{ text: "Let\u2019s Go!", onPress: finish }]
          );
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

  const nextStep = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await markOnboardingDone();
    // Auto-start geofencing if we have stores and background permission
    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      if (bg.status === "granted") {
        const stores = await getSavedStores();
        if (stores.length > 0) {
          await startGeofencing(stores);
        }
      }
    } catch {
      // Non-fatal
    }
    router.replace("/(tabs)");
  };

  const getButtonLabel = () => {
    if (loading) return "...";
    if (currentStep.action === "notifications") {
      return notifStatus === "granted" ? "Next" : "Allow Notifications";
    }
    if (currentStep.action === "location_fg") {
      return fgStatus === "granted" ? "Next" : "Allow Location";
    }
    if (currentStep.action === "location_bg") {
      return bgStatus === "granted" ? "Next" : "Allow \u201CAlways\u201D Access";
    }
    if (currentStep.action === "referral") {
      return referralCode.trim() ? "Apply Code" : "Skip";
    }
    return step === STEPS.length - 1 ? "Get Started" : "Next";
  };

  const getStatusBadge = () => {
    if (currentStep.action === "notifications" && notifStatus === "granted") {
      return { label: "Notifications enabled", color: colors.success };
    }
    if (currentStep.action === "location_fg" && fgStatus === "granted") {
      return { label: "Location access granted", color: colors.success };
    }
    if (currentStep.action === "location_bg" && bgStatus === "granted") {
      return { label: "\u201CAlways\u201D access granted", color: colors.success };
    }
    if (currentStep.action === "notifications" && notifStatus === "denied") {
      return { label: "Notifications blocked \u2014 tap to open Settings", color: colors.warning };
    }
    if (currentStep.action === "location_fg" && fgStatus === "denied") {
      return { label: "Location blocked \u2014 tap to open Settings", color: colors.warning };
    }
    return null;
  };

  const badge = getStatusBadge();

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
                { backgroundColor: i <= step ? colors.primary : colors.border },
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

          {/* Status badge */}
          {badge && (
            <View style={[styles.badge, { backgroundColor: badge.color + "20" }]}>
              <IconSymbol
                name={badge.color === colors.success ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"}
                size={16}
                color={badge.color}
              />
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          )}

          {/* Referral input */}
          {currentStep.action === "referral" && (
            <View style={[styles.referralInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="gift.fill" size={18} color={colors.primary} />
              <Text
                style={[styles.referralText, { color: referralCode ? colors.foreground : colors.muted }]}
                onPress={() => {
                  if (Platform.OS === "ios") {
                    Alert.prompt(
                      "Enter Referral Code",
                      "Enter your friend\u2019s referral code (e.g. R2B-ABC123):",
                      (text) => { if (text) setReferralCode(text.toUpperCase()); },
                      "plain-text",
                      referralCode
                    );
                  } else {
                    // On Android, Alert.prompt doesn't exist — show an alert with instructions
                    Alert.alert(
                      "Enter Referral Code",
                      "Ask your friend for their R2B-XXXXXX code and enter it here.",
                      [{ text: "OK" }]
                    );
                  }
                }}
              >
                {referralCode || "Tap to enter code..."}
              </Text>
            </View>
          )}
        </View>

        {/* Buttons */}
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
  badge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  badgeText: { fontSize: 14, fontWeight: "600" },
  referralInput: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, width: "100%", marginTop: 8 },
  referralText: { flex: 1, fontSize: 16, letterSpacing: 1 },
  buttons: { gap: 10, paddingBottom: 20 },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  skipBtn: { paddingVertical: 12, alignItems: "center" },
  skipBtnText: { fontSize: 14 },
});
