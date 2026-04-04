import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getPurchaseHistory,
  getShoppingItems,
  addShoppingItem,
  getSavedStores,
} from "@/lib/storage";
import { trpc } from "@/lib/trpc";

export default function AISuggestionsScreen() {
  const colors = useColors();
  const router = useRouter();

  const [purchaseHistory, setPurchaseHistory] = useState<string[]>([]);
  const [currentList, setCurrentList] = useState<string[]>([]);
  const [storeName, setStoreName] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [hasScanned, setHasScanned] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  const suggestMutation = trpc.ai.suggestMissingItems.useMutation();

  const loadContext = useCallback(async () => {
    const [history, items, stores] = await Promise.all([
      getPurchaseHistory(),
      getShoppingItems(),
      getSavedStores(),
    ]);

    const historyNames = history
      .sort((a, b) => b.date - a.date)
      .slice(0, 150)
      .map((h) => h.itemText);

    const listNames = items.filter((i) => !i.checked).map((i) => i.text);
    const nearestStore = stores[0]?.name;

    setPurchaseHistory(historyNames);
    setCurrentList(listNames);
    setStoreName(nearestStore);
    setHistoryCount(historyNames.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContext();
    }, [loadContext])
  );

  const handleScan = async () => {
    if (historyCount === 0) {
      Alert.alert(
        "No Purchase History Yet",
        "Start shopping with Remember2Buy and check off items to build your purchase history. The AI will then be able to suggest what you might be forgetting!"
      );
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await suggestMutation.mutateAsync({
        purchaseHistory,
        currentList,
        storeName,
      });
      setSuggestions(result.suggestions);
      setReasoning(result.reasoning);
      setAddedItems(new Set());
      setHasScanned(true);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Error", "Could not reach the AI service. Please check your connection and try again.");
    }
  };

  const handleAddItem = async (item: string) => {
    await addShoppingItem(item, {});
    setAddedItems((prev) => new Set([...prev, item]));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddAll = async () => {
    const toAdd = suggestions.filter((s) => !addedItems.has(s));
    for (const item of toAdd) {
      await addShoppingItem(item, {});
    }
    setAddedItems(new Set(suggestions));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Added!", `${toAdd.length} item${toAdd.length !== 1 ? "s" : ""} added to your list.`, [
      { text: "Go to List", onPress: () => router.push("/(tabs)/list" as never) },
      { text: "OK" },
    ]);
  };

  const s = StyleSheet.create({
    heroCard: { borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20 },
    heroEmoji: { fontSize: 56, marginBottom: 12 },
    heroTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 8 },
    heroDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    scanBtn: { height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 20 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    statBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center" },
    statValue: { fontSize: 20, fontWeight: "700" },
    statLabel: { fontSize: 11, marginTop: 2 },
    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
    suggestionCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
    suggestionText: { fontSize: 15, fontWeight: "600", flex: 1 },
    addBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
    addAllBtn: { height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 4, marginBottom: 16 },
    reasoningBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
    reasoningText: { fontSize: 13, lineHeight: 20 },
    emptyState: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  });

  const unadded = suggestions.filter((s) => !addedItems.has(s));

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 12 }]}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>What Am I Forgetting?</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.heroCard, { backgroundColor: colors.primary + "10", borderWidth: 1, borderColor: colors.primary + "25" }]}>
          <Text style={s.heroEmoji}>🧠</Text>
          <Text style={[s.heroTitle, { color: colors.foreground }]}>AI-Powered List Scan</Text>
          <Text style={[s.heroDesc, { color: colors.muted }]}>
            Our AI analyzes your purchase history and compares it to your current list to find items you commonly buy but haven't added yet.
          </Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.statValue, { color: colors.primary }]}>{historyCount}</Text>
            <Text style={[s.statLabel, { color: colors.muted }]}>Items in History</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.statValue, { color: colors.foreground }]}>{currentList.length}</Text>
            <Text style={[s.statLabel, { color: colors.muted }]}>On Current List</Text>
          </View>
          {storeName && (
            <View style={[s.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.statValue, { color: colors.foreground }]} numberOfLines={1}>🏪</Text>
              <Text style={[s.statLabel, { color: colors.muted }]} numberOfLines={1}>{storeName}</Text>
            </View>
          )}
        </View>

        {/* Scan Button */}
        <Pressable
          style={({ pressed }) => [
            s.scanBtn,
            {
              backgroundColor: suggestMutation.isPending ? colors.border : colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleScan}
          disabled={suggestMutation.isPending}
        >
          {suggestMutation.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Analyzing your history...</Text>
            </View>
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {hasScanned ? "🔄 Scan Again" : "🧠 Scan My List"}
            </Text>
          )}
        </Pressable>

        {/* Results */}
        {hasScanned && suggestions.length === 0 && (
          <View style={[s.emptyState, { backgroundColor: colors.success + "10", borderRadius: 16, borderWidth: 1, borderColor: colors.success + "30" }]}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.success, marginTop: 8 }}>Your list looks complete!</Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 6 }}>
              Based on your purchase history, you haven't missed anything obvious. Happy shopping!
            </Text>
          </View>
        )}

        {suggestions.length > 0 && (
          <>
            {reasoning ? (
              <View style={[s.reasoningBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 4 }}>AI REASONING</Text>
                <Text style={[s.reasoningText, { color: colors.muted }]}>{reasoning}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[s.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                {suggestions.length} Suggestion{suggestions.length !== 1 ? "s" : ""}
              </Text>
              {unadded.length > 0 && (
                <Pressable onPress={handleAddAll} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>Add All ({unadded.length})</Text>
                </Pressable>
              )}
            </View>

            {suggestions.map((item) => {
              const added = addedItems.has(item);
              return (
                <View
                  key={item}
                  style={[
                    s.suggestionCard,
                    {
                      backgroundColor: added ? colors.success + "10" : colors.surface,
                      borderColor: added ? colors.success + "30" : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{added ? "✅" : "🛒"}</Text>
                  <Text style={[s.suggestionText, { color: added ? colors.success : colors.foreground }]}>{item}</Text>
                  {!added ? (
                    <Pressable
                      style={({ pressed }) => [s.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                      onPress={() => handleAddItem(item)}
                    >
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>+ Add</Text>
                    </Pressable>
                  ) : (
                    <View style={[s.addBtn, { backgroundColor: colors.success + "20" }]}>
                      <Text style={{ color: colors.success, fontSize: 13, fontWeight: "700" }}>Added</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {unadded.length > 0 && (
              <Pressable
                style={({ pressed }) => [s.addAllBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleAddAll}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  Add All {unadded.length} to My List
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* How it works */}
        {!hasScanned && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>How It Works</Text>
            {[
              ["📋", "Reads your purchase history", "Items you've bought before"],
              ["🔍", "Compares to your current list", "Finds what's missing"],
              ["🧠", "AI identifies patterns", "Suggests commonly forgotten items"],
              ["➕", "One tap to add", "Add any suggestion instantly"],
            ].map(([emoji, title, desc]) => (
              <View key={title} style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 22, width: 28 }}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{title}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
