import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, TextInput,
  StyleSheet, Alert, Platform, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getShoppingItems, addShoppingItem, toggleShoppingItem,
  deleteShoppingItem, clearCheckedItems, getTier,
  FREE_ITEM_LIMIT, type ShoppingItem, type Tier,
} from "@/lib/storage";

export default function ListScreen() {
  const colors = useColors();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [tier, setTier] = useState<Tier>("free");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const loadItems = useCallback(async () => {
    const [itemsData, tierData] = await Promise.all([getShoppingItems(), getTier()]);
    setItems(itemsData);
    setTier(tierData);
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  const uncheckedCount = items.filter((i) => !i.checked).length;
  const atLimit = tier === "free" && uncheckedCount >= FREE_ITEM_LIMIT;

  const handleAdd = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (atLimit) {
      Alert.alert("Free Limit Reached", `Free accounts can track up to ${FREE_ITEM_LIMIT} items. Upgrade to Premium for unlimited items.`, [{ text: "OK" }]);
      return;
    }
    setLoading(true);
    await addShoppingItem(text);
    setInputText("");
    await loadItems();
    setLoading(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggle = async (id: string) => {
    await toggleShoppingItem(id);
    await loadItems();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDelete = async (id: string) => {
    await deleteShoppingItem(id);
    await loadItems();
  };

  const handleClearChecked = async () => {
    const checkedCount = items.filter((i) => i.checked).length;
    if (checkedCount === 0) return;
    Alert.alert("Clear Bought Items", `Remove ${checkedCount} checked item${checkedCount !== 1 ? "s" : ""}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => { await clearCheckedItems(); await loadItems(); } },
    ]);
  };

  const handleImportPhoto = async () => {
    if (tier !== "premium") {
      Alert.alert("Premium Feature", "Photo import is a Premium feature. Upgrade to import shopping lists from photos.", [{ text: "OK" }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setOcrLoading(true);
    try {
      Alert.alert("Photo Import", "OCR processing requires a server connection. Please add items manually.", [{ text: "OK" }]);
    } catch {
      Alert.alert("Error", "Failed to process image.");
    } finally {
      setOcrLoading(false);
    }
  };

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const allItems = [...unchecked, ...checked];

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        style={({ pressed }) => [styles.checkbox, {
          borderColor: item.checked ? colors.success : colors.border,
          backgroundColor: item.checked ? colors.success : "transparent",
          opacity: pressed ? 0.7 : 1,
        }]}
        onPress={() => handleToggle(item.id)}
      >
        {item.checked && <IconSymbol name="checkmark" size={14} color="#fff" />}
      </Pressable>
      <Text style={[styles.itemText, {
        color: item.checked ? colors.muted : colors.foreground,
        textDecorationLine: item.checked ? "line-through" : "none",
      }]} numberOfLines={2}>{item.text}</Text>
      <Pressable style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => handleDelete(item.id)}>
        <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>My List</Text>
          {checked.length > 0 && (
            <Pressable style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleClearChecked}>
              <Text style={[styles.clearBtnText, { color: colors.error }]}>Clear bought</Text>
            </Pressable>
          )}
        </View>

        {tier === "free" && (
          <View style={[styles.limitBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.limitText, { color: colors.muted }]}>{uncheckedCount}/{FREE_ITEM_LIMIT} items</Text>
            <View style={[styles.limitTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.limitFill, {
                backgroundColor: atLimit ? colors.error : colors.primary,
                width: `${Math.min((uncheckedCount / FREE_ITEM_LIMIT) * 100, 100)}%` as any,
              }]} />
            </View>
            <Text style={[styles.upgradeLink, { color: colors.premium }]}>Upgrade for unlimited</Text>
          </View>
        )}

        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Add an item..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            editable={!atLimit}
          />
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: atLimit ? colors.border : colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleAdd}
            disabled={atLimit || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <IconSymbol name="plus.circle.fill" size={22} color="#fff" />}
          </Pressable>
        </View>

        <View style={styles.importRow}>
          <Pressable
            style={({ pressed }) => [styles.importBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleImportPhoto}
          >
            {ocrLoading ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <>
                <IconSymbol name="plus.circle.fill" size={16} color={tier === "premium" ? colors.primary : colors.muted} />
                <Text style={[styles.importBtnText, { color: tier === "premium" ? colors.primary : colors.muted }]}>
                  Import Photo {tier !== "premium" ? "\uD83D\uDD12" : ""}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {allItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{"\uD83D\uDCDD"}</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No items yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Add items above to start your shopping list.</Text>
          </View>
        ) : (
          <FlatList
            data={allItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  clearBtnText: { fontSize: 13, fontWeight: "500" },
  limitBar: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10, gap: 8 },
  limitText: { fontSize: 12, minWidth: 50 },
  limitTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  limitFill: { height: 4, borderRadius: 2 },
  upgradeLink: { fontSize: 12, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  importRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  importBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  importBtnText: { fontSize: 13, fontWeight: "500" },
  listContent: { paddingBottom: 20 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, fontSize: 15, lineHeight: 20 },
  deleteBtn: { padding: 4 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
