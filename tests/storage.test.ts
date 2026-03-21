import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
    },
  };
});

import {
  getShoppingItems,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  getSavedStores,
  addSavedStore,
  deleteSavedStore,
  getCoupons,
  addCoupon,
  deleteCoupon,
  getTier,
  setTier,
  getReferralCode,
  applyReferralCode,
  isOnboardingDone,
  markOnboardingDone,
  FREE_STORE_LIMIT,
  FREE_ITEM_LIMIT,
} from "../lib/storage";

describe("Shopping Items", () => {
  it("starts with empty list", async () => {
    const items = await getShoppingItems();
    expect(items).toEqual([]);
  });

  it("adds an item", async () => {
    const item = await addShoppingItem("Milk");
    expect(item.text).toBe("Milk");
    expect(item.checked).toBe(false);
    expect(item.id).toMatch(/^item_/);
  });

  it("toggles an item checked state", async () => {
    const item = await addShoppingItem("Eggs");
    await toggleShoppingItem(item.id);
    const items = await getShoppingItems();
    const found = items.find((i) => i.id === item.id);
    expect(found?.checked).toBe(true);
  });

  it("deletes an item", async () => {
    const item = await addShoppingItem("Bread");
    await deleteShoppingItem(item.id);
    const items = await getShoppingItems();
    expect(items.find((i) => i.id === item.id)).toBeUndefined();
  });

  it("clears only checked items", async () => {
    const a = await addShoppingItem("Butter");
    const b = await addShoppingItem("Cheese");
    await toggleShoppingItem(a.id);
    await clearCheckedItems();
    const items = await getShoppingItems();
    expect(items.find((i) => i.id === a.id)).toBeUndefined();
    expect(items.find((i) => i.id === b.id)).toBeDefined();
  });
});

describe("Saved Stores", () => {
  it("starts with empty list", async () => {
    const stores = await getSavedStores();
    expect(stores).toEqual([]);
  });

  it("adds a store", async () => {
    const store = await addSavedStore({ name: "Walmart", lat: 37.7749, lng: -122.4194 });
    expect(store.name).toBe("Walmart");
    expect(store.id).toMatch(/^store_/);
  });

  it("deletes a store", async () => {
    const store = await addSavedStore({ name: "Target", lat: 37.7749, lng: -122.4194 });
    await deleteSavedStore(store.id);
    const stores = await getSavedStores();
    expect(stores.find((s) => s.id === store.id)).toBeUndefined();
  });
});

describe("Coupons", () => {
  it("starts with empty list", async () => {
    const coupons = await getCoupons();
    expect(coupons).toEqual([]);
  });

  it("adds a coupon", async () => {
    const coupon = await addCoupon({ imageUri: "file:///test.jpg" });
    expect(coupon.imageUri).toBe("file:///test.jpg");
    expect(coupon.id).toMatch(/^coupon_/);
  });

  it("deletes a coupon", async () => {
    const coupon = await addCoupon({ imageUri: "file:///test2.jpg" });
    await deleteCoupon(coupon.id);
    const coupons = await getCoupons();
    expect(coupons.find((c) => c.id === coupon.id)).toBeUndefined();
  });
});

describe("Tier / Subscription", () => {
  it("defaults to free tier", async () => {
    const tier = await getTier();
    expect(tier).toBe("free");
  });

  it("sets premium tier", async () => {
    await setTier("premium");
    const tier = await getTier();
    expect(tier).toBe("premium");
  });

  it("free tier limits are defined correctly", () => {
    expect(FREE_STORE_LIMIT).toBe(1);
    expect(FREE_ITEM_LIMIT).toBe(3);
  });
});

describe("Referral", () => {
  it("generates a referral code starting with R2B-", async () => {
    const code = await getReferralCode();
    expect(code).toMatch(/^R2B-/);
  });

  it("returns the same code on subsequent calls", async () => {
    const code1 = await getReferralCode();
    const code2 = await getReferralCode();
    expect(code1).toBe(code2);
  });

  it("rejects own referral code", async () => {
    const myCode = await getReferralCode();
    const result = await applyReferralCode(myCode);
    expect(result).toBe(false);
  });
});

describe("Onboarding", () => {
  it("starts as not done", async () => {
    const done = await isOnboardingDone();
    expect(done).toBe(false);
  });

  it("marks onboarding as done", async () => {
    await markOnboardingDone();
    const done = await isOnboardingDone();
    expect(done).toBe(true);
  });
});
