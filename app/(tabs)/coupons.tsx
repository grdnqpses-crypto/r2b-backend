import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, Platform, Modal, Image, ScrollView,
  TextInput, Linking, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getCoupons, addCoupon, deleteCoupon, updateCoupon, markCouponUsed, getTier,
  getLoyaltyCards, addLoyaltyCard, deleteLoyaltyCard,
  getCashbackEntries, addCashbackEntry, getTotalCashback,
  getShoppingItems,
  type Coupon, type Tier, type LoyaltyCard, type CashbackEntry,
} from "@/lib/storage";

// ─── Smart Savings Partners ───────────────────────────────────────────────────
const SAVINGS_APPS = [
  { name: "Ibotta", emoji: "💰", url: "https://ibotta.com", color: "#E8335A", desc: "Cash back on groceries" },
  { name: "Flipp", emoji: "📰", url: "https://flipp.com", color: "#FF6B35", desc: "Weekly flyers & deals" },
  { name: "Fetch", emoji: "🎁", url: "https://fetchrewards.com", color: "#7B61FF", desc: "Scan receipts for points" },
  { name: "Rakuten", emoji: "🛍️", url: "https://rakuten.com", color: "#BF0000", desc: "Cash back shopping" },
  { name: "Honey", emoji: "🍯", url: "https://joinhoney.com", color: "#F5A623", desc: "Auto-apply coupons" },
  { name: "Checkout 51", emoji: "🧾", url: "https://checkout51.com", color: "#00A651", desc: "Grocery cash back" },
];

// ─── Loyalty Card Colors ──────────────────────────────────────────────────────
const CARD_COLORS = ["#1565C0", "#7C3AED", "#059669", "#DC2626", "#D97706", "#0891B2", "#BE185D", "#374151"];
const STORE_EMOJIS = ["🏪", "🛒", "💊", "🍕", "⛽", "🏦", "👗", "🔧", "🐾", "🌿", "☕", "🎬"];

type CouponTab = "coupons" | "loyalty" | "savings" | "cashback";

