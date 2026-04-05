/**
 * Background task definitions for Remember2Buy.
 * CRITICAL: TaskManager.defineTask MUST be called at the TOP-LEVEL module scope.
 * This file MUST be imported at the very top of app/_layout.tsx.
 */
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "@/lib/i18n";
import { APPROACH_SUFFIX, ARRIVED_SUFFIX } from "@/lib/geofence";

export const GEOFENCE_TASK_NAME = "R2B_GEOFENCE_TASK";

/**
 * AsyncStorage key prefix for pending in-store notification identifiers.
 * Keyed by store name so we can cancel per-store when the user exits the inner ring.
 */
const PENDING_NOTIF_KEY_PREFIX = "r2b_pending_instore_";

/**
 * AsyncStorage key prefix to track whether we already sent an approach
 * notification for a store in this session. Prevents duplicate approach
 * alerts if the OS re-fires the Enter event for the outer ring.
 */
const APPROACH_SENT_KEY_PREFIX = "r2b_approach_sent_";

/**
 * Ensure i18n is initialized with the correct device language before
 * building notification strings. Background tasks run in a separate JS
 * context on some platforms, so we re-set the language from the device
 * locale here to be safe.
 */
function ensureI18nLanguage() {
  try {
    const deviceLocale = Localization.getLocales()[0]?.languageCode ?? "en";
    if (i18n.language !== deviceLocale) {
      i18n.changeLanguage(deviceLocale);
    }
  } catch {
    // Non-fatal — fall back to whatever language i18n already has
  }
}

/**
 * Build a human-readable item list string from unchecked shopping items.
 * e.g. "Milk, Eggs, Bread (and 2 more)"
 */
function buildItemList(
  items: Array<{ text: string }>,
  extra: number
): string {
  if (items.length === 0) return "";
  const names = items.map((item) => item.text);
  let result = names.join(", ");
  if (extra > 0) result += ` (and ${extra} more)`;
  return result;
}

/**
 * Fetch unchecked shopping items from AsyncStorage.
 * Returns the full list of unchecked items.
 */
