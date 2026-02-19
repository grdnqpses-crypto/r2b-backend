import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAK_KEY = "@belief_streak";

export interface StreakData {
  /** Current consecutive days of scanning */
  currentStreak: number;
  /** All-time longest streak */
  longestStreak: number;
  /** Total number of scans ever */
  totalScans: number;
  /** Date string (YYYY-MM-DD) of last scan */
  lastScanDate: string;
  /** Personal best score ever */
  personalBest: number;
  /** Personal best belief name */
  personalBestBelief: string;
  /** Milestone messages earned */
  milestones: string[];
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  totalScans: 0,
  lastScanDate: "",
  personalBest: 0,
  personalBestBelief: "",
  milestones: [],
};

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get an encouraging message based on streak length */
export function getStreakMessage(streak: number): string {
  if (streak >= 30) return "Legendary believer! 30+ days of unwavering faith.";
  if (streak >= 21) return "Three weeks strong! Your belief field is extraordinary.";
  if (streak >= 14) return "Two weeks of daily belief! You're building something powerful.";
  if (streak >= 7) return "One full week! Your belief grows stronger every day.";
  if (streak >= 5) return "Five days in a row! Your dedication is inspiring.";
  if (streak >= 3) return "Three-day streak! Keep the momentum going.";
  if (streak >= 2) return "Two days running! You're building a habit.";
  if (streak >= 1) return "Great start! Come back tomorrow to build your streak.";
  return "Start your belief journey today!";
}

/** Get milestone messages for reaching certain thresholds */
function checkMilestones(data: StreakData): string[] {
  const newMilestones: string[] = [];

  if (data.totalScans === 1 && !data.milestones.includes("first-scan"))
    newMilestones.push("first-scan");
  if (data.totalScans >= 10 && !data.milestones.includes("10-scans"))
    newMilestones.push("10-scans");
  if (data.totalScans >= 25 && !data.milestones.includes("25-scans"))
    newMilestones.push("25-scans");
  if (data.totalScans >= 50 && !data.milestones.includes("50-scans"))
    newMilestones.push("50-scans");
  if (data.totalScans >= 100 && !data.milestones.includes("100-scans"))
    newMilestones.push("100-scans");
  if (data.currentStreak >= 3 && !data.milestones.includes("3-day-streak"))
    newMilestones.push("3-day-streak");
  if (data.currentStreak >= 7 && !data.milestones.includes("7-day-streak"))
    newMilestones.push("7-day-streak");
  if (data.currentStreak >= 14 && !data.milestones.includes("14-day-streak"))
    newMilestones.push("14-day-streak");
  if (data.currentStreak >= 30 && !data.milestones.includes("30-day-streak"))
    newMilestones.push("30-day-streak");
  if (data.personalBest >= 80 && !data.milestones.includes("score-80"))
    newMilestones.push("score-80");
  if (data.personalBest >= 90 && !data.milestones.includes("score-90"))
    newMilestones.push("score-90");

  return newMilestones;
}

/** Human-readable milestone label */
export function getMilestoneLabel(milestone: string): { emoji: string; label: string } {
  const map: Record<string, { emoji: string; label: string }> = {
    "first-scan": { emoji: "🌟", label: "First Scan" },
    "10-scans": { emoji: "📊", label: "10 Scans" },
    "25-scans": { emoji: "🔬", label: "25 Scans" },
    "50-scans": { emoji: "🏅", label: "50 Scans" },
    "100-scans": { emoji: "🏆", label: "100 Scans" },
    "3-day-streak": { emoji: "🔥", label: "3-Day Streak" },
    "7-day-streak": { emoji: "⚡", label: "7-Day Streak" },
    "14-day-streak": { emoji: "💎", label: "14-Day Streak" },
    "30-day-streak": { emoji: "👑", label: "30-Day Streak" },
    "score-80": { emoji: "✨", label: "Score 80+" },
    "score-90": { emoji: "🌈", label: "Score 90+" },
  };
  return map[milestone] || { emoji: "⭐", label: milestone };
}

export function useBeliefStreak() {
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);
  const [loaded, setLoaded] = useState(false);
  const [newMilestones, setNewMilestones] = useState<string[]>([]);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(STREAK_KEY).then((raw) => {
      if (raw) {
        try {
          const data = JSON.parse(raw) as StreakData;
          // Check if streak is still valid (didn't miss a day)
          const today = getToday();
          const yesterday = getYesterday();
          if (data.lastScanDate !== today && data.lastScanDate !== yesterday) {
            // Streak broken — reset current but keep records
            data.currentStreak = 0;
          }
          setStreak(data);
        } catch {
          setStreak(DEFAULT_STREAK);
        }
      }
      setLoaded(true);
    });
  }, []);

  /** Record a completed scan */
  const recordScan = useCallback(
    async (score: number, beliefName: string) => {
      const today = getToday();
      const yesterday = getYesterday();

      setStreak((prev) => {
        let newStreak = { ...prev };
        newStreak.totalScans += 1;

        // Update streak
        if (prev.lastScanDate === today) {
          // Already scanned today — no streak change
        } else if (prev.lastScanDate === yesterday) {
          // Consecutive day
          newStreak.currentStreak = prev.currentStreak + 1;
        } else {
          // New streak
          newStreak.currentStreak = 1;
        }

        newStreak.lastScanDate = today;

        // Update longest
        if (newStreak.currentStreak > newStreak.longestStreak) {
          newStreak.longestStreak = newStreak.currentStreak;
        }

        // Update personal best
        if (score > newStreak.personalBest) {
          newStreak.personalBest = score;
          newStreak.personalBestBelief = beliefName;
        }

        // Check milestones
        const earned = checkMilestones(newStreak);
        if (earned.length > 0) {
          newStreak.milestones = [...newStreak.milestones, ...earned];
          setNewMilestones(earned);
        }

        // Persist
        AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
        return newStreak;
      });
    },
    []
  );

  /** Clear new milestone notifications */
  const clearNewMilestones = useCallback(() => {
    setNewMilestones([]);
  }, []);

  /** Whether the user has scanned today */
  const scannedToday = streak.lastScanDate === getToday();

  return {
    streak,
    loaded,
    scannedToday,
    newMilestones,
    recordScan,
    clearNewMilestones,
  };
}
