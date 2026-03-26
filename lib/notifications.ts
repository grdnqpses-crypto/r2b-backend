/**
 * Notification setup for Remember2Buy.
 * setNotificationHandler MUST be called at module top-level.
 * This file MUST be imported at the very top of app/_layout.tsx.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import i18n from "@/lib/i18n";

// Set handler at module scope — required for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  // Create Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("r2b-alerts", {
      name: i18n.t("notifications.channelName", { defaultValue: "Store Alerts" }),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1D4ED8",
      sound: "default",
    });
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notifications.testTitle", { defaultValue: "🛒 Remember2Buy Test" }),
      body: i18n.t("notifications.testBody", {
        defaultValue: "Notifications are working! You'll be alerted near stores.",
      }),
      sound: true,
    },
    trigger: null,
  });
}
