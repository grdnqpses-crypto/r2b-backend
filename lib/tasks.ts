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

  if (eventType === Location.GeofencingEventType.Enter) {
    try {
      ensureI18nLanguage();

      // Get shopping items from storage
      const raw = await AsyncStorage.getItem("r2b_shopping_items");
      const items: Array<{ text: string; checked: boolean }> = raw
        ? JSON.parse(raw)
        : [];
      const unchecked = items.filter((i) => !i.checked);

      const storeName = region.identifier || "a store";
      const top3 = unchecked.slice(0, 3);
      const remaining = unchecked.length - top3.length;

      // Build a numbered list body for the notification
      const buildBody = (listItems: typeof top3, extra: number): string => {
        if (listItems.length === 0) {
          return i18n.t("notifications.arrivalBodyEmpty");
        }
        const lines = listItems.map((item, idx) => `${idx + 1}. ${item.text}`);
        if (extra > 0) lines.push(`...+${extra}`);
        return lines.join("\n");
      };

      const itemsText = buildBody(top3, remaining);

      // Send immediate notification with top 3 items
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t("notifications.arrivalTitle", { storeName }),
          body:
            unchecked.length > 0
              ? i18n.t("notifications.arrivalBody", { items: itemsText })
              : i18n.t("notifications.arrivalBodyEmpty"),
          sound: true,
          data: { storeId: region.identifier, type: "geofence_enter" },
        },
        trigger: null, // immediate
      });

      // Schedule a follow-up reminder after 6 minutes
      if (unchecked.length > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t("notifications.arrivalTitle", { storeName }),
            body: i18n.t("notifications.arrivalBody", { items: itemsText }),
            sound: false,
            data: { storeId: region.identifier, type: "geofence_arrived" },
          },
          trigger: { seconds: 360, repeats: false } as any,
        });
      }
    } catch (err) {
      console.error("[R2B Geofence] Notification error:", err);
    }
  }
});