export default function CouponsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<CouponTab>("coupons");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [cashbackEntries, setCashbackEntries] = useState<CashbackEntry[]>([]);
  const [cashbackTotals, setCashbackTotals] = useState({ week: 0, month: 0, year: 0, allTime: 0 });
  const [tier, setTierState] = useState<Tier>("free");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddCashback, setShowAddCashback] = useState(false);
  const [showEditCoupon, setShowEditCoupon] = useState(false);
  const [listItems, setListItems] = useState<string[]>([]);

  // Add loyalty card form
  const [cardStore, setCardStore] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const [cardEmoji, setCardEmoji] = useState("🏪");

  // Add cashback form
  const [cbAmount, setCbAmount] = useState("");
  const [cbSource, setCbSource] = useState<CashbackEntry["source"]>("ibotta");
  const [cbDesc, setCbDesc] = useState("");

  // Edit coupon form
  const [editStore, setEditStore] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editExpiry, setEditExpiry] = useState("");

  const loadData = useCallback(async () => {
    const [couponsData, tierData, cards, cbEntries, cbTotals, items] = await Promise.all([
      getCoupons(), getTier(), getLoyaltyCards(), getCashbackEntries(), getTotalCashback(), getShoppingItems(),
    ]);
    setCoupons(couponsData);
    setTierState(tierData);
    setLoyaltyCards(cards);
    setCashbackEntries(cbEntries);
    setCashbackTotals(cbTotals);
    setListItems(items.filter((i) => !i.checked).map((i) => i.text));
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ─── Coupon Actions ──────────────────────────────────────────────────────────
  const handleAddFromCamera = async () => {
    if (tier !== "premium") { showPremiumAlert(); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("coupons.cameraPermission"), t("coupons.cameraPermissionMessage"), [{ text: t("common.ok") }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, base64: false });
    if (result.canceled || !result.assets[0]) return;
    setLoading(true);
    try {
      await addCoupon({ imageUri: result.assets[0].uri, source: "camera" });
      await loadData();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert(t("common.error"), t("coupons.saveFailed")); }
    finally { setLoading(false); }
  };

  const handleAddFromLibrary = async () => {
    if (tier !== "premium") { showPremiumAlert(); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setLoading(true);
    try {
      await addCoupon({ imageUri: result.assets[0].uri, source: "library" });
      await loadData();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert(t("common.error"), t("coupons.saveFailed")); }
    finally { setLoading(false); }
  };

  const showPremiumAlert = () => {
    Alert.alert(t("coupons.premiumFeature"), t("coupons.premiumMessage"), [{ text: t("common.ok") }]);
  };

  const handleDeleteCoupon = (id: string) => {
    Alert.alert(t("coupons.deleteCoupon"), t("coupons.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => {
        await deleteCoupon(id);
        await loadData();
        setSelectedCoupon(null);
      }},
    ]);
  };

  const handleMarkUsed = async (id: string) => {
    await markCouponUsed(id);
    await loadData();
    setSelectedCoupon(null);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveCouponEdit = async () => {
    if (!selectedCoupon) return;
    let expiryTimestamp: number | undefined;
    if (editExpiry) {
      const d = new Date(editExpiry);
      if (!isNaN(d.getTime())) expiryTimestamp = d.getTime();
    }
    await updateCoupon(selectedCoupon.id, {
      storeName: editStore || undefined,
      description: editDesc || undefined,
      discount: editDiscount || undefined,
      expiryDate: expiryTimestamp,
    });
    await loadData();
    setShowEditCoupon(false);
    setSelectedCoupon(null);
  };

  const openEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setEditStore(coupon.storeName ?? "");
    setEditDesc(coupon.description ?? "");
    setEditDiscount(coupon.discount ?? "");
    setEditExpiry(coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split("T")[0] : "");
    setShowEditCoupon(true);
  };

  const getDaysUntilExpiry = (expiryDate?: number): number | null => {
    if (!expiryDate) return null;
    const days = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getExpiryColor = (days: number | null): string => {
    if (days === null) return colors.muted;
    if (days < 0) return colors.error;
    if (days <= 3) return colors.error;
    if (days <= 7) return colors.warning;
    return colors.success;
  };

  // ─── Loyalty Card Actions ────────────────────────────────────────────────────
  const handleAddCard = async () => {
    if (!cardStore.trim() || !cardNumber.trim()) return;
    if (tier !== "premium") { showPremiumAlert(); return; }
    await addLoyaltyCard({
      storeName: cardStore.trim(),
      cardNumber: cardNumber.trim(),
      barcodeType: "CODE128",
      color: cardColor,
      logoEmoji: cardEmoji,
    });
    setCardStore(""); setCardNumber(""); setCardColor(CARD_COLORS[0]); setCardEmoji("🏪");
    setShowAddCard(false);
    await loadData();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert("Remove Card", "Remove this loyalty card?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        await deleteLoyaltyCard(id);
        await loadData();
        setSelectedCard(null);
      }},
    ]);
  };

  // ─── Cashback Actions ────────────────────────────────────────────────────────
  const handleAddCashback = async () => {
    const amount = parseFloat(cbAmount);
    if (isNaN(amount) || amount <= 0 || !cbDesc.trim()) return;
    await addCashbackEntry({ amount, source: cbSource, itemDescription: cbDesc.trim(), date: Date.now() });
    setCbAmount(""); setCbDesc(""); setCbSource("ibotta");
    setShowAddCashback(false);
    await loadData();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const activeCoupons = coupons.filter((c) => !c.isUsed);
  const usedCoupons = coupons.filter((c) => c.isUsed);
  const expiringSoon = activeCoupons.filter((c) => {
    const days = getDaysUntilExpiry(c.expiryDate);
    return days !== null && days >= 0 && days <= 7;
  });

  const renderCoupon = ({ item }: { item: Coupon }) => {
    const days = getDaysUntilExpiry(item.expiryDate);
    const expiryColor = getExpiryColor(days);
    return (
      <Pressable
        style={({ pressed }) => [styles.couponCard, { backgroundColor: colors.surface, borderColor: item.isUsed ? colors.border : colors.border, opacity: pressed ? 0.85 : (item.isUsed ? 0.5 : 1) }]}
        onPress={() => setSelectedCoupon(item)}
        onLongPress={() => openEditCoupon(item)}
      >
        <Image source={{ uri: item.imageUri }} style={styles.couponThumb} resizeMode="cover" />
        <View style={styles.couponInfo}>
          <View style={styles.couponTopRow}>
            {item.storeName && <Text style={[styles.couponStore, { color: colors.foreground }]} numberOfLines={1}>{item.storeName}</Text>}
            {item.discount && (
              <View style={[styles.discountBadge, { backgroundColor: colors.success + "20" }]}>
                <Text style={[styles.discountText, { color: colors.success }]}>{item.discount}</Text>
              </View>
            )}
          </View>
          {item.description && <Text style={[styles.couponDesc, { color: colors.muted }]} numberOfLines={1}>{item.description}</Text>}
          <View style={styles.couponBottomRow}>
            {days !== null ? (
              <Text style={[styles.expiryText, { color: expiryColor }]}>
                {days < 0 ? "Expired" : days === 0 ? "Expires today!" : `${days}d left`}
              </Text>
            ) : (
              <Text style={[styles.expiryText, { color: colors.muted }]}>No expiry</Text>
            )}
            {item.isUsed && <Text style={[styles.usedBadge, { color: colors.muted }]}>✓ Used</Text>}
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => openEditCoupon(item)}>
          <IconSymbol name="pencil" size={16} color={colors.muted} />
        </Pressable>
      </Pressable>
    );
  };

  const renderLoyaltyCard = ({ item }: { item: LoyaltyCard }) => (
    <Pressable
      style={({ pressed }) => [styles.loyaltyCard, { backgroundColor: item.color, opacity: pressed ? 0.9 : 1 }]}
      onPress={() => setSelectedCard(item)}
      onLongPress={() => handleDeleteCard(item.id)}
    >
      <View style={styles.loyaltyCardTop}>
        <Text style={styles.loyaltyEmoji}>{item.logoEmoji}</Text>
        <Text style={styles.loyaltyStoreName}>{item.storeName}</Text>
      </View>
      <Text style={styles.loyaltyCardNumber}>{item.cardNumber}</Text>
      <Text style={styles.loyaltyHint}>Tap to show barcode · Hold to remove</Text>
    </Pressable>
  );

  const TABS: { key: CouponTab; label: string; emoji: string }[] = [
    { key: "coupons", label: "Coupons", emoji: "✂️" },
    { key: "loyalty", label: "Cards", emoji: "💳" },
    { key: "savings", label: "Savings", emoji: "💰" },
    { key: "cashback", label: "Cashback", emoji: "🎁" },
  ];

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Smart Savings</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            ${cashbackTotals.allTime.toFixed(2)} saved all time
          </Text>
        </View>

        {/* Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, { backgroundColor: activeTab === tab.key ? colors.primary : colors.surface, borderColor: activeTab === tab.key ? colors.primary : colors.border }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[styles.tabLabel, { color: activeTab === tab.key ? "#fff" : colors.foreground }]}>{tab.label}</Text>
              {tab.key === "coupons" && expiringSoon.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.warning }]}>
                  <Text style={styles.tabBadgeText}>{expiringSoon.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        {/* ── COUPONS TAB ── */}
        {activeTab === "coupons" && (
          <View style={{ flex: 1 }}>
            {/* Expiring Soon Banner */}
            {expiringSoon.length > 0 && (
              <View style={[styles.expiryBanner, { backgroundColor: colors.warning + "20", borderColor: colors.warning + "40" }]}>
                <Text style={styles.expiryBannerEmoji}>⚠️</Text>
                <Text style={[styles.expiryBannerText, { color: colors.warning }]}>
                  {expiringSoon.length} coupon{expiringSoon.length > 1 ? "s" : ""} expiring within 7 days!
                </Text>
              </View>
            )}

            {/* Add Buttons */}
            <View style={styles.addRow}>
              <Pressable
                style={({ pressed }) => [styles.addBtn, { backgroundColor: tier === "premium" ? colors.primary : colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleAddFromCamera}
              >
                {loading ? <ActivityIndicator size="small" color={tier === "premium" ? "#fff" : colors.muted} /> : (
                  <>
                    <IconSymbol name="camera.fill" size={18} color={tier === "premium" ? "#fff" : colors.muted} />
                    <Text style={[styles.addBtnText, { color: tier === "premium" ? "#fff" : colors.muted }]}>
                      Scan {tier !== "premium" ? "🔒" : ""}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.addBtn, { backgroundColor: tier === "premium" ? colors.primary : colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleAddFromLibrary}
              >
                <IconSymbol name="photo.fill" size={18} color={tier === "premium" ? "#fff" : colors.muted} />
                <Text style={[styles.addBtnText, { color: tier === "premium" ? "#fff" : colors.muted }]}>
                  Import {tier !== "premium" ? "🔒" : ""}
                </Text>
              </Pressable>
            </View>

            {/* Premium Upsell */}
            {tier !== "premium" && (
              <View style={[styles.upsellCard, { backgroundColor: colors.premium + "15", borderColor: colors.premium + "40" }]}>
                <IconSymbol name="crown.fill" size={20} color={colors.premium} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.upsellTitle, { color: colors.premium }]}>Unlock Smart Savings</Text>
                  <Text style={[styles.upsellDesc, { color: colors.foreground }]}>
                    Save coupons, track expiry dates, log cashback, and store loyalty cards. Upgrade to Premium.
                  </Text>
                </View>
              </View>
            )}

            {/* Active Coupons */}
            {activeCoupons.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✂️</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No coupons saved</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  {tier === "premium" ? "Scan or import coupon images to save them here." : "Upgrade to Premium to save and organize coupons."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={[...activeCoupons, ...usedCoupons]}
                keyExtractor={(item) => item.id}
                renderItem={renderCoupon}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            )}
          </View>
        )}

        {/* ── LOYALTY CARDS TAB ── */}
        {activeTab === "loyalty" && (
          <View style={{ flex: 1 }}>
            <Pressable
              style={({ pressed }) => [styles.addCardBtn, { backgroundColor: tier === "premium" ? colors.primary : colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => tier === "premium" ? setShowAddCard(true) : showPremiumAlert()}
            >
              <IconSymbol name="plus.circle.fill" size={20} color={tier === "premium" ? "#fff" : colors.muted} />
              <Text style={[styles.addCardBtnText, { color: tier === "premium" ? "#fff" : colors.muted }]}>
                Add Loyalty Card {tier !== "premium" ? "🔒" : ""}
              </Text>
            </Pressable>

            {loyaltyCards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💳</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No loyalty cards</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Store your Kroger, CVS, Walgreens, and other loyalty cards here. Never dig through your wallet again.
                </Text>
              </View>
            ) : (
              <FlatList
                data={loyaltyCards}
                keyExtractor={(item) => item.id}
                renderItem={renderLoyaltyCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              />
            )}
          </View>
        )}

        {/* ── SMART SAVINGS TAB ── */}
        {activeTab === "savings" && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.savingsContent}>
            {/* Current list items */}
            {listItems.length > 0 && (
              <View style={[styles.listMatchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🛒 Your List Today</Text>
                <Text style={[styles.listMatchSubtitle, { color: colors.muted }]}>
                  Tap an app below to find deals on these items:
                </Text>
                <View style={styles.listChips}>
                  {listItems.slice(0, 8).map((item, i) => (
                    <View key={i} style={[styles.listChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                      <Text style={[styles.listChipText, { color: colors.primary }]}>{item}</Text>
                    </View>
                  ))}
                  {listItems.length > 8 && (
                    <Text style={[styles.moreItems, { color: colors.muted }]}>+{listItems.length - 8} more</Text>
                  )}
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>💰 Cash Back & Deals Apps</Text>
            {SAVINGS_APPS.map((app) => (
              <Pressable
                key={app.name}
                style={({ pressed }) => [styles.savingsAppCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => Linking.openURL(app.url)}
              >
                <View style={[styles.savingsAppIcon, { backgroundColor: app.color + "20" }]}>
                  <Text style={styles.savingsAppEmoji}>{app.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.savingsAppName, { color: colors.foreground }]}>{app.name}</Text>
                  <Text style={[styles.savingsAppDesc, { color: colors.muted }]}>{app.desc}</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            ))}

            {/* Google Shopping */}
            <Pressable
              style={({ pressed }) => [styles.savingsAppCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
              onPress={() => {
                const query = listItems.slice(0, 3).join(" ");
                Linking.openURL(`https://shopping.google.com/search?q=${encodeURIComponent(query || "grocery deals")}`);
              }}
            >
              <View style={[styles.savingsAppIcon, { backgroundColor: "#4285F420" }]}>
                <Text style={styles.savingsAppEmoji}>🔍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.savingsAppName, { color: colors.foreground }]}>Google Shopping</Text>
                <Text style={[styles.savingsAppDesc, { color: colors.muted }]}>Compare prices across stores</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>

            <View style={[styles.tipCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
              <Text style={styles.tipEmoji}>💡</Text>
              <Text style={[styles.tipText, { color: colors.foreground }]}>
                <Text style={{ fontWeight: "700" }}>Pro tip: </Text>
                Stack coupons with cashback apps! Use a store coupon + Ibotta + a credit card reward to triple your savings on the same item.
              </Text>
            </View>
          </ScrollView>
        )}

        {/* ── CASHBACK TAB ── */}
        {activeTab === "cashback" && (
          <View style={{ flex: 1 }}>
            {/* Totals */}
            <View style={styles.cashbackGrid}>
              {[
                { label: "This Week", amount: cashbackTotals.week },
                { label: "This Month", amount: cashbackTotals.month },
                { label: "This Year", amount: cashbackTotals.year },
                { label: "All Time", amount: cashbackTotals.allTime },
              ].map((stat) => (
                <View key={stat.label} style={[styles.cashbackStat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cashbackAmount, { color: colors.success }]}>${stat.amount.toFixed(2)}</Text>
                  <Text style={[styles.cashbackLabel, { color: colors.muted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.addCardBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowAddCashback(true)}
            >
              <IconSymbol name="plus.circle.fill" size={20} color="#fff" />
              <Text style={[styles.addCardBtnText, { color: "#fff" }]}>Log Cashback / Savings</Text>
            </Pressable>

            {cashbackEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎁</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No cashback logged</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                  Log your savings from Ibotta, Fetch, coupons, and more to track your total savings over time.
                </Text>
              </View>
            ) : (
              <FlatList
                data={cashbackEntries}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                renderItem={({ item }) => (
                  <View style={[styles.cashbackEntry, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.cashbackSourceBadge, { backgroundColor: colors.success + "20" }]}>
                      <Text style={styles.cashbackSourceText}>{item.source}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cashbackEntryDesc, { color: colors.foreground }]} numberOfLines={1}>{item.itemDescription}</Text>
                      <Text style={[styles.cashbackEntryDate, { color: colors.muted }]}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.cashbackEntryAmount, { color: colors.success }]}>+${item.amount.toFixed(2)}</Text>
                  </View>
                )}
              />
            )}
          </View>
        )}
      </View>

      {/* ── COUPON DETAIL MODAL ── */}
      <Modal visible={!!selectedCoupon && !showEditCoupon} animationType="slide" presentationStyle="pageSheet">
        {selectedCoupon && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Coupon</Text>
              <Pressable onPress={() => setSelectedCoupon(null)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Image source={{ uri: selectedCoupon.imageUri }} style={styles.couponFullImage} resizeMode="contain" />
              {selectedCoupon.storeName && <Text style={[styles.modalStoreName, { color: colors.foreground }]}>{selectedCoupon.storeName}</Text>}
              {selectedCoupon.discount && (
                <View style={[styles.bigDiscountBadge, { backgroundColor: colors.success + "20" }]}>
                  <Text style={[styles.bigDiscountText, { color: colors.success }]}>{selectedCoupon.discount}</Text>
                </View>
              )}
              {selectedCoupon.description && <Text style={[styles.modalDesc, { color: colors.muted }]}>{selectedCoupon.description}</Text>}
              {selectedCoupon.expiryDate && (
                <Text style={[styles.modalExpiry, { color: getExpiryColor(getDaysUntilExpiry(selectedCoupon.expiryDate)) }]}>
                  {getDaysUntilExpiry(selectedCoupon.expiryDate)! < 0 ? "⚠️ Expired" : `⏰ Expires ${new Date(selectedCoupon.expiryDate).toLocaleDateString()}`}
                </Text>
              )}
              <View style={styles.modalActions}>
                {!selectedCoupon.isUsed && (
                  <Pressable
                    style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
                    onPress={() => handleMarkUsed(selectedCoupon.id)}
                  >
                    <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
                    <Text style={styles.modalBtnText}>Mark as Used</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.primary + "20", opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => openEditCoupon(selectedCoupon)}
                >
                  <IconSymbol name="pencil" size={18} color={colors.primary} />
                  <Text style={[styles.modalBtnText, { color: colors.primary }]}>Edit Details</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.error + "20", opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => handleDeleteCoupon(selectedCoupon.id)}
                >
                  <IconSymbol name="trash.fill" size={18} color={colors.error} />
                  <Text style={[styles.modalBtnText, { color: colors.error }]}>Delete</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* ── EDIT COUPON MODAL ── */}
      <Modal visible={showEditCoupon} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Coupon</Text>
            <Pressable onPress={() => { setShowEditCoupon(false); setSelectedCoupon(null); }}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Store name" placeholderTextColor={colors.muted} value={editStore} onChangeText={setEditStore} returnKeyType="next" />
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Discount (e.g. $1.00 off, 20% off)" placeholderTextColor={colors.muted} value={editDiscount} onChangeText={setEditDiscount} returnKeyType="next" />
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Description" placeholderTextColor={colors.muted} value={editDesc} onChangeText={setEditDesc} returnKeyType="next" />
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Expiry date (YYYY-MM-DD)" placeholderTextColor={colors.muted} value={editExpiry} onChangeText={setEditExpiry} returnKeyType="done" keyboardType="numbers-and-punctuation" />
            <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveCouponEdit}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── LOYALTY CARD DETAIL MODAL ── */}
      <Modal visible={!!selectedCard} animationType="slide" presentationStyle="formSheet">
        {selectedCard && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedCard.storeName}</Text>
              <Pressable onPress={() => setSelectedCard(null)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.modalContent}>
              <View style={[styles.bigLoyaltyCard, { backgroundColor: selectedCard.color }]}>
                <Text style={styles.bigLoyaltyEmoji}>{selectedCard.logoEmoji}</Text>
                <Text style={styles.bigLoyaltyStore}>{selectedCard.storeName}</Text>
                <Text style={styles.bigLoyaltyNumber}>{selectedCard.cardNumber}</Text>
              </View>
              <Text style={[styles.barcodeHint, { color: colors.muted }]}>Show this number at checkout to earn rewards</Text>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: colors.error + "20", opacity: pressed ? 0.85 : 1, marginTop: 16 }]}
                onPress={() => handleDeleteCard(selectedCard.id)}
              >
                <IconSymbol name="trash.fill" size={18} color={colors.error} />
                <Text style={[styles.modalBtnText, { color: colors.error }]}>Remove Card</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      {/* ── ADD LOYALTY CARD MODAL ── */}
      <Modal visible={showAddCard} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Loyalty Card</Text>
            <Pressable onPress={() => setShowAddCard(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Store name (e.g. Kroger, CVS)" placeholderTextColor={colors.muted} value={cardStore} onChangeText={setCardStore} returnKeyType="next" autoFocus />
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Card number / member ID" placeholderTextColor={colors.muted} value={cardNumber} onChangeText={setCardNumber} returnKeyType="done" keyboardType="default" />
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Card Color</Text>
            <View style={styles.colorRow}>
              {CARD_COLORS.map((color) => (
                <Pressable key={color} style={[styles.colorDot, { backgroundColor: color, borderWidth: cardColor === color ? 3 : 0, borderColor: colors.foreground }]} onPress={() => setCardColor(color)} />
              ))}
            </View>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Store Icon</Text>
            <View style={styles.iconGrid}>
              {STORE_EMOJIS.map((emoji) => (
                <Pressable key={emoji} style={[styles.iconOption, { borderColor: cardEmoji === emoji ? colors.primary : colors.border, backgroundColor: cardEmoji === emoji ? colors.primary + "20" : colors.surface }]} onPress={() => setCardEmoji(emoji)}>
                  <Text style={styles.iconOptionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.saveBtn, { backgroundColor: cardStore.trim() && cardNumber.trim() ? colors.primary : colors.border }]} onPress={handleAddCard} disabled={!cardStore.trim() || !cardNumber.trim()}>
              <Text style={styles.saveBtnText}>Add Card</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── ADD CASHBACK MODAL ── */}
      <Modal visible={showAddCashback} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log Savings</Text>
            <Pressable onPress={() => setShowAddCashback(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Amount saved ($)" placeholderTextColor={colors.muted} value={cbAmount} onChangeText={setCbAmount} keyboardType="decimal-pad" returnKeyType="next" autoFocus />
            <TextInput style={[styles.formInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="What did you save on?" placeholderTextColor={colors.muted} value={cbDesc} onChangeText={setCbDesc} returnKeyType="done" />
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["ibotta", "fetch", "flipp", "kroger", "other"] as CashbackEntry["source"][]).map((src) => (
                  <Pressable key={src} style={[styles.sourceChip, { backgroundColor: cbSource === src ? colors.success : colors.surface, borderColor: cbSource === src ? colors.success : colors.border }]} onPress={() => setCbSource(src)}>
                    <Text style={[styles.sourceChipText, { color: cbSource === src ? "#fff" : colors.foreground }]}>{src}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable style={[styles.saveBtn, { backgroundColor: cbAmount && cbDesc ? colors.success : colors.border }]} onPress={handleAddCashback} disabled={!cbAmount || !cbDesc}>
              <Text style={styles.saveBtnText}>Log Savings</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  tabBar: { marginBottom: 12 },
  tabBarContent: { gap: 8, paddingVertical: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  tabBadge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  tabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  expiryBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  expiryBannerEmoji: { fontSize: 16 },
  expiryBannerText: { fontSize: 13, fontWeight: "600", flex: 1 },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  addBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  upsellCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  upsellTitle: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
  upsellDesc: { fontSize: 13, lineHeight: 18 },
  listContent: { paddingBottom: 20 },
  couponCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  couponThumb: { width: 80, height: 72 },
  couponInfo: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 4 },
  couponTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponStore: { fontSize: 14, fontWeight: "600", flex: 1 },
  discountBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  discountText: { fontSize: 11, fontWeight: "700" },
  couponDesc: { fontSize: 12 },
  couponBottomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  expiryText: { fontSize: 11, fontWeight: "600" },
  usedBadge: { fontSize: 11 },
  editBtn: { padding: 12 },
  loyaltyCard: { borderRadius: 16, padding: 18, minHeight: 100 },
  loyaltyCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  loyaltyEmoji: { fontSize: 24 },
  loyaltyStoreName: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 },
  loyaltyCardNumber: { color: "rgba(255,255,255,0.9)", fontSize: 16, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", letterSpacing: 2 },
  loyaltyHint: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 8 },
  savingsContent: { paddingBottom: 30, gap: 8 },
  listMatchCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  listMatchSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 10 },
  listChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  listChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  listChipText: { fontSize: 12, fontWeight: "500" },
  moreItems: { fontSize: 12, alignSelf: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  savingsAppCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  savingsAppIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  savingsAppEmoji: { fontSize: 22 },
  savingsAppName: { fontSize: 15, fontWeight: "600" },
  savingsAppDesc: { fontSize: 12, marginTop: 2 },
  tipCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  tipEmoji: { fontSize: 18 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  cashbackGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  cashbackStat: { flex: 1, minWidth: "44%", padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  cashbackAmount: { fontSize: 22, fontWeight: "700" },
  cashbackLabel: { fontSize: 12, marginTop: 2 },
  addCardBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  addCardBtnText: { fontSize: 15, fontWeight: "600" },
  cashbackEntry: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  cashbackSourceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cashbackSourceText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  cashbackEntryDesc: { fontSize: 14, fontWeight: "500" },
  cashbackEntryDate: { fontSize: 11, marginTop: 2 },
  cashbackEntryAmount: { fontSize: 16, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalContent: { padding: 20, gap: 12 },
  couponFullImage: { width: "100%", height: 280, borderRadius: 12 },
  modalStoreName: { fontSize: 20, fontWeight: "700" },
  bigDiscountBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignSelf: "flex-start" },
  bigDiscountText: { fontSize: 18, fontWeight: "700" },
  modalDesc: { fontSize: 15, lineHeight: 22 },
  modalExpiry: { fontSize: 14, fontWeight: "600" },
  modalActions: { gap: 10, marginTop: 8 },
  modalBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  modalBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  bigLoyaltyCard: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10 },
  bigLoyaltyEmoji: { fontSize: 40 },
  bigLoyaltyStore: { color: "#fff", fontSize: 22, fontWeight: "700" },
  bigLoyaltyNumber: { color: "rgba(255,255,255,0.9)", fontSize: 20, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", letterSpacing: 3 },
  barcodeHint: { fontSize: 13, textAlign: "center", marginTop: 8 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOption: { width: 44, height: 44, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  iconOptionEmoji: { fontSize: 20 },
  sourceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  sourceChipText: { fontSize: 13, fontWeight: "600" },
});
