import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShoppingItem {
  id: string;
  text: string;
  checked: boolean;
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
}

export type Tier = "free" | "premium";
export type DistanceUnit = "miles" | "km";

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  SHOPPING_ITEMS: "r2b_shopping_items",
  SAVED_STORES: "r2b_saved_stores",
  COUPONS: "r2b_coupons",
  TIER: "r2b_tier",
  TIER_EXPIRY: "r2b_tier_expiry",
  REFERRAL_CODE: "r2b_referral_code",
  ONBOARDING_DONE: "r2b_onboarding_done",
  ONBOARDING_STEP: "r2b_onboarding_step",
  REFERRAL_USED: "r2b_referral_used",
  DISTANCE_UNIT: "r2b_distance_unit",
  DEV_MODE: "r2b_dev_mode",
} as const;

// ─── Free Tier Limits ─────────────────────────────────────────────────────────

export const FREE_STORE_LIMIT = 1;
export const FREE_ITEM_LIMIT = 3;

// ─── Shopping Items ───────────────────────────────────────────────────────────

export async function getShoppingItems(): Promise<ShoppingItem[]> {
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

export async function addShoppingItem(text: string): Promise<ShoppingItem> {
  const items = await getShoppingItems();
  const newItem: ShoppingItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    checked: false,
    createdAt: Date.now(),
  };
  await saveShoppingItems([...items, newItem]);
  return newItem;
}

export async function toggleShoppingItem(id: string): Promise<void> {
  const items = await getShoppingItems();
  const updated = items.map((item) =>
    item.id === id ? { ...item, checked: !item.checked } : item
  );
  await saveShoppingItems(updated);
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const items = await getShoppingItems();
  await saveShoppingItems(items.filter((item) => item.id !== id));
}

export async function clearCheckedItems(): Promise<void> {
  const items = await getShoppingItems();
  await saveShoppingItems(items.filter((item) => !item.checked));
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
  const newStore: SavedStore = {
    ...store,
    id: `store_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    addedAt: Date.now(),
  };
  await saveSavedStores([...stores, newStore]);
  return newStore;
}

export async function removeSavedStore(id: string): Promise<void> {
  const stores = await getSavedStores();
  await saveSavedStores(stores.filter((s) => s.id !== id));
}

// Alias for removeSavedStore
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
  const newCoupon: Coupon = {
    ...coupon,
    id: `coupon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    addedAt: Date.now(),
  };
  await saveCoupons([...coupons, newCoupon]);
  return newCoupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  const coupons = await getCoupons();
  await saveCoupons(coupons.filter((c) => c.id !== id));
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function getTier(): Promise<Tier> {
  try {
    const expiry = await AsyncStorage.getItem(KEYS.TIER_EXPIRY);
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      // Premium expired
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
    if (code.toUpperCase() === myCode.toUpperCase()) return false; // Can't use own code
    const alreadyUsed = await AsyncStorage.getItem(KEYS.REFERRAL_USED);
    if (alreadyUsed) return false;
    // Give 1 week premium (7 days)
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
    // Default: miles for US locale, km elsewhere
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
  // Clear the saved step when onboarding is complete
  await AsyncStorage.removeItem(KEYS.ONBOARDING_STEP);
}

/**
 * Persist the current onboarding step index so the app can resume
 * after Android kills the process during background location permission grant.
 */
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
