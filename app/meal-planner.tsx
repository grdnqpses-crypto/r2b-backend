/**
 * AI Meal Planner Screen
 * Search recipes via TheMealDB, view ingredients, add to shopping list
 */
import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, TextInput, Modal, ScrollView, ActivityIndicator, Image,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getMealPlans, addMealPlan, deleteMealPlan, addShoppingItem, getTier, getAllShoppingItems,
  unlockAchievement,
  type MealPlan, type Tier,
} from "@/lib/storage";

interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  [key: string]: string | null;
}

interface Ingredient {
  text: string;
  measure: string;
}

function extractIngredients(meal: MealDBMeal): Ingredient[] {
  const ingredients: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({ text: ingredient.trim(), measure: (measure ?? "").trim() });
    }
  }
  return ingredients;
}

const MEAL_TYPES: MealPlan["mealType"][] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_EMOJIS: Record<MealPlan["mealType"], string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const SEASONAL_LISTS = [
  { name: "Thanksgiving Dinner", emoji: "🦃", items: ["Turkey", "Stuffing mix", "Cranberry sauce", "Sweet potatoes", "Green beans", "Butter", "Heavy cream", "Pie crust", "Pumpkin puree", "Pecans"] },
  { name: "Christmas Baking", emoji: "🎄", items: ["Flour", "Sugar", "Butter", "Eggs", "Vanilla extract", "Baking soda", "Chocolate chips", "Powdered sugar", "Food coloring", "Sprinkles"] },
  { name: "4th of July BBQ", emoji: "🎆", items: ["Ground beef", "Hot dogs", "Burger buns", "Hot dog buns", "Ketchup", "Mustard", "Relish", "Corn on the cob", "Watermelon", "Potato salad"] },
  { name: "Super Bowl Party", emoji: "🏈", items: ["Chicken wings", "Pizza dough", "Nachos", "Salsa", "Guacamole", "Sour cream", "Cheese dip", "Celery", "Ranch dressing", "Beer"] },
  { name: "Easter Brunch", emoji: "🐣", items: ["Eggs", "Ham", "Asparagus", "Cream cheese", "Bagels", "Smoked salmon", "Capers", "Orange juice", "Mimosa mix", "Hot cross buns"] },
  { name: "Summer Cookout", emoji: "☀️", items: ["Steaks", "Corn", "Zucchini", "Bell peppers", "Olive oil", "Garlic", "Lemon", "Ice cream", "Popsicles", "Lemonade"] },
];

