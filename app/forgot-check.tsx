import { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList, Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getAllShoppingItems, getShoppingLists, updateShoppingItem, deleteShoppingItem,
  type ShoppingItem, type ShoppingList,
} from "@/lib/storage";

export default function ForgotCheckScreen() {
  const colors = useColors();
  const router = useRouter();
  const [unchecked, setUnchecked] = useState<(ShoppingItem & { listName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUnchecked = useCallback(async () => {
    setLoading(true);
    const [allItems, allLists] = await Promise.all([getAllShoppingItems(), getShoppingLists()]);
    const listMap: Record<string, string> = {};
    allLists.forEach((l: ShoppingList) => { listMap[l.id] = l.name ?? "My List"; });
    const items = allItems
      .filter((i: ShoppingItem) => !i.checked)
      .map((i: ShoppingItem) => ({ ...i, listName: i.listId ? (listMap[i.listId] ?? "My List") : "My List" }));
    setUnchecked(items);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadUnchecked(); }, [loadUnchecked]));

  const handleGoBack = async (item: ShoppingItem) => {
    Alert.alert(
      "Go Back for This?",
      `Add "${item.text}" to your next trip?`,
      [
        { text: "Keep on list", style: "cancel" },
        {
          text: "Mark as done",
          onPress: async () => {
            await updateShoppingItem(item.id, { checked: true });
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadUnchecked();
          },
        },
        {
          text: "Remove from list",
          style: "destructive",
          onPress: async () => {
            await deleteShoppingItem(item.id);
            await loadUnchecked();
          },
        },
      ]
    );
  };

  const handleMarkAllDone = async () => {
    Alert.alert(
      "Mark All as Done?",
      "This will check off all remaining items.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark All Done",
          onPress: async () => {
            for (const item of unchecked) {
              await updateShoppingItem(item.id, { checked: true });
            }
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadUnchecked();
          },
        },
      ]
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
            <Text style={[styles.title, { color: colors.foreground }]}>🤔 Did You Forget Something?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Items still on your list</Text>
          </View>
          {unchecked.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.doneAllBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleMarkAllDone}
            >
              <Text style={styles.doneAllText}>All Done</Text>
            </Pressable>
          )}
        </View>

        {!loading && unchecked.length === 0 ? (
          <View style={styles.allClear}>
            <Text style={{ fontSize: 64 }}>🎉</Text>
            <Text style={[styles.allClearTitle, { color: colors.foreground }]}>You got everything!</Text>
            <Text style={[styles.allClearDesc, { color: colors.muted }]}>
              All items on your shopping list have been checked off. Great job!
            </Text>
            <Pressable
              style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>Back to Dashboard</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.countCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
              <Text style={[styles.countText, { color: colors.warning }]}>
                ⚠️ You have {unchecked.length} item{unchecked.length !== 1 ? "s" : ""} still on your list
              </Text>
            </View>
            <FlatList
              data={unchecked}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.itemCard, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                  onPress={() => handleGoBack(item)}
                >
                  <View style={[styles.itemIcon, { backgroundColor: colors.warning + "20" }]}>
                    <Text style={{ fontSize: 20 }}>🛒</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemText, { color: colors.foreground }]}>{item.text}</Text>
                    <Text style={[styles.itemList, { color: colors.muted }]}>
                      {item.listName}
                      {item.quantity ? ` · ${item.quantity} ${item.unit ?? ""}` : ""}
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Pressable
                      style={({ pressed }) => [styles.checkBtn, { backgroundColor: colors.success, opacity: pressed ? 0.8 : 1 }]}
                      onPress={async () => {
                        await updateShoppingItem(item.id, { checked: true });
                        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        await loadUnchecked();
                      }}
                    >
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.deleteBtn, { backgroundColor: colors.error + "20", opacity: pressed ? 0.8 : 1 }]}
                      onPress={async () => {
                        await deleteShoppingItem(item.id);
                        await loadUnchecked();
                      }}
                    >
                      <IconSymbol name="trash.fill" size={14} color={colors.error} />
                    </Pressable>
                  </View>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              contentContainerStyle={styles.list}
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  doneAllBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  doneAllText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  countCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  countText: { fontSize: 14, fontWeight: "600" },
  list: { paddingBottom: 24 },
  itemCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1, gap: 3 },
  itemText: { fontSize: 15, fontWeight: "600" },
  itemList: { fontSize: 12 },
  checkBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  allClear: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  allClearTitle: { fontSize: 22, fontWeight: "700" },
  allClearDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  backBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
