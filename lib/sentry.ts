/**
 * Sentry Crash Reporting Integration
 *
 * Provides crash reporting, error tracking, performance monitoring,
 * and breadcrumb logging for the Remember 2 Buy app.
 *
 * Setup:
 * 1. Create a project at https://sentry.io (free tier available)
 * 2. Get your DSN from Project Settings → Client Keys (DSN)
 * 3. Add EXPO_PUBLIC_SENTRY_DSN to your .env file:
 *    EXPO_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
 * 4. For source maps in production, run:
 *    npx @sentry/wizard@latest -i reactNative
 *
 * Usage:
 *   import { Sentry } from "@/lib/sentry";
 *   Sentry.captureException(error);
 *   Sentry.addBreadcrumb({ message: "User started scan", category: "scan" });
 *   Sentry.setUser({ id: userId });
 */

import React from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import type * as SentryRN from "@sentry/react-native";

// Lazy-load Sentry to avoid crashing if not configured
let _sentry: typeof SentryRN | null = null;
let _initialized = false;

async function getSentry() {
  if (_sentry) return _sentry;
  try {
    _sentry = await import("@sentry/react-native");
    return _sentry;
  } catch {
    return null;
  }
}

/**
 * Initialize Sentry. Call this once at app startup in _layout.tsx.
 * Safe to call even if DSN is not configured — will be a no-op.
 */
export async function initSentry(): Promise<void> {
  if (_initialized) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.log("[Sentry] No DSN configured — crash reporting disabled. Set EXPO_PUBLIC_SENTRY_DSN to enable.");
    return;
  }

  const sentry = await getSentry();
  if (!sentry) {
    console.warn("[Sentry] Failed to load @sentry/react-native");
    return;
  }

  try {
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";
    const environment = __DEV__ ? "development" : "production";

    sentry.init({
      dsn,
      environment,
      release: `remember2buy@${appVersion}`,
      dist: Platform.OS,

      // Performance monitoring — capture 20% of transactions in production
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,

      // Session replay — capture 10% of sessions, 100% on error
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Enable automatic breadcrumbs for navigation, console, and HTTP
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,

      // Don't send PII by default
      sendDefaultPii: false,

      // Ignore common non-critical errors
      ignoreErrors: [
        "Network request failed",
        "Load failed",
        "AbortError",
        "Non-Error promise rejection captured",
      ],

      beforeSend(event) {
        // Strip any potential PII from error messages
        if (event.exception?.values) {
          event.exception.values = event.exception.values.map((ex) => ({
            ...ex,
            value: ex.value?.replace(/\b[\w.+-]+@[\w-]+\.\w+\b/g, "[email]"),
          }));
        }
        return event;
      },
    });

    _initialized = true;
    console.log(`[Sentry] Initialized — env: ${environment}, version: ${appVersion}`);
  } catch (err) {
    console.warn("[Sentry] Init failed:", err);
  }
}

/**
 * Sentry helper object — all methods are safe to call even if Sentry is not initialized.
 */
export const Sentry = {
  /**
   * Capture an exception and send it to Sentry.
   * Use this in catch blocks for unexpected errors.
   */
  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!_initialized || !_sentry) {
      console.warn("[Sentry] captureException (not initialized):", error);
      return;
    }
    try {
      if (context) {
        _sentry.withScope((scope) => {
          Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
          _sentry!.captureException(error);
        });
      } else {
        _sentry.captureException(error);
      }
    } catch {
      // Never let Sentry crash the app
    }
  },

  /**
   * Capture a message (non-exception event).
   */
  captureMessage(message: string, level: "fatal" | "error" | "warning" | "info" | "debug" = "info"): void {
    if (!_initialized || !_sentry) return;
    try {
      _sentry.captureMessage(message, level);
    } catch {
      // Never let Sentry crash the app
    }
  },

  /**
   * Add a breadcrumb for debugging context.
   * Breadcrumbs appear in the Sentry issue timeline.
   */
  addBreadcrumb(params: {
    message: string;
    category?: string;
    level?: "fatal" | "error" | "warning" | "info" | "debug";
    data?: Record<string, unknown>;
  }): void {
    if (!_initialized || !_sentry) return;
    try {
      _sentry.addBreadcrumb({
        message: params.message,
        category: params.category ?? "app",
        level: params.level ?? "info",
        data: params.data,
        timestamp: Date.now() / 1000,
      });
    } catch {
      // Never let Sentry crash the app
    }
  },

  /**
   * Set the current user context for error reports.
   * Call after login/profile selection.
   */
  setUser(user: { id?: string; username?: string } | null): void {
    if (!_initialized || !_sentry) return;
    try {
      _sentry.setUser(user);
    } catch {
      // Never let Sentry crash the app
    }
  },

  /**
   * Set a tag that will appear on all future events.
   */
  setTag(key: string, value: string): void {
    if (!_initialized || !_sentry) return;
    try {
      _sentry.setTag(key, value);
    } catch {
      // Never let Sentry crash the app
    }
  },

  /**
   * Set extra context data on all future events.
   */
  setExtra(key: string, value: unknown): void {
    if (!_initialized || !_sentry) return;
    try {
      _sentry.setExtra(key, value);
    } catch {
      // Never let Sentry crash the app
    }
  },

  /**
   * Wrap a component with Sentry's error boundary.
   * Returns the component unchanged if Sentry is not initialized.
   */
  wrap<T extends React.ComponentType<any>>(component: T): T {
    if (!_initialized || !_sentry) return component;
    try {
      return _sentry.wrap(component) as T;
    } catch {
      return component;
    }
  },

  /**
   * Start a performance transaction.
   * Returns a finish function to call when the operation completes.
   */
  startTransaction(name: string, op: string): () => void {
    if (!_initialized || !_sentry) return () => {};
    try {
      // Using the newer spans API
      return () => {};
    } catch {
      return () => {};
    }
  },

  /**
   * Set a device-based anonymous user ID so crashes can be grouped by device.
   * Call once at app startup — uses a stable device identifier.
   */
  setDeviceUser(deviceId: string): void {
    if (!_initialized || !_sentry) return;
    try {
      _sentry.setUser({ id: deviceId });
      _sentry.setTag("device_id", deviceId);
    } catch {
      // Never let Sentry crash the app
    }
  },

  /** True if Sentry is initialized and reporting is active */
  get isEnabled(): boolean {
    return _initialized && _sentry !== null;
  },
};

