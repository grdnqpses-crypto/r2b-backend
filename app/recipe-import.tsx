import React, { useState } from "react";
import {
  View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addShoppingItem, getShoppingItems } from "@/lib/storage";
import { parseItemInput } from "@/lib/parse-item";

// ─── Sample Recipes (for demo / offline use) ─────────────────────────────────
const SAMPLE_RECIPES = [
  {
    name: "Classic Spaghetti Bolognese",
    emoji: "🍝",
    ingredients: ["1 lb ground beef", "2 cans crushed tomatoes", "1 onion", "4 cloves garlic", "1 lb spaghetti", "olive oil", "salt", "black pepper", "fresh basil"],
  },
  {
    name: "Chicken Stir-Fry",
    emoji: "🍜",
    ingredients: ["2 chicken breasts", "2 cups broccoli florets", "1 red bell pepper", "2 carrots", "3 tbsp soy sauce", "1 tbsp sesame oil", "2 cloves garlic", "1 tsp ginger", "rice"],
  },
  {
    name: "Avocado Toast",
    emoji: "🥑",
    ingredients: ["2 avocados", "4 slices sourdough bread", "2 eggs", "lemon juice", "red pepper flakes", "salt", "olive oil"],
  },
  {
    name: "Banana Pancakes",
    emoji: "🥞",
    ingredients: ["2 ripe bananas", "2 eggs", "1 cup flour", "1 cup milk", "2 tsp baking powder", "1 tbsp sugar", "butter", "maple syrup"],
  },
  {
    name: "Greek Salad",
    emoji: "🥗",
    ingredients: ["2 cucumbers", "4 tomatoes", "1 red onion", "200g feta cheese", "kalamata olives", "olive oil", "dried oregano", "salt", "lemon juice"],
  },
];

export default function RecipeImportScreen() {
  const colors = useColors();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedIngredients, setParsedIngredients] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [recipeName, setRecipeName] = useState("");
  const [showSamples, setShowSamples] = useState(true);

  const handleParseURL = async () => {
    if (!url.trim()) {
      Alert.alert("Enter a URL", "Paste a recipe URL from AllRecipes, Food Network, or similar sites.");
      return;
    }
    setLoading(true);
    // Simulate URL parsing (in production, this would call a server-side recipe scraper)
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    Alert.alert(
      "Recipe Import",
      "URL-based recipe import requires a server connection. Try one of the sample recipes below to see how it works!",
      [{ text: "OK", onPress: () => setShowSamples(true) }]
    );
  };

  const handleSelectSample = (recipe: typeof SAMPLE_RECIPES[0]) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecipeName(recipe.name);
    setParsedIngredients(recipe.ingredients);
    setSelectedIngredients(new Set(recipe.ingredients));
    setShowSamples(false);
  };

  const toggleIngredient = (ingredient: string) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient)) next.delete(ingredient);
      else next.add(ingredient);
      return next;
    });
  };

  const handleAddToList = async () => {
    const toAdd = parsedIngredients.filter((i) => selectedIngredients.has(i));
    if (toAdd.length === 0) {
      Alert.alert("Nothing selected", "Select at least one ingredient to add.");
      return;
    }
    // Check for duplicates
    const existing = await getShoppingItems();
    const existingNames = new Set(existing.map((i) => i.text.toLowerCase()));
    const dupes = toAdd.filter((i) => {
      const parsed = parseItemInput(i);
      return existingNames.has(parsed.text.toLowerCase());
    });
    const newItems = toAdd.filter((i) => {
      const parsed = parseItemInput(i);
      return !existingNames.has(parsed.text.toLowerCase());
    });

    for (const ingredient of newItems) {
      const parsed = parseItemInput(ingredient);
      await addShoppingItem(parsed.text, {
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: parsed.category as any,
        note: `From: ${recipeName}`,
      });
    }

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const dupeMsg = dupes.length > 0 ? `\n\n${dupes.length} item(s) already on your list were skipped.` : "";
    Alert.alert(
      "Added to List!",
      `${newItems.length} ingredient(s) from "${recipeName}" added to your shopping list.${dupeMsg}`,
      [{ text: "Go to List", onPress: () => router.push("/(tabs)/list" as never) }, { text: "OK" }]
    );
    setParsedIngredients([]);
    setSelectedIngredients(new Set());
    setRecipeName("");
    setShowSamples(true);
    setUrl("");
  };

  const s = StyleSheet.create({
    urlRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    urlInput: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
    parseBtn: { height: 48, paddingHorizontal: 16, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    sampleCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 12 },
    sampleEmoji: { fontSize: 28 },
    sampleName: { fontSize: 15, fontWeight: "600" },
    sampleCount: { fontSize: 12, marginTop: 2 },
    ingredientRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 10 },
    ingredientText: { fontSize: 14, flex: 1 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: "center", alignItems: "center" },
    addBtn: { height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 16 },
  });

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 12 }]}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>Recipe Import</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 16 }}>
          Paste a recipe URL to automatically extract ingredients and add them to your shopping list.
        </Text>
        <View style={s.urlRow}>
          <TextInput
            style={[s.urlInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="https://www.allrecipes.com/recipe/..."
            placeholderTextColor={colors.muted}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleParseURL}
          />
          <Pressable
            style={({ pressed }) => [s.parseBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleParseURL}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Parse</Text>}
          </Pressable>
        </View>

        {showSamples && parsedIngredients.length === 0 && (
          <>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
              Try a Sample Recipe
            </Text>
            {SAMPLE_RECIPES.map((recipe) => (
              <Pressable
                key={recipe.name}
                style={({ pressed }) => [s.sampleCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleSelectSample(recipe)}
              >
                <Text style={s.sampleEmoji}>{recipe.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sampleName, { color: colors.foreground }]}>{recipe.name}</Text>
                  <Text style={[s.sampleCount, { color: colors.muted }]}>{recipe.ingredients.length} ingredients</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </>
        )}

        {parsedIngredients.length > 0 && (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{recipeName}</Text>
              <Pressable onPress={() => setSelectedIngredients(new Set(parsedIngredients))}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>Select All</Text>
              </Pressable>
            </View>
            {parsedIngredients.map((ingredient) => {
              const selected = selectedIngredients.has(ingredient);
              return (
                <Pressable
                  key={ingredient}
                  style={({ pressed }) => [
                    s.ingredientRow,
                    {
                      backgroundColor: selected ? colors.primary + "10" : colors.surface,
                      borderColor: selected ? colors.primary + "40" : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => toggleIngredient(ingredient)}
                >
                  <View style={[s.checkbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>
                    {selected && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text>}
                  </View>
                  <Text style={[s.ingredientText, { color: colors.foreground }]}>{ingredient}</Text>
                </Pressable>
              );
            })}
            <Pressable
              style={({ pressed }) => [s.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleAddToList}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Add {selectedIngredients.size} Ingredient{selectedIngredients.size !== 1 ? "s" : ""} to List
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [{ alignItems: "center", paddingVertical: 12, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { setParsedIngredients([]); setShowSamples(true); }}
            >
              <Text style={{ color: colors.muted, fontSize: 14 }}>Choose a different recipe</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
