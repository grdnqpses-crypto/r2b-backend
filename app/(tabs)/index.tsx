import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getShoppingItems,
  getSavedStores,
  getTier,
  type ShoppingItem,
  type SavedStore,
  type Tier,
} from "@/lib/storage";
import { isGeofencingActive, checkLocationPermissions } from "@/lib/geofence";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [stores, setStores] = useState<SavedStore[]>([]);
  const [tier, setTier] = useState<Tier>("free");
  const [geofencingActive, setGeofencingActive] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [itemsData, storesData, tierData, geofenceActive, locationPerms] =
      await Promise.all([
        getShoppingItems(),
        getSavedStores(),
        getTier(),
        isGeofencingActive(),
        checkLocationPermissions(),
      ]);
    setItems(itemsData);
    setStores(storesData);
    setTier(tierData);
    setGeofencingActive(geofenceActive);
    setLocationGranted(locationPerms.background);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.appTitle, { color: colors.primary }]}>Remember2Buy</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Never forget to buy something</Text>
          </View>
          {tier === "premium" && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.premium }]}>
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>Alert Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: geofencingActive ? colors.success : colors.muted }]} />
              <Text style={[styles.statusLabel, { color: colors.muted }]}>
                {geofencingActive ? "Geofencing On" : "Geofencing Off"}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: locationGranted ? colors.success : colors.warning }]} />
              <Text style={[styles.statusLabel, { color: colors.muted }]}>
                {locationGranted ? "Location: Always" : "Location: Limited"}
              </Text>
            </View>
          </View>
          {!locationGranted && (
            <Pressable
              style={({ pressed }) => [styles.fixButton, { backgroundColor: colors.warning, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push("/(tabs)/settings")}
            >
              <Text style={styles.fixButtonText}>Fix Permissions →</Text>
            </Pressable>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/list")}
          >
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{uncheckedItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Items to buy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/stores")}
          >
            <Text style={[styles.summaryNumber, { color: colors.primary }]}>{stores.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>{stores.length === 1 ? "Store" : "Stores"} tracked</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)/list")}
          >
            <Text style={[styles.summaryNumber, { color: colors.success }]}>{checkedItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Bought</Text>
          </Pressable>
        </View>

        {/* Active Stores */}
        {stores.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monitored Stores</Text>
            {stores.map((store) => (
              <View key={store.id} style={[styles.storeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.storeIconBg, { backgroundColor: colors.primary + "20" }]}>
                  <IconSymbol name="storefront.fill" size={18} color={colors.primary} />
                </View>
                <View style={styles.storeInfo}>
                  <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{store.name}</Text>
                  {store.address && (
                    <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>{store.address}</Text>
                  )}
                </View>
                <View style={[styles.activeIndicator, { backgroundColor: colors.success + "20" }]}>
                  <Text style={[styles.activeText, { color: colors.success }]}>Active</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Shopping List Preview */}
        {uncheckedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shopping List</Text>
              <Pressable onPress={() => router.push("/(tabs)/list")}>
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
                onPress={() => router.push("/(tabs)/stores")}
              >
                <Text style={styles.emptyButtonText}>Add a Store</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.emptyButtonOutline, { borderColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push("/(tabs)/list")}
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
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  seeAll: { fontSize: 13, fontWeight: "500" },
  storeRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 10 },
  storeIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: "600" },
  storeAddress: { fontSize: 11, marginTop: 1 },
  activeIndicator: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeText: { fontSize: 11, fontWeight: "600" },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 10 },
  itemDot: { width: 6, height: 6, borderRadius: 3 },
  itemText: { fontSize: 14, flex: 1 },
  moreItems: { fontSize: 12, textAlign: "center", marginTop: 4 },
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyActions: { gap: 10, width: "100%" },
  emptyButton: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  emptyButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptyButtonOutline: { paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 2 },
  emptyButtonOutlineText: { fontSize: 16, fontWeight: "600" },
  bottomPadding: { height: 20 },
});
