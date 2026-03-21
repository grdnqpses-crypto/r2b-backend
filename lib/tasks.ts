/**
 * Background task definitions for Remember2Buy.
 * CRITICAL: TaskManager.defineTask MUST be called at the TOP-LEVEL module scope.
 * This file MUST be imported at the very top of app/_layout.tsx.
 */
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const GEOFENCE_TASK_NAME = "R2B_GEOFENCE_TASK";

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
      const buildBody = (items: typeof top3, extra: number): string => {
        if (items.length === 0) return "You have nothing on your list right now.";
        const lines = items.map((item, idx) => `${idx + 1}. ${item.text}`);
        if (extra > 0) lines.push(`...and ${extra} more item${extra !== 1 ? "s" : ""}`);
        return lines.join("\n");
      };

      // Send immediate notification with top 3 items
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🛒 You're near ${storeName}!`,
          body: unchecked.length > 0
            ? `Don't forget:\n${buildBody(top3, remaining)}`
            : "You have nothing on your list right now.",
          sound: true,
          data: { storeId: region.identifier, type: "geofence_enter" },
        },
        trigger: null, // immediate
      });

      // Schedule a follow-up reminder after 6 minutes
      if (unchecked.length > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📋 Still shopping at ${storeName}?`,
            body: `${unchecked.length} item${unchecked.length !== 1 ? "s" : ""} on your list:\n${buildBody(top3, remaining)}`,
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
