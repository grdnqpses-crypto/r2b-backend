import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetentionStats {
  totalRemindersTriggered: number;
  totalItemsChecked: number;
  totalTrips: number;
  weeklyReminders: number; // reminders in last 7 days
  weeklyItemsChecked: number; // items checked in last 7 days
  weeklyTrips: number;
  lastReminderAt?: number; // timestamp
  firstReminderAt?: number; // timestamp
  streakDays: number; // consecutive days with at least 1 reminder
  lastStreakDate?: string; // YYYY-MM-DD
}

export interface ReminderEvent {
  timestamp: number;
  storeName: string;
  type: "approach" | "arrived";
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  STATS: "r2b_retention_stats",
  REMINDER_EVENTS: "r2b_reminder_events",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.getTime();
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Read / Write ─────────────────────────────────────────────────────────────

export async function getRetentionStats(): Promise<RetentionStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.STATS);
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...JSON.parse(raw) };
  } catch {
    return defaultStats();
  }
}

function defaultStats(): RetentionStats {
  return {
    totalRemindersTriggered: 0,
    totalItemsChecked: 0,
    totalTrips: 0,
    weeklyReminders: 0,
    weeklyItemsChecked: 0,
    weeklyTrips: 0,
    streakDays: 0,
  };
}

async function saveStats(stats: RetentionStats): Promise<void> {
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
}

async function getReminderEvents(): Promise<ReminderEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.REMINDER_EVENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveReminderEvents(events: ReminderEvent[]): Promise<void> {
  // Keep last 500 events only
  const trimmed = events.slice(-500);
  await AsyncStorage.setItem(KEYS.REMINDER_EVENTS, JSON.stringify(trimmed));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Call this every time a geofence notification fires */
export async function recordReminderTriggered(
  storeName: string,
  type: "approach" | "arrived" = "approach"
): Promise<void> {
  const [stats, events] = await Promise.all([getRetentionStats(), getReminderEvents()]);
  const now = Date.now();
  const weekStart = getWeekStart();

  // Recompute weekly count from events
  const weeklyCount = events.filter((e) => e.timestamp >= weekStart).length + 1;

  // Streak logic
  const today = todayString();
  const yesterday = yesterdayString();
  let { streakDays, lastStreakDate } = stats;
  if (lastStreakDate === today) {
    // Already counted today
  } else if (lastStreakDate === yesterday) {
    streakDays += 1;
    lastStreakDate = today;
  } else {
    streakDays = 1;
    lastStreakDate = today;
  }

  const updatedStats: RetentionStats = {
    ...stats,
    totalRemindersTriggered: stats.totalRemindersTriggered + 1,
    weeklyReminders: weeklyCount,
    lastReminderAt: now,
    firstReminderAt: stats.firstReminderAt ?? now,
    streakDays,
    lastStreakDate,
  };

  const newEvent: ReminderEvent = { timestamp: now, storeName, type };
  await Promise.all([
    saveStats(updatedStats),
    saveReminderEvents([...events, newEvent]),
  ]);
}

/** Call this every time a shopping item is checked off */
export async function recordItemChecked(): Promise<void> {
  const stats = await getRetentionStats();
  const weekStart = getWeekStart();
  // Approximate weekly: reset if needed
  const updatedStats: RetentionStats = {
    ...stats,
    totalItemsChecked: stats.totalItemsChecked + 1,
    weeklyItemsChecked: stats.weeklyItemsChecked + 1,
  };
  await saveStats(updatedStats);
}

/** Call this every time a shopping trip is logged */
export async function recordTripCompleted(): Promise<void> {
  const stats = await getRetentionStats();
  await saveStats({
    ...stats,
    totalTrips: stats.totalTrips + 1,
    weeklyTrips: stats.weeklyTrips + 1,
  });
}

/** Get a human-readable weekly summary string */
export async function getWeeklySummary(): Promise<string | null> {
  const stats = await getRetentionStats();
  if (stats.totalRemindersTriggered === 0) return null;

  const parts: string[] = [];
  if (stats.weeklyReminders > 0) {
    parts.push(`${stats.weeklyReminders} reminder${stats.weeklyReminders !== 1 ? "s" : ""} this week`);
  }
  if (stats.weeklyItemsChecked > 0) {
    parts.push(`${stats.weeklyItemsChecked} item${stats.weeklyItemsChecked !== 1 ? "s" : ""} checked off`);
  }
  if (stats.streakDays > 1) {
    parts.push(`${stats.streakDays}-day streak 🔥`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