export default function MealPlannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [tier, setTierState] = useState<Tier>("free");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MealDBMeal[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealDBMeal | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"search" | "plans" | "seasonal">("search");
  const [addingToList, setAddingToList] = useState(false);

  const loadData = useCallback(async () => {
    const [plans, tierData] = await Promise.all([getMealPlans(), getTier()]);
    setMealPlans(plans);
    setTierState(tierData);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data.meals ?? []);
    } catch {
      Alert.alert("Search Error", "Could not search recipes. Check your internet connection.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMeal = (meal: MealDBMeal) => {
    const ingredients = extractIngredients(meal);
    setSelectedMeal(meal);
    setSelectedIngredients(new Set(ingredients.map((i) => i.text)));
  };

  const handleAddToList = async () => {
    if (!selectedMeal) return;
    setAddingToList(true);
    try {
      const ingredients = extractIngredients(selectedMeal);
      const toAdd = ingredients.filter((i) => selectedIngredients.has(i.text));
      for (const ingredient of toAdd) {
        await addShoppingItem(ingredient.text, {
          note: ingredient.measure || undefined,
          category: "produce",
        });
      }
      // Save to meal plans
      await addMealPlan({
        date: new Date().toISOString().split("T")[0],
        mealType: "dinner",
        recipeName: selectedMeal.strMeal,
        recipeId: selectedMeal.idMeal,
        ingredients: toAdd.map((i) => ({ text: i.text, quantity: i.measure })),
      });
      await unlockAchievement("meal_planner");
      await loadData();
      setSelectedMeal(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Added!", `${toAdd.length} ingredients from "${selectedMeal.strMeal}" added to your shopping list.`);
    } catch {
      Alert.alert("Error", "Could not add ingredients. Please try again.");
    } finally {
      setAddingToList(false);
    }
  };

  const handleAddSeasonalList = async (list: typeof SEASONAL_LISTS[0]) => {
    Alert.alert(
      `Add ${list.name}`,
      `Add ${list.items.length} items to your shopping list?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Add All", onPress: async () => {
          for (const item of list.items) {
            await addShoppingItem(item, {});
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Added!", `${list.items.length} items added to your shopping list.`);
        }},
      ]
    );
  };

  const handleDeletePlan = (id: string, name: string) => {
    Alert.alert("Remove", `Remove "${name}" from meal plans?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        await deleteMealPlan(id);
        await loadData();
      }},
    ]);
  };

  const ingredients = selectedMeal ? extractIngredients(selectedMeal) : [];

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <IconSymbol name="arrow.left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>🍽️ Meal Planner</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {([
            { key: "search", label: "Recipes", emoji: "🔍" },
            { key: "plans", label: "My Plans", emoji: "📅" },
            { key: "seasonal", label: "Seasonal", emoji: "🌟" },
          ] as const).map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.muted }]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Search Tab */}
        {activeTab === "search" && (
          <View style={{ flex: 1 }}>
            <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search recipes (e.g. pasta, chicken, salad)"
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <Pressable
                style={({ pressed }) => [styles.searchBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleSearch}
                disabled={searching}
              >
                {searching ? <ActivityIndicator size="small" color="#fff" /> : <IconSymbol name="magnifyingglass" size={18} color="#fff" />}
              </Pressable>
            </View>

            {searchResults.length === 0 && !searching && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🍳</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Find a Recipe</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Search for any recipe and instantly add its ingredients to your shopping list</Text>
              </View>
            )}

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.idMeal}
              contentContainerStyle={{ paddingBottom: 80, gap: 10 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.recipeCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
                  onPress={() => handleSelectMeal(item)}
                >
                  <Image source={{ uri: item.strMealThumb + "/preview" }} style={styles.recipeThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recipeName, { color: colors.foreground }]}>{item.strMeal}</Text>
                    <Text style={[styles.recipeMeta, { color: colors.muted }]}>{item.strCategory} · {item.strArea}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={colors.muted} />
                </Pressable>
              )}
            />
          </View>
        )}

        {/* My Plans Tab */}
        {activeTab === "plans" && (
          <View style={{ flex: 1 }}>
            {mealPlans.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No meal plans yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Search for recipes and add them to your meal plan</Text>
              </View>
            ) : (
              <FlatList
                data={[...mealPlans].sort((a, b) => b.addedAt - a.addedAt)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 80, gap: 10 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planEmoji}>{MEAL_TYPE_EMOJIS[item.mealType]}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planName, { color: colors.foreground }]}>{item.recipeName}</Text>
                        <Text style={[styles.planMeta, { color: colors.muted }]}>
                          {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)} · {item.ingredients.length} ingredients
                        </Text>
                      </View>
                      <Pressable onPress={() => handleDeletePlan(item.id, item.recipeName)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                        <IconSymbol name="trash.fill" size={16} color={colors.error} />
                      </Pressable>
                    </View>
                    <View style={styles.ingredientsList}>
                      {item.ingredients.slice(0, 4).map((ing, idx) => (
                        <Text key={idx} style={[styles.ingredientChip, { backgroundColor: colors.primary + "15", color: colors.primary }]}>
                          {ing.text}
                        </Text>
                      ))}
                      {item.ingredients.length > 4 && (
                        <Text style={[styles.ingredientChip, { backgroundColor: colors.border, color: colors.muted }]}>
                          +{item.ingredients.length - 4} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* Seasonal Tab */}
        {activeTab === "seasonal" && (
          <FlatList
            data={SEASONAL_LISTS}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ paddingBottom: 80, gap: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.seasonalCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
                onPress={() => handleAddSeasonalList(item)}
              >
                <Text style={styles.seasonalEmoji}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.seasonalName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.seasonalItems, { color: colors.muted }]}>{item.items.length} items · Tap to add to list</Text>
                  <Text style={[styles.seasonalPreview, { color: colors.muted }]} numberOfLines={1}>
                    {item.items.slice(0, 4).join(", ")}...
                  </Text>
                </View>
                <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
              </Pressable>
            )}
          />
        )}
      </View>

      {/* Recipe Detail Modal */}
      <Modal visible={!!selectedMeal} animationType="slide" presentationStyle="pageSheet">
        {selectedMeal && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]} numberOfLines={2}>{selectedMeal.strMeal}</Text>
              <Pressable onPress={() => setSelectedMeal(null)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </Pressable>
            </View>
            <Image source={{ uri: selectedMeal.strMealThumb }} style={styles.recipeImage} />
            <Text style={[styles.recipeCategoryBadge, { color: colors.muted }]}>
              {selectedMeal.strCategory} · {selectedMeal.strArea}
            </Text>
            <Text style={[styles.ingredientsTitle, { color: colors.foreground }]}>
              Select ingredients to add ({selectedIngredients.size} selected):
            </Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
              {ingredients.map((ing) => {
                const selected = selectedIngredients.has(ing.text);
                return (
                  <Pressable
                    key={ing.text}
                    style={({ pressed }) => [
                      styles.ingredientRow,
                      { borderBottomColor: colors.border, backgroundColor: selected ? colors.primary + "10" : "transparent", opacity: pressed ? 0.8 : 1 }
                    ]}
                    onPress={() => {
                      const next = new Set(selectedIngredients);
                      if (selected) next.delete(ing.text);
                      else next.add(ing.text);
                      setSelectedIngredients(next);
                    }}
                  >
                    <View style={[styles.checkbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>
                      {selected && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text>}
                    </View>
                    <Text style={[styles.ingredientText, { color: colors.foreground }]}>{ing.text}</Text>
                    {ing.measure ? <Text style={[styles.ingredientMeasure, { color: colors.muted }]}>{ing.measure}</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable
                style={({ pressed }) => [styles.addToListBtn, { backgroundColor: selectedIngredients.size > 0 ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleAddToList}
                disabled={addingToList || selectedIngredients.size === 0}
              >
                {addingToList
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.addToListBtnText}>Add {selectedIngredients.size} Ingredients to List</Text>
                }
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  tabBar: { flexDirection: "row", borderRadius: 12, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  searchRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 6 },
  searchBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  recipeCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  recipeThumb: { width: 60, height: 60, borderRadius: 10 },
  recipeName: { fontSize: 15, fontWeight: "600" },
  recipeMeta: { fontSize: 12, marginTop: 2 },
  planCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  planEmoji: { fontSize: 24 },
  planName: { fontSize: 15, fontWeight: "600" },
  planMeta: { fontSize: 12, marginTop: 2 },
  ingredientsList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  ingredientChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12, fontWeight: "600" },
  seasonalCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  seasonalEmoji: { fontSize: 32 },
  seasonalName: { fontSize: 15, fontWeight: "700" },
  seasonalItems: { fontSize: 12, marginTop: 2 },
  seasonalPreview: { fontSize: 12, marginTop: 2 },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  recipeImage: { width: "100%", height: 200 },
  recipeCategoryBadge: { fontSize: 13, paddingHorizontal: 20, paddingVertical: 8 },
  ingredientsTitle: { fontSize: 15, fontWeight: "600", paddingHorizontal: 20, paddingBottom: 8 },
  ingredientRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  ingredientText: { flex: 1, fontSize: 15 },
  ingredientMeasure: { fontSize: 13 },
  modalFooter: { padding: 20, paddingBottom: 40 },
  addToListBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  addToListBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
