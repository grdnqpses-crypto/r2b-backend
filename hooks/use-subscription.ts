/**
 * use-subscription.ts
 *
 * Native Google Play Billing subscription hook using react-native-iap v14 (Nitro Modules).
 *
 * CRASH PREVENTION STRATEGY:
 * react-native-iap v14 uses react-native-nitro-modules (JSI). When the native Nitro
 * module is absent (Expo Go, any build without native linking), importing the library
 * throws a fatal error that cannot be caught with try/catch because it happens at
 * module evaluation time (TurboModuleRegistry.getEnforcing throws synchronously).
 *
 * Guard: check global.NitroModulesProxy before any dynamic import of react-native-iap.
 * This is the actual object Nitro installs into the JS global — if it's null/undefined,
 * the native module is not linked and we must not import the library at all.
 *
 * Fallback: pure AsyncStorage-based status tracking (no billing calls).
 * The app works normally in dev/Expo Go; real billing only activates in production EAS builds.
 *
 * Subscription product: premium_weekly_199
 *   - $1.99 / week, auto-renewing
 *   - No free trial
 *   - Base Plan ID: premium-weekly
 *   - Freemium model: free tier = 1 store + 3 items (no coupons)
 *   - Package: com.remember2buy.shopping
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// ─── Native module availability check ─────────────────────────────────────────

/**
 * Returns true ONLY when:
 *  1. We are on Android (IAP is Android-only in this app)
 *  2. The Nitro runtime is installed (global.NitroModulesProxy exists)
 *
 * This is the correct guard for react-native-iap v14 which uses Nitro Modules.
 * Checking NativeModules.RNIapModule (old API) is WRONG for v14 — it will always
 * be undefined even in production builds, causing the guard to fail.
 *
 * Safe to call synchronously at any point — reads only from the JS global.
 */
