import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, Platform, ActivityIndicator, TextInput, RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getSavedStores, addSavedStore, deleteSavedStore, getTier,
  FREE_STORE_LIMIT, type SavedStore, type Tier,
} from "@/lib/storage";
import { getNearbyStores, formatDistance, type NearbyStore } from "@/lib/nearby-stores";
import { startGeofencing, stopGeofencing } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";

type Tab = "nearby" | "saved";

export default function StoresScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>("nearby");
  const [savedStores, setSavedStores] = useState<SavedStore[]>([]);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadSavedStores = useCallback(async () => {
    const [storesData, tierData] = await Promise.all([getSavedStores(), getTier()]);
    setSavedStores(storesData);
    setTier(tierData);
  }, []);

  const loadNearbyStores = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location access is required to find nearby stores. Please enable it in Settings.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const stores = await getNearbyStores(location.coords.latitude, location.coords.longitude);
      setNearbyStores(stores);
    } catch (err: any) {
      if (err?.message?.includes("Overpass")) {
        setLocationError("Could not reach the store database. Please check your internet connection and try again.");
      } else {
        setLocationError("Could not get your location. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedStores();
      if (activeTab === "nearby" && nearbyStores.length === 0) {
        loadNearbyStores();
      }
    }, [loadSavedStores, loadNearbyStores, activeTab, nearbyStores.length])
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "nearby" && nearbyStores.length === 0 && !loading) {
      loadNearbyStores();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSavedStores(), loadNearbyStores(false)]);
    setRefreshing(false);
  };

  const atLimit = tier === "free" && savedStores.length >= FREE_STORE_LIMIT;

  const handleAddStore = async (nearby: NearbyStore) => {
    if (atLimit) {
      Alert.alert(
        "Free Limit Reached",
        `Free accounts can monitor up to ${FREE_STORE_LIMIT} store. Upgrade to Premium for unlimited stores.`,
        [{ text: "OK" }]
      );
      return;
    }
    // Check if already added
    const alreadyAdded = savedStores.some(
      (s) => Math.abs(s.lat - nearby.lat) < 0.0001 && Math.abs(s.lng - nearby.lng) < 0.0001
    );
    if (alreadyAdded) {
      Alert.alert("Already Added", `${nearby.name} is already in your monitored stores.`);
      return;
    }

    setAddingId(nearby.id);
    try {
      // Request notification permission if not yet granted
      await setupNotifications();

      const newStore = await addSavedStore({
        name: nearby.name,
        address: nearby.address || `${nearby.lat.toFixed(5)}, ${nearby.lng.toFixed(5)}`,
        lat: nearby.lat,
        lng: nearby.lng,
        category: nearby.category,
      });
      const allStores = [...savedStores, newStore];
      await startGeofencing(allStores);
      await loadSavedStores();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Store Added!",
        `${nearby.name} is now being monitored. You'll get an alert when you're within 0.3 miles.`,
        [{ text: "Got it" }]
      );
    } catch {
      Alert.alert("Error", "Failed to add store. Please try again.");
    } finally {
      setAddingId(null);
    }
  };

  const handleDeleteStore = (id: string, name: string) => {
    Alert.alert("Remove Store", `Stop monitoring ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteSavedStore(id);
          const remaining = savedStores.filter((s) => s.id !== id);
          if (remaining.length > 0) {
            await startGeofencing(remaining);
          } else {
            await stopGeofencing();
          }
          await loadSavedStores();
        },
      },
    ]);
  };

  const filteredNearby = nearbyStores.filter((s) =>
    !searchText || s.name.toLowerCase().includes(searchText.toLowerCase()) ||
    s.category.toLowerCase().includes(searchText.toLowerCase())
  );

  const isStoreAdded = (nearby: NearbyStore) =>
    savedStores.some((s) => Math.abs(s.lat - nearby.lat) < 0.0001 && Math.abs(s.lng - nearby.lng) < 0.0001);

  const renderNearbyStore = ({ item }: { item: NearbyStore }) => {
    const added = isStoreAdded(item);
    const isAdding = addingId === item.id;
    return (
      <View style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.storeIcon, { backgroundColor: colors.primary + "18" }]}>
          <IconSymbol name="storefront.fill" size={20} color={colors.primary} />
        </View>
        <View style={styles.storeInfo}>
          <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          {item.address ? (
            <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>{item.address}</Text>
          ) : null}
          <View style={styles.storeMetaRow}>
            <View style={[styles.distanceBadge, { backgroundColor: colors.primary + "15" }]}>
              <IconSymbol name="location.fill" size={11} color={colors.primary} />
              <Text style={[styles.distanceText, { color: colors.primary }]}>{formatDistance(item.distanceMeters)}</Text>
            </View>
            <Text style={[styles.categoryText, { color: colors.muted }]}>{item.category}</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: added ? colors.success + "20" : colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => !added && handleAddStore(item)}
          disabled={added || isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : added ? (
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
          ) : (
            <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    );
  };

  const renderSavedStore = ({ item }: { item: SavedStore }) => (
    <View style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.storeIcon, { backgroundColor: colors.success + "18" }]}>
        <IconSymbol name="storefront.fill" size={20} color={colors.success} />
      </View>
      <View style={styles.storeInfo}>
        <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        {item.address ? (
          <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>{item.address}</Text>
        ) : null}
        <View style={[styles.activeTag, { backgroundColor: colors.success + "18" }]}>
          <Text style={[styles.activeTagText, { color: colors.success }]}>Monitoring active</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
        onPress={() => handleDeleteStore(item.id, item.name)}
      >
        <IconSymbol name="trash.fill" size={18} color={colors.error} />
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Stores</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Monitoring {savedStores.length} of {tier === "free" ? FREE_STORE_LIMIT : "\u221E"} stores
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.tab, activeTab === "nearby" && { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange("nearby")}
          >
            <Text style={[styles.tabText, { color: activeTab === "nearby" ? "#fff" : colors.muted }]}>
              Nearby
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "saved" && { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange("saved")}
          >
            <Text style={[styles.tabText, { color: activeTab === "saved" ? "#fff" : colors.muted }]}>
              My Stores ({savedStores.length})
            </Text>
          </Pressable>
        </View>

        {/* Nearby Tab */}
        {activeTab === "nearby" && (
          <>
            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Filter stores..."
                placeholderTextColor={colors.muted}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
            </View>

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.muted }]}>Finding stores near you...</Text>
              </View>
            ) : locationError ? (
              <View style={styles.centered}>
                <Text style={styles.errorEmoji}>{"\uD83D\uDCCD"}</Text>
                <Text style={[styles.errorText, { color: colors.foreground }]}>Location Unavailable</Text>
                <Text style={[styles.errorDesc, { color: colors.muted }]}>{locationError}</Text>
                <Pressable
                  style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => loadNearbyStores()}
                >
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={filteredNearby}
                keyExtractor={(item) => item.id}
                renderItem={renderNearbyStore}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.centered}>
                    <Text style={styles.errorEmoji}>{"\uD83C\uDFEA"}</Text>
                    <Text style={[styles.errorText, { color: colors.foreground }]}>No stores found nearby</Text>
                    <Text style={[styles.errorDesc, { color: colors.muted }]}>
                      Pull down to refresh or try in a different area.
                    </Text>
                  </View>
                }
              />
            )}
          </>
        )}

        {/* Saved Tab */}
        {activeTab === "saved" && (
          <FlatList
            data={savedStores}
            keyExtractor={(item) => item.id}
            renderItem={renderSavedStore}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.errorEmoji}>{"\uD83D\uDCCC"}</Text>
                <Text style={[styles.errorText, { color: colors.foreground }]}>No stores added yet</Text>
                <Text style={[styles.errorDesc, { color: colors.muted }]}>
                  Switch to the Nearby tab to find and add stores.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  tabBar: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 3, marginBottom: 12, gap: 3 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  listContent: { paddingBottom: 24 },
  storeCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, gap: 12 },
  storeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1, gap: 3 },
  storeName: { fontSize: 15, fontWeight: "600" },
  storeAddress: { fontSize: 12 },
  storeMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  distanceBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  distanceText: { fontSize: 11, fontWeight: "600" },
  categoryText: { fontSize: 11 },
  activeTag: { flexDirection: "row", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeTagText: { fontSize: 11, fontWeight: "600" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  deleteBtn: { padding: 8 },
  centered: { alignItems: "center", paddingVertical: 48, gap: 10 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorEmoji: { fontSize: 48 },
  errorText: { fontSize: 18, fontWeight: "600" },
  errorDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
