import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemCategory =
  | "produce" | "dairy" | "meat" | "bakery" | "frozen"
  | "beverages" | "snacks" | "household" | "personal" | "pharmacy"
  | "other";

export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
  createdAt: number;
  // v2.0 extensions
  category?: ItemCategory;
  quantity?: number;
  unit?: string;
  note?: string;
  photoUri?: string;
  barcode?: string;
  price?: number;
  isRecurring?: boolean;
  listId?: string; // which named list this belongs to (null = default)
}

export interface ShoppingList {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
  isDefault?: boolean;
}

export interface ListTemplate {
  id: string;
  name: string;
  items: Array<{ text: string; category?: ItemCategory; quantity?: number; unit?: string }>;
  createdAt: number;
}

export interface SavedStore {
  id: string;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  address?: string;
  addedAt: number;
}

export interface Coupon {
  id: string;
  imageUri: string;
  storeName?: string;
  description?: string;
  barcode?: string;
  addedAt: number;
  // v2.0 extensions
  expiryDate?: number; // timestamp
  discount?: string; // e.g. "$1.00 off" or "20% off"
  discountType?: "dollar" | "percent" | "bogo" | "other";
  category?: "grocery" | "restaurant" | "retail" | "online" | "other";
  source?: "camera" | "library" | "manual";
  notificationId?: string; // expo-notifications scheduled notification ID
  isUsed?: boolean;
}

export interface LoyaltyCard {
  id: string;
  storeName: string;
  cardNumber: string;
  barcodeType: "CODE128" | "EAN13" | "QR" | "CODE39";
  color: string; // hex color for card background
  logoEmoji: string;
  addedAt: number;
}

export interface TripLog {
  id: string;
  date: number; // timestamp
  storeName: string;
  storeId?: string;
  itemsBought: number;
  totalSpent: number;
  savedAmount: number; // from coupons
  notes?: string;
}

export interface BudgetSettings {
  weeklyBudget: number;
  monthlyBudget: number;
  currency: string;
}

export interface PurchaseHistoryItem {
  id: string;
  itemText: string;
  price?: number;
  date: number;
  storeName?: string;
  category?: ItemCategory;
  quantity?: number;
  unit?: string;
}

export interface Achievement {
  id: string;
  unlockedAt?: number; // timestamp, undefined = locked
  progress?: number; // for progress-based achievements
}

export interface CashbackEntry {
  id: string;
  amount: number;
  source: "ibotta" | "fetch" | "flipp" | "kroger" | "other";
  itemDescription: string;
  date: number;
}

export interface MealPlan {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  recipeName: string;
  recipeId?: string; // TheMealDB ID
  ingredients: Array<{ text: string; quantity?: string; unit?: string }>;
  addedAt: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
  createdAt: number;
}

export type Tier = "free" | "premium";
export type DistanceUnit = "miles" | "km";

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  SHOPPING_ITEMS: "r2b_shopping_items",
  SHOPPING_LISTS: "r2b_shopping_lists",
  LIST_TEMPLATES: "r2b_list_templates",
  SAVED_STORES: "r2b_saved_stores",
  COUPONS: "r2b_coupons",
  LOYALTY_CARDS: "r2b_loyalty_cards",
  TRIP_LOGS: "r2b_trip_logs",
  BUDGET_SETTINGS: "r2b_budget_settings",
  PURCHASE_HISTORY: "r2b_purchase_history",
  ACHIEVEMENTS: "r2b_achievements",
  CASHBACK_ENTRIES: "r2b_cashback_entries",
  MEAL_PLANS: "r2b_meal_plans",
  SAVINGS_GOALS: "r2b_savings_goals",
  TIER: "r2b_tier",
  TIER_EXPIRY: "r2b_tier_expiry",
  REFERRAL_CODE: "r2b_referral_code",
  ONBOARDING_DONE: "r2b_onboarding_done",
  ONBOARDING_STEP: "r2b_onboarding_step",
  REFERRAL_USED: "r2b_referral_used",
  DISTANCE_UNIT: "r2b_distance_unit",
  DEV_MODE: "r2b_dev_mode",
  SHOPPING_STREAK: "r2b_shopping_streak",
  LAST_TRIP_DATE: "r2b_last_trip_date",
} as const;