async function getUncheckedItems(): Promise<Array<{ text: string; checked: boolean }>> {
  try {
    // Try the current list key first, then fall back to legacy key
    const raw = await AsyncStorage.getItem("r2b_shopping_items");
    const items: Array<{ text: string; checked: boolean }> = raw
      ? JSON.parse(raw)
      : [];
    return items.filter((i) => !i.checked);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE BACKGROUND TASK
// ─────────────────────────────────────────────────────────────────────────────

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[R2B Geofence] Task error:", error.message);
    return;
  }

  if (!data) return;

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  const identifier = region.identifier ?? "";

  // ── Determine which ring fired ──
  const isApproachRing = identifier.endsWith(APPROACH_SUFFIX);
  const isArrivedRing = identifier.endsWith(ARRIVED_SUFFIX);

  // Extract the real store name by stripping the suffix
  const storeName = isApproachRing
    ? identifier.slice(0, -APPROACH_SUFFIX.length)
    : isArrivedRing
    ? identifier.slice(0, -ARRIVED_SUFFIX.length)
    : identifier; // legacy single-ring fallback

  const pendingKey = `${PENDING_NOTIF_KEY_PREFIX}${storeName}`;
  const approachSentKey = `${APPROACH_SENT_KEY_PREFIX}${storeName}`;

  // ─────────────────────────────────────────────────────────────────────────
  // OUTER RING ENTER — User is 0.3 miles from the store
  // ─────────────────────────────────────────────────────────────────────────
  if (isApproachRing && eventType === Location.GeofencingEventType.Enter) {
    try {
      ensureI18nLanguage();

      // Deduplicate: don't fire approach alert twice in a row for the same store
      const alreadySent = await AsyncStorage.getItem(approachSentKey);
      if (alreadySent) {
        console.log(`[R2B Geofence] Approach already sent for ${storeName}, skipping`);
        return;
      }

      const unchecked = await getUncheckedItems();

      if (unchecked.length > 0) {
        const top3 = unchecked.slice(0, 3);
        const remaining = unchecked.length - top3.length;
        const itemList = buildItemList(top3, remaining);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📍 Approaching ${storeName}`,
            body: `You're 0.3 miles away — don't forget: ${itemList}`,
            sound: true,
            data: { storeId: storeName, type: "geofence_approach" },
          },
          trigger: null, // fire immediately
        });

        // Mark approach as sent so we don't duplicate it
        await AsyncStorage.setItem(approachSentKey, "1");
        console.log(`[R2B Geofence] Approach notification sent for ${storeName}`);
      } else {
        // Empty list — gentle nudge
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📍 Approaching ${storeName}`,
            body: "Your shopping list is empty — nothing to buy here!",
            sound: false,
            data: { storeId: storeName, type: "geofence_approach_empty" },
          },
          trigger: null,
        });
        await AsyncStorage.setItem(approachSentKey, "1");
      }
    } catch (err) {
      console.error("[R2B Geofence] Approach notification error:", err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INNER RING ENTER — User is at the store (within 100m)
  // Start the 6-minute countdown for the "You're here" reminder
  // ─────────────────────────────────────────────────────────────────────────
  if (isArrivedRing && eventType === Location.GeofencingEventType.Enter) {
    try {
      ensureI18nLanguage();

      const unchecked = await getUncheckedItems();

      if (unchecked.length > 0) {
        const top3 = unchecked.slice(0, 3);
        const remaining = unchecked.length - top3.length;
        const itemList = buildItemList(top3, remaining);

        // Schedule the 6-minute in-store reminder
        const instoreId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🛒 You're at ${storeName}`,
            body: `Remember to buy: ${itemList}`,
            sound: true,
            data: { storeId: storeName, type: "geofence_instore" },
          },
          trigger: { seconds: 360, repeats: false } as any,
        });

        // Save the notification ID so the Exit handler can cancel it if the
        // user leaves before 6 minutes (drive-through, wrong turn, etc.)
        await AsyncStorage.setItem(pendingKey, instoreId);
        console.log(`[R2B Geofence] 6-min in-store reminder scheduled for ${storeName}`);
      }
      // If list is empty, no in-store reminder needed — the approach alert already told them
    } catch (err) {
      console.error("[R2B Geofence] Arrived notification error:", err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INNER RING EXIT — User left the store before 6 minutes
  // Cancel the pending in-store reminder (drive-by protection)
  // Also reset the approach-sent flag so the next visit fires a fresh alert
  // ─────────────────────────────────────────────────────────────────────────
  if (isArrivedRing && eventType === Location.GeofencingEventType.Exit) {
    try {
      const pendingId = await AsyncStorage.getItem(pendingKey);
      if (pendingId) {
        await Notifications.cancelScheduledNotificationAsync(pendingId);
        await AsyncStorage.removeItem(pendingKey);
        console.log(`[R2B Geofence] Cancelled in-store reminder for ${storeName} (user exited inner ring)`);
      }

      // Reset approach-sent flag so next visit fires a fresh approach alert
      await AsyncStorage.removeItem(`${APPROACH_SENT_KEY_PREFIX}${storeName}`);
    } catch (err) {
      console.error("[R2B Geofence] Exit cancel error:", err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OUTER RING EXIT — User has left the 0.3-mile zone entirely
  // Reset approach-sent flag so next visit fires a fresh approach alert
  // ─────────────────────────────────────────────────────────────────────────
  if (isApproachRing && eventType === Location.GeofencingEventType.Exit) {
    try {
      await AsyncStorage.removeItem(`${APPROACH_SENT_KEY_PREFIX}${storeName}`);
      console.log(`[R2B Geofence] Reset approach flag for ${storeName} (user left outer ring)`);
    } catch {
      // Non-fatal
    }
  }
});
