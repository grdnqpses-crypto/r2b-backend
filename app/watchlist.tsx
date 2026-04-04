import { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList, Alert, TextInput, Modal, Linking,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getWatchlist, addToWatchlist, removeFromWatchlist,
  type WatchlistItem,
} from "@/lib/storage";

const SMART_SAVINGS_LINKS = [
  { name: "Ibotta", icon: "💰", url: (q: string) => `https://ibotta.com/offers?search=${encodeURIComponent(q)}` },
  { name: "Flipp", icon: "📰", url: (q: string) => `https://flipp.com/search?q=${encodeURIComponent(q)}` },
  { name: "Google Shopping", icon: "🛍", url: (q: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}` },
  { name: "Fetch", icon: "🎁", url: (_q: string) => "https://fetch.com" },
  { name: "Honey", icon: "🍯", url: (q: string) => `https://www.joinhoney.com/search?q=${encodeURIComponent(q)}` },
];

export default function WatchlistScreen() {
  const colors = useColors();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newStore, setNewStore] = useState("");
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);

  const loadItems = useCallback(async () => {
    const data = await getWatchlist();
    setItems(data);
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    await addToWatchlist({
      itemText: newItem.trim(),
      targetPrice: newTarget ? parseFloat(newTarget) : undefined,
      storeName: newStore.trim() || undefined,
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewItem("");
    setNewTarget("");
    setNewStore("");
    setShowAdd(false);
    await loadItems();
  };

  const handleRemove = async (id: string) => {
    Alert.alert("Remove from Watchlist", "Stop watching this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await removeFromWatchlist(id);
          await loadItems();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: WatchlistItem }) => (
    <Pressable
      style={({ pressed }) => [styles.itemCard, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
      }]}
      onPress={() => setSelectedItem(item)}
    >
      <View style={[styles.watchIcon, { backgroundColor: colors.warning + "20" }]}>
        <Text style={{ fontSize: 22 }}>👁</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.itemText, { color: colors.foreground }]}>{item.itemText}</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {item.targetPrice && (
            <View style={[styles.chip, { backgroundColor: colors.success + "20" }]}>
              <Text style={[styles.chipText, { color: colors.success }]}>🎯 Target: ${item.targetPrice.toFixed(2)}</Text>
            </View>
          )}
          {item.storeName && (
            <View style={[styles.chip, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>🏪 {item.storeName}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.addedAt, { color: colors.muted }]}>
          Watching since {new Date(item.addedAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
        onPress={() => handleRemove(item.id)}
      >
        <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
      </Pressable>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>👁 Price Drop Watchlist</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Watch items, find deals when prices drop</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => setShowAdd(true)}
          >
            <IconSymbol name="plus" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
          <Text style={[styles.infoText, { color: colors.primary }]}>
            💡 Add items you want to buy when the price is right. Tap any item to search for deals across Ibotta, Flipp, Google Shopping, and more.
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 52 }}>👁</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing on your watchlist</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>Add items you want to buy when the price drops. We'll show you where to find the best deals.</Text>
            <Pressable
              style={({ pressed }) => [styles.emptyBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowAdd(true)}
            >
              <Text style={styles.emptyBtnText}>Watch Your First Item</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add Modal */}
        <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Watch an Item</Text>
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => setShowAdd(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Item Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={newItem}
                onChangeText={setNewItem}
                placeholder="e.g. Tide Pods, Chicken Breast"
                placeholderTextColor={colors.muted}
                autoFocus
              />
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Target Price (optional)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={newTarget}
                onChangeText={setNewTarget}
                placeholder="e.g. 3.99"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Store (optional)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={newStore}
                onChangeText={setNewStore}
                placeholder="e.g. Kroger, Walmart"
                placeholderTextColor={colors.muted}
              />
              <Pressable
                style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleAdd}
              >
                <Text style={styles.saveBtnText}>Add to Watchlist</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Deal Search Modal */}
        <Modal visible={!!selectedItem} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedItem(null)}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Find Deals</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>{selectedItem?.itemText}</Text>
              </View>
              <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => setSelectedItem(null)}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.dealDesc, { color: colors.muted }]}>
                Search for the best price on "{selectedItem?.itemText}" across these platforms:
              </Text>
              {SMART_SAVINGS_LINKS.map((link) => (
                <Pressable
                  key={link.name}
                  style={({ pressed }) => [styles.dealBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => Linking.openURL(link.url(selectedItem?.itemText ?? ""))}
                >
                  <Text style={{ fontSize: 24 }}>{link.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dealName, { color: colors.foreground }]}>{link.name}</Text>
                    <Text style={[styles.dealDesc2, { color: colors.muted }]}>Search for coupons & deals</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  infoText: { fontSize: 13, lineHeight: 19 },
  itemCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  watchIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 15, fontWeight: "600" },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: "600" },
  addedAt: { fontSize: 11 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", padding: 20, paddingBottom: 12, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalBody: { paddingHorizontal: 20, gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: -4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dealBtn: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  dealName: { fontSize: 15, fontWeight: "600" },
  dealDesc: { fontSize: 13, lineHeight: 19 },
  dealDesc2: { fontSize: 12, marginTop: 2 },
});
