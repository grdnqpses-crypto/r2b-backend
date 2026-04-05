/**
 * use-subscription.ts
 *
 * Native Google Play Billing subscription hook using react-native-iap v14 (Nitro Modules).
 *
 * FIX for "Connecting to store..." hang:
 *
 * Root cause: The previous NitroModulesProxy guard was too strict. On some Android
 * devices/OS versions, global.NitroModulesProxy is populated asynchronously after
 * the JS bundle loads, so the synchronous check returned false even in production
 * builds where the native module IS available. This caused isIAPAvailable() to
 * permanently return false, keeping iapReady=false and showing "Connecting to store..."
 * forever.
 *
 * Fix strategy:
 *   1. Remove the NitroModulesProxy guard — instead, attempt initConnection() directly
 *      inside a try/catch. If the native module is absent, it will throw and we fall back.
 *   2. Add a 10-second timeout on initConnection() so it never hangs indefinitely.
 *   3. Retry up to 3 times with exponential backoff (1s, 2s, 4s) before giving up.
 *   4. Expose a `retryConnect` action so users can manually retry from the paywall.
 *   5. If all retries fail, show a "Buy on Play Store" fallback link instead of
 *      permanently showing "Connecting to store...".
 *
 * Subscription products:
 *   - premium_weekly_199  → $1.99/week, auto-renewing
 *   - premium_annual_5999 → $59.99/year, auto-renewing
 *   - Package: com.remember2buy.shopping
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_SKU = "premium_weekly_199";
export const ANNUAL_SKU = "premium_annual_5999";
export const SUBSCRIPTION_PRICE = "$1.99";
export const ANNUAL_PRICE = "$59.99";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.remember2buy.shopping";

const STORAGE_STATUS_KEY = "@r2b_subscription_status";
const STORAGE_CONSENT_KEY = "@r2b_subscription_consented";

/** Maximum time (ms) to wait for initConnection() before timing out */
const IAP_CONNECT_TIMEOUT_MS = 10_000;
/** Maximum number of connection attempts before giving up */
const MAX_RETRIES = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "loading"
  | "none"
  | "active"
  | "expired"
  | "cancelled";

