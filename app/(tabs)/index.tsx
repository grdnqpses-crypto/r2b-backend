import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
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
  const mapRef = useRef<MapView>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [stores, setStores] = useState<SavedStore[]>([]);
  const [tier, setTierState] = useState<Tier>("free");
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
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

  // Real-time location tracking for live distance display
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted" || !active) return;
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((pos) => { if (active) setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); })
        .catch(() => {});
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 },
        (pos) => { if (active) setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); }
      ).then((sub) => { if (active) locationSubRef.current = sub; else sub.remove(); }).catch(() => {});
    });
    return () => {
      active = false;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, []);

  // Fit map to show user + all stores
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const coords: { latitude: number; longitude: number }[] = [];
    if (userLocation) coords.push(userLocation);
    stores.forEach((s) => coords.push({ latitude: s.lat, longitude: s.lng }));
    if (coords.length === 0) return;
    if (coords.length === 1) {
      mapRef.current.animateToRegion({ ...coords[0], latitudeDelta: 0.04, longitudeDelta: 0.04 }, 600);
    } else {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    }
  }, [mapReady, userLocation, stores]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  const initialRegion = userLocation
    ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : stores.length > 0
    ? { latitude: stores[0].lat, longitude: stores[0].lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }
    : { latitude: 37.7749, longitude: -122.4194, latitudeDelta: 0.1, longitudeDelta: 0.1 };

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

        {/* Live Map */}
        {Platform.OS !== "web" && (
          <View style={[styles.mapCard, { borderColor: colors.border }]}>
            <View style={styles.mapHeader}>
              <Text style={[styles.mapTitle, { color: colors.foreground }]}>Your Location & Stores</Text>
              {stores.length > 0 && (
                <Text style={[styles.mapSubtitle, { color: colors.muted }]}>
                  {stores.length} store{stores.length !== 1 ? "s" : ""} monitored
                </Text>
              )}
            </View>
            {(locationGranted || userLocation) ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={initialRegion}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={false}
                onMapReady={() => setMapReady(true)}
                onRegionChangeComplete={() => {}}
              >
                {stores.map((store) => (
                  <Marker
                    key={store.id}
                    coordinate={{ latitude: store.lat, longitude: store.lng }}
                    title={store.name}
                    description={
                      userLocation
                        ? formatDistance(haversineMeters(userLocation.latitude, userLocation.longitude, store.lat, store.lng), distanceUnit) + " away"
                        : store.address || "Monitored store"
                    }
                    pinColor={colors.primary}
                  />
                ))}
                {stores.map((store) => (
                  <Circle
                    key={store.id + "_circle"}
                    center={{ latitude: store.lat, longitude: store.lng }}
                    radius={GEOFENCE_RADIUS}
                    strokeColor={colors.primary + "60"}
                    fillColor={colors.primary + "15"}
                    strokeWidth={1.5}
                  />
                ))}
              </MapView>
            ) : (
              <View style={[styles.mapPlaceholder, { backgroundColor: colors.surface }]}>
                <Text style={styles.mapPlaceholderEmoji}>📍</Text>
                <Text style={[styles.mapPlaceholderText, { color: colors.muted }]}>
                  Enable location to see your position on the map
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.mapFixBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => router.push("/(tabs)/settings" as never)}
                >
                  <Text style={styles.mapFixBtnText}>Enable Location</Text>
                </Pressable>
              </View>
            )}
            {stores.length === 0 && (locationGranted || userLocation) && (
              <View style={[styles.mapNostoreOverlay, { backgroundColor: colors.surface + "CC" }]}>
                <Text style={[styles.mapNostoreText, { color: colors.muted }]}>Add stores to see them on the map</Text>
                <Pressable
                  style={({ pressed }) => [styles.mapAddStoreBtn, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => router.push("/(tabs)/stores" as never)}
                >
                  <Text style={[styles.mapAddStoreBtnText, { color: colors.primary }]}>+ Add Store</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>Alert Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: geofencingActive ? colors.success : colors.muted }]} />
              <Text style={[styles.statusLabel, { color: colors.muted }]}>{geofencingActive ? "Geofencing On" : "Geofencing Off"}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: locationGranted ? colors.success : colors.warning }]} />
              <Text style={[styles.statusLabel, { color: colors.muted }]}>{locationGranted ? "Location: Always" : "Location: Limited"}</Text>
            </View>
          </View>
          {!locationGranted && (
            <Pressable
              style={({ pressed }) => [styles.fixButton, { backgroundColor: colors.warning, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/(tabs)/settings" as never)}
            >
              <Text style={styles.fixButtonText}>Fix Permissions →</Text>
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

        {/* Active Stores with real-time distance */}
        {stores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monitored Stores</Text>
              <Pressable onPress={() => router.push("/(tabs)/stores" as never)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Manage →</Text>
              </Pressable>
            </View>
            {stores.map((store) => {
              const distMeters = userLocation
                ? haversineMeters(userLocation.latitude, userLocation.longitude, store.lat, store.lng)
                : null;
              const distLabel = distMeters !== null ? formatDistance(distMeters, distanceUnit) : null;
              const isNearby = distMeters !== null && distMeters <= GEOFENCE_RADIUS;
              return (
                <View key={store.id} style={[styles.storeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.storeIconBg, { backgroundColor: colors.primary + "20" }]}>
                    <IconSymbol name="storefront.fill" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.storeInfo}>
                    <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{store.name}</Text>
                    {store.address ? (
                      <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>{store.address}</Text>
                    ) : null}
                  </View>
                  <View style={styles.storeRight}>
                    {distLabel ? (
                      <View style={[styles.distanceBadge, { backgroundColor: isNearby ? colors.success + "20" : colors.primary + "15" }]}>
                        <Text style={[styles.distanceText, { color: isNearby ? colors.success : colors.primary }]}>
                          {isNearby ? "🛖 Here!" : distLabel + " away"}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.activeIndicator, { backgroundColor: colors.success + "20" }]}>
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
              <Text style={[styles.moreItems, { color: colors.muted }]}>+{uncheckedItems.length - 5} more items</Text>
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
  mapCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  mapHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  mapTitle: { fontSize: 14, fontWeight: "600" },
  mapSubtitle: { fontSize: 12 },
  map: { width: "100%", height: 220 },
  mapPlaceholder: { height: 160, alignItems: "center", justifyContent: "center", gap: 10, padding: 20 },
  mapPlaceholderEmoji: { fontSize: 36 },
  mapPlaceholderText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  mapFixBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  mapFixBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  mapNostoreOverlay: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mapNostoreText: { fontSize: 13, flex: 1 },
  mapAddStoreBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 10 },
  mapAddStoreBtnText: { fontSize: 13, fontWeight: "600" },
  statusCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  statusTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  statusRow: { flexDirection: "row", gap: 16 },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12 },
  fixButton: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignSelf: "flex-start" },
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
  distanceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  distanceText: { fontSize: 12, fontWeight: "700" },
  activeIndicator: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeText: { fontSize: 11, fontWeight: "600" },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 10 },
  itemDot: { width: 6, height: 6, borderRadius: 3 },
  itemText: { fontSize: 14, flex: 1 },
  moreItems: { fontSize: 12, textAlign: "center", marginTop: 4 },
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
