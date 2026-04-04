import { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Linking, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getAllShoppingItems } from "@/lib/storage";

interface SavingsApp {
  name: string;
  emoji: string;
  description: string;
  bestFor: string;
  url: string;
  color: string;
  tip: string;
}

const SAVINGS_APPS: SavingsApp[] = [
  {
    name: "Ibotta",
    emoji: "💰",
    description: "Cash back on groceries, household, and more",
    bestFor: "Groceries & household items",
    url: "https://ibotta.com",
    color: "#E63946",
    tip: "Stack with store sales for maximum savings. Earn $20 welcome bonus.",
  },
  {
    name: "Flipp",
    emoji: "📰",
    description: "Browse all local store flyers in one place",
    bestFor: "Finding the best store for each item",
    url: "https://flipp.com",
    color: "#2196F3",
    tip: "Search any item to see which store has it on sale this week.",
  },
  {
    name: "Fetch Rewards",
    emoji: "🎁",
    description: "Scan any receipt to earn points on everything",
    bestFor: "Any purchase — no specific offers needed",
    url: "https://fetchrewards.com",
    color: "#FF6B35",
    tip: "Works on ANY receipt from ANY store. Points convert to gift cards.",
  },
  {
    name: "Rakuten",
    emoji: "🛍️",
    description: "Cash back at 3,500+ stores online and in-store",
    bestFor: "Online grocery orders & big purchases",
    url: "https://rakuten.com",
    color: "#BF0000",
    tip: "Link your credit card for automatic in-store cash back. $30 welcome bonus.",
  },
  {
    name: "Honey",
    emoji: "🍯",
    description: "Automatically finds and applies coupon codes",
    bestFor: "Online shopping — auto-applies best coupon",
    url: "https://joinhoney.com",
    color: "#F5A623",
    tip: "Install the browser extension — it works automatically at checkout.",
  },
  {
    name: "Checkout 51",
    emoji: "✅",
    description: "Weekly cash back offers on groceries",
    bestFor: "Grocery staples with weekly rotating offers",
    url: "https://checkout51.com",
    color: "#4CAF50",
    tip: "New offers every Thursday. Stack with Ibotta for double cash back.",
  },
  {
    name: "Coupons.com",
    emoji: "✂️",
    description: "Printable and digital coupons for groceries",
    bestFor: "Manufacturer coupons for brand-name items",
    url: "https://coupons.com",
    color: "#9C27B0",
    tip: "Load digital coupons directly to your store loyalty card.",
  },
  {
    name: "Grocery TV",
    emoji: "📺",
    description: "Find the best grocery deals near you",
    bestFor: "Comparing prices across local stores",
    url: "https://grocery.tv",
    color: "#00BCD4",
    tip: "Great for planning which stores to hit each week.",
  },
];

const STACKING_STRATEGIES = [
  {
    title: "The Triple Stack",
    emoji: "🥇",
    steps: [
      "1. Find item on sale at store (Flipp)",
      "2. Apply manufacturer coupon (Coupons.com)",
      "3. Add Ibotta cash back offer",
      "4. Pay with cash back credit card",
    ],
    savings: "Up to 70% off",
    color: "#22C55E",
  },
  {
    title: "The Receipt Stack",
    emoji: "🥈",
    steps: [
      "1. Buy item at regular price",
      "2. Scan receipt in Fetch Rewards",
      "3. Scan receipt in Ibotta",
      "4. Scan receipt in Checkout 51",
    ],
    savings: "5-15% back",
    color: "#3B82F6",
  },
  {
    title: "The Loyalty Stack",
    emoji: "🥉",
    steps: [
      "1. Load digital coupons to loyalty card",
      "2. Buy sale items",
      "3. Earn loyalty points",
      "4. Redeem points for free items",
    ],
    savings: "10-25% off",
    color: "#F59E0B",
  },
];

