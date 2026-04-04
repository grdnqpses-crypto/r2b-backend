import { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getAllShoppingItems } from "@/lib/storage";

// CO2 estimates in kg per unit (approximate averages)
const CO2_PER_ITEM: Record<string, { co2: number; unit: string; swap?: string; swapCo2?: number }> = {
  // Meat & Dairy (high impact)
  beef: { co2: 27.0, unit: "kg", swap: "lentils", swapCo2: 0.9 },
  steak: { co2: 27.0, unit: "kg", swap: "mushrooms", swapCo2: 0.7 },
  lamb: { co2: 39.2, unit: "kg", swap: "chicken", swapCo2: 6.9 },
  pork: { co2: 12.1, unit: "kg", swap: "tofu", swapCo2: 3.0 },
  chicken: { co2: 6.9, unit: "kg", swap: "beans", swapCo2: 0.9 },
  turkey: { co2: 10.9, unit: "kg", swap: "chicken", swapCo2: 6.9 },
  fish: { co2: 6.1, unit: "kg", swap: "canned tuna", swapCo2: 3.5 },
  shrimp: { co2: 26.9, unit: "kg", swap: "canned fish", swapCo2: 3.5 },
  cheese: { co2: 13.5, unit: "kg", swap: "nutritional yeast", swapCo2: 1.0 },
  butter: { co2: 23.8, unit: "kg", swap: "olive oil", swapCo2: 6.0 },
  milk: { co2: 3.2, unit: "L", swap: "oat milk", swapCo2: 0.9 },
  eggs: { co2: 4.8, unit: "dozen", swap: "tofu", swapCo2: 3.0 },
  yogurt: { co2: 3.5, unit: "kg", swap: "plant-based yogurt", swapCo2: 1.2 },
  // Plant-based (low impact)
  rice: { co2: 4.0, unit: "kg" },
  bread: { co2: 1.3, unit: "kg" },
  pasta: { co2: 1.8, unit: "kg" },
  oats: { co2: 1.6, unit: "kg" },
  lentils: { co2: 0.9, unit: "kg" },
  beans: { co2: 0.9, unit: "kg" },
  tofu: { co2: 3.0, unit: "kg" },
  vegetables: { co2: 0.5, unit: "kg" },
  fruit: { co2: 0.5, unit: "kg" },
  apples: { co2: 0.4, unit: "kg" },
  bananas: { co2: 0.9, unit: "kg" },
  potatoes: { co2: 0.5, unit: "kg" },
  tomatoes: { co2: 2.1, unit: "kg" }, // greenhouse grown
  // Beverages
  coffee: { co2: 17.0, unit: "kg", swap: "tea", swapCo2: 0.4 },
  tea: { co2: 0.4, unit: "kg" },
  wine: { co2: 1.8, unit: "L" },
  beer: { co2: 0.9, unit: "L" },
  soda: { co2: 0.6, unit: "L", swap: "sparkling water", swapCo2: 0.2 },
  juice: { co2: 1.0, unit: "L" },
  // Packaged
  chips: { co2: 2.5, unit: "kg" },
  chocolate: { co2: 19.0, unit: "kg", swap: "fruit", swapCo2: 0.5 },
  cereal: { co2: 1.6, unit: "kg" },
  crackers: { co2: 1.8, unit: "kg" },
};

interface ItemFootprint {
  name: string;
  co2: number;
  unit: string;
  swap?: string;
  swapCo2?: number;
  savings?: number;
}

const RATINGS = [
  { max: 5, label: "🌱 Excellent", color: "#22C55E", desc: "Your basket has a very low carbon footprint. Great job!" },
  { max: 15, label: "🌿 Good", color: "#84CC16", desc: "Your basket is below average. A few swaps could make it even better." },
  { max: 30, label: "🌍 Average", color: "#F59E0B", desc: "Your basket is about average. Consider some plant-based swaps." },
  { max: 60, label: "⚠️ High", color: "#F97316", desc: "Your basket has a high carbon footprint. Reducing meat and dairy would help significantly." },
  { max: Infinity, label: "🔴 Very High", color: "#EF4444", desc: "Your basket has a very high carbon footprint. Major swaps recommended." },
];

