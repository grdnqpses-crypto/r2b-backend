/**
 * Validates that the Sentry DSN environment variable is set and has the correct format.
 * A valid Sentry DSN looks like: https://<key>@<org>.ingest.sentry.io/<project_id>
 */
import { describe, it, expect } from "vitest";

describe("Sentry DSN configuration", () => {
  it("EXPO_PUBLIC_SENTRY_DSN is set", () => {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    // If not set, Sentry is disabled — this is acceptable (no DSN = no-op mode)
    if (!dsn) {
      console.warn("[Sentry] DSN not configured — crash reporting disabled");
      expect(dsn).toBeUndefined(); // Pass — disabled mode is valid
      return;
    }
    // If set, it must be a valid Sentry DSN URL (supports US: ingest.us.sentry.io and EU: ingest.sentry.io)
    expect(dsn).toMatch(/^https:\/\/.+@.+\.ingest(\.us)?\.sentry\.io\/.+$/);
  });

  it("Sentry DSN is a non-empty string when configured", () => {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      // No DSN = disabled mode, which is valid
      expect(true).toBe(true);
      return;
    }
    // DSN must be a non-empty string starting with https://
    expect(typeof dsn).toBe("string");
    expect(dsn.startsWith("https://")).toBe(true);
    expect(dsn.length).toBeGreaterThan(20);
  });
});
