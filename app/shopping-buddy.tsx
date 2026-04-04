import { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList, Alert, Share,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getAllShoppingItems, updateShoppingItem,
  type ShoppingItem,
} from "@/lib/storage";

type BuddySplit = { me: ShoppingItem[]; buddy: ShoppingItem[] };

export default function ShoppingBuddyScreen() {
  const colors = useColors();
  const router = useRouter();
  const [split, setSplit] = useState<BuddySplit>({ me: [], buddy: [] });
  const [allItems, setAllItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState("Me");
  const [buddyName, setBuddyName] = useState("Buddy");

  const loadAndSplit = useCallback(async () => {
    setLoading(true);
    const items = (await getAllShoppingItems()).filter((i: ShoppingItem) => !i.checked);
    setAllItems(items);
    // Split evenly — odd items go to "me"
    const half = Math.ceil(items.length / 2);
    setSplit({ me: items.slice(0, half), buddy: items.slice(half) });
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadAndSplit(); }, [loadAndSplit]));

  const reshuffleSplit = () => {
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    setSplit({ me: shuffled.slice(0, half), buddy: shuffled.slice(half) });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const moveItem = (item: ShoppingItem, from: "me" | "buddy") => {
    setSplit((prev) => {
      if (from === "me") {
        return { me: prev.me.filter((i) => i.id !== item.id), buddy: [...prev.buddy, item] };
      } else {
        return { me: [...prev.me, item], buddy: prev.buddy.filter((i) => i.id !== item.id) };
      }
    });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const checkItem = async (item: ShoppingItem, from: "me" | "buddy") => {
    await updateShoppingItem(item.id, { checked: true });
    setSplit((prev) => ({
      me: from === "me" ? prev.me.filter((i) => i.id !== item.id) : prev.me,
      buddy: from === "buddy" ? prev.buddy.filter((i) => i.id !== item.id) : prev.buddy,
    }));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const shareBuddyList = async () => {
    const text = `🛒 Shopping Buddy List for ${buddyName}:\n\n` +
      split.buddy.map((i) => `• ${i.text}${i.quantity ? ` (${i.quantity} ${i.unit ?? ""})` : ""}`).join("\n");
    await Share.share({ message: text });
  };

  const renderItem = (item: ShoppingItem, from: "me" | "buddy") => (
    <View style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        style={({ pressed }) => [styles.checkCircle, {
          borderColor: colors.primary,
          backgroundColor: pressed ? colors.primary + "20" : "transparent",
        }]}
        onPress={() => checkItem(item, from)}
      >
        <IconSymbol name="checkmark" size={14} color={colors.primary} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemText, { color: colors.foreground }]}>{item.text}</Text>
        {(item.quantity || item.category) && (
          <Text style={[styles.itemMeta, { color: colors.muted }]}>
            {item.quantity ? `${item.quantity} ${item.unit ?? ""}` : ""}{item.category ? ` · ${item.category}` : ""}
          </Text>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.moveBtn, {
          backgroundColor: from === "me" ? colors.warning + "20" : colors.primary + "20",
          opacity: pressed ? 0.7 : 1,
        }]}
        onPress={() => moveItem(item, from)}
      >
        <Text style={{ fontSize: 12, color: from === "me" ? colors.warning : colors.primary }}>
          {from === "me" ? "→ Buddy" : "← Me"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>👥 Shopping Buddy</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Split the list, cover the store faster</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.reshuffleBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={reshuffleSplit}
          >
            <Text style={styles.reshuffleBtnText}>Reshuffle</Text>
          </Pressable>
        </View>

        {allItems.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🛒</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No items to split</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>Add items to your shopping list first, then come back here to split them with a buddy.</Text>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: "row", gap: 12 }}>
            {/* My Column */}
            <View style={{ flex: 1 }}>
              <View style={[styles.columnHeader, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.columnTitle, { color: colors.primary }]}>🙋 {myName}</Text>
                <Text style={[styles.columnCount, { color: colors.primary }]}>{split.me.length} items</Text>
              </View>
              <FlatList
                data={split.me}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => renderItem(item, "me")}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Buddy Column */}
            <View style={{ flex: 1 }}>
              <View style={[styles.columnHeader, { backgroundColor: colors.warning + "15" }]}>
                <Text style={[styles.columnTitle, { color: colors.warning }]}>🙋 {buddyName}</Text>
                <Text style={[styles.columnCount, { color: colors.warning }]}>{split.buddy.length} items</Text>
              </View>
              <FlatList
                data={split.buddy}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => renderItem(item, "buddy")}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        )}

        {split.buddy.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.shareBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
            onPress={shareBuddyList}
          >
            <IconSymbol name="paperplane.fill" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share {buddyName}'s List</Text>
          </Pressable>
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
  reshuffleBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  reshuffleBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  columnHeader: { borderRadius: 10, padding: 10, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  columnTitle: { fontSize: 14, fontWeight: "700" },
  columnCount: { fontSize: 12, fontWeight: "600" },
  divider: { width: 1 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  checkCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 13, fontWeight: "500" },
  itemMeta: { fontSize: 11, marginTop: 1 },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, marginBottom: 16 },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
