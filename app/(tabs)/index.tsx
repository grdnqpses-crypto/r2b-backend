/**
 * Dashboard Screen
 *
 * NOTE: react-native-maps MapView is intentionally NOT used here.
 * It crashes on Android with Expo SDK 54 + New Architecture (RN 0.81) when
 * the screen is navigated to after onboarding. This is a confirmed library bug:
 * https://github.com/react-native-maps/react-native-maps/issues/5759
 * https://github.com/react-native-maps/react-native-maps/issues/5699
 *
 * The map has been moved to the Stores tab only, where it is rendered on demand
 * rather than on every app launch.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Location from "expo-location";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getShoppingItems, getSavedStores, getTier, getDistanceUnit,
  type ShoppingItem, type SavedStore, type Tier, type DistanceUnit,
} from "@/lib/storage";
import { isGeofencingActive, checkLocationPermissions } from "@/lib/geofence";

const GEOFENCE_RADIUS = 483; // meters (~0.3 mi)

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
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [stores, setStores] = useState<SavedStore[]>([]);
  const [tier, setTierState] = useState<Tier>("free");
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("miles");
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const loadData = useCallback(async () => {
    const [itemsData, storesData, tierData, geofenceActive, locationPerms, unit] =
      await Promise.all([
        getShoppingItems(), getSavedStores(), getTier(),
        isGeofencingActive(), checkLocationPermissions(), getDistanceUnit(),
      ]);
    setItems(itemsData);
    setStores(storesData);
    setTierState(tierData);
    setGeofencingActive(geofenceActive);
    setLocationGranted(locationPerms.background);
    setDistanceUnitState(unit);
  }, []);

  // Real-time location tracking for live distance display (no MapView needed)
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted" || !active) return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((pos) => {
          if (active) setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        })
        .catch(() => {});
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 30 },
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

  // Sort stores by distance if we have user location
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
          <View>
            <Text style={[styles.appTitle, { color: colors.primary }]}>Remember2Buy</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Never forget to buy something</Text>
          </View>
          {tier === "premium" && (
            <View style={[styles.premiumBadge, { backgroundColor: "#a855f7" }]}>
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}
        </View>

        {/* Alert Status Card */}
        <View style={[styles.statusCard, { backgroundColor: geofencingActive ? colors.success + "18" : colors.surface, borderColor: geofencingActive ? colors.success + "50" : colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconBg, { backgroundColor: geofencingActive ? colors.success + "25" : colors.muted + "20" }]}>
              <IconSymbol name="bell.fill" size={20} color={geofencingActive ? colors.success : colors.muted} />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                {geofencingActive ? "Alerts Active" : "Alerts Inactive"}
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.muted }]}>
                {geofencingActive
                  ? `Monitoring ${stores.length} store${stores.length !== 1 ? "s" : ""} — you'll be notified when nearby`
                  : locationGranted
                  ? "Add stores to start receiving alerts"
                  : "Enable location access to activate alerts"}
              </Text>
            </View>
          </View>
          {!locationGranted && (
            <Pressable
              style={({ pressed }) => [styles.fixButton, { backgroundColor: colors.warning, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/(tabs)/settings" as never)}
            >
              <Text style={styles.fixButtonText}>Fix Location Permissions →</Text>
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
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Items to buy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/stores" as never)}
          >
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{stores.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{stores.length === 1 ? "Store" : "Stores"} tracked</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/list" as never)}
          >
            <Text style={[styles.summaryNumber, { color: colors.success }]}>{checkedItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Bought</Text>
          </Pressable>
        </View>

        {/* Monitored Stores with real-time distance */}
        {storesWithDistance.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monitored Stores</Text>
              <Pressable onPress={() => router.push("/(tabs)/stores" as never)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Manage →</Text>
              </Pressable>
            </View>
            {storesWithDistance.map((store) => {
              const distLabel = store.distMeters !== null
                ? formatDistance(store.distMeters, distanceUnit)
                : null;
              const isNearby = store.distMeters !== null && store.distMeters <= GEOFENCE_RADIUS;
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
                        <Text style={[styles.nearbyText, { color: colors.success }]}>🛖 You're here!</Text>
                      </View>
                    ) : distLabel ? (
                      <View style={[styles.distanceBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.distanceText, { color: colors.primary }]}>{distLabel} away</Text>
                      </View>
                    ) : (
                      <View style={[styles.activeBadge, { backgroundColor: colors.success + "20" }]}>
                        <Text style={[styles.activeText, { color: colors.success }]}>Active</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shopping List</Text>
              <Pressable onPress={() => router.push("/(tabs)/list" as never)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
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
                <Text style={[styles.moreItems, { color: colors.primary }]}>+{uncheckedItems.length - 5} more items — tap to see all</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Empty State */}
        {stores.length === 0 && uncheckedItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Get Started</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Add stores and shopping items to get alerts when you're nearby.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                style={({ pressed }) => [styles.emptyButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push("/(tabs)/stores" as never)}
              >
                <Text style={styles.emptyButtonText}>Add a Store</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.emptyButtonOutline, { borderColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push("/(tabs)/list" as never)}
              >
                <Text style={[styles.emptyButtonOutlineText, { color: colors.primary }]}>Add Items</Text>
              </Pressable>
            </View>
          </View>
        )}

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
});