// ─── Free Tier Limits ─────────────────────────────────────────────────────────

export const FREE_STORE_LIMIT = 1;
export const FREE_ITEM_LIMIT = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Shopping Items ───────────────────────────────────────────────────────────

export async function getShoppingItems(listId?: string): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SHOPPING_ITEMS);
    const items: ShoppingItem[] = raw ? JSON.parse(raw) : [];
    if (listId !== undefined) {
      return items.filter((i) => (i.listId ?? "default") === listId);
    }
    return items;
  } catch {
    return [];
  }
}

export async function getAllShoppingItems(): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SHOPPING_ITEMS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveShoppingItems(items: ShoppingItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SHOPPING_ITEMS, JSON.stringify(items));
}

export async function addShoppingItem(
  text: string,
  opts?: Partial<Omit<ShoppingItem, "id" | "text" | "checked" | "createdAt">>
): Promise<ShoppingItem> {
  const items = await getAllShoppingItems();
  const newItem: ShoppingItem = {
    id: genId("item"),
    text: text.trim(),
    checked: false,
    createdAt: Date.now(),
    listId: "default",
    ...opts,
  };
  await saveShoppingItems([...items, newItem]);
  // Add to purchase history for autocomplete
  await addToPurchaseHistory({ itemText: text.trim(), category: opts?.category });
  return newItem;
}

export async function updateShoppingItem(id: string, updates: Partial<ShoppingItem>): Promise<void> {
  const items = await getAllShoppingItems();
  const updated = items.map((item) => item.id === id ? { ...item, ...updates } : item);
  await saveShoppingItems(updated);
}

export async function toggleShoppingItem(id: string): Promise<void> {
  const items = await getAllShoppingItems();
  const updated = items.map((item) =>
    item.id === id ? { ...item, checked: !item.checked } : item
  );
  await saveShoppingItems(updated);
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const items = await getAllShoppingItems();
  await saveShoppingItems(items.filter((item) => item.id !== id));
}

export async function clearCheckedItems(listId?: string): Promise<void> {
  const items = await getAllShoppingItems();
  if (listId) {
    await saveShoppingItems(items.filter((item) => !(item.checked && (item.listId ?? "default") === listId)));
  } else {
    await saveShoppingItems(items.filter((item) => !item.checked));
  }
}

export async function reorderShoppingItems(newOrder: ShoppingItem[]): Promise<void> {
  const allItems = await getAllShoppingItems();
  const reorderedIds = new Set(newOrder.map((i) => i.id));
  const otherItems = allItems.filter((i) => !reorderedIds.has(i.id));
  await saveShoppingItems([...newOrder, ...otherItems]);
}

// ─── Shopping Lists (Named Lists) ─────────────────────────────────────────────

export async function getShoppingLists(): Promise<ShoppingList[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SHOPPING_LISTS);
    const lists: ShoppingList[] = raw ? JSON.parse(raw) : [];
    // Always ensure default list exists
    if (!lists.find((l) => l.id === "default")) {
      const defaultList: ShoppingList = {
        id: "default",
        name: "My List",
        icon: "🛒",
        color: "#0a7ea4",
        createdAt: Date.now(),
        isDefault: true,
      };
      lists.unshift(defaultList);
      await AsyncStorage.setItem(KEYS.SHOPPING_LISTS, JSON.stringify(lists));
    }
    return lists;
  } catch {
    return [{ id: "default", name: "My List", icon: "🛒", color: "#0a7ea4", createdAt: Date.now(), isDefault: true }];
  }
}

export async function addShoppingList(name: string, icon: string, color: string): Promise<ShoppingList> {
  const lists = await getShoppingLists();
  const newList: ShoppingList = { id: genId("list"), name, icon, color, createdAt: Date.now() };
  await AsyncStorage.setItem(KEYS.SHOPPING_LISTS, JSON.stringify([...lists, newList]));
  return newList;
}

