import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, Platform, ActivityIndicator, TextInput, RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PremiumPaywall } from "@/components/premium-paywall";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getSavedStores, addSavedStore, deleteSavedStore, getTier,
  FREE_STORE_LIMIT, type SavedStore, type Tier,
} from "@/lib/storage";
import { getNearbyStores, enrichStoreAddresses, formatDistance, type NearbyStore } from "@/lib/nearby-stores";
import { startGeofencing, stopGeofencing } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";

type Tab = "nearby" | "saved";

export default function StoresScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("nearby");
  const [savedStores, setSavedStores] = useState<SavedStore[]>([]);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [tier, setTierState] = useState<Tier>("free");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [sortByDistance, setSortByDistance] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const loadSavedStores = useCallback(async () => {
    const [storesData, tierData] = await Promise.all([getSavedStores(), getTier()]);
    setSavedStores(storesData);
    setTierState(tierData);
  }, []);

  const loadNearbyStores = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(t("stores.permissionDenied"));
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const stores = await getNearbyStores(location.coords.latitude, location.coords.longitude);
      setNearbyStores([...stores]);
      setLoading(false);
      enrichStoreAddresses(stores).then(() => {
        setNearbyStores([...stores]);
      }).catch(() => {});
      return;
    } catch (err: any) {
      if (err?.message?.includes("Overpass")) {
        setLocationError(t("stores.networkError"));
      } else {
        setLocationError(t("stores.locationError"));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      setShowPaywall(true);
      return;
    }
    const alreadyAdded = savedStores.some(
      (s) => Math.abs(s.lat - nearby.lat) < 0.0001 && Math.abs(s.lng - nearby.lng) < 0.0001
    );
    if (alreadyAdded) {
      Alert.alert(t("stores.alreadyAdded"), `${nearby.name} ${t("stores.alreadyAddedMessage")}`);
      return;
    }

    setAddingId(nearby.id);
    try {
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
        t("stores.storeAdded"),
        t("stores.storeAddedMessage", { name: nearby.name }),
        [{ text: t("stores.gotIt") }]
      );
    } catch {
      Alert.alert(t("common.error"), t("common.retry"));
    } finally {
      setAddingId(null);
    }
  };

  const handleDeleteStore = (id: string, name: string) => {
    Alert.alert(t("stores.removeStore"), t("stores.removeStoreConfirm", { name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("stores.remove"),
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

  const filteredNearby = nearbyStores
    .filter((s) =>
      !searchText || s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.category.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => sortByDistance ? (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0) : 0);

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
            { backgroundColor: added ? colors.success + "20" : colors.primary, opacity: pressed ? 0.8 : 1 },
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
          <Text style={[styles.activeTagText, { color: colors.success }]}>{t("stores.monitoringActive")}</Text>
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t("stores.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {t("stores.monitoringCount", { count: savedStores.length, max: tier === "free" ? FREE_STORE_LIMIT : "∞" })}
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.tab, activeTab === "nearby" && { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange("nearby")}
          >
            <Text style={[styles.tabText, { color: activeTab === "nearby" ? "#fff" : colors.muted }]}>
              {t("stores.nearby")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "saved" && { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange("saved")}
          >
            <Text style={[styles.tabText, { color: activeTab === "saved" ? "#fff" : colors.muted }]}>
              {t("stores.myStores")} ({savedStores.length})
            </Text>
          </Pressable>
        </View>

        {/* Nearby Tab */}
        {activeTab === "nearby" && (
          <>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder={t("stores.filterStores")}
                placeholderTextColor={colors.muted}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
            </View>

            {/* Sort toggle */}
            <View style={styles.sortRow}>
              <Text style={[styles.sortLabel, { color: colors.muted }]}>{t("stores.sort")}:</Text>
              <Pressable
                style={[styles.sortBtn, sortByDistance && { backgroundColor: colors.primary }]}
                onPress={() => setSortByDistance(true)}
              >
                <Text style={[styles.sortBtnText, { color: sortByDistance ? "#fff" : colors.muted }]}>{t("stores.nearestFirst")}</Text>
              </Pressable>
              <Pressable
                style={[styles.sortBtn, !sortByDistance && { backgroundColor: colors.primary }]}
                onPress={() => setSortByDistance(false)}
              >
                <Text style={[styles.sortBtnText, { color: !sortByDistance ? "#fff" : colors.muted }]}>A–Z</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.centered}>
                <View style={{ alignItems: "center", paddingHorizontal: 32, gap: 16 }}>
                  <Text style={{ fontSize: 40 }}>🗺️</Text>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
                    {t("stores.findingStores")}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
                    {t("stores.findingStoresSub")}
                  </Text>
                  <View style={{ backgroundColor: colors.primary + "15", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.primary + "30" }}>
                    <Text style={{ fontSize: 13, color: colors.primary, textAlign: "center", lineHeight: 18 }}>
                      {t("stores.findingStoresTip")}
                    </Text>
                  </View>
                </View>
              </View>
            ) : locationError ? (
              <View style={styles.centered}>
                <Text style={styles.errorEmoji}>📍</Text>
                <Text style={[styles.errorText, { color: colors.foreground }]}>{t("stores.locationUnavailable")}</Text>
                <Text style={[styles.errorDesc, { color: colors.muted }]}>{locationError}</Text>
                <Pressable
                  style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => loadNearbyStores()}
                >
                  <Text style={styles.retryBtnText}>{t("common.tryAgain")}</Text>
                </Pressable>
                <View style={[styles.apiBusyTip, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "40" }]}>
                  <Text style={[styles.apiBusyTipText, { color: colors.warning }]}>
                    {t("stores.apiBusyTip")}
                  </Text>
                </View>
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
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                  <View style={styles.centered}>
                    <Text style={styles.errorEmoji}>🏪</Text>
                    <Text style={[styles.errorText, { color: colors.foreground }]}>{t("stores.noStoresFound")}</Text>
                    <Text style={[styles.errorDesc, { color: colors.muted }]}>{t("stores.noStoresFoundDesc")}</Text>
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
                <Text style={styles.errorEmoji}>📌</Text>
                <Text style={[styles.errorText, { color: colors.foreground }]}>{t("stores.noSavedStores")}</Text>
                <Text style={[styles.errorDesc, { color: colors.muted }]}>{t("stores.noSavedStoresSubtitle")}</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Premium Paywall Modal — shown when free store limit is reached */}
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywall(false)}
      >
        <PremiumPaywall
          reason="store-limit"
          onActivate={async (_family: boolean) => {
            setShowPaywall(false);
            await loadSavedStores();
          }}
          onDismiss={() => setShowPaywall(false)}
        />
      </Modal>
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
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  sortRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sortLabel: { fontSize: 13, fontWeight: "500", marginRight: 2 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: "transparent" },
  sortBtnText: { fontSize: 13, fontWeight: "600" },
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
  apiBusyTip: { marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  apiBusyTipText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
});
