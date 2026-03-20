/**
 * use-subscription.ts
 *
 * Native Google Play Billing subscription hook using react-native-iap.
 * No third-party middleware — connects directly to Google Play Billing Library.
 *
 * Subscription product: belief_weekly_099
 *   - $0.99 / week, auto-renewing
 *   - 3-day free trial (configured in Play Console → Monetization → Subscriptions)
 *
 * Flow:
 *  1. App starts → initConnection()
 *  2. fetchProducts(['belief_weekly_099']) → get offer token
 *  3. User taps "Start Free Trial" → requestPurchase() with offerToken
 *  4. purchaseUpdatedListener fires → finishTransaction()
 *  5. Status persisted in AsyncStorage for offline reads
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { NativeModules, Platform } from "react-native";

/**
 * Returns true only when the react-native-iap native module is actually linked
 * and available in the current build. Returns false in Expo Go, simulators,
 * web, iOS, and any build where the native module wasn't compiled in.
 * This check is synchronous and safe to call at module scope.
 */
function isIAPAvailable(): boolean {
  if (Platform.OS !== "android") return false;
  // react-native-iap registers its native module as RNIapModule
  return !!NativeModules.RNIapModule;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Product ID — must match exactly what you create in Play Console → Monetization → Subscriptions */
export const SUBSCRIPTION_SKU = "belief_weekly_099";

/** Trial duration in days (enforced locally; Play Store enforces the billing trial) */
export const TRIAL_DAYS = 3;

const STORAGE_STATUS_KEY = "@belief_subscription_status";
const STORAGE_TRIAL_START_KEY = "@belief_trial_start";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "loading"    // initial async check in progress
  | "none"       // never subscribed, no trial started
  | "trial"      // within 3-day free trial window
  | "active"     // paid subscription active
  | "expired"    // trial or subscription lapsed
  | "cancelled"; // user cancelled but still within paid period

export interface SubscriptionState {
  /** True if the user has access (trial or active subscription) */
  hasAccess: boolean;
  status: SubscriptionStatus;
  /** Days remaining in trial (0 if not in trial) */
  trialDaysRemaining: number;
  /** Whether the IAP connection is initializing */
  loading: boolean;
  /** Start the 3-day free trial */
  startTrial: () => Promise<void>;
  /** Initiate a purchase via Google Play Billing */
  purchase: () => Promise<void>;
  /** Restore previous purchases */
  restore: () => Promise<void>;
  /** Refresh subscription status from Play Store */
  refresh: () => Promise<void>;
  /** Error message if something went wrong */
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTrialDaysRemaining(trialStartMs: number): number {
  const THREE_DAYS_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - trialStartMs;
  const remaining = THREE_DAYS_MS - elapsed;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionState {
  const [status, setStatus] = useState<SubscriptionStatus>("loading");
  const [loading, setLoading] = useState(true);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [offerToken, setOfferToken] = useState<string | null>(null);
  const connectionRef = useRef(false);
  const purchaseListenerRef = useRef<{ remove: () => void } | null>(null);
  const errorListenerRef = useRef<{ remove: () => void } | null>(null);

  // ── Determine status from persisted data + Play Store ──────────────────────
  const refreshStatus = useCallback(async () => {
    try {
      // 1. Check for active Play Store purchases (Android only)
      if (Platform.OS === "android" && connectionRef.current) {
        try {
          const { getAvailablePurchases } = await import("react-native-iap");
          const purchases = await getAvailablePurchases();
          const activeSub = purchases.find(
            (p) => p.productId === SUBSCRIPTION_SKU && p.purchaseToken
          );
          if (activeSub) {
            await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
            setStatus("active");
            setTrialDaysRemaining(0);
            setLoading(false);
            return;
          }
        } catch {
          // getAvailablePurchases failed — fall through to local check
        }
      }

      // 2. Check locally stored subscription status
      const [storedStatus, trialStartStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_STATUS_KEY),
        AsyncStorage.getItem(STORAGE_TRIAL_START_KEY),
      ]);

      if (storedStatus === "active") {
        setStatus("active");
        setTrialDaysRemaining(0);
      } else if (trialStartStr) {
        const trialStart = parseInt(trialStartStr, 10);
        const daysLeft = computeTrialDaysRemaining(trialStart);
        if (daysLeft > 0) {
          setStatus("trial");
          setTrialDaysRemaining(daysLeft);
        } else {
          setStatus("expired");
          setTrialDaysRemaining(0);
        }
      } else {
        setStatus("none");
        setTrialDaysRemaining(0);
      }
    } catch {
      // On web or simulator, default to trial mode for development
      setStatus("trial");
      setTrialDaysRemaining(TRIAL_DAYS);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initialize IAP connection ───────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Guard: only attempt IAP on Android builds that have the native module linked.
        // On Expo Go, simulators, iOS, and web the native module is absent and any
        // import/call would throw a fatal "Native module cannot be null" error.
        if (!isIAPAvailable()) {
          await refreshStatus();
          return;
        }

        const { initConnection, fetchProducts, purchaseUpdatedListener, purchaseErrorListener, finishTransaction } =
          await import("react-native-iap");

        await initConnection();
        connectionRef.current = true;

        // Fetch the subscription product to get the offer token
        try {
          const products = await fetchProducts({ skus: [SUBSCRIPTION_SKU] });
          if (mounted && products && products.length > 0) {
            const sub = products[0] as {
              subscriptionOfferDetailsAndroid?: Array<{
                offerToken: string;
                pricingPhases?: Array<{ formattedPrice?: string; priceAmountMicros?: string }>;
              }>;
            };
            const offerDetails = sub.subscriptionOfferDetailsAndroid;
            if (offerDetails && offerDetails.length > 0) {
              // Prefer the offer that has a free trial phase (price = 0)
              const trialOffer = offerDetails.find((o) =>
                o.pricingPhases?.some(
                  (p) => p.formattedPrice === "Free" || p.priceAmountMicros === "0"
                )
              );
              setOfferToken(trialOffer?.offerToken ?? offerDetails[0].offerToken ?? null);
            }
          }
        } catch {
          // Product fetch failed — purchase will still work without offer token
        }

        // Set up purchase success listener
        purchaseListenerRef.current = purchaseUpdatedListener(async (purchase) => {
          if (purchase.productId === SUBSCRIPTION_SKU) {
            try {
              await finishTransaction({ purchase, isConsumable: false });
              await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
              if (mounted) {
                setStatus("active");
                setTrialDaysRemaining(0);
                setError(null);
              }
            } catch {
              // Transaction finish failed — will retry on next app open
            }
          }
        });

        // Set up purchase error listener
        errorListenerRef.current = purchaseErrorListener((err) => {
          if (mounted) {
            // Ignore user-cancelled errors
            if (err.code !== "user-cancelled") {
              setError(err.message ?? "Purchase failed. Please try again.");
            }
          }
        });

        await refreshStatus();
      } catch {
        // IAP not available (simulator, web, etc.) — allow trial mode
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

  const startTrial = useCallback(async () => {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_TRIAL_START_KEY);
      if (existing) return; // Already started — idempotent
      await AsyncStorage.setItem(STORAGE_TRIAL_START_KEY, Date.now().toString());
      setStatus("trial");
      setTrialDaysRemaining(TRIAL_DAYS);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const purchase = useCallback(async () => {
    if (Platform.OS === "web") {
      setError("Subscriptions are only available on Android devices.");
      return;
    }
    if (!connectionRef.current) {
      setError("Store connection not ready. Please try again.");
      return;
    }
    try {
      setError(null);
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
      // Result handled by purchaseUpdatedListener above
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Purchase failed.";
      if (!msg.toLowerCase().includes("cancel")) {
        setError(msg);
      }
    }
  }, [offerToken]);

  const restore = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      setError(null);
      const { getAvailablePurchases } = await import("react-native-iap");
      const purchases = await getAvailablePurchases();
      const activeSub = purchases.find((p) => p.productId === SUBSCRIPTION_SKU);
      if (activeSub) {
        await AsyncStorage.setItem(STORAGE_STATUS_KEY, "active");
        setStatus("active");
        setTrialDaysRemaining(0);
      } else {
        setError("No active subscription found for this account.");
      }
    } catch {
      setError("Could not restore purchases. Please try again.");
    }
  }, []);

  const hasAccess = status === "trial" || status === "active";

  return {
    hasAccess,
    status,
    trialDaysRemaining,
    loading,
    startTrial,
    purchase,
    restore,
    refresh: refreshStatus,
    error,
  };
}
