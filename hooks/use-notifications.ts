import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_KEY = "@belief_notifications";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  reminderHour: number; // 0-23
  reminderMinute: number; // 0-59
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderHour: 19, // 7 PM default
  reminderMinute: 0,
};

// Encouraging reminder messages that rotate
const REMINDER_MESSAGES = [
  {
    title: "Your Belief Field Awaits ✨",
    body: "Take a moment to measure what you believe in today. Your sensors are ready.",
  },
  {
    title: "Time to Believe 🔬",
    body: "Your phone's 7 sensors are calibrated and waiting. What will you believe in today?",
  },
  {
    title: "Keep Your Streak Alive 🔥",
    body: "Don't break your belief streak! A quick scan keeps your journey going.",
  },
  {
    title: "Science Meets Belief 🌟",
    body: "Your belief creates measurable changes. Come see what your sensors detect today.",
  },
  {
    title: "The Field Is Strong Today 💫",
    body: "Environmental conditions are great for belief detection. Try a scan now!",
  },
  {
    title: "Believe Deeper 🧠",
    body: "Neuroscience shows that consistent practice strengthens belief. Scan today to grow.",
  },
  {
    title: "Your Sensors Miss You 📡",
    body: "It's been a while since your last scan. Your belief field is waiting to be measured.",
  },
];

export function getRandomReminder() {
  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("belief-reminders", {
      name: "Belief Reminders",
      description: "Daily reminders to measure your belief field",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9B7AFF",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleDailyReminder(hour: number, minute: number) {
  // Cancel existing reminders first
  await Notifications.cancelAllScheduledNotificationsAsync();

  const reminder = getRandomReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body,
      data: { type: "daily-reminder" },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load settings
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {}
      }
      setLoaded(true);
    });

    // Check current permission status
    if (Platform.OS !== "web") {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setPermissionGranted(status === "granted");
      });
    }
  }, []);

  // Schedule/cancel when settings change
  useEffect(() => {
    if (!loaded) return;
    if (settings.enabled && permissionGranted) {
      scheduleDailyReminder(settings.reminderHour, settings.reminderMinute);
    } else {
      cancelAllReminders();
    }
  }, [settings.enabled, settings.reminderHour, settings.reminderMinute, permissionGranted, loaded]);

  const enableReminders = useCallback(async () => {
    const granted = await requestPermissions();
    setPermissionGranted(granted);
    if (granted) {
      const newSettings = { ...settings, enabled: true };
      setSettings(newSettings);
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(newSettings));
    }
    return granted;
  }, [settings]);

  const disableReminders = useCallback(async () => {
    const newSettings = { ...settings, enabled: false };
    setSettings(newSettings);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(newSettings));
    await cancelAllReminders();
  }, [settings]);

  const setReminderTime = useCallback(
    async (hour: number, minute: number) => {
      const newSettings = { ...settings, reminderHour: hour, reminderMinute: minute };
      setSettings(newSettings);
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(newSettings));
    },
    [settings]
  );

  return {
    settings,
    permissionGranted,
    loaded,
    enableReminders,
    disableReminders,
    setReminderTime,
  };
}