export default function CarbonFootprintScreen() {
  const colors = useColors();
  const router = useRouter();
  const [footprints, setFootprints] = useState<ItemFootprint[]>([]);
  const [totalCo2, setTotalCo2] = useState(0);
  const [potentialSavings, setPotentialSavings] = useState(0);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const items = await getAllShoppingItems();
    const results: ItemFootprint[] = [];
    let total = 0;
    let savings = 0;

    for (const item of items) {
      const key = Object.keys(CO2_PER_ITEM).find((k) =>
        item.text.toLowerCase().includes(k)
      );
      if (key) {
        const data = CO2_PER_ITEM[key];
        const co2 = data.co2 * (item.quantity || 1);
        const itemSavings = data.swap ? co2 - (data.swapCo2! * (item.quantity || 1)) : 0;
        results.push({
          name: item.text,
          co2,
          unit: data.unit,
          swap: data.swap,
          swapCo2: data.swapCo2 ? data.swapCo2 * (item.quantity || 1) : undefined,
          savings: itemSavings > 0 ? itemSavings : undefined,
        });
        total += co2;
        savings += itemSavings;
      }
    }

    // Sort by CO2 descending
    results.sort((a, b) => b.co2 - a.co2);
    setFootprints(results);
    setTotalCo2(total);
    setPotentialSavings(savings);
  };

  const rating = RATINGS.find((r) => totalCo2 <= r.max) ?? RATINGS[RATINGS.length - 1];

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🌍 Carbon Footprint</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Your shopping basket's environmental impact</Text>
          </View>
        </View>

        {/* Total Score */}
        <View style={[styles.scoreCard, { backgroundColor: rating.color + "15", borderColor: rating.color + "40" }]}>
          <Text style={[styles.scoreLabel, { color: rating.color }]}>{rating.label}</Text>
          <Text style={[styles.scoreValue, { color: rating.color }]}>{totalCo2.toFixed(1)} kg CO₂</Text>
          <Text style={[styles.scoreDesc, { color: colors.foreground }]}>{rating.desc}</Text>
          {potentialSavings > 0 && (
            <View style={[styles.savingsBadge, { backgroundColor: colors.success + "20" }]}>
              <Text style={[styles.savingsText, { color: colors.success }]}>
                💡 Save {potentialSavings.toFixed(1)} kg CO₂ with smart swaps
              </Text>
            </View>
          )}
        </View>

        {/* Equivalent */}
        <View style={[styles.equivCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.equivTitle, { color: colors.foreground }]}>That's equivalent to...</Text>
          <View style={styles.equivRow}>
            <Text style={{ fontSize: 24 }}>🚗</Text>
            <Text style={[styles.equivText, { color: colors.foreground }]}>{(totalCo2 * 4.2).toFixed(0)} miles driven</Text>
          </View>
          <View style={styles.equivRow}>
            <Text style={{ fontSize: 24 }}>💡</Text>
            <Text style={[styles.equivText, { color: colors.foreground }]}>{(totalCo2 * 1.2).toFixed(0)} hours of electricity</Text>
          </View>
          <View style={styles.equivRow}>
            <Text style={{ fontSize: 24 }}>🌳</Text>
            <Text style={[styles.equivText, { color: colors.foreground }]}>{(totalCo2 / 21).toFixed(2)} trees needed to offset</Text>
          </View>
        </View>

        {/* Item Breakdown */}
        {footprints.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Item Breakdown</Text>
            {footprints.map((item, idx) => (
              <View key={idx} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemCo2, { color: item.co2 > 10 ? colors.error : item.co2 > 5 ? colors.warning : colors.success }]}>
                    {item.co2.toFixed(1)} kg CO₂
                  </Text>
                </View>
                {item.swap && (
                  <View style={[styles.swapRow, { backgroundColor: colors.success + "10" }]}>
                    <Text style={[styles.swapText, { color: colors.success }]}>
                      💚 Swap for {item.swap} → save {item.savings!.toFixed(1)} kg CO₂
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 48, textAlign: "center" }}>🛒</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Add items to your list</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              Add grocery items to your shopping list and we'll calculate the carbon footprint of your basket.
            </Text>
          </View>
        )}

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "20" }]}>
          <Text style={[styles.tipsTitle, { color: colors.primary }]}>🌱 Tips to Reduce Your Footprint</Text>
          {[
            "Choose plant-based proteins (beans, lentils, tofu) over beef and lamb",
            "Buy seasonal, local produce to reduce transportation emissions",
            "Choose oat or almond milk instead of dairy milk",
            "Reduce food waste — wasted food = wasted emissions",
            "Buy in bulk to reduce packaging waste",
          ].map((tip, idx) => (
            <Text key={idx} style={[styles.tipText, { color: colors.foreground }]}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8, marginBottom: 16 },
  scoreLabel: { fontSize: 20, fontWeight: "700" },
  scoreValue: { fontSize: 36, fontWeight: "800" },
  scoreDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  savingsBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  savingsText: { fontSize: 13, fontWeight: "600" },
  equivCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  equivTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  equivRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  equivText: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  itemCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 6 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 14, fontWeight: "600", flex: 1 },
  itemCo2: { fontSize: 13, fontWeight: "700" },
  swapRow: { borderRadius: 8, padding: 8 },
  swapText: { fontSize: 12, fontWeight: "600" },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 10, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  tipsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8, marginTop: 8 },
  tipsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 19 },
});
