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
      const itemList =
        unchecked.length > 0
          ? unchecked
              .slice(0, 5)
              .map((i) => i.text)
              .join(", ") +
            (unchecked.length > 5 ? ` +${unchecked.length - 5} more` : "")
          : "Check your list!";

      // Send immediate notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🛒 Near ${storeName}!`,
          body:
            unchecked.length > 0
              ? `Don't forget: ${itemList}`
              : "You have nothing on your list right now.",
          sound: true,
          data: { storeId: region.identifier, type: "geofence_enter" },
        },
        trigger: null, // immediate
      });

      // Schedule a follow-up "arrived" notification after 6 minutes
      if (unchecked.length > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📋 Shopping at ${storeName}`,
            body: `You have ${unchecked.length} item${unchecked.length !== 1 ? "s" : ""} to buy: ${itemList}`,
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
