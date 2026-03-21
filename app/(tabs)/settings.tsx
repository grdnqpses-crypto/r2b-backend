import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Platform, Linking, Switch,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getTier, setTier, getDistanceUnit, setDistanceUnit, type Tier, type DistanceUnit } from "@/lib/storage";
import {
  checkLocationPermissions,
  requestLocationPermissions,
  isGeofencingActive,
  startGeofencing,
  stopGeofencing,
  getSavedStores,
} from "@/lib/geofence";
import { setupNotifications, sendTestNotification } from "@/lib/notifications";

export default function SettingsScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [tier, setTierState] = useState<Tier>("free");
  const [locationPerms, setLocationPerms] = useState({ foreground: false, background: false });
  const [notifGranted, setNotifGranted] = useState(false);
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("miles");

  const loadState = useCallback(async () => {
    const [tierData, perms, geofence, unit] = await Promise.all([
      getTier(),
      checkLocationPermissions(),
      isGeofencingActive(),
      getDistanceUnit(),
    ]);
    setTierState(tierData);
    setLocationPerms(perms);
    setGeofencingActive(geofence);
    setDistanceUnitState(unit);
  }, []);

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
        Alert.alert("Location Access Granted", "Geofencing is now active. You will receive alerts near your stores.");
      } else {
        Alert.alert("Location Access Granted", "Add stores in the Stores tab to start receiving alerts.");
      }
    } else if (perms.foreground) {
      Alert.alert(
        "Background Location Needed",
        "For alerts when the app is closed, please allow 'Always' location access in Settings.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Later", style: "cancel" },
        ]
      );
    } else {
      Alert.alert(
        "Location Denied",
        "Location access is required for store alerts. Please enable it in Settings.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await setupNotifications();
    setNotifGranted(granted);
    if (granted) {
      Alert.alert("Notifications Enabled", "You will receive store alerts.");
    } else {
      Alert.alert(
        "Notifications Denied",
        "Please enable notifications in Settings.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleGeofencing = async (value: boolean) => {
    if (value) {
      if (!locationPerms.background) {
        Alert.alert("Location Required", "Please grant 'Always' location access first.");
        return;
      }
      const stores = await getSavedStores();
      if (stores.length === 0) {
        Alert.alert("No Stores", "Add stores in the Stores tab first.");
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
    Alert.alert(
      "Upgrade to Premium",
      "Premium features:\n\n• Unlimited stores\n• Unlimited shopping items\n• Photo import (OCR)\n• Priority support\n\nPrice: $1.99/week or $4.99/month\n\n(In-app purchase integration coming soon)",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Upgrade",
          onPress: async () => {
            // In production, this would trigger RevenueCat purchase flow
            await setTier("premium");
            setTierState("premium");
            Alert.alert("Welcome to Premium!", "You now have unlimited stores and items.");
          },
        },
      ]
    );
  };

  const handleRestorePurchases = () => {
    Alert.alert("Restore Purchases", "Checking for previous purchases... (RevenueCat integration required for production)");
  };

  const PermissionRow = ({
    label,
    granted,
    onPress,
    description,
  }: {
    label: string;
    granted: boolean;
    onPress: () => void;
    description: string;
  }) => (
    <View style={[styles.settingRow, { borderColor: colors.border }]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.settingDesc, { color: colors.muted }]}>{description}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.permBtn,
          { backgroundColor: granted ? colors.success + "20" : colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.permBtnText, { color: granted ? colors.success : "#fff" }]}>
          {granted ? "Granted" : "Enable"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

        {/* Permissions Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>PERMISSIONS</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <PermissionRow
              label="Location (Always)"
              granted={locationPerms.background}
              onPress={handleRequestLocation}
              description="Required for background store alerts"
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <PermissionRow
              label="Notifications"
              granted={notifGranted}
              onPress={handleEnableNotifications}
              description="Required to receive store alerts"
            />
          </View>
        </View>

        {/* Geofencing Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>MONITORING</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Background Alerts</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>
                  {geofencingActive ? "Monitoring your stores" : "Not monitoring"}
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
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Test Notification</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Send a test alert now</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>SUBSCRIPTION</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Current Plan</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>
                  {tier === "premium" ? "Premium — Unlimited everything" : "Free — Limited stores & items"}
                </Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: tier === "premium" ? colors.premium + "20" : colors.border }]}>
                <Text style={[styles.tierText, { color: tier === "premium" ? colors.premium : colors.muted }]}>
                  {tier === "premium" ? "PREMIUM" : "FREE"}
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
                  <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.restoreBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={handleRestorePurchases}
                >
                  <Text style={[styles.restoreBtnText, { color: colors.muted }]}>Restore Purchases</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Distance Unit Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>DISPLAY</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Distance Unit</Text>
                <Text style={[styles.settingDesc, { color: colors.muted }]}>Used on Dashboard and Stores screens</Text>
              </View>
              <View style={styles.unitToggleRow}>
                <Pressable
                  style={({ pressed }) => [styles.unitBtn, { backgroundColor: distanceUnit === "miles" ? colors.primary : colors.border, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => handleDistanceUnitToggle("miles")}
                >
                  <Text style={[styles.unitBtnText, { color: distanceUnit === "miles" ? "#fff" : colors.muted }]}>mi</Text>
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

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Version</Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Alert Radius</Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>0.3 miles</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.settingRow, { borderColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Follow-up Alert</Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>6 min after arrival</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
