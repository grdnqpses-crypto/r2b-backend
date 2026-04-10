import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Coupon, ShoppingItem, SavedStore } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CouponMatch {
  coupon: Coupon;
  matchedItems: ShoppingItem[]; // items on the list that this coupon applies to
  matchScore: number; // 0-100, higher = better match
  isExpiringSoon: boolean; // expires within 48 hours
  isExpired: boolean;
  savingsText: string; // e.g. "$1.50 off" or "20% off"
}

export interface SavingsStack {
  coupons: CouponMatch[];
  totalEstimatedSavings: number; // in dollars
  storeNames: string[];
}

const KEYS = {
  LAST_COUPON_NOTIFICATION: "r2b_last_coupon_notif",
} as const;

// ─── Match Engine ─────────────────────────────────────────────────────────────

/**
 * Match coupons to the current shopping list and nearby store.
 * Returns ranked matches sorted by relevance.
 */
export function matchCouponsToList(
  coupons: Coupon[],
  items: ShoppingItem[],
  storeName?: string
): CouponMatch[] {
  const now = Date.now();
  const uncheckedItems = items.filter((i) => !i.checked);

  const matches: CouponMatch[] = coupons
    .map((coupon): CouponMatch | null => {
      const isExpired = coupon.expiryDate ? coupon.expiryDate < now : false;
      const isExpiringSoon = coupon.expiryDate
        ? coupon.expiryDate > now && coupon.expiryDate - now < 48 * 60 * 60 * 1000
        : false;

      if (isExpired || coupon.isUsed) return null;

      // Score: store match (40pts) + item match (up to 40pts) + expiry urgency (20pts)
      let score = 0;
      const matchedItems: ShoppingItem[] = [];

      // Store name match
      if (coupon.storeName && storeName) {
        const couponStore = coupon.storeName.toLowerCase();
        const nearbyStore = storeName.toLowerCase();
        if (couponStore === nearbyStore || nearbyStore.includes(couponStore) || couponStore.includes(nearbyStore)) {
          score += 40;
        }
      } else if (!coupon.storeName) {
        // Generic coupon — partial score
        score += 15;
      }

      // Item text match
      if (coupon.description) {
        const desc = coupon.description.toLowerCase();
        for (const item of uncheckedItems) {
          const itemText = item.text.toLowerCase();
          // Check if any word in item text appears in coupon description
          const words = itemText.split(/\s+/).filter((w) => w.length > 2);
          const hasMatch = words.some((w) => desc.includes(w));
          if (hasMatch) {
            matchedItems.push(item);
            score += Math.min(40, score + 10); // up to 40 pts from items
          }
        }
      }

      // Expiry urgency bonus
      if (isExpiringSoon) score += 20;

      // Must have at least some relevance
      if (score < 10) return null;

      return {
        coupon,
        matchedItems,
        matchScore: Math.min(100, score),
        isExpiringSoon,
        isExpired: false,
        savingsText: formatSavings(coupon),
      };
    })
    .filter((m): m is CouponMatch => m !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  return matches;
}

/**
 * Build a savings stack from matched coupons.
 * Estimates total dollar savings.
 */
export function buildSavingsStack(matches: CouponMatch[]): SavingsStack {
  const storeNames = [
    ...new Set(
      matches
        .map((m) => m.coupon.storeName)
        .filter((s): s is string => Boolean(s))
    ),
  ];

  let totalEstimatedSavings = 0;
  for (const match of matches) {
    const { coupon } = match;
    if (coupon.discountType === "dollar" && coupon.discount) {
      const amount = parseFloat(coupon.discount.replace(/[^0-9.]/g, ""));
      if (!isNaN(amount)) totalEstimatedSavings += amount;
    } else if (coupon.discountType === "percent" && coupon.discount) {
      // Estimate $2 average item price × percent
      const pct = parseFloat(coupon.discount.replace(/[^0-9.]/g, ""));
      if (!isNaN(pct)) totalEstimatedSavings += (2 * pct) / 100;
    } else {
      // Unknown type — estimate $1
      totalEstimatedSavings += 1;
    }
  }

  return {
    coupons: matches,
    totalEstimatedSavings: Math.round(totalEstimatedSavings * 100) / 100,
    storeNames,
  };
}

/**
 * Check if we should show a coupon proximity notification.
 * Rate-limited to once per 30 minutes per store.
 */
export async function shouldShowCouponProximityAlert(storeName: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LAST_COUPON_NOTIFICATION);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const last = map[storeName] ?? 0;
    return Date.now() - last > 30 * 60 * 1000;
  } catch {
    return true;
  }
}

export async function markCouponProximityAlertShown(storeName: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.LAST_COUPON_NOTIFICATION);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[storeName] = Date.now();
    await AsyncStorage.setItem(KEYS.LAST_COUPON_NOTIFICATION, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSavings(coupon: Coupon): string {
  if (coupon.discount) return coupon.discount;
  if (coupon.discountType === "bogo") return "Buy 1 Get 1";
  return "Savings available";
}

/** Check if a coupon expires within N hours */
export function expiresWithinHours(coupon: Coupon, hours: number): boolean {
  if (!coupon.expiryDate) return false;
  const diff = coupon.expiryDate - Date.now();
  return diff > 0 && diff < hours * 60 * 60 * 1000;
}

/** Get coupons expiring today */
export function getExpiringToday(coupons: Coupon[]): Coupon[] {
  return coupons.filter((c) => !c.isUsed && expiresWithinHours(c, 24));
}
