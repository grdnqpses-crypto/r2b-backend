/**
 * Savings Streak
 *
 * Tracks consecutive weeks where the user's savings met or exceeded their goal.
 * A "week" is defined as Mon–Sun (ISO week). Each week is checked independently:
 * if the user saved >= goal that week, the streak continues; otherwise it resets.
 *
 * Streak data is stored in AsyncStorage under the key "r2b_savings_streak".
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_KEY = "r2b_savings_streak";
const GOAL_KEY = "r2b_savings_goal";

export interface SavingsStreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckedWeek: string; // ISO week string, e.g. "2026-W14"
  weeklyHistory: { week: string; saved: number; goal: number; met: boolean }[];
}

interface SavingsGoal {
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  createdAt: number;
}

/** Returns the ISO week string for a given timestamp, e.g. "2026-W14" */
export function getISOWeek(ts: number = Date.now()): string {
  const date = new Date(ts);
  const jan4 = new Date(date.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const daysDiff = Math.floor((date.getTime() - startOfWeek1.getTime()) / 86400000);
  const weekNum = Math.floor(daysDiff / 7) + 1;
  return `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

/** Returns the start timestamp (Monday 00:00) of the given ISO week string */
export function getWeekStart(isoWeek: string): number {
  const [yearStr, weekStr] = isoWeek.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  startOfWeek1.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  startOfWeek1.setHours(0, 0, 0, 0);
  return startOfWeek1.getTime();
}

export async function getSavingsStreak(): Promise<SavingsStreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCheckedWeek: "",
    weeklyHistory: [],
  };
}

/**
 * Recalculates the savings streak based on cashback entries and the user's savings goal.
 * Call this whenever cashback is logged or the goal changes.
 */
export async function recalculateSavingsStreak(cashbackEntries: { date: number; amount: number }[]): Promise<SavingsStreakData> {
  const streak = await getSavingsStreak();

  // Load the savings goal
  const goalRaw = await AsyncStorage.getItem(GOAL_KEY);
  if (!goalRaw) {
    // No goal set — streak stays at 0 but we don't reset existing data
    return streak;
  }
  const goal: SavingsGoal = JSON.parse(goalRaw);
  if (goal.period !== "weekly") {
    // Only track weekly goals for streak purposes
    return streak;
  }

  const currentWeek = getISOWeek();

  // If we already checked this week, return cached data
  if (streak.lastCheckedWeek === currentWeek) {
    return streak;
  }

  // Group cashback entries by ISO week
  const byWeek: Record<string, number> = {};
  for (const entry of cashbackEntries) {
    const week = getISOWeek(entry.date);
    byWeek[week] = (byWeek[week] ?? 0) + entry.amount;
  }

  // Build weekly history for the last 12 weeks
  const weeks: string[] = [];
  let ts = Date.now();
  for (let i = 0; i < 12; i++) {
    weeks.unshift(getISOWeek(ts));
    ts -= 7 * 24 * 60 * 60 * 1000;
  }
  // Deduplicate
  const uniqueWeeks = [...new Set(weeks)];

  const weeklyHistory = uniqueWeeks.map((week) => ({
    week,
    saved: byWeek[week] ?? 0,
    goal: goal.amount,
    met: (byWeek[week] ?? 0) >= goal.amount,
  }));

  // Calculate current streak (count backwards from last completed week)
  // Don't count the current week as it's still in progress
  const completedWeeks = weeklyHistory.filter((w) => w.week < currentWeek);
  let currentStreak = 0;
  for (let i = completedWeeks.length - 1; i >= 0; i--) {
    if (completedWeeks[i].met) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Also check if current week is already meeting the goal (optimistic streak)
  const thisWeekSaved = byWeek[currentWeek] ?? 0;
  if (thisWeekSaved >= goal.amount) {
    currentStreak++;
  }

  const longestStreak = Math.max(streak.longestStreak, currentStreak);

  const newStreak: SavingsStreakData = {
    currentStreak,
    longestStreak,
    lastCheckedWeek: currentWeek,
    weeklyHistory,
  };

  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
  return newStreak;
}

/** Returns a fire emoji string based on streak count */
export function getStreakEmoji(streak: number): string {
  if (streak === 0) return "💤";
  if (streak < 3) return "🔥";
  if (streak < 7) return "🔥🔥";
  if (streak < 12) return "🔥🔥🔥";
  return "🏆";
}

/** Returns a motivational message for the streak */
export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Set a weekly savings goal to start your streak!";
  if (streak === 1) return "You're on a 1-week streak! Keep it going!";
  if (streak < 4) return `${streak}-week streak! You're building great habits!`;
  if (streak < 8) return `${streak}-week streak! You're on fire! 🔥`;
  if (streak < 13) return `${streak}-week streak! Incredible discipline!`;
  return `${streak}-week streak! You're a savings legend! 🏆`;
}
