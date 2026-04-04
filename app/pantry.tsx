import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, Alert, Modal, ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getPantryItems, addPantryItem, updatePantryItem, deletePantryItem,
  addShoppingItem,
  type PantryItem, type ItemCategory,
} from "@/lib/storage";

const STOCK_LEVELS: Array<{ key: PantryItem["currentStock"]; label: string; color: string; emoji: string }> = [
  { key: "plenty", label: "Plenty", color: "#22C55E", emoji: "✅" },
  { key: "low", label: "Running Low", color: "#F59E0B", emoji: "⚠️" },
  { key: "out", label: "Out", color: "#EF4444", emoji: "❌" },
];

const CATEGORIES: ItemCategory[] = [
  "produce", "dairy", "meat", "bakery", "frozen",
  "beverages", "snacks", "household", "personal", "pharmacy", "other",
];

export default function PantryScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [filterStock, setFilterStock] = useState<PantryItem["currentStock"] | "all">("all");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ItemCategory>("other");
  const [newStock, setNewStock] = useState<PantryItem["currentStock"]>("plenty");
  const [newIsStaple, setNewIsStaple] = useState(false);
  const [newNotes, setNewNotes] = useState("");
  const [addingToList, setAddingToList] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const data = await getPantryItems();
    setItems(data);
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  const resetForm = () => {
    setNewName(""); setNewCategory("other"); setNewStock("plenty");
    setNewIsStaple(false); setNewNotes(""); setEditItem(null);
  };

  const handleSave = async () => {
    const name = newName.trim();
    if (!name) { Alert.alert("Item name required"); return; }
    if (editItem) {
      await updatePantryItem(editItem.id, {
        itemText: name, category: newCategory as ItemCategory, currentStock: newStock,
        isStaple: newIsStaple, notes: newNotes,
      });
    } else {
      await addPantryItem({
        itemText: name, category: newCategory as ItemCategory, currentStock: newStock,
        isStaple: newIsStaple, notes: newNotes,
      });
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadItems();
    resetForm();
    setShowAddModal(false);
  };

  const handleEdit = (item: PantryItem) => {
    setEditItem(item);
    setNewName(item.itemText);
    setNewCategory((item.category as ItemCategory) ?? "other");
    setNewStock(item.currentStock);
    setNewIsStaple(item.isStaple);
    setNewNotes(item.notes ?? "");
    setShowAddModal(true);
  };

  const handleDelete = (item: PantryItem) => {
    Alert.alert("Remove from Pantry", `Remove ${item.itemText}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => { await deletePantryItem(item.id); await loadItems(); },
      },
    ]);
  };

  const handleAddToShoppingList = async (item: PantryItem) => {
    setAddingToList(item.id);
    try {
      await addShoppingItem(item.itemText, {
        category: item.category,
        quantity: 1,
        unit: item.unit,
        note: item.notes,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Added!", `${item.itemText} added to your shopping list.`);
    } catch {
      Alert.alert("Error", "Could not add to list.");
    } finally {
      setAddingToList(null);
    }
  };

  const handleAddAllLow = async () => {
    const lowItems = items.filter((i) => i.currentStock === "low" || i.currentStock === "out");
    if (lowItems.length === 0) { Alert.alert("Nothing to add", "No low or out-of-stock items."); return; }
    await Promise.all(lowItems.map((item) =>
      addShoppingItem(item.itemText, { category: item.category, quantity: 1 })
    ));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Added!", `${lowItems.length} items added to your shopping list.`);
  };

  const filtered = filterStock === "all" ? items : items.filter((i) => i.currentStock === filterStock);
  const lowCount = items.filter((i) => i.currentStock === "low" || i.currentStock === "out").length;

  const renderItem = ({ item }: { item: PantryItem }) => {
    const stockInfo = STOCK_LEVELS.find((s) => s.key === item.currentStock)!;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.stockDot, { backgroundColor: stockInfo.color }]} />
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.foreground }]}>{item.itemText}</Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <Text style={[styles.tag, { color: stockInfo.color, backgroundColor: stockInfo.color + "18" }]}>
              {stockInfo.emoji} {stockInfo.label}
            </Text>
            {item.category && (
              <Text style={[styles.tag, { color: colors.muted, backgroundColor: colors.border }]}>{item.category}</Text>
            )}
            {item.isStaple && (
              <Text style={[styles.tag, { color: colors.primary, backgroundColor: colors.primary + "18" }]}>⭐ Staple</Text>
            )}
          </View>
          {item.notes ? <Text style={[styles.notes, { color: colors.muted }]}>{item.notes}</Text> : null}
        </View>
        <View style={{ gap: 4 }}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.primary + "18", opacity: pressed ? 0.6 : 1 }]}
            onPress={() => handleAddToShoppingList(item)}
            disabled={addingToList === item.id}
          >
            <IconSymbol name="cart.badge.plus" size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1 }]}
            onPress={() => handleEdit(item)}
          >
            <IconSymbol name="pencil" size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.error + "18", opacity: pressed ? 0.6 : 1 }]}
            onPress={() => handleDelete(item)}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🥫 Pantry Mode</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{items.length} items tracked</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Low stock alert */}
        {lowCount > 0 && (
          <Pressable
            style={[styles.alertBanner, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "40" }]}
            onPress={handleAddAllLow}
          >
            <Text style={[styles.alertText, { color: colors.warning }]}>
              ⚠️ {lowCount} item{lowCount !== 1 ? "s" : ""} low or out of stock — tap to add all to list
            </Text>
          </Pressable>
        )}

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {(["all", "plenty", "low", "out"] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterChip, filterStock === f && { backgroundColor: colors.primary }]}
              onPress={() => setFilterStock(f)}
            >
              <Text style={[styles.filterText, { color: filterStock === f ? "#fff" : colors.muted }]}>
                {f === "all" ? "All" : STOCK_LEVELS.find((s) => s.key === f)!.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🥫</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Pantry is empty</Text>
              <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                Track what you have at home. When you're running low, add to your shopping list with one tap.
              </Text>
            </View>
          }
        />
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editItem ? "Edit Item" : "Add to Pantry"}</Text>

            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Item name (e.g. Olive Oil)"
              placeholderTextColor={colors.muted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={[styles.label, { color: colors.muted }]}>Stock Level</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {STOCK_LEVELS.map((s) => (
                <Pressable
                  key={s.key}
                  style={[styles.stockBtn, { borderColor: s.color, backgroundColor: newStock === s.key ? s.color : "transparent" }]}
                  onPress={() => setNewStock(s.key)}
                >
                  <Text style={{ color: newStock === s.key ? "#fff" : s.color, fontSize: 12, fontWeight: "600" }}>
                    {s.emoji} {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.catChip, { borderColor: colors.border, backgroundColor: newCategory === c ? colors.primary : colors.surface }]}
                    onPress={() => setNewCategory(c)}
                  >
                    <Text style={{ color: newCategory === c ? "#fff" : colors.muted, fontSize: 12 }}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable
              style={[styles.stapleRow, { borderColor: colors.border }]}
              onPress={() => setNewIsStaple(!newIsStaple)}
            >
              <Text style={[styles.label, { color: colors.foreground, marginBottom: 0 }]}>⭐ Staple Item</Text>
              <View style={[styles.toggle, { backgroundColor: newIsStaple ? colors.primary : colors.border }]}>
                <View style={[styles.toggleKnob, { left: newIsStaple ? 18 : 2 }]} />
              </View>
            </Pressable>

            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              value={newNotes}
              onChangeText={setNewNotes}
            />

            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>{editItem ? "Save Changes" : "Add to Pantry"}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { resetForm(); setShowAddModal(false); }}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  alertBanner: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  alertText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  filterRow: { marginBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent", marginRight: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { paddingBottom: 24 },
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  stockDot: { width: 10, height: 10, borderRadius: 5 },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontWeight: "600" },
  tag: { fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  notes: { fontSize: 12, marginTop: 2 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  stockBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  stapleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  toggle: { width: 40, height: 24, borderRadius: 12, justifyContent: "center" },
  toggleKnob: { position: "absolute", width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelText: { fontSize: 15 },
});
