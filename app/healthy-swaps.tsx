import { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList, TextInput, ScrollView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getAllShoppingItems, addShoppingItem, getShoppingLists, type ShoppingItem } from "@/lib/storage";

interface SwapSuggestion {
  original: string;
  swap: string;
  reason: string;
  calories?: string;
  savings?: string;
  emoji: string;
}

const SWAP_DATABASE: SwapSuggestion[] = [
  { original: "white bread", swap: "whole wheat bread", reason: "More fiber, lower glycemic index", calories: "Save ~20 cal/slice", emoji: "🍞" },
  { original: "white rice", swap: "brown rice", reason: "More fiber and nutrients", calories: "Save ~10 cal/cup", emoji: "🍚" },
  { original: "soda", swap: "sparkling water", reason: "Zero sugar, zero calories", calories: "Save ~140 cal/can", savings: "Save ~$1/can", emoji: "🥤" },
  { original: "whole milk", swap: "oat milk", reason: "Lower saturated fat, plant-based", calories: "Save ~50 cal/cup", emoji: "🥛" },
  { original: "butter", swap: "olive oil", reason: "Healthier unsaturated fats", calories: "Similar calories, better fats", emoji: "🫙" },
  { original: "potato chips", swap: "popcorn", reason: "More fiber, less fat", calories: "Save ~80 cal/oz", emoji: "🍿" },
  { original: "ground beef", swap: "ground turkey", reason: "Less saturated fat", calories: "Save ~60 cal/4oz", emoji: "🥩" },
  { original: "cream cheese", swap: "greek yogurt", reason: "More protein, less fat", calories: "Save ~70 cal/2oz", emoji: "🧀" },
  { original: "mayo", swap: "avocado", reason: "Healthier fats, more nutrients", calories: "Similar calories, better nutrition", emoji: "🥑" },
  { original: "sour cream", swap: "greek yogurt", reason: "More protein, less fat", calories: "Save ~40 cal/tbsp", emoji: "🥄" },
  { original: "white pasta", swap: "whole wheat pasta", reason: "More fiber, lower GI", calories: "Save ~15 cal/cup", emoji: "🍝" },
  { original: "ice cream", swap: "frozen yogurt", reason: "Less fat and calories", calories: "Save ~80 cal/cup", emoji: "🍦" },
  { original: "granola bars", swap: "mixed nuts", reason: "Less sugar, more protein", calories: "Similar calories, better nutrition", emoji: "🥜" },
  { original: "fruit juice", swap: "whole fruit", reason: "More fiber, less sugar spike", calories: "Save ~50 cal/serving", emoji: "🍊" },
  { original: "vegetable oil", swap: "avocado oil", reason: "Higher smoke point, healthier fats", calories: "Same calories, better fats", emoji: "🫙" },
  { original: "sugar", swap: "honey", reason: "Lower GI, trace minerals", calories: "Similar calories, sweeter", emoji: "🍯" },
  { original: "table salt", swap: "himalayan salt", reason: "Trace minerals, less processed", calories: "No difference", emoji: "🧂" },
  { original: "croutons", swap: "pumpkin seeds", reason: "More protein and healthy fats", calories: "Save ~30 cal/serving", emoji: "🎃" },
  { original: "flour tortillas", swap: "corn tortillas", reason: "Fewer calories, gluten-free option", calories: "Save ~50 cal each", emoji: "🫓" },
  { original: "bacon", swap: "turkey bacon", reason: "Less saturated fat", calories: "Save ~40 cal/slice", emoji: "🥓" },
  { original: "heavy cream", swap: "coconut milk", reason: "Plant-based, similar richness", calories: "Save ~100 cal/cup", emoji: "🥥" },
  { original: "ranch dressing", swap: "hummus", reason: "More protein and fiber", calories: "Save ~100 cal/2tbsp", emoji: "🫙" },
  { original: "ketchup", swap: "salsa", reason: "Less sugar, more vegetables", calories: "Save ~15 cal/tbsp", emoji: "🍅" },
  { original: "peanut butter", swap: "almond butter", reason: "More vitamin E and magnesium", calories: "Similar calories, better nutrients", emoji: "🥜" },
  { original: "white sugar", swap: "coconut sugar", reason: "Lower GI, trace minerals", calories: "Similar calories", emoji: "🍬" },
];