export async function deleteShoppingList(id: string): Promise<void> {
  if (id === "default") return; // can't delete default list
  const lists = await getShoppingLists();
  await AsyncStorage.setItem(KEYS.SHOPPING_LISTS, JSON.stringify(lists.filter((l) => l.id !== id)));
  // Move items from deleted list to default
  const items = await getAllShoppingItems();
  const updated = items.map((i) => i.listId === id ? { ...i, listId: "default" } : i);
  await saveShoppingItems(updated);
}

export async function updateShoppingList(id: string, updates: Partial<ShoppingList>): Promise<void> {
  const lists = await getShoppingLists();
  await AsyncStorage.setItem(KEYS.SHOPPING_LISTS, JSON.stringify(lists.map((l) => l.id === id ? { ...l, ...updates } : l)));
}

// ─── List Templates ───────────────────────────────────────────────────────────

export async function getListTemplates(): Promise<ListTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LIST_TEMPLATES);
    const templates: ListTemplate[] = raw ? JSON.parse(raw) : [];
    // Add built-in seasonal templates if none exist
    if (templates.length === 0) {
      return getBuiltInTemplates();
    }
    return templates;
  } catch {
    return getBuiltInTemplates();
  }
}

function getBuiltInTemplates(): ListTemplate[] {
  return [
    {
      id: "tpl_thanksgiving",
      name: "🦃 Thanksgiving Dinner",
      createdAt: 0,
      items: [
        { text: "Turkey", quantity: 1, unit: "whole" },
        { text: "Stuffing mix", category: "bakery" },
        { text: "Cranberry sauce", category: "other" },
        { text: "Sweet potatoes", category: "produce" },
        { text: "Green beans", category: "produce" },
        { text: "Butter", category: "dairy" },
        { text: "Heavy cream", category: "dairy" },
        { text: "Chicken broth", category: "other" },
        { text: "Pie crust", category: "bakery" },
        { text: "Pumpkin puree", category: "other" },
      ],
    },
    {
      id: "tpl_bbq",
      name: "🔥 Summer BBQ",
      createdAt: 0,
      items: [
        { text: "Burgers", category: "meat" },
        { text: "Hot dogs", category: "meat" },
        { text: "Buns", category: "bakery" },
        { text: "Corn on the cob", category: "produce" },
        { text: "Potato salad", category: "other" },
        { text: "Ketchup", category: "other" },
        { text: "Mustard", category: "other" },
        { text: "Chips", category: "snacks" },
        { text: "Lemonade", category: "beverages" },
        { text: "Ice cream", category: "frozen" },
      ],
    },
    {
      id: "tpl_weekly",
      name: "📅 Weekly Staples",
      createdAt: 0,
      items: [
        { text: "Milk", category: "dairy", quantity: 1, unit: "gallon" },
        { text: "Eggs", category: "dairy", quantity: 1, unit: "dozen" },
        { text: "Bread", category: "bakery", quantity: 1, unit: "loaf" },
        { text: "Bananas", category: "produce" },
        { text: "Apples", category: "produce" },
        { text: "Chicken breast", category: "meat" },
        { text: "Pasta", category: "other" },
        { text: "Tomato sauce", category: "other" },
        { text: "Yogurt", category: "dairy" },
        { text: "Orange juice", category: "beverages" },
      ],
    },
    {
      id: "tpl_christmas",
      name: "🎄 Christmas Baking",
      createdAt: 0,
      items: [
        { text: "Flour", category: "bakery", quantity: 5, unit: "lbs" },
        { text: "Sugar", category: "other", quantity: 2, unit: "lbs" },
        { text: "Brown sugar", category: "other" },
        { text: "Butter", category: "dairy", quantity: 2, unit: "lbs" },
        { text: "Eggs", category: "dairy", quantity: 2, unit: "dozen" },
        { text: "Vanilla extract", category: "other" },
        { text: "Baking soda", category: "other" },
        { text: "Chocolate chips", category: "snacks" },
        { text: "Powdered sugar", category: "other" },
        { text: "Food coloring", category: "other" },
      ],
    },
  ];
}

