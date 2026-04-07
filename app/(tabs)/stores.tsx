import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { useSubscriptionContext } from "@/lib/subscription-context";

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
  category: string;
  address?: {
    shop?: string;
    amenity?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

async function searchStoresByName(query: string): Promise<NominatimResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=20&featuretype=shop,amenity`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Remember2Buy/1.0 (com.remember2buy.shopping)" },
  });
  if (!resp.ok) throw new Error("Search failed");
  const data: NominatimResult[] = await resp.json();
  // Filter to only shop/amenity/building results that look like stores
  return data.filter((r) =>
    r.category === "shop" ||
    r.category === "amenity" ||
    r.category === "building" ||
    r.type === "supermarket" ||
    r.type === "convenience" ||
    r.type === "pharmacy"
  );
}
import {
  getSavedStores, addSavedStore, deleteSavedStore, getTier,
  FREE_STORE_LIMIT, type SavedStore, type Tier,
  getStoreExtended, saveStoreExtended, toggleStoreFavorite, incrementStoreVisit,
  type StoreExtended,
} from "@/lib/storage";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { getNearbyStores, enrichStoreAddresses, formatDistance, getPersistedNearbyStores, type NearbyStore } from "@/lib/nearby-stores";
import { startGeofencing, stopGeofencing } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";

type Tab = "nearby" | "search" | "saved";

export default function StoresScreen() {
  const colors = useColors();
  const storeSubscription = useSubscriptionContext();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("nearby");
  const [savedStores, setSavedStores] = useState<SavedStore[]>([]);
  const [storeExtMap, setStoreExtMap] = useState<Record<string, StoreExtended>>({});
  const [selectedStore, setSelectedStore] = useState<SavedStore | null>(null);
  const [storeDetailVisible, setStoreDetailVisible] = useState(false);
  const [storeNotes, setStoreNotes] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeWebsite, setStoreWebsite] = useState("");
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [tier, setTierState] = useState<Tier>("free");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [sortByDistance, setSortByDistance] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<any>(null);
  // Track whether nearby stores have been loaded at least once
  const nearbyLoadedRef = useRef(false);
  // Recent searches (persisted in AsyncStorage)
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  // User location for distance badges in search results
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Report missing store modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportAddress, setReportAddress] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Load recent searches from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem("r2b_recent_searches").then((raw) => {
      if (raw) {
        try { setRecentSearches(JSON.parse(raw)); } catch {}
      }
    });
    // Get user location for distance badges in search results
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        Location.getLastKnownPositionAsync().then((pos) => {
          if (pos) setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }).catch(() => {});
      }
    });
  }, []);

  const saveRecentSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 5);
      AsyncStorage.setItem("r2b_recent_searches", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const loadSavedStores = useCallback(async () => {
    const [storesData, tierData] = await Promise.all([getSavedStores(), getTier()]);
    setSavedStores(storesData);
    setTierState(tierData);
    // Load extended info for all saved stores
    const map: Record<string, StoreExtended> = {};
    await Promise.all(storesData.map(async (s) => {
      const ext = await getStoreExtended(s.id);
      if (ext) map[s.id] = ext;
    }));
    setStoreExtMap(map);
  }, []);

  const handleToggleFavorite = async (storeId: string) => {
    await toggleStoreFavorite(storeId);
    const ext = await getStoreExtended(storeId);
    setStoreExtMap((prev) => ({ ...prev, [storeId]: ext ?? { storeId } }));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNavigateToStore = (store: SavedStore) => {
    const label = encodeURIComponent(store.name);
    const url = Platform.OS === "ios"
      ? `maps://?q=${label}&ll=${store.lat},${store.lng}`
      : `geo:${store.lat},${store.lng}?q=${label}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`);
    });
  };

  const handleOnMyWay = async (store: SavedStore) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await incrementStoreVisit(store.id);
    await loadSavedStores();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "\uD83D\uDED2 On My Way!",
        body: `Heading to ${store.name}. Your list is ready!`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
    }).catch(() => {});
    Alert.alert("On My Way!", `Your visit to ${store.name} has been logged. List is ready!`);
  };

  const handleOpenStoreDetail = (store: SavedStore) => {
    setSelectedStore(store);
    setStoreNotes(storeExtMap[store.id]?.notes ?? "");
    setStorePhone(storeExtMap[store.id]?.phone ?? "");
    setStoreWebsite(storeExtMap[store.id]?.website ?? "");
    setStoreDetailVisible(true);
  };

  const handleSaveStoreNotes = async () => {
    if (!selectedStore) return;
    const ext = storeExtMap[selectedStore.id] ?? { storeId: selectedStore.id };
    const updated = { ...ext, notes: storeNotes, phone: storePhone.trim() || undefined, website: storeWebsite.trim() || undefined };
    await saveStoreExtended(updated);
    setStoreExtMap((prev) => ({ ...prev, [selectedStore.id]: updated }));
    setStoreDetailVisible(false);
  };

  const loadNearbyStores = useCallback(async (showLoader = true) => {
    setLocationError(null);

    // ── INSTANT DISPLAY: show persisted results immediately while fresh data loads ──
    // This eliminates the blank screen on first open. The user sees stores within ~100ms.
    if (showLoader && nearbyStores.length === 0) {
      const persisted = await getPersistedNearbyStores();
      if (persisted && persisted.length > 0) {
        setNearbyStores(persisted);
        // Show a subtle spinner instead of a full loading screen since we have data
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(t("stores.permissionDenied"));
        return;
      }
      // Get location: use last-known immediately, race with fresh GPS (8s timeout)
      let location = await Location.getLastKnownPositionAsync().catch(() => null);
      try {
        const fresh = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Location timeout")), 8000)
          ),
        ]);
        location = fresh;
      } catch {
        // Use last known position if fresh GPS times out
        if (!location) throw new Error("Location unavailable");
      }
      const stores = await getNearbyStores(location.coords.latitude, location.coords.longitude);
      setNearbyStores([...stores]);
      // Enrich addresses in parallel batches — runs in background, updates UI when done
      enrichStoreAddresses(stores).then(() => {
        setNearbyStores([...stores]);
      }).catch(() => {});
    } catch (err: any) {
      if (err?.message?.includes("Overpass")) {
        setLocationError(t("stores.networkError"));
      } else {
        setLocationError(t("stores.locationError"));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, nearbyStores.length]);

  useFocusEffect(
    useCallback(() => {
      loadSavedStores();
      // Load nearby stores on first focus — use a ref so this doesn't re-trigger
      // every time nearbyStores state changes (which would cause an infinite loop)
      if (!nearbyLoadedRef.current) {
        nearbyLoadedRef.current = true;
        loadNearbyStores(true);
      }
    }, [loadSavedStores, loadNearbyStores])
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

  const handleSearchStores = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? searchQuery).trim();
    if (!q) return;
    if (overrideQuery) setSearchQuery(overrideQuery);
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await searchStoresByName(q);
      setSearchResults(results);
      if (results.length === 0) setSearchError("No stores found. Try a different name or add a city.");
      else await saveRecentSearch(q);
    } catch {
      setSearchError("Search failed. Please check your internet connection.");
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, saveRecentSearch]);

  const handleReportMissingStore = async () => {
    const name = reportName.trim();
    const address = reportAddress.trim();
    if (!name) { Alert.alert("Store name required", "Please enter the store name."); return; }
    if (!address) { Alert.alert("Address required", "Please enter the store address."); return; }
    setReportSubmitting(true);
    try {
      // Geocode the address using Nominatim
      const encoded = encodeURIComponent(`${name} ${address}`);
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
      const resp = await fetch(url, { headers: { "User-Agent": "Remember2Buy/1.0 (com.remember2buy.shopping)" } });
      const data = await resp.json();
      if (!data || data.length === 0) throw new Error("Could not find that address");
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (atLimit) { setShowPaywall(true); setShowReportModal(false); return; }
      await setupNotifications();
      const newStore = await addSavedStore({ name, address, lat, lng, category: "Store" });
      const allStores = [...savedStores, newStore];
      await startGeofencing(allStores);
      await loadSavedStores();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowReportModal(false);
      setReportName("");
      setReportAddress("");
      Alert.alert(t("stores.storeAdded"), t("stores.storeAddedMessage", { name }), [{ text: t("stores.gotIt") }]);
    } catch (err: any) {
      Alert.alert("Could not add store", err?.message ?? "Please check the address and try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleAddSearchResult = async (result: NominatimResult) => {
    if (atLimit) { setShowPaywall(true); return; }
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const alreadyAdded = savedStores.some(
      (s) => Math.abs(s.lat - lat) < 0.0001 && Math.abs(s.lng - lng) < 0.0001
    );
    if (alreadyAdded) {
      Alert.alert(t("stores.alreadyAdded"), `${result.name} ${t("stores.alreadyAddedMessage")}`);
      return;
    }
    const addr = result.address
      ? [
          result.address.road,
          result.address.city,
          result.address.state,
          result.address.postcode,
        ].filter(Boolean).join(", ")
      : result.display_name;
    setAddingId(String(result.place_id));
    try {
      await setupNotifications();
      const newStore = await addSavedStore({
        name: result.name || result.display_name.split(",")[0],
        address: addr,
        lat,
        lng,
        category: result.type || result.category || "Store",
      });
      const allStores = [...savedStores, newStore];
      await startGeofencing(allStores);
      await loadSavedStores();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t("stores.storeAdded"),
        t("stores.storeAddedMessage", { name: result.name || result.display_name.split(",")[0] }),
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
    .sort((a, b) => sortByDistance ? (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0) : a.name.localeCompare(b.name));

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

  const renderSavedStore = ({ item }: { item: SavedStore }) => {
    const ext = storeExtMap[item.id];
    const isFav = ext?.isFavorite ?? false;
    const visitCount = ext?.visitCount ?? 0;
    return (
      <Pressable
        style={({ pressed }) => [styles.storeCard, { backgroundColor: colors.surface, borderColor: isFav ? colors.warning : colors.border, opacity: pressed ? 0.95 : 1 }]}
        onPress={() => handleOpenStoreDetail(item)}
      >
        <View style={[styles.storeIcon, { backgroundColor: colors.success + "18" }]}>
          <IconSymbol name="storefront.fill" size={20} color={colors.success} />
        </View>
        <View style={styles.storeInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.storeName, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{item.name}</Text>
            {isFav && <Text style={{ fontSize: 14 }}>⭐</Text>}
          </View>
          {item.address ? (
            <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>{item.address}</Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            <View style={[styles.activeTag, { backgroundColor: colors.success + "18" }]}>
              <Text style={[styles.activeTagText, { color: colors.success }]}>{t("stores.monitoringActive")}</Text>
            </View>
            {visitCount > 0 && (
              <View style={[styles.activeTag, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.activeTagText, { color: colors.primary }]}>{visitCount} {visitCount === 1 ? "visit" : "visits"}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Pressable style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => handleToggleFavorite(item.id)}>
            <Text style={{ fontSize: 18 }}>{isFav ? "⭐" : "☆"}</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => handleNavigateToStore(item)}>
            <IconSymbol name="location.fill" size={18} color={colors.primary} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => handleOnMyWay(item)}>
            <IconSymbol name="cart.fill" size={18} color={colors.success} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => handleDeleteStore(item.id, item.name)}>
            <IconSymbol name="trash.fill" size={18} color={colors.error} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

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
            style={[styles.tab, activeTab === "search" && { backgroundColor: colors.primary }]}
            onPress={() => handleTabChange("search")}
          >
            <Text style={[styles.tabText, { color: activeTab === "search" ? "#fff" : colors.muted }]}>
              Search
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

        {/* Search Tab */}
        {activeTab === "search" && (
          <View style={{ flex: 1 }}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search any store by name or address…"
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchStores()}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => { setSearchQuery(""); setSearchResults([]); setSearchError(null); }}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.searchSubmitBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => handleSearchStores()}
            >
              {searchLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchSubmitText}>Find Store</Text>
              )}
            </Pressable>
            <Text style={[styles.searchHint, { color: colors.muted }]}>
              Powered by OpenStreetMap · Works for any store worldwide
            </Text>

            {/* Recent searches chips */}
            {recentSearches.length > 0 && searchResults.length === 0 && !searchLoading && (
              <View style={styles.recentRow}>
                <Text style={[styles.recentLabel, { color: colors.muted }]}>Recent:</Text>
                <View style={styles.recentChips}>
                  {recentSearches.map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.recentChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => handleSearchStores(s)}
                    >
                      <Text style={[styles.recentChipText, { color: colors.foreground }]} numberOfLines={1}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {searchError ? (
              <View style={styles.centered}>
                <Text style={styles.errorEmoji}>🔍</Text>
                <Text style={[styles.errorText, { color: colors.foreground }]}>{searchError}</Text>
                <Text style={[styles.errorDesc, { color: colors.muted }]}>Try adding a city name, e.g. "Walmart Chicago"</Text>
                {/* Report missing store button shown after failed search */}
                <Pressable
                  style={({ pressed }) => [styles.reportBtn, { backgroundColor: colors.warning + "20", borderColor: colors.warning + "50", opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => { setReportName(searchQuery.trim()); setShowReportModal(true); }}
                >
                  <Text style={[styles.reportBtnText, { color: colors.warning }]}>Can't find it? Add manually</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => String(item.place_id)}
                renderItem={({ item }) => {
                  const lat = parseFloat(item.lat);
                  const lng = parseFloat(item.lon);
                  const added = savedStores.some(
                    (s) => Math.abs(s.lat - lat) < 0.0001 && Math.abs(s.lng - lng) < 0.0001
                  );
                  const isAdding = addingId === String(item.place_id);
                  const addr = item.address
                    ? [item.address.road, item.address.city, item.address.state].filter(Boolean).join(", ")
                    : item.display_name;
                  // Calculate distance if user location is known
                  let distMeters: number | null = null;
                  if (userLocation) {
                    const dLat = (lat - userLocation.lat) * Math.PI / 180;
                    const dLng = (lng - userLocation.lng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
                    distMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  }
                  return (
                    <View style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={[styles.storeIcon, { backgroundColor: colors.primary + "18" }]}>
                        <IconSymbol name="storefront.fill" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.storeInfo}>
                        <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
                          {item.name || item.display_name.split(",")[0]}
                        </Text>
                        <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={2}>{addr}</Text>
                        {distMeters !== null && (
                          <View style={styles.storeMetaRow}>
                            <View style={[styles.distanceBadge, { backgroundColor: colors.primary + "15" }]}>
                              <IconSymbol name="location.fill" size={11} color={colors.primary} />
                              <Text style={[styles.distanceText, { color: colors.primary }]}>{formatDistance(distMeters)}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.addBtn,
                          { backgroundColor: added ? colors.success + "20" : colors.primary, opacity: pressed ? 0.8 : 1 },
                        ]}
                        onPress={() => !added && handleAddSearchResult(item)}
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
                }}
                contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListFooterComponent={
                  searchResults.length > 0 ? (
                    <Pressable
                      style={({ pressed }) => [styles.reportBtn, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40", marginTop: 16, opacity: pressed ? 0.8 : 1 }]}
                      onPress={() => setShowReportModal(true)}
                    >
                      <Text style={[styles.reportBtnText, { color: colors.warning }]}>Don't see the right location? Add manually</Text>
                    </Pressable>
                  ) : null
                }
                ListEmptyComponent={
                  searchResults.length === 0 && !searchLoading && !searchError ? (
                    <View style={styles.centered}>
                      <Text style={{ fontSize: 48 }}>🏪</Text>
                      <Text style={[styles.errorText, { color: colors.foreground }]}>Search for any store</Text>
                      <Text style={[styles.errorDesc, { color: colors.muted }]}>
                        Type a store name above and tap Find Store.{"\n"}Works for any store worldwide.
                      </Text>
                    </View>
                  ) : null
                }
              />
            )}
          </View>
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
          iapReady={storeSubscription.iapReady}
          iapFailed={storeSubscription.iapFailed}
          purchaseError={storeSubscription.error}
          onRetry={storeSubscription.retryConnect}
          onActivate={async (plan) => {
            try {
              if (plan === "annual") {
                await storeSubscription.purchaseAnnual();
              } else {
                await storeSubscription.purchase();
              }
              setTimeout(() => {
                setShowPaywall(false);
                loadSavedStores();
              }, 1500);
            } catch {
              setShowPaywall(false);
            }
          }}
          onDismiss={() => setShowPaywall(false)}
        />
      </Modal>

      {/* Store Detail Modal */}
      <Modal
        visible={storeDetailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStoreDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedStore?.name}</Text>
            {selectedStore?.address ? (
              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{selectedStore.address}</Text>
            ) : null}
            {/* Store Hours Display */}
            {selectedStore && storeExtMap[selectedStore.id]?.hours && Object.keys(storeExtMap[selectedStore.id]?.hours ?? {}).length > 0 && (
              <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, marginBottom: 6 }}>🕐 Store Hours</Text>
                {(() => {
                  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                  const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                  const hours = storeExtMap[selectedStore.id]?.hours ?? {};
                  return days.map((day) => (
                    hours[day] ? (
                      <View key={day} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ fontSize: 12, color: day === today ? colors.primary : colors.muted, fontWeight: day === today ? "700" : "400" }}>{day === today ? `${day} (today)` : day}</Text>
                        <Text style={{ fontSize: 12, color: day === today ? colors.primary : colors.foreground, fontWeight: day === today ? "700" : "400" }}>{hours[day]}</Text>
                      </View>
                    ) : null
                  ));
                })()}
              </View>
            )}
            {/* Phone & Website */}
            {selectedStore && (storeExtMap[selectedStore.id]?.phone || storeExtMap[selectedStore.id]?.website) && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {storeExtMap[selectedStore.id]?.phone && (
                  <Pressable
                    style={({ pressed }) => [{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => Linking.openURL(`tel:${storeExtMap[selectedStore.id]?.phone}`)}
                  >
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>📞 Call</Text>
                  </Pressable>
                )}
                {storeExtMap[selectedStore.id]?.website && (
                  <Pressable
                    style={({ pressed }) => [{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => Linking.openURL(storeExtMap[selectedStore.id]?.website ?? "")}
                  >
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>🌐 Website</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", opacity: pressed ? 0.85 : 1 }]}
                onPress={() => { if (selectedStore) { handleNavigateToStore(selectedStore); setStoreDetailVisible(false); } }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Navigate</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.success, alignItems: "center", opacity: pressed ? 0.85 : 1 }]}
                onPress={() => { if (selectedStore) { handleOnMyWay(selectedStore); setStoreDetailVisible(false); } }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>On My Way</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.warning + "30", alignItems: "center", opacity: pressed ? 0.85 : 1 }]}
                onPress={() => { if (selectedStore) { handleToggleFavorite(selectedStore.id); } }}
              >
                <Text style={{ color: colors.warning, fontWeight: "700", fontSize: 14 }}>{storeExtMap[selectedStore?.id ?? ""]?.isFavorite ? "Unfav" : "Favorite"}</Text>
              </Pressable>
            </View>
            <Text style={[{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 8 }]}>📞 Phone (optional)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="e.g. (555) 123-4567"
              placeholderTextColor={colors.muted}
              value={storePhone}
              onChangeText={setStorePhone}
              keyboardType="phone-pad"
            />
            <Text style={[{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 8 }]}>🌐 Website (optional)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="e.g. https://www.walmart.com"
              placeholderTextColor={colors.muted}
              value={storeWebsite}
              onChangeText={setStoreWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />
            <Text style={[{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 8 }]}>📝 Notes</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 80, textAlignVertical: "top" }]}
              placeholder="Add notes about this store (e.g. best parking, open 24h)..."
              placeholderTextColor={colors.muted}
              value={storeNotes}
              onChangeText={setStoreNotes}
              multiline
            />
            <Pressable
              style={({ pressed }) => [styles.modalSubmitBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSaveStoreNotes}
            >
              <Text style={styles.modalSubmitText}>Save Notes</Text>
            </Pressable>
            <Pressable style={styles.modalCancelBtn} onPress={() => setStoreDetailVisible(false)}>
              <Text style={[styles.modalCancelText, { color: colors.muted }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Report / Add Missing Store Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Store Manually</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              Can't find the store in search results? Enter the name and address below and we'll add it with geofencing.
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Store name (e.g. Bob's Hardware)"
              placeholderTextColor={colors.muted}
              value={reportName}
              onChangeText={setReportName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Address (e.g. 123 Main St, Chicago, IL)"
              placeholderTextColor={colors.muted}
              value={reportAddress}
              onChangeText={setReportAddress}
              returnKeyType="done"
              onSubmitEditing={handleReportMissingStore}
            />
            <Pressable
              style={({ pressed }) => [styles.modalSubmitBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleReportMissingStore}
              disabled={reportSubmitting}
            >
              {reportSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Add Store & Start Monitoring</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => { setShowReportModal(false); setReportName(""); setReportAddress(""); }}
            >
              <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
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
  iconBtn: { padding: 8 },
  centered: { alignItems: "center", paddingVertical: 48, gap: 10 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorEmoji: { fontSize: 48 },
  errorText: { fontSize: 18, fontWeight: "600" },
  errorDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  apiBusyTip: { marginTop: 16, marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  apiBusyTipText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  searchSubmitBtn: { paddingVertical: 13, borderRadius: 12, alignItems: "center", marginBottom: 6, marginTop: 4 },
  searchSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  searchHint: { fontSize: 11, textAlign: "center", marginBottom: 12 },
  // Recent searches
  recentRow: { marginBottom: 12 },
  recentLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  recentChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  recentChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  recentChipText: { fontSize: 13 },
  // Report missing store
  reportBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  reportBtnText: { fontSize: 14, fontWeight: "600" },
  // Report modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSubtitle: { fontSize: 13, lineHeight: 19 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalSubmitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalCancelBtn: { paddingVertical: 10, alignItems: "center" },
  modalCancelText: { fontSize: 15 },
});
