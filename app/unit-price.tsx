import { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface Product {
  id: string;
  name: string;
  price: string;
  quantity: string;
  unit: string;
  pricePerUnit?: number;
}

const UNITS = ["oz", "lb", "g", "kg", "fl oz", "L", "ml", "count", "sheets", "loads"];

const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Brand A", price: "", quantity: "", unit: "oz" },
  { id: "2", name: "Brand B", price: "", quantity: "", unit: "oz" },
];

export default function UnitPriceScreen() {
  const colors = useColors();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [calculated, setCalculated] = useState(false);

  const addProduct = () => {
    const id = Date.now().toString();
    setProducts((prev) => [...prev, { id, name: `Brand ${String.fromCharCode(65 + prev.length)}`, price: "", quantity: "", unit: prev[0]?.unit ?? "oz" }]);
    setCalculated(false);
  };

  const removeProduct = (id: string) => {
    if (products.length <= 2) {
      Alert.alert("Need at least 2 products to compare");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCalculated(false);
  };

  const updateProduct = (id: string, field: keyof Product, value: string) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
    setCalculated(false);
  };

  const calculate = () => {
    const updated = products.map((p) => {
      const price = parseFloat(p.price);
      const qty = parseFloat(p.quantity);
      if (!isNaN(price) && !isNaN(qty) && qty > 0) {
        return { ...p, pricePerUnit: price / qty };
      }
      return { ...p, pricePerUnit: undefined };
    });
    setProducts(updated);
    setCalculated(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const reset = () => {
    setProducts(DEFAULT_PRODUCTS);
    setCalculated(false);
  };

  const validProducts = products.filter((p) => p.pricePerUnit !== undefined);
  const bestDeal = validProducts.length > 0
    ? validProducts.reduce((best, p) => (p.pricePerUnit! < best.pricePerUnit! ? p : best))
    : null;

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🧮 Unit Price Calculator</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Find the best deal per oz, lb, or unit</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.resetBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={reset}
          >
            <Text style={[styles.resetBtnText, { color: colors.muted }]}>Reset</Text>
          </Pressable>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
          <Text style={[styles.infoText, { color: colors.primary }]}>
            💡 Enter the price and size of each product to find which gives you the most for your money.
          </Text>
        </View>

        {/* Products */}
        {products.map((product, idx) => {
          const isBest = calculated && bestDeal?.id === product.id;
          const hasResult = calculated && product.pricePerUnit !== undefined;
          return (
            <View
              key={product.id}
              style={[styles.productCard, {
                backgroundColor: isBest ? colors.success + "10" : colors.surface,
                borderColor: isBest ? colors.success : colors.border,
                borderWidth: isBest ? 2 : 1,
              }]}
            >
              <View style={styles.productHeader}>
                <TextInput
                  style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
                  value={product.name}
                  onChangeText={(v) => updateProduct(product.id, "name", v)}
                  placeholder="Product name"
                  placeholderTextColor={colors.muted}
                />
                {isBest && (
                  <View style={[styles.bestBadge, { backgroundColor: colors.success }]}>
                    <Text style={styles.bestBadgeText}>🏆 Best Deal</Text>
                  </View>
                )}
                {products.length > 2 && (
                  <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => removeProduct(product.id)}>
                    <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                  </Pressable>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Price ($)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={product.price}
                    onChangeText={(v) => updateProduct(product.id, "price", v)}
                    placeholder="e.g. 3.99"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Size</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={product.quantity}
                    onChangeText={(v) => updateProduct(product.id, "quantity", v)}
                    placeholder="e.g. 32"
                    placeholderTextColor={colors.muted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {UNITS.map((unit) => (
                        <Pressable
                          key={unit}
                          style={({ pressed }) => [styles.unitChip, {
                            backgroundColor: product.unit === unit ? colors.primary : colors.background,
                            borderColor: product.unit === unit ? colors.primary : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          }]}
                          onPress={() => updateProduct(product.id, "unit", unit)}
                        >
                          <Text style={[styles.unitChipText, { color: product.unit === unit ? "#fff" : colors.muted }]}>{unit}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {hasResult && (
                <View style={[styles.resultRow, { backgroundColor: isBest ? colors.success + "15" : colors.primary + "10" }]}>
                  <Text style={[styles.resultText, { color: isBest ? colors.success : colors.primary }]}>
                    ${product.pricePerUnit!.toFixed(4)} per {product.unit}
                  </Text>
                  {isBest && <Text style={[styles.resultSub, { color: colors.success }]}>Cheapest option!</Text>}
                </View>
              )}
            </View>
          );
        })}

        {/* Add Product */}
        <Pressable
          style={({ pressed }) => [styles.addProductBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          onPress={addProduct}
        >
          <IconSymbol name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addProductText, { color: colors.primary }]}>Add Another Product</Text>
        </Pressable>

        {/* Calculate Button */}
        <Pressable
          style={({ pressed }) => [styles.calcBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={calculate}
        >
          <Text style={styles.calcBtnText}>Calculate Best Deal</Text>
        </Pressable>

        {/* Summary */}
        {calculated && bestDeal && (
          <View style={[styles.summaryCard, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}>
            <Text style={[styles.summaryTitle, { color: colors.success }]}>🏆 Best Value: {bestDeal.name}</Text>
            <Text style={[styles.summaryText, { color: colors.foreground }]}>
              At ${bestDeal.pricePerUnit!.toFixed(4)} per {bestDeal.unit}, {bestDeal.name} gives you the most for your money.
            </Text>
            {validProducts.length >= 2 && (() => {
              const worst = validProducts.reduce((w, p) => (p.pricePerUnit! > w.pricePerUnit! ? p : w));
              const savings = ((worst.pricePerUnit! - bestDeal.pricePerUnit!) / worst.pricePerUnit! * 100).toFixed(0);
              return (
                <Text style={[styles.savingsText, { color: colors.success }]}>
                  💰 {savings}% cheaper than {worst.name}
                </Text>
              );
            })()}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  resetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  resetBtnText: { fontSize: 13, fontWeight: "600" },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  infoText: { fontSize: 13, lineHeight: 19 },
  productCard: { borderRadius: 14, padding: 14, marginBottom: 12, gap: 10 },
  productHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, fontWeight: "600" },
  bestBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  bestBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  inputRow: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  unitChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  unitChipText: { fontSize: 11, fontWeight: "600" },
  resultRow: { borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  resultText: { fontSize: 15, fontWeight: "700" },
  resultSub: { fontSize: 12, fontWeight: "600" },
  addProductBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginBottom: 12, borderStyle: "dashed" },
  addProductText: { fontSize: 14, fontWeight: "600" },
  calcBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", marginBottom: 16 },
  calcBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  summaryTitle: { fontSize: 17, fontWeight: "700" },
  summaryText: { fontSize: 14, lineHeight: 20 },
  savingsText: { fontSize: 15, fontWeight: "700" },
});