function isIAPAvailable(): boolean {
  if (Platform.OS !== "android") return false;
  // NitroModulesProxy is installed into global by react-native-nitro-modules
  // when the native TurboModule is linked. If it's absent, any import of
  // react-native-iap will throw a fatal ModuleNotFoundError.
  return typeof (global as Record<string, unknown>).NitroModulesProxy !== "undefined";
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_SKU = "premium_weekly_199";
export const ANNUAL_SKU = "premium_annual_5999";
/** Weekly price shown to users */
export const SUBSCRIPTION_PRICE = "$1.99";
/** Annual price shown to users */
export const ANNUAL_PRICE = "$59.99";
/** Play Store URL for fallback when IAP is unavailable */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.remember2buy.shopping";

const STORAGE_STATUS_KEY = "@r2b_subscription_status";
const STORAGE_CONSENT_KEY = "@r2b_subscription_consented";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "loading"
  | "none"       // free tier — no active subscription
  | "active"     // paid subscription active
  | "expired"    // subscription lapsed
  | "cancelled"; // user cancelled but still within paid period

export interface SubscriptionState {
  /** True when status is "active" */
  hasAccess: boolean;
  status: SubscriptionStatus;
  loading: boolean;
  /** Whether the IAP connection is ready for purchases */
  iapReady: boolean;
  /** Whether the user has seen and agreed to the subscription consent screen */
  hasConsented: boolean;
  /**
   * Initiate a weekly ($1.99/week) purchase via Google Play Billing.
   * THROWS an Error if IAP is unavailable or connection is not ready.
   */
  purchase: () => Promise<void>;
  /**
   * Initiate an annual ($59.99/year) purchase via Google Play Billing.
   * THROWS an Error if IAP is unavailable or connection is not ready.
   */
  purchaseAnnual: () => Promise<void>;
  /** Restore previous purchases */
  restore: () => Promise<void>;
  /** Refresh subscription status from Play Store */
  refresh: () => Promise<void>;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionState {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [loading, setLoading] = useState(true);
  const [iapReady, setIapReady] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerToken, setOfferToken] = useState<string | null>(null);
  const [annualOfferToken, setAnnualOfferToken] = useState<string | null>(null);
  const connectionRef = useRef(false);
  const purchaseListenerRef = useRef<{ remove: () => void } | null>(null);
  const errorListenerRef = useRef<{ remove: () => void } | null>(null);

  // ── Determine status from persisted data + Play Store ──────────────────────
  const refreshStatus = useCallback(async () => {
    try {
      // 1. Check for active Play Store purchases (Android + Nitro only)
      if (isIAPAvailable() && connectionRef.current) {
        try {
          const { getAvailablePurchases } = await import("react-native-iap");
          const purchases = await getAvailablePurchases();
          const activeSub = purchases.find(
            (p) => p.productId === SUBSCRIPTION_SKU && p.purchaseToken
          );
          if (activeSub) {
            await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
            setStatus("active");
            setLoading(false);
            return;
          }
        } catch {
          // getAvailablePurchases failed — fall through to local check
        }
      }

      // 2. Check locally stored subscription status
      const [storedStatus, consentedStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_STATUS_KEY),
        AsyncStorage.getItem(STORAGE_CONSENT_KEY),
      ]);

      setHasConsented(consentedStr === "true");

      if (storedStatus === "active") {
        setStatus("active");
      } else if (storedStatus === "cancelled") {
        setStatus("cancelled");
      } else if (storedStatus === "expired") {
        setStatus("expired");
      } else {
        setStatus("none");
      }
    } catch {
      // On web or simulator, default to free tier
      setStatus("none");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initialize IAP connection (only when Nitro is available) ───────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!isIAPAvailable()) {
          // Nitro not available — use local status tracking only
          await refreshStatus();
          return;
        }

        const {
          initConnection,
          fetchProducts,
          purchaseUpdatedListener,
          purchaseErrorListener,
          finishTransaction,
        } = await import("react-native-iap");

        await initConnection();
        connectionRef.current = true;
        if (mounted) setIapReady(true);

        // Fetch both subscription products to get offer tokens
        try {
          const products = await fetchProducts({ skus: [SUBSCRIPTION_SKU, ANNUAL_SKU] });
          if (mounted && products && products.length > 0) {
            for (const product of products) {
              const sub = product as {
                productId?: string;
                subscriptionOfferDetailsAndroid?: Array<{
                  offerToken: string;
                  pricingPhases?: Array<{ formattedPrice?: string; priceAmountMicros?: string }>;
                }>;
              };
              const offerDetails = sub.subscriptionOfferDetailsAndroid;
              if (offerDetails && offerDetails.length > 0) {
                const baseOffer =
                  offerDetails.find((o) =>
                    o.pricingPhases?.every((p) => p.priceAmountMicros !== "0")
                  ) ?? offerDetails[0];
                if (sub.productId === SUBSCRIPTION_SKU) {
                  setOfferToken(baseOffer.offerToken ?? null);
                } else if (sub.productId === ANNUAL_SKU) {
                  setAnnualOfferToken(baseOffer.offerToken ?? null);
                }
              }
            }
          }
        } catch {
          // Product fetch failed — purchase will still work without offer token
        }

        // Purchase success listener
        purchaseListenerRef.current = purchaseUpdatedListener(async (purchase) => {
          if (purchase.productId === SUBSCRIPTION_SKU || purchase.productId === ANNUAL_SKU) {
            try {
              await finishTransaction({ purchase, isConsumable: false });
              await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
              await AsyncStorage.setItem(STORAGE_CONSENT_KEY, "true");
              if (mounted) {
                setStatus("active");
                setHasConsented(true);
                setError(null);
              }
            } catch {
              // Transaction finish failed — will retry on next app open
            }
          }
        });

        // Purchase error listener
        errorListenerRef.current = purchaseErrorListener((err) => {
          if (mounted && err.code !== "user-cancelled") {
            setError(err.message ?? "Purchase failed. Please try again.");
          }
        });

        await refreshStatus();
      } catch {
        // IAP init failed — fall back to local status tracking
        if (mounted) {
          await refreshStatus();
        }
      }
    };

    init();

    return () => {
      mounted = false;
      purchaseListenerRef.current?.remove();
      errorListenerRef.current?.remove();
      if (connectionRef.current) {
        import("react-native-iap")
          .then(({ endConnection }) => endConnection())
          .catch(() => {});
        connectionRef.current = false;
      }
    };
  }, [refreshStatus]);

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Trigger the Google Play subscription purchase flow for premium_weekly_199.
   * On success, purchaseUpdatedListener sets status to "active".
   *
   * THROWS when IAP is unavailable or connection is not ready so callers
   * can catch and fall back to opening the Play Store URL directly.
   */
  const purchase = useCallback(async () => {
    if (Platform.OS === "web") {
      throw new Error("Subscriptions are only available on Android devices.");
    }
    if (!isIAPAvailable()) {
      throw new Error("Google Play Billing is not available on this device.");
    }
    if (!connectionRef.current) {
      throw new Error("Store connection not ready. Please try again in a moment.");
    }
    setError(null);
    await AsyncStorage.setItem(STORAGE_CONSENT_KEY, "true");
    setHasConsented(true);
    const { requestPurchase } = await import("react-native-iap");
    await requestPurchase({
      type: "subs",
      request: {
        google: {
          skus: [SUBSCRIPTION_SKU],
          ...(offerToken
            ? { subscriptionOffers: [{ sku: SUBSCRIPTION_SKU, offerToken }] }
            : {}),
        },
      },
    });
  // Note: success is handled by purchaseUpdatedListener above.
  // requestPurchase resolves when the purchase dialog is shown, not when complete.
  }, [offerToken]);

  /**
   * Trigger the Google Play subscription purchase flow for premium_annual_5999.
   * THROWS when IAP is unavailable or connection is not ready.
   */
  const purchaseAnnual = useCallback(async () => {
    if (Platform.OS === "web") {
      throw new Error("Subscriptions are only available on Android devices.");
    }
    if (!isIAPAvailable()) {
      throw new Error("Google Play Billing is not available on this device.");
    }
    if (!connectionRef.current) {
      throw new Error("Store connection not ready. Please try again in a moment.");
    }
    setError(null);
    await AsyncStorage.setItem(STORAGE_CONSENT_KEY, "true");
    setHasConsented(true);
    const { requestPurchase } = await import("react-native-iap");
    await requestPurchase({
      type: "subs",
      request: {
        google: {
          skus: [ANNUAL_SKU],
          ...(annualOfferToken
            ? { subscriptionOffers: [{ sku: ANNUAL_SKU, offerToken: annualOfferToken }] }
            : {}),
        },
      },
    });
  }, [annualOfferToken]);

  const restore = useCallback(async () => {
    if (!isIAPAvailable()) {
      setError("Restore is only available on Android devices.");
      return;
    }
    try {
      setError(null);
      const { getAvailablePurchases } = await import("react-native-iap");
      const purchases = await getAvailablePurchases();
      const activeSub = purchases.find(
      (p) => p.productId === SUBSCRIPTION_SKU || p.productId === ANNUAL_SKU
    );
      if (activeSub) {
        await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
        setStatus("active");
      } else {
        setError("No active subscription found for this account.");
      }
    } catch {
      setError("Could not restore purchases. Please try again.");
    }
  }, []);

  const hasAccess = status === "active";

  return {
    hasAccess,
    status,
    loading,
    iapReady,
    hasConsented,
    purchase,
    purchaseAnnual,
    restore,
    refresh: refreshStatus,
    error,
  };
}