export async function saveListTemplate(name: string, items: ListTemplate["items"]): Promise<ListTemplate> {
  const templates = await getListTemplates();
  const newTemplate: ListTemplate = { id: genId("tpl"), name, items, createdAt: Date.now() };
  const userTemplates = templates.filter((t) => !t.id.startsWith("tpl_thanksgiving") && !t.id.startsWith("tpl_bbq") && !t.id.startsWith("tpl_weekly") && !t.id.startsWith("tpl_christmas"));
  await AsyncStorage.setItem(KEYS.LIST_TEMPLATES, JSON.stringify([...userTemplates, newTemplate]));
  return newTemplate;
}

export async function deleteListTemplate(id: string): Promise<void> {
  const templates = await getListTemplates();
  const userTemplates = templates.filter((t) => t.id !== id && !["tpl_thanksgiving", "tpl_bbq", "tpl_weekly", "tpl_christmas"].includes(t.id));
  await AsyncStorage.setItem(KEYS.LIST_TEMPLATES, JSON.stringify(userTemplates));
}

// ─── Saved Stores ─────────────────────────────────────────────────────────────

export async function getSavedStores(): Promise<SavedStore[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED_STORES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveSavedStores(stores: SavedStore[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SAVED_STORES, JSON.stringify(stores));
}

export async function addSavedStore(store: Omit<SavedStore, "id" | "addedAt">): Promise<SavedStore> {
  const stores = await getSavedStores();
  const newStore: SavedStore = { ...store, id: genId("store"), addedAt: Date.now() };
  await saveSavedStores([...stores, newStore]);
  return newStore;
}

export async function removeSavedStore(id: string): Promise<void> {
  const stores = await getSavedStores();
  await saveSavedStores(stores.filter((s) => s.id !== id));
}

export const deleteSavedStore = removeSavedStore;

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.COUPONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCoupons(coupons: Coupon[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.COUPONS, JSON.stringify(coupons));
}

export async function addCoupon(coupon: Omit<Coupon, "id" | "addedAt">): Promise<Coupon> {
  const coupons = await getCoupons();
  const newCoupon: Coupon = { ...coupon, id: genId("coupon"), addedAt: Date.now() };
  await saveCoupons([...coupons, newCoupon]);
  return newCoupon;
}

export async function updateCoupon(id: string, updates: Partial<Coupon>): Promise<void> {
  const coupons = await getCoupons();
  await saveCoupons(coupons.map((c) => c.id === id ? { ...c, ...updates } : c));
}

export async function deleteCoupon(id: string): Promise<void> {
  const coupons = await getCoupons();
  await saveCoupons(coupons.filter((c) => c.id !== id));
}

export async function markCouponUsed(id: string): Promise<void> {
  await updateCoupon(id, { isUsed: true });
}

// ─── Loyalty Cards ────────────────────────────────────────────────────────────

export async function getLoyaltyCards(): Promise<LoyaltyCard[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LOYALTY_CARDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addLoyaltyCard(card: Omit<LoyaltyCard, "id" | "addedAt">): Promise<LoyaltyCard> {
  const cards = await getLoyaltyCards();
  const newCard: LoyaltyCard = { ...card, id: genId("lcard"), addedAt: Date.now() };
  await AsyncStorage.setItem(KEYS.LOYALTY_CARDS, JSON.stringify([...cards, newCard]));
  return newCard;
}

export async function deleteLoyaltyCard(id: string): Promise<void> {
  const cards = await getLoyaltyCards();
  await AsyncStorage.setItem(KEYS.LOYALTY_CARDS, JSON.stringify(cards.filter((c) => c.id !== id)));
}

// ─── Trip Logs ────────────────────────────────────────────────────────────────

export async function getTripLogs(): Promise<TripLog[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.TRIP_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addTripLog(trip: Omit<TripLog, "id">): Promise<TripLog> {
  const trips = await getTripLogs();
  const newTrip: TripLog = { ...trip, id: genId("trip") };
  await AsyncStorage.setItem(KEYS.TRIP_LOGS, JSON.stringify([newTrip, ...trips]));
  // Update streak
  await updateShoppingStreak();
  return newTrip;
}

export async function deleteTripLog(id: string): Promise<void> {
  const trips = await getTripLogs();
  await AsyncStorage.setItem(KEYS.TRIP_LOGS, JSON.stringify(trips.filter((t) => t.id !== id)));
}

// ─── Budget Settings ──────────────────────────────────────────────────────────

export async function getBudgetSettings(): Promise<BudgetSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BUDGET_SETTINGS);
    return raw ? JSON.parse(raw) : { weeklyBudget: 0, monthlyBudget: 0, currency: "USD" };
  } catch {
    return { weeklyBudget: 0, monthlyBudget: 0, currency: "USD" };
  }
}

