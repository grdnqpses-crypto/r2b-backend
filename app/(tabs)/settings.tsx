import { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Platform, Linking, Switch, AppState, Modal, Share, type AppStateStatus,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeContext } from "@/lib/theme-provider";
import {
  getTier, setTier, getDistanceUnit, setDistanceUnit,
  isDevModeEnabled, setDevModeEnabled, getReferralCode,
  getAppSettings, saveAppSettings,
  type Tier, type DistanceUnit, type AppSettings,
} from "@/lib/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  checkLocationPermissions,
  requestLocationPermissions,
  isGeofencingActive,
  startGeofencing,
  stopGeofencing,
  getSavedStores,
} from "@/lib/geofence";
import { setupNotifications, sendTestNotification } from "@/lib/notifications";
import { PLAY_STORE_URL } from "@/hooks/use-subscription";
import { useSubscriptionContext } from "@/lib/subscription-context";
import { PremiumPaywall } from "@/components/premium-paywall";
import { LocationDisclosureModal } from "@/components/LocationDisclosureModal";
import { usePermissions } from "@/hooks/use-permissions";
import { isBatteryExempted } from "@/lib/batteryService";
import BatteryGateScreen from "@/components/BatteryGateScreen";

export default function SettingsScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [tier, setTierState] = useState<Tier>("free");
  const [locationPerms, setLocationPerms] = useState({ foreground: false, background: false });
  const [notifGranted, setNotifGranted] = useState(false);
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("miles");
  const [devMode, setDevMode] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const { setColorScheme: setTheme } = useThemeContext();
  const subscription = useSubscriptionContext();
  const permissions = usePermissions();
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [batteryOptimized, setBatteryOptimized] = useState(false);
  const [showBatteryGate, setShowBatteryGate] = useState(false);

  const loadState = useCallback(async () => {
    const [tierData, perms, geofence, unit, devEnabled, notifStatus, appSettingsData] = await Promise.all([
      getTier(),
      checkLocationPermissions(),
      isGeofencingActive(),
      getDistanceUnit(),
      isDevModeEnabled(),
      Notifications.getPermissionsAsync(),
      getAppSettings(),
    ]);
    setTierState(tierData);
    setLocationPerms(perms);
    setGeofencingActive(geofence);
    setDistanceUnitState(unit);
    setDevMode(devEnabled);
    setNotifGranted(notifStatus.status === "granted");
    setNotifDenied(notifStatus.status === "denied");
    setAppSettings(appSettingsData);
    // Sync battery optimization state
    setBatteryOptimized(permissions.batteryOptimizationEnabled);
    // Apply saved theme
    if (appSettingsData.themeMode !== "system") {
      setTheme(appSettingsData.themeMode);
    }
  }, [setTheme]);

  // Re-check permissions when app comes back to foreground (user may have enabled in Settings)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") loadState();
    });
    return () => sub.remove();
  }, [loadState]);

  const handleDistanceUnitToggle = async (unit: DistanceUnit) => {
    await setDistanceUnit(unit);
    setDistanceUnitState(unit);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useFocusEffect(useCallback(() => { loadState(); }, [loadState]));

  const handleRequestLocation = async () => {
    // Step 1: Request foreground location
    const fgGranted = await permissions.requestForeground();
    if (!fgGranted) {
      Alert.alert(
        t("settings.location"),
        t("stores.permissionDenied"),
        [
          { text: t("settings.openSettings"), onPress: () => Linking.openSettings() },
          { text: t("common.cancel"), style: "cancel" },
        ]
      );
      return;
    }
    // Step 2: Check if background is already granted
    const bgCheck = await (await import("expo-location")).getBackgroundPermissionsAsync();
    if (bgCheck.status !== "granted") {
      // Show prominent disclosure modal before requesting background
      setShowDisclosureModal(true);
      return;
    }
    // Already have background — refresh and start geofencing
    const perms = await checkLocationPermissions();
    setLocationPerms(perms);
    if (perms.background) {
      const stores = await getSavedStores();
      if (stores.length > 0) {
        await startGeofencing(stores);
        setGeofencingActive(true);
      } else {
        Alert.alert(t("settings.location"), t("stores.noSavedStoresSubtitle"));
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (notifDenied) {
      Linking.openSettings();
      return;
    }
    const granted = await setupNotifications();
    setNotifGranted(granted);
    if (granted) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setNotifDenied(true);
      Linking.openSettings();
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleGeofencing = async (value: boolean) => {
    if (value) {
      if (!locationPerms.background) {
        Alert.alert(t("settings.location"), t("onboarding.locationBg.title"));
        return;
      }
      // MANDATORY: Battery optimization gate — block geofencing until exempted
      if (Platform.OS === "android") {
        const exempted = await isBatteryExempted();
        if (!exempted) {
          setShowBatteryGate(true);
          return;
        }
      }
      const stores = await getSavedStores();
      if (stores.length === 0) {
        Alert.alert(t("stores.noSavedStores"), t("stores.noSavedStoresSubtitle"));
        return;
      }
      await startGeofencing(stores);
      setGeofencingActive(true);
    } else {
      await stopGeofencing();
      setGeofencingActive(false);
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const handleReferFriend = async () => {
    try {
      const code = await getReferralCode();
      const message = t("settings.referFriendMessage", { code });
      await Share.share({ message, title: t("settings.referFriend") });
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // user cancelled share sheet — no action needed
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await subscription.restore();
      if (!subscription.error) {
        Alert.alert(
          t("settings.subscription"),
          "Purchase restored successfully! Premium is now active."
        );
        await loadState();
      } else {
        Alert.alert(
          t("settings.subscription"),
          subscription.error
        );
      }
    } catch {
      Alert.alert(
        t("settings.subscription"),
        "Could not restore purchases. Please try again."
      );
    }
  };

  const PermissionRow = ({
    label,
    granted,
    denied,
    onPress,
    description,
  }: {
    label: string;
    granted: boolean;
    denied?: boolean;
    onPress: () => void;
    description: string;
  }) => {
    const btnLabel = granted ? t("settings.enabled") : denied ? t("settings.openSettings") : t("settings.enable");
    const btnBg = granted ? colors.success + "20" : denied ? colors.warning : colors.primary;
    const btnTextColor = granted ? colors.success : "#fff";
    return (
      <View style={[styles.settingRow, { borderColor: colors.border }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
          <Text style={[styles.settingDesc, { color: denied && !granted ? colors.error : colors.muted }]}>
            {denied && !granted ? t("onboarding.notifications.blockedMessage") : description}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.permBtn,
            { backgroundColor: btnBg, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={onPress}
        >
          <Text style={[styles.permBtnText, { color: btnTextColor }]}>{btnLabel}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("settings.title")}</Text>

        {/* Permissions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t("settings.permissions").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <PermissionRow
              label={t("settings.backgroundLocation")}
              granted={locationPerms.background}
              onPress={handleRequestLocation}
              description={t("onboarding.locationBg.description")}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <PermissionRow
              label={t("settings.notifications")}
              granted={notifGranted}
              denied={notifDenied}
              onPress={handleEnableNotifications}
              description={t("onboarding.notifications.description")}
            />
            {/* Battery Optimization — Android only */}
            {Platform.OS === "android" && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={[styles.settingRow, { borderColor: colors.border }]}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                      🔋 Battery Optimization
                    </Text>
                    <Text style={[styles.settingDesc, { color: batteryOptimized ? colors.error : colors.muted }]}>
                      {batteryOptimized
                        ? "App may be killed in background. Tap to exempt."
                        : "App is exempt from battery optimization."}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.permBtn,
                      {
                        backgroundColor: batteryOptimized ? colors.error : colors.success + "20",
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={async () => {
                      if (batteryOptimized) {
                        await permissions.requestBatteryOptimizationExemption();
                        setBatteryOptimized(false);
                      }
                    }}
                  >
                    <Text style={[styles.permBtnText, { color: batteryOptimized ? "#fff" : colors.success }]}>
                      {batteryOptimized ? "Fix" : "Exempt ✓"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Geofencing Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t("settings.geofencing").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.geofencing")}</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>
                  {geofencingActive ? t("settings.geofencingActive") : t("settings.geofencingInactive")}
                </Text>
              </View>
              <Switch
                value={geofencingActive}
                onValueChange={handleToggleGeofencing}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable
              style={({ pressed }) => [styles.settingRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={handleTestNotification}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.sendTestNotification")}</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>{t("settings.notifications")}</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t("settings.subscription").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.subscription")}</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>
                  {tier === "premium" ? t("settings.premium") : t("settings.free")}
                </Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: tier === "premium" ? colors.premium + "20" : colors.border }]}>
                <Text style={[styles.tierText, { color: tier === "premium" ? colors.premium : colors.muted }]}>
                  {tier === "premium" ? t("settings.premium").toUpperCase() : t("settings.free").toUpperCase()}
                </Text>
              </View>
            </View>
            {tier !== "premium" && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Pressable
                  style={({ pressed }) => [styles.upgradeBtn, { backgroundColor: colors.premium, opacity: pressed ? 0.85 : 1 }]}
                  onPress={handleUpgrade}
                >
                  <IconSymbol name="crown.fill" size={18} color="#fff" />
                  <Text style={styles.upgradeBtnText}>{t("settings.upgradeToPremium")}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.restoreBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={handleRestorePurchases}
                >
                  <Text style={[styles.restoreBtnText, { color: colors.muted }]}>{t("settings.subscription")}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Theme Mode */}
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Theme</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Choose light, dark, or follow system</Text>
              </View>
              <View style={styles.unitToggleRow}>
                {(["light", "system", "dark"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    style={({ pressed }) => [styles.unitBtn, {
                      backgroundColor: (appSettings?.themeMode ?? "system") === mode ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    }]}
                    onPress={async () => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      await saveAppSettings({ themeMode: mode });
                      setAppSettings((prev) => prev ? { ...prev, themeMode: mode } : null);
                      setTheme(mode === "system" ? (colorScheme ?? "light") : mode);
                    }}
                  >
                    <Text style={[styles.unitBtnText, { color: (appSettings?.themeMode ?? "system") === mode ? "#fff" : colors.muted }]}>
                      {mode === "light" ? "☀️" : mode === "dark" ? "🌙" : "⚙️"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {/* Confetti on completion */}
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>🎉 Confetti on List Complete</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Celebrate when you check off everything</Text>
              </View>
              <Switch
                value={appSettings?.confettiEnabled ?? true}
                onValueChange={async (val) => {
                  await saveAppSettings({ confettiEnabled: val });
                  setAppSettings((prev) => prev ? { ...prev, confettiEnabled: val } : null);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {/* Haptic celebration */}
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>📳 Haptic Celebration</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Vibration pattern when list is complete</Text>
              </View>
              <Switch
                value={appSettings?.hapticCelebration ?? true}
                onValueChange={async (val) => {
                  await saveAppSettings({ hapticCelebration: val });
                  setAppSettings((prev) => prev ? { ...prev, hapticCelebration: val } : null);
                  if (Platform.OS !== "web" && val) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {/* Haptic feedback */}
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Haptic Feedback</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Vibrate on button taps and actions</Text>
              </View>
              <Switch
                value={appSettings?.hapticEnabled ?? true}
                onValueChange={async (val) => {
                  await saveAppSettings({ hapticEnabled: val });
                  setAppSettings((prev) => prev ? { ...prev, hapticEnabled: val } : null);
                  if (Platform.OS !== "web" && val) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>
        {/* Distance Unit Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t("settings.distanceUnit").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.distanceUnit")}</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>{t("settings.distanceUnit")}</Text>
              </View>
              <View style={styles.unitToggleRow}>
                <Pressable
                  style={({ pressed }) => [styles.unitBtn, { backgroundColor: distanceUnit === "miles" ? colors.primary : colors.border, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => handleDistanceUnitToggle("miles")}
                >
                  <Text style={[styles.unitBtnText, { color: distanceUnit === "miles" ? "#fff" : colors.muted }]}>{t("settings.miles").slice(0, 2)}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.unitBtn, { backgroundColor: distanceUnit === "km" ? colors.primary : colors.border, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => handleDistanceUnitToggle("km")}
                >
                  <Text style={[styles.unitBtnText, { color: distanceUnit === "km" ? "#fff" : colors.muted }]}>km</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Refer a Friend Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t("settings.referAFriend").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [styles.settingRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={handleReferFriend}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.primary }]}>{t("settings.referFriend")}</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>{t("settings.referFriendDesc")}</Text>
              </View>
              <IconSymbol name="paperplane.fill" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>{t("settings.about").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.version", { version: Constants.expoConfig?.version ?? "1.0.42" })}</Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>{Constants.expoConfig?.version ?? "1.0.42"}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.privacyPolicy")}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.termsOfService")}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t("settings.contactSupport")}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </View>
          </View>
        </View>

        {/* Developer Panel — only visible when dev mode is active */}
        {devMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.warning }]}>{t("settings.developerMode").toUpperCase()}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.warning + "50" }]}>
              <Pressable
                style={({ pressed }) => [styles.settingRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                onPress={async () => {
                  await AsyncStorage.removeItem("r2b_onboarding_done");
                  Alert.alert(t("common.done"), "Onboarding reset. Restart the app to see it.");
                }}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Reset Onboarding</Text>
                  <Text style={[styles.settingDesc, { color: colors.muted }]}>Clears onboarding flag — restart app to re-run</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Pressable
                style={({ pressed }) => [styles.settingRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                onPress={async () => {
                  await setTier("premium");
                  setTierState("premium");
                  Alert.alert(t("common.done"), "Tier set to Premium (no expiry).");
                }}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Force Premium</Text>
                  <Text style={[styles.settingDesc, { color: colors.muted }]}>Set tier to premium with no expiry</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Pressable
                style={({ pressed }) => [styles.settingRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                onPress={async () => {
                  await setTier("free");
                  setTierState("free");
                  Alert.alert(t("common.done"), "Tier reset to Free.");
                }}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Force Free</Text>
                  <Text style={[styles.settingDesc, { color: colors.muted }]}>Reset tier back to free</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Pressable
                style={({ pressed }) => [styles.settingRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                onPress={async () => {
                  await setDevModeEnabled(false);
                  setDevMode(false);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.warning }]}>{t("settings.developerMode")} — Disable</Text>
                  <Text style={[styles.settingDesc, { color: colors.muted }]}>Tap title 11× on Dashboard to re-enable</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Access — New Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>TOOLS & FEATURES</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { label: "⏰ Smart Reminders", desc: "Schedule weekly shopping reminders", route: "/reminders" },
              { label: "🥦 Pantry Mode", desc: "Track what you have at home", route: "/pantry" },
              { label: "🍽 Meal Planner", desc: "Plan meals and auto-add ingredients", route: "/meal-planner" },
              { label: "💰 Budget & Savings", desc: "Track spending and set goals", route: "/budget" },
              { label: "🏆 Achievements", desc: "Badges, streaks, and rewards", route: "/achievements" },
              { label: "👫 Shopping Buddy", desc: "Split your list with someone", route: "/shopping-buddy" },
              { label: "💸 Never Pay Full Price", desc: "Savings apps & stacking strategies", route: "/never-full-price" },
              { label: "👁️ Price Drop Watchlist", desc: "Watch items for price drops", route: "/watchlist" },
              { label: "🌱 Carbon Footprint", desc: "Track your basket's eco impact", route: "/carbon-footprint" },
              { label: "🔄 Healthy Swaps", desc: "Healthier alternatives to your items", route: "/healthy-swaps" },
              { label: "🌿 What's In Season", desc: "Freshest produce by month", route: "/in-season" },
              { label: "🧮 Unit Price Calculator", desc: "Compare price per oz/lb/unit", route: "/unit-price" },
              { label: "📷 Receipt Scanner", desc: "Scan receipt to log your trip", route: "/receipt-scanner" },
              { label: "❓ Forgot Something?", desc: "Post-trip unchecked item check", route: "/forgot-check" },
            ].map((item, idx, arr) => (
              <View key={item.route}>
                <Pressable
                  style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => router.push(item.route as never)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.settingDesc, { color: colors.muted }]}>{item.desc}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
                {idx < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>
        </View>
        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>DATA MANAGEMENT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={async () => {
                const { getShoppingLists, getAllShoppingItems } = await import("@/lib/storage");
                const allLists = await getShoppingLists();
                const allItems = await getAllShoppingItems();
                const text = allLists.map((l) => {
                  const items = allItems.filter((i) => i.listId === l.id);
                  return `=== ${l.name} ===\n` + items.map((i) => `- ${i.text}${i.quantity ? ` (${i.quantity} ${i.unit ?? ""})` : ""}`).join("\n");
                }).join("\n\n");
                await Share.share({ message: text || "No items in your lists." });
              }}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>📤 Export All Lists</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Share all shopping lists as text</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable
              style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => {
                Alert.alert(
                  "Clear All Data",
                  "This will permanently delete all your shopping lists, stores, coupons, and settings. This cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear Everything", style: "destructive",
                      onPress: async () => {
                        await AsyncStorage.clear();
                        Alert.alert("Done", "All data cleared. Restart the app.");
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.error }]}>🗑 Clear All Data</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Permanently delete everything</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Location Prominent Disclosure Modal — required by Google Play policy */}
      <LocationDisclosureModal
        visible={showDisclosureModal}
        onNotNow={() => setShowDisclosureModal(false)}
        onGotIt={async () => {
          setShowDisclosureModal(false);
          await permissions.requestBackground();
          const perms = await checkLocationPermissions();
          setLocationPerms(perms);
          if (perms.background) {
            const stores = await getSavedStores();
            if (stores.length > 0) {
              await startGeofencing(stores);
              setGeofencingActive(true);
            }
          }
        }}
      />

      {/* Battery Optimization Gate — MANDATORY full-screen block on Android */}
      <Modal
        visible={showBatteryGate}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowBatteryGate(false)}
      >
        <BatteryGateScreen
          onComplete={async () => {
            setShowBatteryGate(false);
            // Now proceed with enabling geofencing
            const stores = await getSavedStores();
            if (stores.length > 0) {
              await startGeofencing(stores);
              setGeofencingActive(true);
            } else {
              Alert.alert(t("stores.noSavedStores"), t("stores.noSavedStoresSubtitle"));
            }
          }}
          onSkip={() => setShowBatteryGate(false)}
        />
      </Modal>

      {/* Premium Paywall Modal — triggers real Google Play Billing purchase */}
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywall(false)}
      >
        <PremiumPaywall
          reason="general"
          iapReady={subscription.iapReady}
          iapFailed={subscription.iapFailed}
          purchaseError={subscription.error}
          onRetry={subscription.retryConnect}
          onActivate={async (plan) => {
            try {
              if (plan === "annual") {
                await subscription.purchaseAnnual();
              } else {
                await subscription.purchase();
              }
              // purchaseUpdatedListener handles success and sets status to "active".
              // Close modal after a short delay to let the listener fire.
              setTimeout(() => {
                setShowPaywall(false);
                loadState();
              }, 1500);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "";
              // User cancelled — do nothing
              if (msg.toLowerCase().includes("cancel")) return;
              // IAP not available or connection not ready — open Play Store directly
              const supported = await Linking.canOpenURL(PLAY_STORE_URL);
              if (supported) {
                await Linking.openURL(PLAY_STORE_URL);
              } else {
                Alert.alert(
                  "Open Play Store",
                  "Please search for Remember2Buy in the Google Play Store to subscribe."
                );
              }
            }
          }}
          onDismiss={() => setShowPaywall(false)}
        />
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  title: { fontSize: 24, fontWeight: "700", paddingTop: 8, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: "600", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: "500" },
  settingDesc: { fontSize: 12, marginTop: 2 },
  settingValue: { fontSize: 14 },
  divider: { height: 0.5, marginLeft: 16 },
  permBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  permBtnText: { fontSize: 13, fontWeight: "600" },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tierText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 16, marginTop: 4, paddingVertical: 14, borderRadius: 12 },
  upgradeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  restoreBtn: { alignItems: "center", paddingBottom: 12 },
  restoreBtnText: { fontSize: 13 },
  unitToggleRow: { flexDirection: "row", gap: 6 },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  unitBtnText: { fontSize: 13, fontWeight: "700" },
});