export interface SubscriptionState {
  hasAccess: boolean;
  status: SubscriptionStatus;
  loading: boolean;
  iapReady: boolean;
  /** True when all retries have been exhausted and IAP is unavailable */
  iapFailed: boolean;
  hasConsented: boolean;
  purchase: () => Promise<void>;
  purchaseAnnual: () => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Manually retry the IAP connection (e.g. from a "Retry" button in the paywall) */
  retryConnect: () => void;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap a promise with a timeout. Rejects with "timeout" if it takes too long. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/** Sleep for `ms` milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionState {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [loading, setLoading] = useState(true);
  const [iapReady, setIapReady] = useState(false);
  const [iapFailed, setIapFailed] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerToken, setOfferToken] = useState<string | null>(null);
  const [annualOfferToken, setAnnualOfferToken] = useState<string | null>(null);
  const connectionRef = useRef(false);
  const purchaseListenerRef = useRef<{ remove: () => void } | null>(null);
  const errorListenerRef = useRef<{ remove: () => void } | null>(null);
  const mountedRef = useRef(true);
  const retryTrigger = useRef(0);
  const [retryCount, setRetryCount] = useState(0);

  // ── Refresh subscription status ────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    try {
      if (connectionRef.current) {
        try {
          const { getAvailablePurchases } = await import("react-native-iap");
          const purchases = await withTimeout(getAvailablePurchases(), 8_000);
          const activeSub = purchases.find(
            (p) =>
              (p.productId === SUBSCRIPTION_SKU || p.productId === ANNUAL_SKU) &&
              p.purchaseToken
          );
          if (activeSub) {
            await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
            if (mountedRef.current) setStatus("active");
            if (mountedRef.current) setLoading(false);
            return;
          }
        } catch {
          // getAvailablePurchases failed — fall through to local check
        }
      }

      const [storedStatus, consentedStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_STATUS_KEY),
        AsyncStorage.getItem(STORAGE_CONSENT_KEY),
      ]);

      if (mountedRef.current) setHasConsented(consentedStr === "true");

      if (storedStatus === "active") {
        if (mountedRef.current) setStatus("active");
      } else if (storedStatus === "cancelled") {
        if (mountedRef.current) setStatus("cancelled");
      } else if (storedStatus === "expired") {
        if (mountedRef.current) setStatus("expired");
      } else {
        if (mountedRef.current) setStatus("none");
      }
    } catch {
      if (mountedRef.current) setStatus("none");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ── Initialize IAP connection with retry logic ─────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      // Web or non-Android: skip IAP entirely, use local status
      if (Platform.OS !== "android") {
        await refreshStatus();
        return;
      }

      let attempt = 0;
      let connected = false;

      while (attempt < MAX_RETRIES && !connected && mountedRef.current) {
        try {
          const {
            initConnection,
            fetchProducts,
            purchaseUpdatedListener,
            purchaseErrorListener,
            finishTransaction,
          } = await import("react-native-iap");

          // Attempt connection with timeout
          await withTimeout(initConnection(), IAP_CONNECT_TIMEOUT_MS);
          connectionRef.current = true;
          connected = true;

          if (!mountedRef.current) return;
          setIapReady(true);
          setIapFailed(false);

          // Fetch products to get offer tokens (non-blocking)
          try {
            const products = await withTimeout(
              fetchProducts({ skus: [SUBSCRIPTION_SKU, ANNUAL_SKU] }),
              8_000
            );
            if (mountedRef.current && products && products.length > 0) {
              for (const product of products) {
                const sub = product as {
                  productId?: string;
                  subscriptionOfferDetailsAndroid?: Array<{
                    offerToken: string;
                    pricingPhases?: Array<{
                      formattedPrice?: string;
                      priceAmountMicros?: string;
                    }>;
                  }>;
                };
                const offerDetails = sub.subscriptionOfferDetailsAndroid;
                if (offerDetails && offerDetails.length > 0) {
                  const baseOffer =
                    offerDetails.find((o) =>
                      o.pricingPhases?.every((p) => p.priceAmountMicros !== "0")
                    ) ?? offerDetails[0];
                  if (sub.productId === SUBSCRIPTION_SKU) {
                    if (mountedRef.current) setOfferToken(baseOffer.offerToken ?? null);
                  } else if (sub.productId === ANNUAL_SKU) {
                    if (mountedRef.current) setAnnualOfferToken(baseOffer.offerToken ?? null);
                  }
                }
              }
            }
          } catch {
            // Product fetch failed — purchase will still work without offer token
          }

          // Purchase success listener
          purchaseListenerRef.current = purchaseUpdatedListener(async (purchase) => {
            if (
              purchase.productId === SUBSCRIPTION_SKU ||
              purchase.productId === ANNUAL_SKU
            ) {
              try {
                await finishTransaction({ purchase, isConsumable: false });
                await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
                await AsyncStorage.setItem(STORAGE_CONSENT_KEY, "true");
                if (mountedRef.current) {
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
            if (mountedRef.current && err.code !== "user-cancelled") {
              setError(err.message ?? "Purchase failed. Please try again.");
            }
          });

          await refreshStatus();
        } catch (err) {
          attempt++;
          connectionRef.current = false;

          if (attempt < MAX_RETRIES && mountedRef.current) {
            // Exponential backoff: 1s, 2s, 4s
            await sleep(1000 * Math.pow(2, attempt - 1));
          } else {
            // All retries exhausted — fall back to local status tracking
            if (mountedRef.current) {
              setIapFailed(true);
              setIapReady(false);
            }
            await refreshStatus();
          }
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      purchaseListenerRef.current?.remove();
      errorListenerRef.current?.remove();
      if (connectionRef.current) {
        import("react-native-iap")
          .then(({ endConnection }) => endConnection())
          .catch(() => {});
        connectionRef.current = false;
      }
    };
    // retryCount is intentionally included to re-run init on manual retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, refreshStatus]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const purchase = useCallback(async () => {
    if (Platform.OS === "web") {
      throw new Error("Subscriptions are only available on Android devices.");
    }
    if (!connectionRef.current) {
      throw new Error("Store connection not ready. Please tap Retry and try again.");
    }
    setError(null);
    await AsyncStorage.setItem(STORAGE_CONSENT_KEY, "true");
    if (mountedRef.current) setHasConsented(true);
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
  }, [offerToken]);

  const purchaseAnnual = useCallback(async () => {
    if (Platform.OS === "web") {
      throw new Error("Subscriptions are only available on Android devices.");
    }
    if (!connectionRef.current) {
      throw new Error("Store connection not ready. Please tap Retry and try again.");
    }
    setError(null);
    await AsyncStorage.setItem(STORAGE_CONSENT_KEY, "true");
    if (mountedRef.current) setHasConsented(true);
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
    if (!connectionRef.current) {
      setError("Store not connected. Please tap Retry first.");
      return;
    }
    try {
      setError(null);
      const { getAvailablePurchases } = await import("react-native-iap");
      const purchases = await withTimeout(getAvailablePurchases(), 8_000);
      const activeSub = purchases.find(
        (p) => p.productId === SUBSCRIPTION_SKU || p.productId === ANNUAL_SKU
      );
      if (activeSub) {
        await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
        if (mountedRef.current) setStatus("active");
      } else {
        if (mountedRef.current) setError("No active subscription found for this account.");
      }
    } catch {
      if (mountedRef.current) setError("Could not restore purchases. Please try again.");
    }
  }, []);

  /** Manually retry the IAP connection — resets state and re-runs the init effect */
  const retryConnect = useCallback(() => {
    if (mountedRef.current) {
      setIapFailed(false);
      setIapReady(false);
      setError(null);
      setRetryCount((c) => c + 1);
    }
  }, []);

  const hasAccess = status === "active";

  return {
    hasAccess,
    status,
    loading,
    iapReady,
    iapFailed,
    hasConsented,
    purchase,
    purchaseAnnual,
    restore,
    refresh: refreshStatus,
    retryConnect,
    error,
  };
}