export async function saveBudgetSettings(settings: BudgetSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.BUDGET_SETTINGS, JSON.stringify(settings));
}

// ─── Purchase History (for autocomplete + price book) ─────────────────────────

export async function getPurchaseHistory(): Promise<PurchaseHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PURCHASE_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToPurchaseHistory(item: Partial<PurchaseHistoryItem> & { itemText: string }): Promise<void> {
  try {
    const history = await getPurchaseHistory();
    // Deduplicate by itemText (case-insensitive) — update existing entry
    const existing = history.find((h) => h.itemText.toLowerCase() === item.itemText.toLowerCase());
    if (existing) {
      const updated = history.map((h) =>
        h.itemText.toLowerCase() === item.itemText.toLowerCase()
          ? { ...h, date: Date.now(), price: item.price ?? h.price }
          : h
      );
      await AsyncStorage.setItem(KEYS.PURCHASE_HISTORY, JSON.stringify(updated));
    } else {
      const newEntry: PurchaseHistoryItem = {
        id: genId("hist"),
        itemText: item.itemText,
        date: Date.now(),
        price: item.price,
        storeName: item.storeName,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
      };
      // Keep last 500 items
      const trimmed = [newEntry, ...history].slice(0, 500);
      await AsyncStorage.setItem(KEYS.PURCHASE_HISTORY, JSON.stringify(trimmed));
    }
  } catch {
    // non-critical, ignore
  }
}

