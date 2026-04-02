import { useState, useRef, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, Platform, Alert, Linking,
  Animated, Dimensions, TextInput, KeyboardAvoidingView, ScrollView, AppState,
} from "react-native";
import { Image } from "expo-image";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { applyReferralCode, getSavedStores, saveOnboardingStep, getSavedOnboardingStep } from "@/lib/storage";
import { startGeofencing } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";
import { useOnboarding } from "@/lib/onboarding-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Permission state tracks:
 * - "unknown": not yet checked
 * - "granted": permission granted
 * - "denied_retriable": denied but canAskAgain=true — show explanation + "Try Again"
 * - "denied_permanent": denied and canAskAgain=false — must go to Settings
 */
type PermStatus = "unknown" | "granted" | "denied_retriable" | "denied_permanent";

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

export default function OnboardingScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { completeOnboarding } = useOnboarding();
  const [step, setStep] = useState(0);
  const [stepLoaded, setStepLoaded] = useState(false);

  // On mount: restore persisted step (handles Android process kill during bg location grant)
  useEffect(() => {
    getSavedOnboardingStep().then((saved) => {
      // Only restore permission steps (index 4+) — skip ad/tutorial steps
      if (saved >= 4 && saved < STEPS.length) {
        setStep(saved);
      }
      setStepLoaded(true);
    }).catch(() => setStepLoaded(true));
  }, []);
  const [loading, setLoading] = useState(false);
  const [notifStatus, setNotifStatus] = useState<PermStatus>("unknown");
  const [fgStatus, setFgStatus] = useState<PermStatus>("unknown");
  const [bgStatus, setBgStatus] = useState<PermStatus>("unknown");
  const [referralCode, setReferralCode] = useState("");
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const currentStep = STEPS[step];

  // Tutorial steps defined inline using t() — will be called inside render
  const TUTORIAL_STEPS = [
    {
      emoji: "📝",
      title: t("onboarding.tutorial.step1Title"),
      subtitle: t("onboarding.tutorial.step1Subtitle"),
      tip: t("onboarding.tutorial.step1Tip"),
    },
    {
      emoji: "🏪",
      title: t("onboarding.tutorial.step2Title"),
      subtitle: t("onboarding.tutorial.step2Subtitle"),
      tip: t("onboarding.tutorial.step2Tip"),
    },
    {
      emoji: "🔔",
      title: t("onboarding.tutorial.step3Title"),
      subtitle: t("onboarding.tutorial.step3Subtitle"),
      tip: t("onboarding.tutorial.step3Tip"),
    },
  ];

  // When arriving at a permission step, check existing status immediately
  useEffect(() => {
    if (currentStep.action === "notifications") {
      Notifications.getPermissionsAsync().then(({ status, canAskAgain }) => {
        if (status === "granted") setNotifStatus("granted");
        else if (status === "denied") {
          setNotifStatus(canAskAgain ? "denied_retriable" : "denied_permanent");
        }
      });
    } else if (currentStep.action === "location_fg") {
      Location.getForegroundPermissionsAsync().then(({ status, canAskAgain }) => {
        if (status === "granted") setFgStatus("granted");
        else if (status === "denied") {
          setFgStatus(canAskAgain ? "denied_retriable" : "denied_permanent");
        }
      });
    } else if (currentStep.action === "location_bg") {
      Location.getBackgroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") {
          setBgStatus("granted");
          // Auto-advance if we restored to this step and permission is already granted
          // (happens when Android restarts the app after granting background location)
          if (stepLoaded) {
            // Small delay to let the UI render before advancing
            setTimeout(() => {
              animateToNextStep(step + 1 < STEPS.length ? step + 1 : step);
            }, 500);
          }
        }
      });
    }
  }, [step, stepLoaded]);

  // When returning from device Settings (AppState foreground), re-check permissions
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (currentStep.action === "notifications") {
          Notifications.getPermissionsAsync().then(({ status, canAskAgain }) => {
            if (status === "granted") setNotifStatus("granted");
            else setNotifStatus(canAskAgain ? "denied_retriable" : "denied_permanent");
          });
        } else if (currentStep.action === "location_fg") {
          Location.getForegroundPermissionsAsync().then(({ status, canAskAgain }) => {
            if (status === "granted") setFgStatus("granted");
            else if (status === "denied") setFgStatus(canAskAgain ? "denied_retriable" : "denied_permanent");
          });
        } else if (currentStep.action === "location_bg") {
          Location.getBackgroundPermissionsAsync().then(({ status }) => {
            if (status === "granted") setBgStatus("granted");
          });
        }
      }
    });
    return () => sub.remove();
  }, [step]);

  const animateToNextStep = (nextStepIndex: number) => {
    fadeAnim.setValue(0);
    setStep(nextStepIndex);
    // Persist step so we can resume if Android kills the process
    saveOnboardingStep(nextStepIndex).catch(() => {});
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
   * See onboarding.tsx comments for full explanation.
   */
  const finish = async () => {
    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      if (bg.status === "granted") {
        const stores = await getSavedStores();
        if (stores.length > 0) await startGeofencing(stores);
      }
    } catch {}
    await completeOnboarding();
  };

  const requestNotifications = async () => {
    setLoading(true);
    try {
      await setupNotifications();
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") { setNotifStatus("granted"); return; }
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        setNotifStatus("granted");
      } else {
        setNotifStatus(canAskAgain ? "denied_retriable" : "denied_permanent");
      }
    } catch {
      setNotifStatus("denied_retriable");
    } finally {
      setLoading(false);
    }
  };

  const requestForegroundLocation = async () => {
    setLoading(true);
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === "granted") { setFgStatus("granted"); return; }
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        setFgStatus("granted");
      } else {
        setFgStatus(canAskAgain ? "denied_retriable" : "denied_permanent");
      }
    } catch {
      setFgStatus("denied_retriable");
    } finally {
      setLoading(false);
    }
  };

  const requestBackgroundLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === "granted") {
        setBgStatus("granted");
      } else {
        const { canAskAgain } = await Location.getBackgroundPermissionsAsync();
        setBgStatus(canAskAgain ? "denied_retriable" : "denied_permanent");
      }
    } catch {
      setBgStatus("denied_retriable");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep.action === "notifications") {
      if (notifStatus === "granted") {
        nextStep();
      } else if (notifStatus === "denied_permanent") {
        Linking.openSettings();
      } else {
        await requestNotifications();
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "granted") nextStep();
      }
    } else if (currentStep.action === "location_fg") {
      if (fgStatus === "granted") {
        nextStep();
      } else if (fgStatus === "denied_permanent") {
        Linking.openSettings();
      } else {
        await requestForegroundLocation();
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") nextStep();
      }
    } else if (currentStep.action === "location_bg") {
      if (bgStatus === "granted") {
        nextStep();
      } else if (bgStatus === "denied_permanent") {
        Linking.openSettings();
      } else {
        await requestBackgroundLocation();
        const { status } = await Location.getBackgroundPermissionsAsync();
        if (status === "granted") nextStep();
      }
    } else if (currentStep.action === "referral") {
      if (referralCode.trim()) {
        setLoading(true);
        const success = await applyReferralCode(referralCode.trim());
        setLoading(false);
        if (success) {
          Alert.alert(t("onboarding.referral.applied"), t("onboarding.referral.appliedMessage"), [
            { text: t("onboarding.referral.ok"), onPress: finish },
          ]);
        } else {
          Alert.alert(t("onboarding.referral.invalid"), t("onboarding.referral.invalidMessage"), [
            { text: t("onboarding.referral.ok"), onPress: finish },
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
    if (loading) return t("onboarding.buttons.pleaseWait");
    if (currentStep.id === "ad") return t("onboarding.ad.cta");
    if (currentStep.type === "tutorial") return step === 3 ? t("onboarding.tutorial.letsSetUp") : t("onboarding.tutorial.next");
    if (currentStep.action === "notifications") {
      if (notifStatus === "granted") return t("onboarding.buttons.continue");
      if (notifStatus === "denied_permanent") return t("onboarding.notifications.openSettings");
      if (notifStatus === "denied_retriable") return t("onboarding.notifications.tryAgain");
      return t("onboarding.notifications.enableButton");
    }
    if (currentStep.action === "location_fg") {
      if (fgStatus === "granted") return t("onboarding.buttons.continue");
      if (fgStatus === "denied_permanent") return t("onboarding.locationFg.openSettings");
      if (fgStatus === "denied_retriable") return t("onboarding.locationFg.tryAgain");
      return t("onboarding.locationFg.enableButton");
    }
    if (currentStep.action === "location_bg") {
      if (bgStatus === "granted") return t("onboarding.buttons.continue");
      if (bgStatus === "denied_permanent") return t("onboarding.locationBg.openSettings");
      if (bgStatus === "denied_retriable") return t("onboarding.locationBg.tryAgain");
      return t("onboarding.locationBg.enableButton");
    }
    if (currentStep.action === "referral") return referralCode.trim() ? t("onboarding.referral.applyCode") : t("onboarding.referral.skipForNow");
    return t("onboarding.buttons.continue");
  };

  const getStatusBadge = (): { label: string; color: string } | null => {
    if (currentStep.action === "notifications") {
      if (notifStatus === "granted") return { label: "✓ " + t("onboarding.notifications.title"), color: colors.success };
      if (notifStatus === "denied_retriable") return { label: t("onboarding.notifications.retriableMessage"), color: colors.warning };
      if (notifStatus === "denied_permanent") return { label: t("onboarding.notifications.blockedMessage"), color: colors.error };
    }
    if (currentStep.action === "location_fg") {
      if (fgStatus === "granted") return { label: "✓ " + t("onboarding.locationFg.title"), color: colors.success };
      if (fgStatus === "denied_retriable") return { label: t("onboarding.locationFg.retriableMessage"), color: colors.warning };
      if (fgStatus === "denied_permanent") return { label: t("onboarding.locationFg.blockedMessage"), color: colors.error };
    }
    if (currentStep.action === "location_bg") {
      if (bgStatus === "granted") return { label: "✓ " + t("onboarding.locationBg.title"), color: colors.success };
      if (bgStatus === "denied_retriable") return { label: t("onboarding.locationBg.retriableMessage"), color: colors.warning };
      if (bgStatus === "denied_permanent") return { label: t("onboarding.locationBg.blockedMessage"), color: colors.error };
    }
    return null;
  };

  const getDeniedExplanation = (): string | null => {
    if (currentStep.action === "notifications" && (notifStatus === "denied_retriable" || notifStatus === "denied_permanent")) {
      return t("onboarding.notifications.description");
    }
    if (currentStep.action === "location_fg" && (fgStatus === "denied_retriable" || fgStatus === "denied_permanent")) {
      return t("onboarding.locationFg.description");
    }
    if (currentStep.action === "location_bg" && (bgStatus === "denied_retriable" || bgStatus === "denied_permanent")) {
      return t("onboarding.locationBg.description");
    }
    return null;
  };

  const badge = getStatusBadge();
  const deniedExplanation = getDeniedExplanation();
  const tutorialIndex = step - 1;
  const tutorialData = currentStep.type === "tutorial" ? TUTORIAL_STEPS[tutorialIndex] : null;
  const showDots = step > 0;
  const totalDots = STEPS.length - 1;

  const getBtnColor = () => {
    if (currentStep.type === "permission") {
      const s = currentStep.action === "notifications" ? notifStatus
               : currentStep.action === "location_fg" ? fgStatus
               : bgStatus;
      if (s === "denied_permanent") return colors.error;
      if (s === "denied_retriable") return colors.warning;
    }
    return colors.primary;
  };

  // Don't render until we've loaded the persisted step (prevents flash of step 0)
  if (!stepLoaded) return null;

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
                <Text style={[styles.adBadgeText, { color: colors.primary }]}>{t("onboarding.ad.price")}</Text>
              </View>
              <Text style={[styles.adHeadline, { color: colors.foreground }]}>
                {t("onboarding.ad.headline")}
              </Text>
              <View style={[styles.adDivider, { backgroundColor: colors.primary }]} />
              <Text style={[styles.adBody, { color: colors.muted }]}>
                {t("onboarding.ad.subheadline")}
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
                  { icon: "🛒", text: t("onboarding.ad.feature1") },
                  { icon: "📍", text: t("onboarding.ad.feature2") },
                  { icon: "🔕", text: t("onboarding.ad.feature3") },
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
                {currentStep.action === "notifications" ? t("onboarding.notifications.title") :
                 currentStep.action === "location_fg" ? t("onboarding.locationFg.title") :
                 t("onboarding.locationBg.title")}
              </Text>
              <Text style={[styles.permSubtitle, { color: colors.muted }]}>
                {currentStep.action === "notifications"
                  ? t("onboarding.notifications.description")
                  : currentStep.action === "location_fg"
                  ? t("onboarding.locationFg.description")
                  : t("onboarding.locationBg.description")}
              </Text>
              {badge && (
                <View style={[styles.badge, { backgroundColor: badge.color + "20" }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              )}
              {deniedExplanation && (
                <View style={[styles.deniedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.deniedText, { color: colors.foreground }]}>{deniedExplanation}</Text>
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
                <Text style={[styles.permTitle, { color: colors.foreground }]}>{t("onboarding.referral.title")}</Text>
                <Text style={[styles.permSubtitle, { color: colors.muted }]}>{t("onboarding.referral.skipForNow")}</Text>
                <View style={[styles.referralInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <IconSymbol name="gift.fill" size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.referralTextInput, { color: colors.foreground }]}
                    placeholder={t("onboarding.referral.placeholder")}
                    placeholderTextColor={colors.muted}
                    value={referralCode}
                    onChangeText={(txt) => setReferralCode(txt.toUpperCase())}
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
              { backgroundColor: getBtnColor(), opacity: pressed || loading ? 0.8 : 1 },
            ]}
            onPress={handleAction}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>{getButtonLabel()}</Text>
          </Pressable>
          {/* Skip is ONLY available on the referral step — all permission steps are mandatory */}
          {currentStep.type === "referral" && (
            <Pressable
              style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={finish}
            >
              <Text style={[styles.skipBtnText, { color: colors.muted }]}>{t("onboarding.skipForNow")}</Text>
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
  deniedCard: { borderRadius: 14, borderWidth: 1, padding: 16, width: "100%", marginTop: 4 },
  deniedText: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  referralInput: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, width: "100%", marginTop: 8 },
  referralTextInput: { flex: 1, fontSize: 16, letterSpacing: 1, paddingVertical: 2 },
  buttons: { gap: 10, paddingBottom: 20 },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  skipBtn: { paddingVertical: 12, alignItems: "center" },
  skipBtnText: { fontSize: 14 },
});
