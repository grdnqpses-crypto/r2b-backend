import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, StyleSheet, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const PRICE_HISTORY_KEY = "r2b_price_history";

interface PriceEntry {
  id: string;
  itemName: string;
  price: number;
  store: string;
  date: number;
  unit?: string;
}

interface PriceBook {
  [itemName: string]: PriceEntry[];
}

export default function PriceHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [priceBook, setPriceBook] = useState<PriceBook>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStore, setNewStore] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [searchText, setSearchText] = useState("");

  const loadData = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PRICE_HISTORY_KEY);
    if (raw) setPriceBook(JSON.parse(raw));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveData = async (book: PriceBook) => {
    await AsyncStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(book));
    setPriceBook(book);
  };

  const handleAddEntry = async () => {
    const name = newItemName.trim();
    const price = parseFloat(newPrice);
    const store = newStore.trim();
    if (!name || isNaN(price) || price <= 0) {
      Alert.alert("Missing Info", "Please enter item name and a valid price.");
      return;
    }
    const entry: PriceEntry = {
      id: `pe_${Date.now()}`,
      itemName: name,
      price,
      store: store || "Unknown",
      date: Date.now(),
      unit: newUnit.trim() || undefined,
    };
    const book = { ...priceBook };
    if (!book[name]) book[name] = [];
    book[name] = [entry, ...book[name]].slice(0, 50); // Keep last 50 entries per item
    await saveData(book);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewItemName("");
    setNewPrice("");
    setNewStore("");
    setNewUnit("");
    setShowAddForm(false);
    setSelectedItem(name);
  };

  const handleDeleteEntry = async (itemName: string, entryId: string) => {
    const book = { ...priceBook };
    book[itemName] = book[itemName].filter((e) => e.id !== entryId);
    if (book[itemName].length === 0) {
      delete book[itemName];
      setSelectedItem(null);
    }
    await saveData(book);
  };

  const getLowestPrice = (entries: PriceEntry[]) => Math.min(...entries.map((e) => e.price));
  const getHighestPrice = (entries: PriceEntry[]) => Math.max(...entries.map((e) => e.price));
  const getLatestPrice = (entries: PriceEntry[]) => entries.sort((a, b) => b.date - a.date)[0]?.price ?? 0;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(2)}`;
  };

  const filteredItems = Object.keys(priceBook).filter((name) =>
    name.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedEntries = selectedItem ? (priceBook[selectedItem] ?? []).sort((a, b) => b.date - a.date) : [];

  const s = StyleSheet.create({
    searchBar: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginBottom: 12 },
    itemCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    priceTag: { fontSize: 18, fontWeight: "700" },
    storeName: { fontSize: 12, marginTop: 2 },
    entryRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
    miniChart: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 40, marginVertical: 12 },
    chartBar: { flex: 1, borderRadius: 3, minHeight: 4 },
    formInput: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14, marginBottom: 10 },
  });

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable onPress={() => selectedItem ? setSelectedItem(null) : router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 12 }]}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>
          {selectedItem ? selectedItem : "Price History"}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          style={({ pressed }) => [{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => { setShowAddForm(true); setSelectedItem(null); }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Add Form */}
        {showAddForm && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>Log a Price</Text>
            <TextInput style={[s.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} placeholder="Item name (e.g. Milk)" placeholderTextColor={colors.muted} value={newItemName} onChangeText={setNewItemName} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput style={[s.formInput, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} placeholder="Price ($)" placeholderTextColor={colors.muted} value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" />
              <TextInput style={[s.formInput, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} placeholder="Unit (oz, lb...)" placeholderTextColor={colors.muted} value={newUnit} onChangeText={setNewUnit} />
            </View>
            <TextInput style={[s.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} placeholder="Store name" placeholderTextColor={colors.muted} value={newStore} onChangeText={setNewStore} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={({ pressed }) => [{ flex: 1, height: 44, borderRadius: 10, backgroundColor: colors.border, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.8 : 1 }]} onPress={() => setShowAddForm(false)}>
                <Text style={{ color: colors.muted, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [{ flex: 2, height: 44, borderRadius: 10, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", opacity: pressed ? 0.8 : 1 }]} onPress={handleAddEntry}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save Price</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Item Detail View */}
        {selectedItem && (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: colors.success + "15", borderRadius: 12, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: colors.muted }}>Lowest</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.success }}>${getLowestPrice(selectedEntries).toFixed(2)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.primary + "15", borderRadius: 12, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: colors.muted }}>Latest</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.primary }}>${getLatestPrice(selectedEntries).toFixed(2)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.error + "15", borderRadius: 12, padding: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: colors.muted }}>Highest</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.error }}>${getHighestPrice(selectedEntries).toFixed(2)}</Text>
              </View>
            </View>

            {/* Mini Bar Chart */}
            {selectedEntries.length > 1 && (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>Price Trend (last {Math.min(selectedEntries.length, 10)} entries)</Text>
                <View style={s.miniChart}>
                  {selectedEntries.slice(0, 10).reverse().map((entry, i) => {
                    const maxP = getHighestPrice(selectedEntries);
                    const minP = getLowestPrice(selectedEntries);
                    const range = maxP - minP || 1;
                    const heightPct = ((entry.price - minP) / range) * 80 + 20;
                    const isLowest = entry.price === getLowestPrice(selectedEntries);
                    return (
                      <View key={entry.id} style={{ flex: 1, alignItems: "center" }}>
                        <View style={[s.chartBar, { height: heightPct, backgroundColor: isLowest ? colors.success : colors.primary + "80" }]} />
                        <Text style={{ fontSize: 8, color: colors.muted, marginTop: 2 }}>{formatDate(entry.date)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Entry List */}
            {selectedEntries.map((entry) => (
              <View key={entry.id} style={[s.entryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                    ${entry.price.toFixed(2)}{entry.unit ? ` / ${entry.unit}` : ""}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{entry.store} · {formatDate(entry.date)}</Text>
                </View>
                {entry.price === getLowestPrice(selectedEntries) && (
                  <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 8 }}>
                    <Text style={{ fontSize: 11, color: colors.success, fontWeight: "700" }}>BEST</Text>
                  </View>
                )}
                <Pressable onPress={() => handleDeleteEntry(selectedItem, entry.id)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 6 }]}>
                  <Text style={{ fontSize: 16, color: colors.error }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* Item List */}
        {!selectedItem && (
          <>
            <TextInput
              style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Search items..."
              placeholderTextColor={colors.muted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {filteredItems.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Text style={{ fontSize: 40 }}>📊</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: 12 }}>No Price History Yet</Text>
                <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6 }}>
                  Tap "+ Add" to start tracking prices and find the best deals.
                </Text>
              </View>
            ) : (
              filteredItems.map((itemName) => {
                const entries = priceBook[itemName];
                const latest = getLatestPrice(entries);
                const lowest = getLowestPrice(entries);
                const isAtLowest = latest === lowest;
                return (
                  <Pressable
                    key={itemName}
                    style={({ pressed }) => [s.itemCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                    onPress={() => setSelectedItem(itemName)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{itemName}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{entries.length} price record{entries.length !== 1 ? "s" : ""}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[s.priceTag, { color: isAtLowest ? colors.success : colors.foreground }]}>${latest.toFixed(2)}</Text>
                      {isAtLowest && <Text style={{ fontSize: 10, color: colors.success, fontWeight: "700" }}>BEST PRICE</Text>}
                    </View>
                    <IconSymbol name="chevron.right" size={16} color={colors.muted} style={{ marginLeft: 8 }} />
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
