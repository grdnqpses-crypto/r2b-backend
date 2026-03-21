import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
}

const STORAGE_KEY = "@r2b_shopping_items";

export default function ListScreen() {
  const colors = useColors();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [isPremium] = useState(false); // Free tier: max 3 items

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) setItems(JSON.parse(v));
    });
  }, []);

  const save = async (updated: ShoppingItem[]) => {
    setItems(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    if (!isPremium && items.length >= 3) {
      Alert.alert(
        "Free Tier Limit",
        "Free accounts can store up to 3 items. Upgrade to Premium for unlimited items.",
        [{ text: "OK" }]
      );
      return;
    }
    const item: ShoppingItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      quantity: newQty.trim(),
      checked: false,
    };
    await save([...items, item]);
    setNewItem("");
    setNewQty("");
  };

  const toggleItem = async (id: string) => {
    await save(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const deleteItem = async (id: string) => {
    await save(items.filter((i) => i.id !== id));
  };

  const clearChecked = async () => {
    await save(items.filter((i) => !i.checked));
  };

  const pendingCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>My Shopping List</Text>
          <Text style={styles.headerSub}>{pendingCount} items remaining</Text>
        </View>

        {/* Add Item */}
        <View style={[styles.addCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Add Item</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, flex: 2 }]}
              placeholder="Item name..."
              placeholderTextColor={colors.muted}
              value={newItem}
              onChangeText={setNewItem}
              returnKeyType="done"
              onSubmitEditing={addItem}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, flex: 1 }]}
              placeholder="Qty"
              placeholderTextColor={colors.muted}
              value={newQty}
              onChangeText={setNewQty}
              returnKeyType="done"
              onSubmitEditing={addItem}
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={addItem}
          >
            <IconSymbol name="plus.circle.fill" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add to List</Text>
          </TouchableOpacity>
          {!isPremium && (
            <Text style={[styles.limitNote, { color: colors.muted }]}>
              Free: {items.length}/3 items used. Upgrade for unlimited.
            </Text>
          )}
        </View>

        {/* Items */}
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="list.bullet" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>Your list is empty</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>Add items above to get started</Text>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.listHeader}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Items</Text>
              {checkedCount > 0 && (
                <TouchableOpacity onPress={clearChecked}>
                  <Text style={[styles.clearBtn, { color: colors.error }]}>Clear checked</Text>
                </TouchableOpacity>
              )}
            </View>
            {items.map((item) => (
              <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => toggleItem(item.id)} style={styles.checkbox}>
                  <View style={[
                    styles.checkboxBox,
                    { borderColor: colors.primary },
                    item.checked && { backgroundColor: colors.primary }
                  ]}>
                    {item.checked && <IconSymbol name="checkmark" size={12} color="#fff" />}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.itemName,
                    { color: item.checked ? colors.muted : colors.foreground },
                    item.checked && styles.strikethrough
                  ]}>
                    {item.name}
                  </Text>
                  {item.quantity ? (
                    <Text style={[styles.itemQty, { color: colors.muted }]}>Qty: {item.quantity}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                  <IconSymbol name="trash.fill" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Premium Upsell */}
        {!isPremium && (
          <View style={[styles.premiumCard, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
            <IconSymbol name="crown.fill" size={24} color={colors.primary} />
            <Text style={[styles.premiumTitle, { color: colors.primary }]}>Upgrade to Premium</Text>
            <Text style={[styles.premiumSub, { color: colors.foreground }]}>
              Unlimited items, unlimited stores, full coupon access — just $1.99/week
            </Text>
            <TouchableOpacity style={[styles.premiumBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.premiumBtnText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  addCard: { margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, gap: 10 },
  sectionLabel: { fontSize: 15, fontWeight: "700" },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 12 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  limitNote: { fontSize: 12, textAlign: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "600" },
  emptySub: { fontSize: 14 },
  listCard: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  clearBtn: { fontSize: 13, fontWeight: "600" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  checkbox: { padding: 2 },
  checkboxBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 15, fontWeight: "500" },
  strikethrough: { textDecorationLine: "line-through" },
  itemQty: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  premiumCard: { margin: 16, borderRadius: 12, padding: 20, borderWidth: 1, alignItems: "center", gap: 8 },
  premiumTitle: { fontSize: 17, fontWeight: "800" },
  premiumSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  premiumBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  premiumBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
