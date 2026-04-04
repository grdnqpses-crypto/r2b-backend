import { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, TextInput, ScrollView, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type Unit = "oz" | "lb" | "g" | "kg" | "fl oz" | "L" | "mL" | "count" | "sq ft";
const UNITS: Unit[] = ["oz", "lb", "g", "kg", "fl oz", "L", "mL", "count", "sq ft"];

// Convert everything to a base unit for comparison
function toBaseUnit(value: number, unit: Unit): number {
  switch (unit) {
    case "oz": return value;
    case "lb": return value * 16;
    case "g": return value / 28.3495;
    case "kg": return value / 0.0283495;
    case "fl oz": return value;
    case "L": return value * 33.814;
    case "mL": return value / 29.5735;
    case "count": return value;
    case "sq ft": return value;
    default: return value;
  }
}

interface Product {
  id: string;
  name: string;
  price: string;
  quantity: string;
  unit: Unit;
}

export default function PriceCalculatorScreen() {
  const colors = useColors();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "Brand A", price: "", quantity: "", unit: "oz" },
    { id: "2", name: "Brand B", price: "", quantity: "", unit: "oz" },
  ]);

  const addProduct = () => {
    setProducts((prev) => [
      ...prev,
      { id: Date.now().toString(), name: `Brand ${String.fromCharCode(65 + prev.length)}`, price: "", quantity: "", unit: "oz" },
    ]);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeProduct = (id: string) => {
    if (products.length <= 2) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof Product, value: string) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };

  const getUnitPrice = (p: Product): number | null => {
    const price = parseFloat(p.price);
    const qty = parseFloat(p.quantity);
    if (isNaN(price) || isNaN(qty) || qty === 0) return null;
    const baseQty = toBaseUnit(qty, p.unit);
    return price / baseQty;
  };

  const results = products.map((p) => ({ ...p, unitPrice: getUnitPrice(p) }))
    .filter((p) => p.unitPrice !== null)
    .sort((a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0));

  const bestId = results[0]?.id;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🧮 Unit Price Calculator</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Find the best deal per unit</Text>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.infoText, { color: colors.primary }]}>
            💡 Enter price and quantity for each product to find the cheapest per oz/lb/unit. Great for comparing store brands vs name brands!
          </Text>
        </View>

        {/* Products */}
        {products.map((p, idx) => {
          const unitPrice = getUnitPrice(p);
          const isBest = results.length > 1 && p.id === bestId && unitPrice !== null;
          return (
            <View key={p.id} style={[styles.productCard, {
              backgroundColor: colors.surface,
              borderColor: isBest ? colors.success : colors.border,
              borderWidth: isBest ? 2 : 1,
            }]}>
              <View style={styles.productHeader}>
                <TextInput
                  style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                  value={p.name}
                  onChangeText={(v) => updateProduct(p.id, "name", v)}
                  placeholder={`Product ${idx + 1}`}
                  placeholderTextColor={colors.muted}
                />
                {isBest && (
                  <View style={[styles.bestBadge, { backgroundColor: colors.success }]}>
                    <Text style={styles.bestBadgeText}>BEST DEAL</Text>
                  </View>
                )}
                {products.length > 2 && (
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => removeProduct(p.id)}>
                    <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
                  </Pressable>
                )}
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>Price ($)</Text>
                  <TextInput
                    style={[styles.numInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={p.price}
                    onChangeText={(v) => updateProduct(p.id, "price", v)}
                    placeholder="0.00"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>Quantity</Text>
                  <TextInput
                    style={[styles.numInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={p.quantity}
                    onChangeText={(v) => updateProduct(p.id, "quantity", v)}
                    placeholder="0"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {UNITS.map((u) => (
                        <Pressable
                          key={u}
                          style={[styles.unitChip, {
                            backgroundColor: p.unit === u ? colors.primary : colors.border,
                          }]}
                          onPress={() => updateProduct(p.id, "unit", u)}
                        >
                          <Text style={{ color: p.unit === u ? "#fff" : colors.muted, fontSize: 11, fontWeight: "600" }}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              {unitPrice !== null && (
                <View style={[styles.resultRow, { backgroundColor: isBest ? colors.success + "15" : colors.primary + "10" }]}>
                  <Text style={[styles.resultText, { color: isBest ? colors.success : colors.primary }]}>
                    ${unitPrice.toFixed(4)} per {p.unit}
                    {isBest ? " ✓ Cheapest!" : ""}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <Pressable
          style={({ pressed }) => [styles.addBtn, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
          onPress={addProduct}
        >
          <IconSymbol name="plus" size={18} color={colors.primary} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Another Product</Text>
        </Pressable>

        {/* Summary */}
        {results.length >= 2 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>📊 Comparison</Text>
            {results.map((r, idx) => (
              <View key={r.id} style={styles.summaryRow}>
                <Text style={[styles.summaryRank, { color: idx === 0 ? colors.success : colors.muted }]}>#{idx + 1}</Text>
                <Text style={[styles.summaryName, { color: colors.foreground }]}>{r.name}</Text>
                <Text style={[styles.summaryPrice, { color: idx === 0 ? colors.success : colors.muted }]}>
                  ${r.unitPrice!.toFixed(4)}/{r.unit}
                </Text>
              </View>
            ))}
            {results.length >= 2 && results[0].unitPrice && results[results.length - 1].unitPrice && (
              <View style={[styles.savingsRow, { backgroundColor: colors.success + "15" }]}>
                <Text style={[styles.savingsText, { color: colors.success }]}>
                  💰 You save {(((results[results.length - 1].unitPrice! - results[0].unitPrice!) / results[results.length - 1].unitPrice!) * 100).toFixed(1)}% by choosing {results[0].name}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 12, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  infoText: { fontSize: 13, lineHeight: 19 },
  productCard: { borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  productHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, fontWeight: "600" },
  bestBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  bestBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  inputRow: { gap: 8 },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 11, fontWeight: "600", marginLeft: 2 },
  numInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  resultRow: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  resultText: { fontSize: 14, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, paddingVertical: 12, marginBottom: 16 },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryRank: { fontSize: 16, fontWeight: "800", width: 28 },
  summaryName: { flex: 1, fontSize: 14 },
  summaryPrice: { fontSize: 14, fontWeight: "600" },
  savingsRow: { borderRadius: 8, padding: 10, marginTop: 4 },
  savingsText: { fontSize: 13, fontWeight: "600" },
});