export default function NeverFullPriceScreen() {
  const colors = useColors();
  const router = useRouter();
  const [listItems, setListItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"apps" | "strategies" | "search">("apps");

  useEffect(() => {
    loadListItems();
  }, []);

  const loadListItems = async () => {
    const items = await getAllShoppingItems();
    setListItems(items.filter((i) => !i.checked).map((i) => i.text));
  };

  const searchInApp = (app: SavingsApp, item?: string) => {
    const query = item ? encodeURIComponent(item) : "";
    let url = app.url;
    if (item) {
      if (app.name === "Ibotta") url = `https://ibotta.com/rebates?q=${query}`;
      else if (app.name === "Flipp") url = `https://flipp.com/flyers?q=${query}`;
      else if (app.name === "Honey") url = `https://joinhoney.com`;
    }
    Linking.openURL(url);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>💸 Never Pay Full Price</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Stack savings apps for maximum discounts</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
          <Text style={styles.heroEmoji}>🏆</Text>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>The Golden Rule of Smart Shopping</Text>
          <Text style={[styles.heroText, { color: colors.foreground }]}>
            Never buy anything at full price. Every item on your list can be discounted by stacking coupons, cash back apps, loyalty points, and credit card rewards.
          </Text>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["apps", "strategies", "search"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? "#fff" : colors.muted }]}>
                {tab === "apps" ? "💰 Apps" : tab === "strategies" ? "🎯 Strategies" : "🔍 My List"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "apps" && (
          <View style={{ gap: 10 }}>
            {SAVINGS_APPS.map((app) => (
              <Pressable
                key={app.name}
                style={({ pressed }) => [styles.appCard, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                }]}
                onPress={() => searchInApp(app)}
              >
                <View style={[styles.appIcon, { backgroundColor: app.color + "20" }]}>
                  <Text style={{ fontSize: 24 }}>{app.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.appName, { color: colors.foreground }]}>{app.name}</Text>
                    <View style={[styles.bestForBadge, { backgroundColor: app.color + "15" }]}>
                      <Text style={[styles.bestForText, { color: app.color }]}>{app.bestFor}</Text>
                    </View>
                  </View>
                  <Text style={[styles.appDesc, { color: colors.muted }]}>{app.description}</Text>
                  <Text style={[styles.appTip, { color: colors.primary }]}>💡 {app.tip}</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === "strategies" && (
          <View style={{ gap: 12 }}>
            {STACKING_STRATEGIES.map((strategy) => (
              <View key={strategy.title} style={[styles.strategyCard, { backgroundColor: colors.surface, borderColor: strategy.color + "40", borderWidth: 1.5 }]}>
                <View style={styles.strategyHeader}>
                  <Text style={{ fontSize: 28 }}>{strategy.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.strategyTitle, { color: colors.foreground }]}>{strategy.title}</Text>
                    <View style={[styles.savingsBadge, { backgroundColor: strategy.color + "20" }]}>
                      <Text style={[styles.savingsText, { color: strategy.color }]}>{strategy.savings}</Text>
                    </View>
                  </View>
                </View>
                {strategy.steps.map((step, idx) => (
                  <Text key={idx} style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {activeTab === "search" && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Search your list items in savings apps</Text>
            {listItems.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 40, textAlign: "center" }}>🛒</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your list is empty</Text>
                <Text style={[styles.emptyDesc, { color: colors.muted }]}>Add items to your shopping list to search for deals.</Text>
              </View>
            ) : (
              listItems.map((item) => (
                <View key={item} style={[styles.searchItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.searchItemName, { color: colors.foreground }]}>{item}</Text>
                  <View style={styles.searchBtns}>
                    {["Ibotta", "Flipp", "Fetch"].map((appName) => {
                      const app = SAVINGS_APPS.find((a) => a.name === appName)!;
                      return (
                        <Pressable
                          key={appName}
                          style={({ pressed }) => [styles.searchBtn, { backgroundColor: app.color + "15", opacity: pressed ? 0.7 : 1 }]}
                          onPress={() => searchInApp(app, item)}
                        >
                          <Text style={[styles.searchBtnText, { color: app.color }]}>{app.emoji} {appName}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
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
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center", gap: 8, marginBottom: 16 },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  heroText: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  tabRow: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 3, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 12, fontWeight: "600" },
  appCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  appIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 15, fontWeight: "700" },
  bestForBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  bestForText: { fontSize: 10, fontWeight: "600" },
  appDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  appTip: { fontSize: 12, marginTop: 4, fontWeight: "500" },
  strategyCard: { borderRadius: 14, padding: 16, gap: 8 },
  strategyHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  strategyTitle: { fontSize: 16, fontWeight: "700" },
  savingsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  savingsText: { fontSize: 12, fontWeight: "700" },
  stepText: { fontSize: 13, lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  searchItemCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  searchItemName: { fontSize: 14, fontWeight: "600" },
  searchBtns: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  searchBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  searchBtnText: { fontSize: 12, fontWeight: "700" },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13, textAlign: "center" },
});
