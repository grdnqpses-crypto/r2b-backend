/**
 * Dashboard Screen
 *
 * Map strategy: Pure Leaflet/OpenStreetMap via WebView.
 * Zero Google dependencies — no react-native-maps, no GMS, no API key required.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, RefreshControl,
  Platform, Animated,
} from "react-native";
import { LeafletMap } from "@/components/leaflet-map";
import { useFocusEffect, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getShoppingItems, getSavedStores, getTier, setTier, getDistanceUnit,
  isDevModeEnabled, setDevModeEnabled,
  type ShoppingItem, type SavedStore, type Tier, type DistanceUnit,
} from "@/lib/storage";
import { isGeofencingActive, checkLocationPermissions } from "@/lib/geofence";

const DEV_TAP_TARGET = 11;

// 15 miles in meters — used for "nearby" highlight on dashboard
const NEARBY_RADIUS_METERS = 24140;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number, unit: DistanceUnit): string {
  if (unit === "km") {
    const km = meters / 1000;
    return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
  }
  const miles = meters / 1609.344;
  if (miles < 0.1) return `${Math.round(meters * 3.281)} ft`;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}



export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [stores, setStores] = useState<SavedStore[]>([]);
  const [tier, setTierState] = useState<Tier>("free");
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("miles");
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [devTapCount, setDevTapCount] = useState(0);
  const devTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devToastAnim = useRef(new Animated.Value(0)).current;
  const [devToastMsg, setDevToastMsg] = useState("");

  const loadData = useCallback(async () => {
    const [itemsData, storesData, tierData, geofenceActive, locationPerms, unit, devEnabled] =
      await Promise.all([
        getShoppingItems(), getSavedStores(), getTier(),
        isGeofencingActive(), checkLocationPermissions(), getDistanceUnit(),
        isDevModeEnabled(),
      ]);
    setItems(itemsData);
    setStores(storesData);
    setTierState(tierData);
    setGeofencingActive(geofenceActive);
    setLocationGranted(locationPerms.background);
    setDistanceUnitState(unit);
    setDevMode(devEnabled);
  }, []);

  const showDevToast = useCallback((msg: string) => {
    setDevToastMsg(msg);
    Animated.sequence([
      Animated.timing(devToastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(devToastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [devToastAnim]);

  const handleTitleTap = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (devTapTimer.current) clearTimeout(devTapTimer.current);
    devTapTimer.current = setTimeout(() => setDevTapCount(0), 3000);

    const newCount = devTapCount + 1;
    setDevTapCount(newCount);

    if (newCount === DEV_TAP_TARGET) {
      setDevTapCount(0);
      if (devTapTimer.current) clearTimeout(devTapTimer.current);
      const next = !devMode;
      await setDevModeEnabled(next);
      setDevMode(next);
      await setTier(next ? "premium" : "free");
      setTierState(next ? "premium" : "free");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showDevToast(next ? "🛠️ Dev mode ON · Premium unlocked" : "Dev mode OFF · Free tier restored");
    } else if (newCount >= DEV_TAP_TARGET - 3) {
      showDevToast(`${DEV_TAP_TARGET - newCount} more tap${DEV_TAP_TARGET - newCount !== 1 ? "s" : ""}…`);
    }
  }, [devTapCount, devMode, devToastAnim, showDevToast]);

  // Real-time location tracking
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted" || !active) return;
      // Get last known position instantly (no network wait)
      Location.getLastKnownPositionAsync({}).then((pos) => {
        if (pos && active) {
          setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          // Enable map after we have a position

        }
      }).catch(() => {});
      // Then get accurate position
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((pos) => {
          if (active) {
            setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });

          }
        })
        .catch(() => {});
      // Watch for updates
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 },
        (pos) => {
          if (active) setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      ).then((sub) => {
        if (active) locationSubRef.current = sub;
        else sub.remove();
      }).catch(() => {});
    });
    return () => {
      active = false;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, []);


  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  const storesWithDistance = stores.map((store) => {
    const distMeters = userLocation
      ? haversineMeters(userLocation.latitude, userLocation.longitude, store.lat, store.lng)
      : null;
    return { ...store, distMeters };
  }).sort((a, b) => {
    if (a.distMeters === null && b.distMeters === null) return 0;
    if (a.distMeters === null) return 1;
    if (b.distMeters === null) return -1;
    return a.distMeters - b.distMeters;
  });


  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleTitleTap} style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.appTitle, { color: colors.primary }]}>Remember2Buy</Text>
              {devMode && (
                <View style={[styles.devBadge, { backgroundColor: colors.warning + "25", borderColor: colors.warning + "60" }]}>
                  <Text style={[styles.devBadgeText, { color: colors.warning }]}>DEV</Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{t("dashboard.subtitle")}</Text>
          </Pressable>
          {tier === "premium" && (
            <View style={[styles.premiumBadge, { backgroundColor: "#a855f7" }]}>
              <Text style={styles.premiumText}>{t("dashboard.premiumBadge")}</Text>
            </View>
          )}
        </View>

        {/* Dev mode toast */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.devToast,
            { backgroundColor: colors.foreground, opacity: devToastAnim,
              transform: [{ translateY: devToastAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }
          ]}
        >
          <Text style={[styles.devToastText, { color: colors.background }]}>{devToastMsg}</Text>
        </Animated.View>

        {/* Live Map — OpenStreetMap tiles, no Google API key required */}
        {userLocation && (
          <View style={[styles.mapCard, { borderColor: colors.border }]}>
            <View style={styles.mapHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[styles.mapLiveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.mapTitle, { color: colors.foreground }]}>Live Map</Text>
              </View>
              {stores.length > 0 && (
                <Text style={[styles.mapStoreCount, { color: colors.muted }]}>
                  {stores.length} store{stores.length !== 1 ? "s" : ""} monitored
                </Text>
              )}
            </View>
            <LeafletMap
              latitude={userLocation.latitude}
              longitude={userLocation.longitude}
              stores={storesWithDistance}
            />
          </View>
        )}

        {/* Alert Status Card */}
        <View style={[styles.statusCard, { backgroundColor: geofencingActive ? colors.success + "18" : colors.surface, borderColor: geofencingActive ? colors.success + "50" : colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconBg, { backgroundColor: geofencingActive ? colors.success + "25" : colors.muted + "20" }]}>
              <IconSymbol name="bell.fill" size={20} color={geofencingActive ? colors.success : colors.muted} />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                {geofencingActive ? t("dashboard.alertsActive") : t("dashboard.alertsInactive")}
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.muted }]}>
                {geofencingActive
                  ? t("dashboard.monitoringStores", { count: stores.length })
                  : locationGranted
                  ? t("dashboard.addStoresToStart")
                  : t("dashboard.enableLocationToActivate")}
              </Text>
            </View>
          </View>
          {!locationGranted && (
            <Pressable
              style={({ pressed }) => [styles.fixButton, { backgroundColor: colors.warning, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/(tabs)/settings" as never)}
            >
              <Text style={styles.fixButtonText}>{t("dashboard.fixLocationPermissions")}</Text>
            </Pressable>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/list" as never)}
          >
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{uncheckedItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{t("dashboard.itemsToBuy")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/stores" as never)}
          >
            <Text style={[styles.summaryNumber, { color: colors.foreground }]}>{stores.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{t("dashboard.stores")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/list" as never)}
          >
            <Text style={[styles.summaryNumber, { color: colors.success }]}>{checkedItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{t("dashboard.bought")}</Text>
          </Pressable>
        </View>

        {/* Monitored Stores with real-time distance */}
        {storesWithDistance.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("dashboard.monitoredStores")}</Text>
              <Pressable onPress={() => router.push("/(tabs)/stores" as never)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t("dashboard.manage")}</Text>
              </Pressable>
            </View>
            {storesWithDistance.map((store) => {
              const distLabel = store.distMeters !== null
                ? formatDistance(store.distMeters, distanceUnit)
                : null;
              const isNearby = store.distMeters !== null && store.distMeters <= NEARBY_RADIUS_METERS;
              return (
                <View key={store.id} style={[styles.storeRow, { backgroundColor: isNearby ? colors.success + "12" : colors.surface, borderColor: isNearby ? colors.success + "50" : colors.border }]}>
                  <View style={[styles.storeIconBg, { backgroundColor: isNearby ? colors.success + "25" : colors.primary + "20" }]}>
                    <IconSymbol name="storefront.fill" size={18} color={isNearby ? colors.success : colors.primary} />
                  </View>
                  <View style={styles.storeInfo}>
                    <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{store.name}</Text>
                    {store.address ? (
                      <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>{store.address}</Text>
                    ) : null}
                  </View>
                  <View style={styles.storeRight}>
                    {isNearby ? (
                      <View style={[styles.nearbyBadge, { backgroundColor: colors.success + "20" }]}>
                        <Text style={[styles.nearbyText, { color: colors.success }]}>🛖 {t("dashboard.youreHere")}</Text>
                      </View>
                    ) : distLabel ? (
                      <View style={[styles.distanceBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.distanceText, { color: colors.primary }]}>{t("stores.distanceAway", { distance: distLabel })}</Text>
                      </View>
                    ) : (
                      <View style={[styles.activeBadge, { backgroundColor: colors.success + "20" }]}>
                        <Text style={[styles.activeText, { color: colors.success }]}>{t("dashboard.active")}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Shopping List Preview */}
        {uncheckedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("dashboard.shoppingList")}</Text>
              <Pressable onPress={() => router.push("/(tabs)/list" as never)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t("dashboard.seeAll")}</Text>
              </Pressable>
            </View>
            {uncheckedItems.slice(0, 5).map((item) => (
              <View key={item.id} style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.itemDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.itemText, { color: colors.foreground }]} numberOfLines={1}>{item.text}</Text>
              </View>
            ))}
            {uncheckedItems.length > 5 && (
              <Pressable onPress={() => router.push("/(tabs)/list" as never)}>
                <Text style={[styles.moreItems, { color: colors.primary }]}>{t("dashboard.moreItems", { count: uncheckedItems.length - 5 })}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Empty State */}
        {stores.length === 0 && uncheckedItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("dashboard.getStarted")}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {t("dashboard.getStartedSubtitle")}
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                style={({ pressed }) => [styles.emptyButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push("/(tabs)/stores" as never)}
              >
                <Text style={styles.emptyButtonText}>{t("dashboard.addAStore")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.emptyButtonOutline, { borderColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push("/(tabs)/list" as never)}
              >
                <Text style={[styles.emptyButtonOutlineText, { color: colors.primary }]}>{t("dashboard.addItems")}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Access Section */}
        <View style={[styles.section, { marginTop: 4 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>✨ Quick Access</Text>
          <View style={styles.quickGrid}>
            {([
              { emoji: "💰", label: "Budget", sub: "Trips & Goals", route: "/budget" },
              { emoji: "🏆", label: "Achievements", sub: "Badges & Streaks", route: "/achievements" },
              { emoji: "🍽️", label: "Meal Planner", sub: "Recipes & Lists", route: "/meal-planner" },
              { emoji: "🥦", label: "Pantry", sub: "Stock Tracker", route: "/pantry" },
              { emoji: "⏰", label: "Reminders", sub: "Smart Alerts", route: "/reminders" },
              { emoji: "👁️", label: "Watchlist", sub: "Price Drops", route: "/watchlist" },
              { emoji: "👫", label: "Buddy Mode", sub: "Split List", route: "/shopping-buddy" },
              { emoji: "💸", label: "Never Full Price", sub: "Savings Apps", route: "/never-full-price" },
              { emoji: "🌱", label: "Carbon", sub: "Eco Tracker", route: "/carbon-footprint" },
              { emoji: "🔄", label: "Healthy Swaps", sub: "Better Choices", route: "/healthy-swaps" },
              { emoji: "🌿", label: "In Season", sub: "Fresh Produce", route: "/in-season" },
              { emoji: "🧮", label: "Unit Price", sub: "Best Value", route: "/unit-price" },
              { emoji: "📷", label: "Receipt Scan", sub: "Log Trip", route: "/receipt-scanner" },
              { emoji: "❓", label: "Forgot?", sub: "Post-Trip Check", route: "/forgot-check" },
            ] as const).map((item) => (
              <Pressable
                key={item.route}
                style={({ pressed }) => [styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push(item.route as never)}
              >
                <Text style={styles.quickEmoji}>{item.emoji}</Text>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.quickSub, { color: colors.muted }]}>{item.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingTop: 8 },
  appTitle: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  premiumBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  premiumText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  // Map card (OpenStreetMap)
  mapCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  mapHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  mapLiveDot: { width: 8, height: 8, borderRadius: 4 },
  mapTitle: { fontSize: 13, fontWeight: "600" },
  mapStoreCount: { fontSize: 12 },
  map: { width: "100%", height: 220 },
  mapWebFallback: { height: 80, alignItems: "center", justifyContent: "center", gap: 6 },
  mapWebText: { fontSize: 12 },
  // Status card
  statusCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  statusSubtitle: { fontSize: 12, lineHeight: 16 },
  fixButton: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignSelf: "flex-start" },
  fixButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  summaryNumber: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
  summaryLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  seeAll: { fontSize: 13, fontWeight: "500" },
  storeRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 10 },
  storeIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: "600" },
  storeAddress: { fontSize: 11, marginTop: 1 },
  storeRight: { alignItems: "flex-end" },
  nearbyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  nearbyText: { fontSize: 12, fontWeight: "700" },
  distanceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  distanceText: { fontSize: 12, fontWeight: "600" },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeText: { fontSize: 11, fontWeight: "600" },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 10 },
  itemDot: { width: 6, height: 6, borderRadius: 3 },
  itemText: { fontSize: 14, flex: 1 },
  moreItems: { fontSize: 12, textAlign: "center", marginTop: 4, fontWeight: "500" },
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  emptyActions: { flexDirection: "row", gap: 12 },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  emptyButtonOutline: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  emptyButtonOutlineText: { fontSize: 15, fontWeight: "600" },
  bottomPadding: { height: 20 },
  quickGrid: { flexDirection: "row", gap: 10 },
  quickCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  quickEmoji: { fontSize: 26, marginBottom: 2 },
  quickLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  quickSub: { fontSize: 11, textAlign: "center" },
  devBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  devBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  devToast: { alignSelf: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12, zIndex: 10 },
  devToastText: { fontSize: 13, fontWeight: "600" },
});
