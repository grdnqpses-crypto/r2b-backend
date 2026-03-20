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
 * Fallback: pure AsyncStorage-based trial tracking (no billing calls).
 * The app works normally; real billing only activates in production EAS builds.
 *
 * Subscription product: belief_field_weekly_099
 *   - $0.99 / week, auto-renewing
 *   - 3-day free trial (configured in Play Console → Monetization → Subscriptions)
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

export const SUBSCRIPTION_SKU = "belief_field_weekly_099";
export const TRIAL_DAYS = 3;

const STORAGE_STATUS_KEY = "@belief_subscription_status";
const STORAGE_TRIAL_START_KEY = "@belief_trial_start";
const STORAGE_CONSENT_KEY = "@belief_subscription_consented";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "loading"
  | "none"       // never subscribed, no trial started
  | "trial"      // within 3-day free trial window
  | "active"     // paid subscription active
  | "expired"    // trial or subscription lapsed
  | "cancelled"; // user cancelled but still within paid period

export interface SubscriptionState {
  hasAccess: boolean;
  status: SubscriptionStatus;
  trialDaysRemaining: number;
  loading: boolean;
  /** Whether the user has seen and agreed to the subscription consent screen */
  hasConsented: boolean;
  /** Start the 3-day free trial (records consent + trial start) */
  startTrial: () => Promise<void>;
  /** Initiate a purchase via Google Play Billing */
  purchase: () => Promise<void>;
  /** Restore previous purchases */
  restore: () => Promise<void>;
  /** Refresh subscription status from Play Store */
  refresh: () => Promise<void>;
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
  const [hasConsented, setHasConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerToken, setOfferToken] = useState<string | null>(null);
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
            setTrialDaysRemaining(0);
            setLoading(false);
            return;
          }
        } catch {
          // getAvailablePurchases failed — fall through to local check
        }
      }

      // 2. Check locally stored subscription status
      const [storedStatus, trialStartStr, consentedStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_STATUS_KEY),
        AsyncStorage.getItem(STORAGE_TRIAL_START_KEY),
        AsyncStorage.getItem(STORAGE_CONSENT_KEY),
      ]);

      setHasConsented(consentedStr === "true");

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
      setHasConsented(true);
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
          // Nitro not available — use local trial tracking only
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

        // Fetch subscription product to get the offer token
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

        // Purchase success listener
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

        // Purchase error listener
        errorListenerRef.current = purchaseErrorListener((err) => {
          if (mounted && err.code !== "user-cancelled") {
            setError(err.message ?? "Purchase failed. Please try again.");
          }
        });

        await refreshStatus();
      } catch {
        // IAP init failed — fall back to local trial tracking
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
   * Record user consent and start the 3-day free trial.
   * On Android production builds with Nitro available, this also triggers
   * the Google Play subscription purchase flow (which includes the trial).
   */
  const startTrial = useCallback(async () => {
    try {
      // Record consent
      await AsyncStorage.setItem(STORAGE_CONSENT_KEY, "true");
      setHasConsented(true);

      // On production Android with Nitro available, trigger the Play Billing flow
      if (isIAPAvailable() && connectionRef.current) {
        try {
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
          // Purchase result handled by purchaseUpdatedListener
          return;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.toLowerCase().includes("cancel")) {
            // User cancelled — don't start local trial, let them retry
            await AsyncStorage.removeItem(STORAGE_CONSENT_KEY);
            setHasConsented(false);
            return;
          }
          // Other error — fall through to local trial as fallback
        }
      }

      // Fallback: local trial tracking (Expo Go, dev builds, non-Android)
      const existing = await AsyncStorage.getItem(STORAGE_TRIAL_START_KEY);
      if (!existing) {
        await AsyncStorage.setItem(STORAGE_TRIAL_START_KEY, Date.now().toString());
      }
      setStatus("trial");
      setTrialDaysRemaining(TRIAL_DAYS);
    } catch {
      // Never block the user for storage errors
      setStatus("trial");
      setTrialDaysRemaining(TRIAL_DAYS);
    }
  }, [offerToken]);

  const purchase = useCallback(async () => {
    if (Platform.OS === "web") {
      setError("Subscriptions are only available on Android devices.");
      return;
    }
    if (!isIAPAvailable() || !connectionRef.current) {
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Purchase failed.";
      if (!msg.toLowerCase().includes("cancel")) {
        setError(msg);
      }
    }
  }, [offerToken]);

  const restore = useCallback(async () => {
    if (!isIAPAvailable()) return;
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
    hasConsented,
    startTrial,
    purchase,
    restore,
    refresh: refreshStatus,
    error,
  };
}
