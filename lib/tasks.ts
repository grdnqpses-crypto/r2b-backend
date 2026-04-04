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

export const GEOFENCE_TASK_NAME = "R2B_GEOFENCE_TASK";

// AsyncStorage key prefix for pending in-store notification identifiers.
// Keyed by store identifier so we can cancel per-store.
const PENDING_NOTIF_KEY_PREFIX = "r2b_pending_instore_";

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

// Define the geofencing background task at module scope
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

  const storeName = region.identifier || "a store";
  const pendingKey = `${PENDING_NOTIF_KEY_PREFIX}${region.identifier}`;

  // ── USER ENTERED the 0.3-mile boundary ──
  if (eventType === Location.GeofencingEventType.Enter) {
    try {
      ensureI18nLanguage();

      // Get shopping items from storage
      const raw = await AsyncStorage.getItem("r2b_shopping_items");
      const items: Array<{ text: string; checked: boolean }> = raw
        ? JSON.parse(raw)
        : [];
      const unchecked = items.filter((i) => !i.checked);

      const top3 = unchecked.slice(0, 3);
      const remaining = unchecked.length - top3.length;

      // Build the item list inline: "Milk, Eggs, Bread (and 2 more)"
      const buildItemList = (listItems: typeof top3, extra: number): string => {
        if (listItems.length === 0) return "";
        const names = listItems.map((item) => item.text);
        let result = names.join(", ");
        if (extra > 0) result += ` (and ${extra} more)`;
        return result;
      };

      const itemList = buildItemList(top3, remaining);

      if (unchecked.length > 0) {
        // ── NOTIFICATION 1: Immediate approach alert ──
        // Fires the moment the user crosses the 0.3-mile boundary.
        // Gives them time to decide whether to stop.
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📍 Approaching ${storeName}`,
            body: `Don't forget: ${itemList}`,
            sound: true,
            data: { storeId: region.identifier, type: "geofence_approach" },
          },
          trigger: null, // fire immediately
        });

        // ── NOTIFICATION 2: In-store reminder (6 minutes later) ──
        // Only fires if the user is STILL inside the boundary after 6 minutes.
        // If they exit before 6 minutes (drive-by), the Exit handler cancels this.
        const instoreId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🛒 Time to grab at ${storeName}`,
            body: `Remember to buy: ${itemList}`,
            sound: true,
            data: { storeId: region.identifier, type: "geofence_instore" },
          },
          trigger: { seconds: 360, repeats: false } as any,
        });

        // Save the identifier so the Exit handler can cancel it if the user leaves early
        await AsyncStorage.setItem(pendingKey, instoreId);
      } else {
        // No unchecked items — single gentle nudge immediately, nothing to cancel
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🛒 You're near ${storeName}`,
            body: "Your shopping list is empty — nothing to buy here!",
            sound: false,
            data: { storeId: region.identifier, type: "geofence_empty" },
          },
          trigger: null,
        });
      }
    } catch (err) {
      console.error("[R2B Geofence] Enter notification error:", err);
    }
  }

  // ── USER EXITED the 0.3-mile boundary ──
  // If they left before 6 minutes (drive-by, passing the store, etc.),
  // cancel the pending in-store reminder so they don't get a false notification
  // when they're already pulling into their driveway.
  if (eventType === Location.GeofencingEventType.Exit) {
    try {
      const pendingId = await AsyncStorage.getItem(pendingKey);
      if (pendingId) {
        await Notifications.cancelScheduledNotificationAsync(pendingId);
        await AsyncStorage.removeItem(pendingKey);
        console.log(`[R2B Geofence] Cancelled in-store reminder for ${storeName} (user exited before 6 min)`);
      }
    } catch (err) {
      console.error("[R2B Geofence] Exit cancel error:", err);
    }
  }
});
