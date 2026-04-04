import { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addShoppingItem, getShoppingLists } from "@/lib/storage";

interface SeasonalItem {
  name: string;
  emoji: string;
  tip: string;
  peak: boolean; // true = peak season (best quality + lowest price)
}

interface MonthData {
  produce: SeasonalItem[];
}

const SEASONAL_DATA: Record<number, MonthData> = {
  0: { // January
    produce: [
      { name: "Citrus fruits", emoji: "🍊", tip: "Peak season for oranges, grapefruits, and clementines", peak: true },
      { name: "Kale", emoji: "🥬", tip: "Cold-weather crop at its best", peak: true },
      { name: "Brussels sprouts", emoji: "🥦", tip: "Sweeter after frost", peak: true },
      { name: "Sweet potatoes", emoji: "🍠", tip: "Great storage crop, still fresh", peak: true },
      { name: "Pomegranates", emoji: "🍎", tip: "Late season, still available", peak: false },
      { name: "Turnips", emoji: "🫚", tip: "Root vegetables at peak", peak: true },
    ],
  },
  1: { // February
    produce: [
      { name: "Citrus fruits", emoji: "🍊", tip: "Still peak season", peak: true },
      { name: "Leeks", emoji: "🧅", tip: "Winter leeks are sweetest now", peak: true },
      { name: "Cauliflower", emoji: "🥦", tip: "Cool-weather crop", peak: true },
      { name: "Endive", emoji: "🥬", tip: "Belgian endive at peak", peak: true },
      { name: "Kiwi", emoji: "🥝", tip: "Southern hemisphere kiwis at peak", peak: true },
    ],
  },
  2: { // March
    produce: [
      { name: "Artichokes", emoji: "🌿", tip: "Spring artichokes just starting", peak: true },
      { name: "Asparagus", emoji: "🌱", tip: "First spring asparagus", peak: true },
      { name: "Spinach", emoji: "🥬", tip: "Spring spinach is tender and sweet", peak: true },
      { name: "Peas", emoji: "🫛", tip: "Early spring peas", peak: false },
      { name: "Radishes", emoji: "🔴", tip: "First spring radishes", peak: true },
    ],
  },
  3: { // April
    produce: [
      { name: "Asparagus", emoji: "🌱", tip: "Peak asparagus season", peak: true },
      { name: "Strawberries", emoji: "🍓", tip: "Early strawberries from warm regions", peak: false },
      { name: "Peas", emoji: "🫛", tip: "Spring peas at peak", peak: true },
      { name: "Rhubarb", emoji: "🌿", tip: "First rhubarb of the year", peak: true },
      { name: "Lettuce", emoji: "🥬", tip: "Spring lettuce is crisp and sweet", peak: true },
      { name: "Morel mushrooms", emoji: "🍄", tip: "Rare spring delicacy", peak: true },
    ],
  },
  4: { // May
    produce: [
      { name: "Strawberries", emoji: "🍓", tip: "Peak strawberry season begins", peak: true },
      { name: "Cherries", emoji: "🍒", tip: "Early cherries from California", peak: false },
      { name: "Asparagus", emoji: "🌱", tip: "Last of spring asparagus", peak: true },
      { name: "Artichokes", emoji: "🌿", tip: "Peak artichoke season", peak: true },
      { name: "Zucchini", emoji: "🥒", tip: "Early summer squash", peak: false },
    ],
  },
  5: { // June
    produce: [
      { name: "Strawberries", emoji: "🍓", tip: "Peak strawberry season", peak: true },
      { name: "Cherries", emoji: "🍒", tip: "Peak cherry season", peak: true },
      { name: "Blueberries", emoji: "🫐", tip: "Early blueberries", peak: false },
      { name: "Peaches", emoji: "🍑", tip: "Early peaches from Georgia", peak: false },
      { name: "Corn", emoji: "🌽", tip: "Early summer corn", peak: false },
      { name: "Tomatoes", emoji: "🍅", tip: "First summer tomatoes", peak: false },
      { name: "Zucchini", emoji: "🥒", tip: "Summer squash at peak", peak: true },
    ],
  },
  6: { // July
    produce: [
      { name: "Blueberries", emoji: "🫐", tip: "Peak blueberry season", peak: true },
      { name: "Peaches", emoji: "🍑", tip: "Peak peach season", peak: true },
      { name: "Corn", emoji: "🌽", tip: "Peak sweet corn season", peak: true },
      { name: "Tomatoes", emoji: "🍅", tip: "Peak heirloom tomato season", peak: true },
      { name: "Watermelon", emoji: "🍉", tip: "Peak watermelon season", peak: true },
      { name: "Cucumbers", emoji: "🥒", tip: "Peak cucumber season", peak: true },
      { name: "Blackberries", emoji: "🫐", tip: "Wild blackberries at peak", peak: true },
    ],
  },
  7: { // August
    produce: [
      { name: "Tomatoes", emoji: "🍅", tip: "Best tomatoes of the year", peak: true },
      { name: "Peaches", emoji: "🍑", tip: "Last of peak peach season", peak: true },
      { name: "Figs", emoji: "🫐", tip: "First fig harvest", peak: true },
      { name: "Eggplant", emoji: "🍆", tip: "Peak eggplant season", peak: true },
      { name: "Bell peppers", emoji: "🫑", tip: "Peak pepper season", peak: true },
      { name: "Cantaloupe", emoji: "🍈", tip: "Peak melon season", peak: true },
    ],
  },
  8: { // September
    produce: [
      { name: "Apples", emoji: "🍎", tip: "Apple harvest begins — best of the year", peak: true },
      { name: "Grapes", emoji: "🍇", tip: "Wine grape harvest season", peak: true },
      { name: "Pears", emoji: "🍐", tip: "Peak pear season", peak: true },
      { name: "Butternut squash", emoji: "🎃", tip: "Fall squash at peak", peak: true },
      { name: "Brussels sprouts", emoji: "🥦", tip: "First fall Brussels sprouts", peak: false },
      { name: "Cranberries", emoji: "🔴", tip: "Cranberry harvest begins", peak: true },
    ],
  },
  9: { // October
    produce: [
      { name: "Apples", emoji: "🍎", tip: "Peak apple season", peak: true },
      { name: "Pumpkins", emoji: "🎃", tip: "Peak pumpkin season", peak: true },
      { name: "Sweet potatoes", emoji: "🍠", tip: "Fresh harvest sweet potatoes", peak: true },
      { name: "Beets", emoji: "🔴", tip: "Fall beets at peak", peak: true },
      { name: "Cauliflower", emoji: "🥦", tip: "Fall cauliflower at peak", peak: true },
      { name: "Pomegranates", emoji: "🍎", tip: "Pomegranate season begins", peak: true },
    ],
  },
  10: { // November
    produce: [
      { name: "Cranberries", emoji: "🔴", tip: "Peak cranberry season", peak: true },
      { name: "Sweet potatoes", emoji: "🍠", tip: "Best sweet potatoes of the year", peak: true },
      { name: "Butternut squash", emoji: "🎃", tip: "Peak fall squash", peak: true },
      { name: "Persimmons", emoji: "🍊", tip: "Peak persimmon season", peak: true },
      { name: "Turnips", emoji: "🫚", tip: "Fall turnips at peak", peak: true },
      { name: "Parsnips", emoji: "🌿", tip: "Sweetened by frost", peak: true },
    ],
  },
  11: { // December
    produce: [
      { name: "Citrus fruits", emoji: "🍊", tip: "Clementines and oranges at peak", peak: true },
      { name: "Pomegranates", emoji: "🍎", tip: "Last of pomegranate season", peak: true },
      { name: "Persimmons", emoji: "🍊", tip: "Last of persimmon season", peak: true },
      { name: "Brussels sprouts", emoji: "🥦", tip: "Peak Brussels sprout season", peak: true },
      { name: "Kale", emoji: "🥬", tip: "Winter kale at its sweetest", peak: true },
    ],
  },
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function InSeasonScreen() {
  const colors = useColors();
  const router = useRouter();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const monthData = SEASONAL_DATA[selectedMonth];

  const handleAddToList = async (item: SeasonalItem) => {
    const lists = await getShoppingLists();
    const defaultList = lists[0];
    if (!defaultList) return;
    await addShoppingItem(item.name, { listId: defaultList.id, category: "produce" });
    setAddedItems((prev) => new Set([...prev, item.name]));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🌱 What's in Season</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Best quality & lowest prices right now</Text>
          </View>
        </View>

        {/* Month Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingRight: 16 }}>
            {MONTH_NAMES.map((month, idx) => (
              <Pressable
                key={month}
                style={({ pressed }) => [styles.monthChip, {
                  backgroundColor: selectedMonth === idx ? colors.primary : colors.surface,
                  borderColor: selectedMonth === idx ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                }]}
                onPress={() => setSelectedMonth(idx)}
              >
                <Text style={[styles.monthChipText, { color: selectedMonth === idx ? "#fff" : colors.muted }]}>
                  {month.slice(0, 3)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {MONTH_NAMES[selectedMonth]} Produce
          {selectedMonth === now.getMonth() ? " (This Month)" : ""}
        </Text>

        <FlatList
          data={monthData.produce}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => {
            const isAdded = addedItems.has(item.name);
            return (
              <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    {item.peak && (
                      <View style={[styles.peakBadge, { backgroundColor: colors.success + "20" }]}>
                        <Text style={[styles.peakText, { color: colors.success }]}>⭐ Peak</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.itemTip, { color: colors.muted }]}>{item.tip}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.addBtn, {
                    backgroundColor: isAdded ? colors.success : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                  onPress={() => !isAdded && handleAddToList(item)}
                >
                  <Text style={styles.addBtnText}>{isAdded ? "✓" : "+"}</Text>
                </Pressable>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
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
  monthChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  monthChipText: { fontSize: 13, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  itemCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemTip: { fontSize: 12, lineHeight: 17 },
  peakBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  peakText: { fontSize: 11, fontWeight: "700" },
  addBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
