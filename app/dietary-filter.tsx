import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, Switch, Alert, StyleSheet, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getShoppingItems, updateShoppingItem, type ShoppingItem } from "@/lib/storage";

// ─── Dietary Profiles ─────────────────────────────────────────────────────────
const DIETARY_PROFILES = [
  { id: "vegan", label: "Vegan", emoji: "🌱", description: "No animal products", keywords: ["meat", "chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp", "milk", "cheese", "butter", "cream", "egg", "honey", "gelatin", "lard"] },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥗", description: "No meat or fish", keywords: ["meat", "chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp", "bacon", "ham", "turkey", "lamb", "sausage"] },
  { id: "gluten_free", label: "Gluten-Free", emoji: "🌾", description: "No wheat, barley, rye", keywords: ["bread", "pasta", "flour", "wheat", "barley", "rye", "cereal", "crackers", "cookies", "cake", "muffin", "bagel", "pretzel", "soy sauce"] },
  { id: "dairy_free", label: "Dairy-Free", emoji: "🥛", description: "No milk or dairy", keywords: ["milk", "cheese", "butter", "cream", "yogurt", "ice cream", "whey", "casein", "lactose"] },
  { id: "keto", label: "Keto", emoji: "🥑", description: "Low carb, high fat", keywords: ["bread", "pasta", "rice", "potato", "sugar", "corn", "oats", "cereal", "juice", "soda", "candy", "cake", "cookie", "chips"] },
  { id: "paleo", label: "Paleo", emoji: "🦴", description: "No processed foods, grains, legumes", keywords: ["bread", "pasta", "rice", "beans", "lentils", "peanut", "dairy", "sugar", "soda", "candy", "chips", "cereal"] },
  { id: "low_sodium", label: "Low Sodium", emoji: "🧂", description: "Limit high-salt foods", keywords: ["salt", "soy sauce", "pickle", "canned soup", "deli meat", "hot dog", "bacon", "chips", "pretzels", "olives"] },
  { id: "nut_free", label: "Nut-Free", emoji: "🚫", description: "No tree nuts or peanuts", keywords: ["peanut", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut", "nut butter"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flagItem(item: ShoppingItem, activeProfiles: string[]): { flagged: boolean; reason: string } {
  const name = item.text.toLowerCase();
  for (const profileId of activeProfiles) {
    const profile = DIETARY_PROFILES.find((p) => p.id === profileId);
    if (!profile) continue;
    for (const kw of profile.keywords) {
      if (name.includes(kw)) {
        return { flagged: true, reason: `${profile.emoji} Not ${profile.label}` };
      }
    }
  }
  return { flagged: false, reason: "" };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DietaryFilterScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeProfiles, setActiveProfiles] = useState<string[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [flaggedItems, setFlaggedItems] = useState<{ item: ShoppingItem; reason: string }[]>([]);

  const loadItems = useCallback(async () => {
    const all = await getShoppingItems();
    setItems(all.filter((i) => !i.checked));
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    const flagged = items
      .map((item) => ({ item, ...flagItem(item, activeProfiles) }))
      .filter((r) => r.flagged);
    setFlaggedItems(flagged);
  }, [items, activeProfiles]);

  const toggleProfile = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveProfiles((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleRemoveItem = async (itemId: string) => {
    Alert.alert("Remove Item", "Remove this item from your list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { deleteShoppingItem } = await import("@/lib/storage");
          await deleteShoppingItem(itemId);
          await loadItems();
        },
      },
    ]);
  };

  const s = StyleSheet.create({
    profileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    profileChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, gap: 6 },
    profileEmoji: { fontSize: 18 },
    profileLabel: { fontSize: 14, fontWeight: "600" },
    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
    flagCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 10 },
    flagReason: { fontSize: 12, marginTop: 2 },
    flagName: { fontSize: 15, fontWeight: "600", flex: 1 },
    emptyBox: { alignItems: "center", paddingVertical: 32 },
    emptyText: { fontSize: 15, textAlign: "center", marginTop: 8 },
  });

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 12 }]}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>Dietary Filter</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.sectionTitle, { color: colors.foreground }]}>Select Your Dietary Preferences</Text>
        <View style={s.profileGrid}>
          {DIETARY_PROFILES.map((profile) => {
            const active = activeProfiles.includes(profile.id);
            return (
              <Pressable
                key={profile.id}
                style={({ pressed }) => [
                  s.profileChip,
                  {
                    backgroundColor: active ? colors.primary + "20" : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => toggleProfile(profile.id)}
              >
                <Text style={s.profileEmoji}>{profile.emoji}</Text>
                <Text style={[s.profileLabel, { color: active ? colors.primary : colors.foreground }]}>{profile.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeProfiles.length === 0 ? (
          <View style={[s.emptyBox, { backgroundColor: colors.surface, borderRadius: 16 }]}>
            <Text style={{ fontSize: 36 }}>🥗</Text>
            <Text style={[s.emptyText, { color: colors.muted }]}>Select dietary preferences above to scan your shopping list for items that may not fit.</Text>
          </View>
        ) : flaggedItems.length === 0 ? (
          <View style={[s.emptyBox, { backgroundColor: colors.success + "15", borderRadius: 16, borderWidth: 1, borderColor: colors.success + "30" }]}>
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={[s.emptyText, { color: colors.success }]}>Your list looks good! No items flagged for your selected dietary preferences.</Text>
          </View>
        ) : (
          <>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>
              {flaggedItems.length} Item{flaggedItems.length !== 1 ? "s" : ""} Flagged
            </Text>
            {flaggedItems.map(({ item, reason }) => (
              <View
                key={item.id}
                style={[s.flagCard, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.flagName, { color: colors.foreground }]}>{item.text}</Text>
                  <Text style={[s.flagReason, { color: colors.warning }]}>{reason}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 6 }]}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
