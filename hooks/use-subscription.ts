/**
 * use-subscription.ts
 *
 * RevenueCat subscription hook for Belief Field Detector.
 * Manages the $0.99/week auto-renewing subscription with 3-day free trial.
 *
 * Usage:
 *   const { isSubscribed, isTrialing, daysLeftInTrial, purchase, restore, loading } = useSubscription();
 */

import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// RevenueCat product/entitlement IDs — must match what you create in RevenueCat dashboard
export const RC_ENTITLEMENT_ID = "premium";
export const RC_WEEKLY_PRODUCT_ID = "belief_weekly_099";

// Trial duration in days
export const TRIAL_DAYS = 3;

// AsyncStorage keys
const STORAGE_KEY_TRIAL_START = "@belief_trial_start";
const STORAGE_KEY_SUBSCRIBED = "@belief_subscribed";
const STORAGE_KEY_SUBSCRIPTION_EXPIRY = "@belief_subscription_expiry";

export type SubscriptionStatus = "loading" | "trial" | "subscribed" | "expired" | "none";

export interface SubscriptionState {
  status: SubscriptionStatus;
  isSubscribed: boolean;    // true if active paid subscription
  isTrialing: boolean;      // true if within 3-day free trial
  hasAccess: boolean;       // true if subscribed OR trialing
  daysLeftInTrial: number;  // 0-3
  trialEndDate: Date | null;
  loading: boolean;
  error: string | null;
}

export interface UseSubscriptionReturn extends SubscriptionState {
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  startTrial: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Safe RevenueCat import — gracefully degrades if native module not available (web/simulator)
let Purchases: typeof import("react-native-purchases").default | null = null;

try {
  const rc = require("react-native-purchases");
  Purchases = rc.default;
} catch {
  // RevenueCat not available (web preview) — use local trial fallback
}

const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? "";
const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? "";

let rcInitialized = false;

async function initRevenueCat(): Promise<boolean> {
  if (rcInitialized || !Purchases) return false;
  const apiKey = Platform.OS === "ios" ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!apiKey) return false;
  try {
    Purchases.configure({ apiKey });
    rcInitialized = true;
    return true;
  } catch {
    return false;
  }
}

async function checkRCEntitlement(): Promise<{ active: boolean; expiry: Date | null }> {
  if (!Purchases || !rcInitialized) return { active: false, expiry: null };
  try {
    const info = await Purchases.getCustomerInfo();
    const entitlement = info.entitlements.active[RC_ENTITLEMENT_ID];
    if (entitlement) {
      const expiry = entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
      return { active: true, expiry };
    }
    return { active: false, expiry: null };
  } catch {
    return { active: false, expiry: null };
  }
}

export function useSubscription(): UseSubscriptionReturn {
  const [state, setState] = useState<SubscriptionState>({
    status: "loading",
    isSubscribed: false,
    isTrialing: false,
    hasAccess: false,
    daysLeftInTrial: 0,
    trialEndDate: null,
    loading: true,
    error: null,
  });

  const computeState = useCallback(async (): Promise<SubscriptionState> => {
    // 1. Try RevenueCat first
    await initRevenueCat();
    const { active, expiry } = await checkRCEntitlement();

    if (active) {
      return {
        status: "subscribed",
        isSubscribed: true,
        isTrialing: false,
        hasAccess: true,
        daysLeftInTrial: 0,
        trialEndDate: null,
        loading: false,
        error: null,
      };
    }

    // 2. Fall back to local trial tracking
    const [trialStartRaw, subscribedRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_TRIAL_START),
      AsyncStorage.getItem(STORAGE_KEY_SUBSCRIBED),
    ]);

    // Check locally stored subscription (for offline scenarios)
    if (subscribedRaw === "true") {
      return {
        status: "subscribed",
        isSubscribed: true,
        isTrialing: false,
        hasAccess: true,
        daysLeftInTrial: 0,
        trialEndDate: null,
        loading: false,
        error: null,
      };
    }

    // Check trial
    if (trialStartRaw) {
      const trialStart = new Date(trialStartRaw);
      const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const now = new Date();
      const msLeft = trialEnd.getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

      if (now < trialEnd) {
        return {
          status: "trial",
          isSubscribed: false,
          isTrialing: true,
          hasAccess: true,
          daysLeftInTrial: daysLeft,
          trialEndDate: trialEnd,
          loading: false,
          error: null,
        };
      } else {
        return {
          status: "expired",
          isSubscribed: false,
          isTrialing: false,
          hasAccess: false,
          daysLeftInTrial: 0,
          trialEndDate: trialEnd,
          loading: false,
          error: null,
        };
      }
    }

    // No trial started yet
    return {
      status: "none",
      isSubscribed: false,
      isTrialing: false,
      hasAccess: false,
      daysLeftInTrial: 0,
      trialEndDate: null,
      loading: false,
      error: null,
    };
  }, []);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const next = await computeState();
    setState(next);
  }, [computeState]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startTrial = useCallback(async () => {
    const existing = await AsyncStorage.getItem(STORAGE_KEY_TRIAL_START);
    if (!existing) {
      await AsyncStorage.setItem(STORAGE_KEY_TRIAL_START, new Date().toISOString());
    }
    await refresh();
  }, [refresh]);

  const purchase = useCallback(async (): Promise<boolean> => {
    try {
      await initRevenueCat();

      if (Purchases && rcInitialized) {
        // Real RevenueCat purchase
        const offerings = await Purchases.getOfferings();
        const pkg = offerings.current?.availablePackages.find(
          (p) => p.product.identifier === RC_WEEKLY_PRODUCT_ID
        ) ?? offerings.current?.weekly ?? offerings.current?.availablePackages[0];

        if (!pkg) {
          setState((s) => ({ ...s, error: "No subscription package available." }));
          return false;
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const active = !!customerInfo.entitlements.active[RC_ENTITLEMENT_ID];

        if (active) {
          await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIBED, "true");
          await refresh();
          return true;
        }
        return false;
      } else {
        // Simulator/web fallback: simulate successful purchase
        await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIBED, "true");
        await refresh();
        return true;
      }
    } catch (err: unknown) {
      // User cancelled — not an error (RevenueCat sets userCancelled on the error object)
      if (err && typeof err === "object" && (err as { userCancelled?: boolean }).userCancelled) {
        return false;
      }
      setState((s) => ({ ...s, error: "Purchase failed. Please try again." }));
      return false;
    }
  }, [refresh]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      await initRevenueCat();

      if (Purchases && rcInitialized) {
        const info = await Purchases.restorePurchases();
        const active = !!info.entitlements.active[RC_ENTITLEMENT_ID];
        if (active) {
          await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIBED, "true");
          await refresh();
          return true;
        }
        return false;
      }
      return false;
    } catch {
      setState((s) => ({ ...s, error: "Restore failed. Please try again." }));
      return false;
    }
  }, [refresh]);

  return { ...state, purchase, restore, startTrial, refresh };
}
