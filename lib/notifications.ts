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

const STREAK_NOTIF_ID_KEY = "r2b_streak_notif_id";

/**
 * Schedules a weekly Sunday evening reminder to log savings and keep the streak alive.
 * Cancels any previous streak notification before scheduling a new one.
 */
export async function scheduleStreakReminder(streakCount: number): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel existing streak reminder
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const existingId = await AsyncStorage.getItem(STREAK_NOTIF_ID_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    }
  } catch {}

  const title = streakCount > 0
    ? `🔥 Keep your ${streakCount}-week streak alive!`
    : "💰 Log your savings this week!";
  const body = streakCount > 0
    ? "You're on a roll! Log this week's savings before midnight to extend your streak."
    : "Set a savings goal and log your savings to start a streak. Every week counts!";

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: "streak_reminder" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // Sunday = weekday 1 in Expo (1=Sunday, 2=Monday, ..., 7=Saturday)
        weekday: 1,
        hour: 19,
        minute: 0,
      },
    });
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(STREAK_NOTIF_ID_KEY, id);
  } catch {
    // non-critical
  }
}

/**
 * Cancels the streak reminder notification.
 */
export async function cancelStreakReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const existingId = await AsyncStorage.getItem(STREAK_NOTIF_ID_KEY);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(STREAK_NOTIF_ID_KEY);
    }
  } catch {}
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
