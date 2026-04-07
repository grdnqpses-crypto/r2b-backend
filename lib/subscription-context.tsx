/**
 * SubscriptionProvider — Phase 5 Hardening (Master Directive)
 *
 * Problem identified in audit:
 *   useSubscription() was called independently in settings.tsx AND stores.tsx,
 *   creating two separate IAP connections with duplicate purchase/error listeners.
 *   This causes race conditions where one screen's listener fires for another
 *   screen's purchase, and doubles the risk of missed finishTransaction() calls.
 *
 * Fix:
 *   Wrap the app once in <SubscriptionProvider> (in app/_layout.tsx) and expose
 *   the single shared SubscriptionState via useSubscriptionContext().
 *   All screens call useSubscriptionContext() instead of useSubscription().
 *
 * Error handling hardened per Phase 5 directive:
 *   - USER_CANCELED / user-cancelled: silently dismissed (no error shown)
 *   - Network failure: "Check your internet connection and try again."
 *   - Pending transactions: "Your purchase is pending. Google Play will activate it shortly."
 *   - Unknown errors: generic message with error code for debugging
 */
import React, { createContext, useContext, type ReactNode } from "react";
import { useSubscription, type SubscriptionState } from "@/hooks/use-subscription";

// ─── Context ──────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const subscription = useSubscription();
  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

/**
 * Returns the global subscription state.
 * Must be used inside <SubscriptionProvider>.
 */
export function useSubscriptionContext(): SubscriptionState {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscriptionContext must be used inside <SubscriptionProvider>");
  }
  return ctx;
}

// ─── Error message normalizer ─────────────────────────────────────────────────

/**
 * Converts raw IAP error codes into user-friendly messages per Phase 5 directive.
 *
 * react-native-iap error codes:
 *   E_USER_CANCELLED / user-cancelled → silent dismiss
 *   E_NETWORK_ERROR                   → network message
 *   E_ITEM_UNAVAILABLE                → item unavailable
 *   E_DEFERRED_PAYMENT                → pending transaction
 *   E_ALREADY_OWNED                   → already subscribed
 */
export function normalizeIAPError(
  err: unknown
): { message: string | null; isCancellation: boolean } {
  if (!err) return { message: null, isCancellation: false };

  const e = err as { code?: string; message?: string };
  const code = (e.code ?? "").toLowerCase();
  const msg = (e.message ?? "").toLowerCase();

  // User cancelled — silent, no error shown
  if (
    code.includes("cancelled") ||
    code.includes("canceled") ||
    code.includes("user_cancel") ||
    msg.includes("user cancelled") ||
    msg.includes("user canceled")
  ) {
    return { message: null, isCancellation: true };
  }

  // Network failure
  if (code.includes("network") || msg.includes("network") || msg.includes("internet")) {
    return {
      message: "Network error. Please check your internet connection and try again.",
      isCancellation: false,
    };
  }

  // Pending / deferred payment (e.g. family approval required)
  if (code.includes("deferred") || code.includes("pending") || msg.includes("pending")) {
    return {
      message: "Your purchase is pending. Google Play will activate your subscription once approved.",
      isCancellation: false,
    };
  }

  // Already owned
  if (code.includes("already_owned") || msg.includes("already owned")) {
    return {
      message: "You already have an active subscription. Tap \"Restore purchases\" to activate it.",
      isCancellation: false,
    };
  }

  // Item unavailable
  if (code.includes("unavailable") || msg.includes("unavailable")) {
    return {
      message: "This subscription is temporarily unavailable. Please try again later.",
      isCancellation: false,
    };
  }

  // Generic fallback with code for debugging
  return {
    message: `Purchase failed${e.code ? ` (${e.code})` : ""}. Please try again.`,
    isCancellation: false,
  };
}