export default function HealthySwapsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [listItems, setListItems] = useState<ShoppingItem[]>([]);
  const [search, setSearch] = useState("");
  const [addedSwaps, setAddedSwaps] = useState<Set<string>>(new Set());

  const loadListItems = useCallback(async () => {
    const items = await getAllShoppingItems();
    setListItems(items.filter((i: ShoppingItem) => !i.checked));
  }, []);

  useFocusEffect(useCallback(() => { loadListItems(); }, [loadListItems]));

  // Find swaps for items currently on the shopping list
  const listSwaps = listItems
    .flatMap((item: ShoppingItem) =>
      SWAP_DATABASE.filter((s) =>
        item.text.toLowerCase().includes(s.original.toLowerCase()) ||
        s.original.toLowerCase().includes(item.text.toLowerCase().split(" ")[0])
      ).map((s) => ({ ...s, fromList: true }))
    )
    .filter((v, i, a) => a.findIndex((t) => t.original === v.original) === i);

  // Filter all swaps by search
  const searchResults = search.trim()
    ? SWAP_DATABASE.filter((s) =>
        s.original.toLowerCase().includes(search.toLowerCase()) ||
        s.swap.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const displaySwaps = search.trim() ? searchResults : listSwaps;

  const handleAddSwap = async (swap: SwapSuggestion) => {
    const lists = await getShoppingLists();
    const defaultList = lists[0];
    if (!defaultList) return;
    await addShoppingItem(swap.swap, { listId: defaultList.id, quantity: 1, category: "produce" });
    setAddedSwaps((prev) => new Set([...prev, swap.original]));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderSwap = ({ item }: { item: SwapSuggestion }) => {
    const isAdded = addedSwaps.has(item.original);
    return (
      <View style={[styles.swapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.swapHeader}>
          <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.swapRow}>
              <Text style={[styles.originalText, { color: colors.muted }]}>{item.original}</Text>
              <Text style={[styles.arrowText, { color: colors.primary }]}>→</Text>
              <Text style={[styles.swapText, { color: colors.success }]}>{item.swap}</Text>
            </View>
            <Text style={[styles.reasonText, { color: colors.muted }]}>{item.reason}</Text>
          </View>
        </View>
        <View style={styles.swapMeta}>
          {item.calories && (
            <View style={[styles.metaChip, { backgroundColor: colors.success + "15" }]}>
              <Text style={[styles.metaText, { color: colors.success }]}>🔥 {item.calories}</Text>
            </View>
          )}
          {item.savings && (
            <View style={[styles.metaChip, { backgroundColor: colors.warning + "15" }]}>
              <Text style={[styles.metaText, { color: colors.warning }]}>💰 {item.savings}</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.addSwapBtn, {
              backgroundColor: isAdded ? colors.success : colors.primary,
              opacity: pressed ? 0.85 : 1,
            }]}
            onPress={() => !isAdded && handleAddSwap(item)}
          >
            <Text style={styles.addSwapBtnText}>{isAdded ? "✓ Added" : "Add to List"}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🥗 Healthy Swaps</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Smarter choices for your shopping list</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search for a swap (e.g. soda, butter)"
            placeholderTextColor={colors.muted}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {!search && listSwaps.length > 0 && (
          <View style={[styles.sectionHeader, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.primary }]}>
              💡 {listSwaps.length} swap suggestion{listSwaps.length !== 1 ? "s" : ""} based on your current shopping list
            </Text>
          </View>
        )}

        {!search && listSwaps.length === 0 && (
          <View style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeaderText, { color: colors.muted }]}>
              Search above to find healthy swaps for any ingredient
            </Text>
          </View>
        )}

        <FlatList
          data={displaySwaps}
          keyExtractor={(item) => item.original}
          renderItem={renderSwap}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            search ? (
              <View style={styles.noResults}>
                <Text style={[styles.noResultsText, { color: colors.muted }]}>No swaps found for "{search}"</Text>
              </View>
            ) : null
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  sectionHeader: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 12 },
  sectionHeaderText: { fontSize: 13, fontWeight: "500" },
  swapCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  swapHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  swapRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  originalText: { fontSize: 14, textDecorationLine: "line-through" },
  arrowText: { fontSize: 14, fontWeight: "700" },
  swapText: { fontSize: 14, fontWeight: "700" },
  reasonText: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  swapMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 11, fontWeight: "600" },
  addSwapBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: "auto" },
  addSwapBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  noResults: { paddingTop: 40, alignItems: "center" },
  noResultsText: { fontSize: 14 },
});