export async function getRecentItems(limit = 20): Promise<string[]> {
  try {
    const history = await getPurchaseHistory();
    return history
      .sort((a, b) => b.date - a.date)
      .slice(0, limit)
      .map((h) => h.itemText);
  } catch {
    return [];
  }
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export const ACHIEVEMENT_DEFS = [
  { id: "first_item", title: "First Step", desc: "Add your first item", emoji: "🌱", target: 1 },
  { id: "first_store", title: "Store Scout", desc: "Add your first store", emoji: "🏪", target: 1 },
  { id: "ten_items", title: "List Builder", desc: "Add 10 items total", emoji: "📝", target: 10 },
  { id: "first_trip", title: "First Trip", desc: "Log your first shopping trip", emoji: "🛒", target: 1 },
  { id: "five_trips", title: "Regular Shopper", desc: "Complete 5 shopping trips", emoji: "🏆", target: 5 },
  { id: "twenty_trips", title: "Shopping Pro", desc: "Complete 20 shopping trips", emoji: "⭐", target: 20 },
  { id: "first_coupon", title: "Coupon Clipper", desc: "Save your first coupon", emoji: "✂️", target: 1 },
  { id: "ten_coupons", title: "Deal Hunter", desc: "Save 10 coupons", emoji: "🎯", target: 10 },
  { id: "save_10", title: "Saver", desc: "Save $10 with coupons", emoji: "💰", target: 10 },
  { id: "save_50", title: "Smart Shopper", desc: "Save $50 with coupons", emoji: "💎", target: 50 },
  { id: "save_100", title: "Savings Master", desc: "Save $100 with coupons", emoji: "👑", target: 100 },
  { id: "streak_3", title: "On a Roll", desc: "Shop 3 weeks in a row", emoji: "🔥", target: 3 },
  { id: "streak_7", title: "Dedicated", desc: "Shop 7 weeks in a row", emoji: "🌟", target: 7 },
  { id: "first_loyalty", title: "Card Carrier", desc: "Add your first loyalty card", emoji: "💳", target: 1 },
  { id: "meal_planner", title: "Meal Planner", desc: "Plan your first meal", emoji: "🍽️", target: 1 },
] as const;

export type AchievementId = typeof ACHIEVEMENT_DEFS[number]["id"];

export async function getAchievements(): Promise<Record<string, Achievement>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function unlockAchievement(id: AchievementId): Promise<boolean> {
  const achievements = await getAchievements();
  if (achievements[id]?.unlockedAt) return false; // already unlocked
  achievements[id] = { id, unlockedAt: Date.now() };
  await AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  return true; // newly unlocked
}

export async function updateAchievementProgress(id: AchievementId, progress: number): Promise<boolean> {
  const achievements = await getAchievements();
  const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
  if (!def) return false;
  if (achievements[id]?.unlockedAt) return false; // already unlocked
  if (progress >= def.target) {
    return unlockAchievement(id);
  }
  achievements[id] = { id, progress };
  await AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  return false;
}

// ─── Cashback Tracker ─────────────────────────────────────────────────────────

export async function getCashbackEntries(): Promise<CashbackEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CASHBACK_ENTRIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addCashbackEntry(entry: Omit<CashbackEntry, "id">): Promise<CashbackEntry> {
  const entries = await getCashbackEntries();
  const newEntry: CashbackEntry = { ...entry, id: genId("cash") };
  await AsyncStorage.setItem(KEYS.CASHBACK_ENTRIES, JSON.stringify([newEntry, ...entries]));
  // Check savings achievements
  const total = [...entries, newEntry].reduce((sum, e) => sum + e.amount, 0);
  if (total >= 100) await unlockAchievement("save_100");
  else if (total >= 50) await unlockAchievement("save_50");
  else if (total >= 10) await unlockAchievement("save_10");
  return newEntry;
}

export async function getTotalCashback(): Promise<{ week: number; month: number; year: number; allTime: number }> {
  const entries = await getCashbackEntries();
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
  return {
    week: entries.filter((e) => e.date >= weekAgo).reduce((s, e) => s + e.amount, 0),
    month: entries.filter((e) => e.date >= monthAgo).reduce((s, e) => s + e.amount, 0),
    year: entries.filter((e) => e.date >= yearAgo).reduce((s, e) => s + e.amount, 0),
    allTime: entries.reduce((s, e) => s + e.amount, 0),
  };
}

// ─── Meal Plans ───────────────────────────────────────────────────────────────

export async function getMealPlans(): Promise<MealPlan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.MEAL_PLANS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addMealPlan(plan: Omit<MealPlan, "id" | "addedAt">): Promise<MealPlan> {
  const plans = await getMealPlans();
  const newPlan: MealPlan = { ...plan, id: genId("meal"), addedAt: Date.now() };
  await AsyncStorage.setItem(KEYS.MEAL_PLANS, JSON.stringify([...plans, newPlan]));
  await unlockAchievement("meal_planner");
  return newPlan;
}

export async function deleteMealPlan(id: string): Promise<void> {
  const plans = await getMealPlans();
  await AsyncStorage.setItem(KEYS.MEAL_PLANS, JSON.stringify(plans.filter((p) => p.id !== id)));
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVINGS_GOALS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addSavingsGoal(goal: Omit<SavingsGoal, "id" | "createdAt">): Promise<SavingsGoal> {
  const goals = await getSavingsGoals();
  const newGoal: SavingsGoal = { ...goal, id: genId("goal"), createdAt: Date.now() };
  await AsyncStorage.setItem(KEYS.SAVINGS_GOALS, JSON.stringify([...goals, newGoal]));
  return newGoal;
}

export async function updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<void> {
  const goals = await getSavingsGoals();
  await AsyncStorage.setItem(KEYS.SAVINGS_GOALS, JSON.stringify(goals.map((g) => g.id === id ? { ...g, ...updates } : g)));
}

// ─── Shopping Streak ──────────────────────────────────────────────────────────

export async function getShoppingStreak(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SHOPPING_STREAK);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

async function updateShoppingStreak(): Promise<void> {
  try {
    const lastTrip = await AsyncStorage.getItem(KEYS.LAST_TRIP_DATE);
    const now = new Date();
    const thisWeek = `${now.getFullYear()}-W${getWeekNumber(now)}`;
    if (lastTrip === thisWeek) return; // already counted this week
    const lastWeek = getLastWeekString(now);
    const streak = await getShoppingStreak();
    const newStreak = lastTrip === lastWeek ? streak + 1 : 1;
    await AsyncStorage.setItem(KEYS.SHOPPING_STREAK, String(newStreak));
    await AsyncStorage.setItem(KEYS.LAST_TRIP_DATE, thisWeek);
    if (newStreak >= 7) await unlockAchievement("streak_7");
    else if (newStreak >= 3) await unlockAchievement("streak_3");
  } catch {
    // non-critical
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getLastWeekString(date: Date): string {
  const lastWeek = new Date(date);
  lastWeek.setDate(lastWeek.getDate() - 7);
  return `${lastWeek.getFullYear()}-W${getWeekNumber(lastWeek)}`;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function getTier(): Promise<Tier> {
  try {
    const expiry = await AsyncStorage.getItem(KEYS.TIER_EXPIRY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      await AsyncStorage.setItem(KEYS.TIER, "free");
      await AsyncStorage.removeItem(KEYS.TIER_EXPIRY);
      return "free";
    }
    const val = await AsyncStorage.getItem(KEYS.TIER);
    return (val as Tier) ?? "free";
  } catch {
    return "free";
  }
}

export async function setTier(tier: Tier, expiryMs?: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.TIER, tier);
  if (expiryMs) {
    await AsyncStorage.setItem(KEYS.TIER_EXPIRY, String(Date.now() + expiryMs));
  } else {
    await AsyncStorage.removeItem(KEYS.TIER_EXPIRY);
  }
}

// ─── Referral ─────────────────────────────────────────────────────────────────

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "R2B-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getReferralCode(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(KEYS.REFERRAL_CODE);
    if (existing) return existing;
    const code = generateReferralCode();
    await AsyncStorage.setItem(KEYS.REFERRAL_CODE, code);
    return code;
  } catch {
    return "R2B-ERROR";
  }
}

export async function applyReferralCode(code: string): Promise<boolean> {
  try {
    const myCode = await getReferralCode();
    if (code.toUpperCase() === myCode.toUpperCase()) return false;
    const alreadyUsed = await AsyncStorage.getItem(KEYS.REFERRAL_USED);
    if (alreadyUsed) return false;
    await setTier("premium", 7 * 24 * 60 * 60 * 1000);
    await AsyncStorage.setItem(KEYS.REFERRAL_USED, "1");
    return true;
  } catch {
    return false;
  }
}

// ─── Distance Unit ───────────────────────────────────────────────────────────

export async function getDistanceUnit(): Promise<DistanceUnit> {
  try {
    const val = await AsyncStorage.getItem(KEYS.DISTANCE_UNIT);
    if (val === "miles" || val === "km") return val;
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "en-US";
    return locale.toLowerCase().includes("us") ? "miles" : "km";
  } catch {
    return "miles";
  }
}

export async function setDistanceUnit(unit: DistanceUnit): Promise<void> {
  await AsyncStorage.setItem(KEYS.DISTANCE_UNIT, unit);
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export async function isOnboardingDone(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
    return val === "1";
  } catch {
    return false;
  }
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, "1");
  await AsyncStorage.removeItem(KEYS.ONBOARDING_STEP);
}

export async function saveOnboardingStep(step: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_STEP, String(step));
}

export async function getSavedOnboardingStep(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_STEP);
    if (val === null) return 0;
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

// ─── Developer Mode ───────────────────────────────────────────────────────────

export async function isDevModeEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.DEV_MODE);
    return val === "1";
  } catch {
    return false;
  }
}

export async function setDevModeEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.DEV_MODE, enabled ? "1" : "0");
}
