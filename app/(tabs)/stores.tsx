import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, TextInput,
  StyleSheet, Alert, Platform, ActivityIndicator, Modal, ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getSavedStores, addSavedStore, deleteSavedStore, getTier,
  FREE_STORE_LIMIT, type SavedStore, type Tier,
} from "@/lib/storage";
import { STORE_CHAINS, type StoreChain } from "@/lib/store-data";
import { geocodeAddress, startGeofencing, stopGeofencing } from "@/lib/geofence";
import { setupNotifications } from "@/lib/notifications";

export default function StoresScreen() {
  const colors = useColors();
  const [stores, setStores] = useState<SavedStore[]>([]);
  const [tier, setTier] = useState<Tier>("free");
  const [searchText, setSearchText] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [chainSearch, setChainSearch] = useState("");

  const loadStores = useCallback(async () => {
    const [storesData, tierData] = await Promise.all([getSavedStores(), getTier()]);
    setStores(storesData);
    setTier(tierData);
  }, []);

  useFocusEffect(useCallback(() => { loadStores(); }, [loadStores]));

  const atLimit = tier === "free" && stores.length >= FREE_STORE_LIMIT;

  const handleAddCustom = async () => {
    const name = customName.trim();
    const address = customAddress.trim();
    if (!name || !address) {
      Alert.alert("Missing Info", "Please enter both a store name and address.");
      return;
    }
    if (atLimit) {
      Alert.alert("Free Limit Reached", `Free accounts can track up to ${FREE_STORE_LIMIT} stores. Upgrade to Premium for unlimited stores.`, [{ text: "OK" }]);
      return;
    }
    setLoading(true);
    try {
      const coords = await geocodeAddress(address);
      if (!coords) {
        Alert.alert("Address Not Found", "Could not find coordinates for that address. Please try a more specific address.");
        setLoading(false);
        return;
      }
      const newStore = await addSavedStore({ name, address, lat: coords.lat, lng: coords.lng });
      const allStores = [...stores, newStore];
      await startGeofencing(allStores);
      setCustomName("");
      setCustomAddress("");
      await loadStores();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Store Added!", `${name} is now being monitored. You'll get an alert when you're within 0.3 miles.`);
    } catch (err) {
      Alert.alert("Error", "Failed to add store. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChain = async (chain: StoreChain) => {
    setShowChainPicker(false);
    if (atLimit) {
      Alert.alert("Free Limit Reached", `Free accounts can track up to ${FREE_STORE_LIMIT} stores. Upgrade to Premium for unlimited stores.`, [{ text: "OK" }]);
      return;
    }
    setCustomName(chain.name);
    Alert.alert(
      `Add ${chain.name}`,
      "Enter the address of the specific location you want to monitor:",
      [{ text: "OK" }]
    );
  };

  const handleDeleteStore = async (id: string, name: string) => {
    Alert.alert("Remove Store", `Stop monitoring ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteSavedStore(id);
          const remaining = stores.filter((s) => s.id !== id);
          if (remaining.length > 0) {
            await startGeofencing(remaining);
          } else {
            await stopGeofencing();
          }
          await loadStores();
        },
      },
    ]);
  };

  const handleRequestPermissions = async () => {
    const granted = await setupNotifications();
    if (granted) {
      Alert.alert("Notifications Enabled", "You will receive alerts when near your stores.");
    } else {
      Alert.alert("Permission Denied", "Please enable notifications in Settings to receive store alerts.");
    }
  };

  const filteredChains = STORE_CHAINS.filter((c) =>
    c.name.toLowerCase().includes(chainSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(chainSearch.toLowerCase())
  );

  const renderStore = ({ item }: { item: SavedStore }) => (
    <View style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.storeIcon, { backgroundColor: colors.primary + "20" }]}>
        <IconSymbol name="storefront.fill" size={20} color={colors.primary} />
      </View>
      <View style={styles.storeInfo}>
        <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        {item.address && (
          <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>{item.address}</Text>
        )}
        <View style={[styles.activeTag, { backgroundColor: colors.success + "20" }]}>
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>My Stores</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {stores.length} of {tier === "free" ? FREE_STORE_LIMIT : "unlimited"} stores
          </Text>
        </View>

        {/* Add Store Form */}
        <View style={[styles.addCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Add a Store</Text>

          <Pressable
            style={({ pressed }) => [styles.chainPickerBtn, { borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setShowChainPicker(true)}
          >
            <IconSymbol name="storefront.fill" size={16} color={colors.primary} />
            <Text style={[styles.chainPickerText, { color: colors.primary }]}>Browse Popular Chains</Text>
            <IconSymbol name="chevron.right" size={14} color={colors.muted} />
          </Pressable>

          <View style={[styles.inputField, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Store name (e.g. Walmart)"
              placeholderTextColor={colors.muted}
              value={customName}
              onChangeText={setCustomName}
              returnKeyType="next"
            />
          </View>

          <View style={[styles.inputField, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Address (e.g. 123 Main St, City, State)"
              placeholderTextColor={colors.muted}
              value={customAddress}
              onChangeText={setCustomAddress}
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: atLimit ? colors.border : colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleAddCustom}
            disabled={atLimit || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add Store</Text>
              </>
            )}
          </Pressable>

          {atLimit && (
            <Text style={[styles.limitNote, { color: colors.premium }]}>
              Upgrade to Premium for unlimited stores
            </Text>
          )}
        </View>

        {/* Notification Permission */}
        <Pressable
          style={({ pressed }) => [styles.notifBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          onPress={handleRequestPermissions}
        >
          <IconSymbol name="bell.fill" size={16} color={colors.primary} />
          <Text style={[styles.notifBtnText, { color: colors.primary }]}>Enable Store Alerts</Text>
        </Pressable>

        {/* Stores List */}
        <Text style={[styles.listTitle, { color: colors.foreground }]}>
          {stores.length === 0 ? "No stores yet" : "Monitored Stores"}
        </Text>

        {stores.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{"\uD83C\uDFEA"}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Add a store above to start receiving location alerts.
            </Text>
          </View>
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => item.id}
            renderItem={renderStore}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>

      {/* Chain Picker Modal */}
      <Modal visible={showChainPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Popular Chains</Text>
            <Pressable onPress={() => setShowChainPicker(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <View style={[styles.modalSearch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Search chains..."
              placeholderTextColor={colors.muted}
              value={chainSearch}
              onChangeText={setChainSearch}
              autoFocus
            />
          </View>
          <ScrollView contentContainerStyle={styles.chainList}>
            {filteredChains.map((chain) => (
              <Pressable
                key={chain.id}
                style={({ pressed }) => [styles.chainRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleSelectChain(chain)}
              >
                <View style={styles.chainInfo}>
                  <Text style={[styles.chainName, { color: colors.foreground }]}>{chain.name}</Text>
                  <Text style={[styles.chainCategory, { color: colors.muted }]}>{chain.category}</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  addCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12, gap: 10 },
  sectionLabel: { fontSize: 15, fontWeight: "600" },
  chainPickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  chainPickerText: { flex: 1, fontSize: 14, fontWeight: "500" },
  inputField: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  input: { fontSize: 15, paddingVertical: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  limitNote: { fontSize: 12, textAlign: "center", fontWeight: "500" },
  notifBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  notifBtnText: { fontSize: 14, fontWeight: "600" },
  listTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  listContent: { paddingBottom: 20 },
  storeCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  storeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1, gap: 3 },
  storeName: { fontSize: 15, fontWeight: "600" },
  storeAddress: { fontSize: 12 },
  activeTag: { flexDirection: "row", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  activeTagText: { fontSize: 11, fontWeight: "600" },
  deleteBtn: { padding: 6 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalSearch: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, marginBottom: 12 },
  chainList: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  chainRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1 },
  chainInfo: { flex: 1 },
  chainName: { fontSize: 15, fontWeight: "600" },
  chainCategory: { fontSize: 12, marginTop: 1 },
});
