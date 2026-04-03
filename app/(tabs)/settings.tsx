import { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Platform, Linking, Switch, AppState, Modal, Share, type AppStateStatus,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getTier, setTier, getDistanceUnit, setDistanceUnit,
  isDevModeEnabled, setDevModeEnabled, getReferralCode,
  type Tier, type DistanceUnit,
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
import { useSubscription } from "@/hooks/use-subscription";
import { PremiumPaywall } from "@/components/premium-paywall";

export default function SettingsScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [tier, setTierState] = useState<Tier>("free");
  const [locationPerms, setLocationPerms] = useState({ foreground: false, background: false });
  const [notifGranted, setNotifGranted] = useState(false);
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("miles");
  const [devMode, setDevMode] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const subscription = useSubscription();

  const loadState = useCallback(async () => {
    const [tierData, perms, geofence, unit, devEnabled, notifStatus] = await Promise.all([
      getTier(),
      checkLocationPermissions(),
      isGeofencingActive(),
      getDistanceUnit(),
      isDevModeEnabled(),
      Notifications.getPermissionsAsync(),
    ]);
    setTierState(tierData);
    setLocationPerms(perms);
    setGeofencingActive(geofence);
    setDistanceUnitState(unit);
    setDevMode(devEnabled);
    setNotifGranted(notifStatus.status === "granted");
    setNotifDenied(notifStatus.status === "denied");
  }, []);

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
    const perms = await requestLocationPermissions();
    setLocationPerms(perms);
    if (perms.background) {
      const stores = await getSavedStores();
      if (stores.length > 0) {
        await startGeofencing(stores);
        setGeofencingActive(true);
        Alert.alert(t("settings.location"), t("dashboard.addStoresToStart"));
      } else {
        Alert.alert(t("settings.location"), t("stores.noSavedStoresSubtitle"));
      }
    } else if (perms.foreground) {
      Alert.alert(
        t("settings.backgroundLocation"),
        t("onboarding.locationBg.description"),
        [
          { text: t("settings.openSettings"), onPress: () => Linking.openSettings() },
          { text: t("common.cancel"), style: "cancel" },
        ]
      );
    } else {
      Alert.alert(
        t("settings.location"),
        t("stores.permissionDenied"),
        [
          { text: t("settings.openSettings"), onPress: () => Linking.openSettings() },
          { text: t("common.cancel"), style: "cancel" },
        ]
      );
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

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Premium Paywall Modal — triggers real Google Play Billing purchase */}
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywall(false)}
      >
        <PremiumPaywall
          reason="general"
          onActivate={async (_family: boolean) => {
            await subscription.purchase();
            setShowPaywall(false);
            await loadState();
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
