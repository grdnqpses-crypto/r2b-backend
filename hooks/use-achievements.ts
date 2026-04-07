import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACHIEVEMENTS_KEY = "@r2b_achievements";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** How to earn it */
  howToEarn: string;
  /** Large emoji artwork */
  icon: string;
  /** Gradient colors for badge background */
  colors: [string, string];
  /** Category for grouping */
  category: "journey" | "mastery" | "explorer" | "dedication";
  /** Whether this is a premium-only badge */
  premium: boolean;
}

export interface EarnedAchievement {
  id: string;
  earnedAt: string; // ISO date
}

// All possible achievements
export const ALL_ACHIEVEMENTS: Achievement[] = [
  // JOURNEY — Getting started and building habits
  {
    id: "first-light",
    title: "First Light",
    description: "You took your first step into the world of belief measurement. Every journey begins with a single scan.",
    howToEarn: "Complete your first belief scan",
    icon: "🌅",
    colors: ["#FFD700", "#FF8C00"],
    category: "journey",
    premium: false,
  },
  {
    id: "curious-mind",
    title: "Curious Mind",
    description: "You've completed 5 scans. Your curiosity is the engine of discovery.",
    howToEarn: "Complete 5 belief scans",
    icon: "🔍",
    colors: ["#00BCD4", "#0097A7"],
    category: "journey",
    premium: false,
  },
  {
    id: "devoted-seeker",
    title: "Devoted Seeker",
    description: "10 scans deep. You're not just curious — you're committed to understanding belief.",
    howToEarn: "Complete 10 belief scans",
    icon: "🧭",
    colors: ["#9B7AFF", "#6B4FCC"],
    category: "journey",
    premium: false,
  },
  {
    id: "field-scientist",
    title: "Field Scientist",
    description: "25 scans! You've gathered enough data to be a real belief field researcher.",
    howToEarn: "Complete 25 belief scans",
    icon: "🔬",
    colors: ["#4CAF50", "#2E7D32"],
    category: "journey",
    premium: false,
  },
  {
    id: "master-shopper",
    title: "Master Shopper",
    description: "50 scans. Your dedication to measuring belief is extraordinary.",
    howToEarn: "Complete 50 belief scans",
    icon: "🏅",
    colors: ["#FF6B6B", "#EE5A24"],
    category: "journey",
    premium: true,
  },
  {
    id: "legend",
    title: "Living Legend",
    description: "100 scans. You are a true pioneer of belief science.",
    howToEarn: "Complete 100 belief scans",
    icon: "🏆",
    colors: ["#FFD700", "#B8860B"],
    category: "journey",
    premium: true,
  },

  // MASTERY — High scores and skill
  {
    id: "strong-signal",
    title: "Strong Signal",
    description: "Your belief field registered above 50. The sensors are responding to you.",
    howToEarn: "Achieve a belief score of 50 or higher",
    icon: "📡",
    colors: ["#2196F3", "#1565C0"],
    category: "mastery",
    premium: false,
  },
  {
    id: "powerful-field",
    title: "Powerful Field",
    description: "A score above 70! Your belief is creating measurable changes in the environment.",
    howToEarn: "Achieve a belief score of 70 or higher",
    icon: "⚡",
    colors: ["#FF9800", "#E65100"],
    category: "mastery",
    premium: false,
  },
  {
    id: "extraordinary",
    title: "Extraordinary",
    description: "Score 80+. Your belief field is in the top tier. The sensors can barely keep up.",
    howToEarn: "Achieve a belief score of 80 or higher",
    icon: "✨",
    colors: ["#E040FB", "#9C27B0"],
    category: "mastery",
    premium: false,
  },
  {
    id: "transcendent",
    title: "Transcendent",
    description: "Score 90+. Your belief has transcended ordinary measurement. This is rare and remarkable.",
    howToEarn: "Achieve a belief score of 90 or higher",
    icon: "🌈",
    colors: ["#FF6B6B", "#9B7AFF"],
    category: "mastery",
    premium: true,
  },
  {
    id: "perfect-field",
    title: "Perfect Field",
    description: "Score 95+. Near-perfect belief resonance. You've achieved what few ever will.",
    howToEarn: "Achieve a belief score of 95 or higher",
    icon: "💎",
    colors: ["#00E5FF", "#00B0FF"],
    category: "mastery",
    premium: true,
  },

  // EXPLORER — Trying different stores
  {
    id: "open-heart",
    title: "Open Heart",
    description: "You've explored 3 different stores. An open mind leads to better shopping.",
    howToEarn: "Visit 3 different stores",
    icon: "💖",
    colors: ["#F48FB1", "#E91E63"],
    category: "explorer",
    premium: false,
  },
  {
    id: "world-explorer",
    title: "World Explorer",
    description: "5 different stores visited. You're exploring the full spectrum of shopping.",
    howToEarn: "Visit 5 different stores",
    icon: "🌍",
    colors: ["#4DB6AC", "#00796B"],
    category: "explorer",
    premium: false,
  },
  {
    id: "belief-collector",
    title: "Belief Collector",
    description: "10 different beliefs explored! You understand that belief comes in many forms.",
    howToEarn: "Visit 10 different stores",
    icon: "🗺️",
    colors: ["#FFB74D", "#F57C00"],
    category: "explorer",
    premium: true,
  },
  {
    id: "category-master",
    title: "Category Master",
    description: "You've scanned a belief from every category. A true student of belief science.",
    howToEarn: "Scan at least one belief from every category",
    icon: "🎓",
    colors: ["#7C4DFF", "#304FFE"],
    category: "explorer",
    premium: true,
  },
  {
    id: "journal-keeper",
    title: "Journal Keeper",
    description: "You've written 5 journal entries. Reflecting on belief deepens the experience.",
    howToEarn: "Write 5 journal entries after scans",
    icon: "📝",
    colors: ["#8D6E63", "#5D4037"],
    category: "explorer",
    premium: false,
  },

  // DEDICATION — Streaks and consistency
  {
    id: "spark",
    title: "Spark",
    description: "2 days in a row! A spark of dedication has been lit.",
    howToEarn: "Maintain a 2-day scan streak",
    icon: "🕯️",
    colors: ["#FFEB3B", "#FBC02D"],
    category: "dedication",
    premium: false,
  },
  {
    id: "flame",
    title: "Flame",
    description: "3 consecutive days. Your belief flame is growing stronger.",
    howToEarn: "Maintain a 3-day scan streak",
    icon: "🔥",
    colors: ["#FF5722", "#D84315"],
    category: "dedication",
    premium: false,
  },
  {
    id: "week-warrior",
    title: "Week Warrior",
    description: "7 days straight! A full week of daily belief measurement. Incredible.",
    howToEarn: "Maintain a 7-day scan streak",
    icon: "⚔️",
    colors: ["#607D8B", "#37474F"],
    category: "dedication",
    premium: false,
  },
  {
    id: "fortnight-force",
    title: "Fortnight Force",
    description: "14 days of unwavering commitment. Your belief field grows stronger every day.",
    howToEarn: "Maintain a 14-day scan streak",
    icon: "🛡️",
    colors: ["#3F51B5", "#1A237E"],
    category: "dedication",
    premium: true,
  },
  {
    id: "monthly-master",
    title: "Monthly Master",
    description: "30 days! A full month of daily belief. You are a true master of dedication.",
    howToEarn: "Maintain a 30-day scan streak",
    icon: "👑",
    colors: ["#FFD700", "#9B7AFF"],
    category: "dedication",
    premium: true,
  },
  {
    id: "meditator",
    title: "Mindful Meditator",
    description: "You completed a guided meditation before your scan. A calm mind shops smarter.",
    howToEarn: "Complete a pre-scan meditation",
    icon: "🧘",
    colors: ["#80DEEA", "#00ACC1"],
    category: "dedication",
    premium: false,
  },
];

// Achievement category labels
export const ACHIEVEMENT_CATEGORIES = [
  { id: "journey" as const, name: "Journey", emoji: "🚀", description: "Milestones on your belief journey" },
  { id: "mastery" as const, name: "Mastery", emoji: "⭐", description: "Achieving high belief scores" },
  { id: "explorer" as const, name: "Explorer", emoji: "🌍", description: "Exploring different stores" },
  { id: "dedication" as const, name: "Dedication", emoji: "🔥", description: "Consistency and commitment" },
];

export function useAchievements() {
  const [earned, setEarned] = useState<EarnedAchievement[]>([]);
  const [newlyEarned, setNewlyEarned] = useState<Achievement[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(ACHIEVEMENTS_KEY).then((raw) => {
      if (raw) {
        try {
          setEarned(JSON.parse(raw));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const earnAchievement = useCallback(
    async (id: string) => {
      if (earned.some((e) => e.id === id)) return; // Already earned
      const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement) return;

      const entry: EarnedAchievement = {
        id,
        earnedAt: new Date().toISOString(),
      };
      const updated = [...earned, entry];
      setEarned(updated);
      setNewlyEarned((prev) => [...prev, achievement]);
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
    },
    [earned]
  );

  /** Check and award achievements based on current stats */
  const checkAchievements = useCallback(
    async (stats: {
      totalScans: number;
      currentStreak: number;
      personalBest: number;
      uniqueItems: string[];
      uniqueCategories: string[];
      journalCount: number;
      usedMeditation: boolean;
    }) => {
      const toEarn: string[] = [];

      // Journey
      if (stats.totalScans >= 1) toEarn.push("first-light");
      if (stats.totalScans >= 5) toEarn.push("curious-mind");
      if (stats.totalScans >= 10) toEarn.push("devoted-seeker");
      if (stats.totalScans >= 25) toEarn.push("field-scientist");
      if (stats.totalScans >= 50) toEarn.push("master-shopper");
      if (stats.totalScans >= 100) toEarn.push("legend");

      // Mastery
      if (stats.personalBest >= 50) toEarn.push("strong-signal");
      if (stats.personalBest >= 70) toEarn.push("powerful-field");
      if (stats.personalBest >= 80) toEarn.push("extraordinary");
      if (stats.personalBest >= 90) toEarn.push("transcendent");
      if (stats.personalBest >= 95) toEarn.push("perfect-field");

      // Explorer
      if (stats.uniqueItems.length >= 3) toEarn.push("open-heart");
      if (stats.uniqueItems.length >= 5) toEarn.push("world-explorer");
      if (stats.uniqueItems.length >= 10) toEarn.push("belief-collector");
      if (stats.uniqueCategories.length >= 6) toEarn.push("category-master");
      if (stats.journalCount >= 5) toEarn.push("journal-keeper");

      // Dedication
      if (stats.currentStreak >= 2) toEarn.push("spark");
      if (stats.currentStreak >= 3) toEarn.push("flame");
      if (stats.currentStreak >= 7) toEarn.push("week-warrior");
      if (stats.currentStreak >= 14) toEarn.push("fortnight-force");
      if (stats.currentStreak >= 30) toEarn.push("monthly-master");
      if (stats.usedMeditation) toEarn.push("meditator");

      // Earn any new ones
      for (const id of toEarn) {
        if (!earned.some((e) => e.id === id)) {
          await earnAchievement(id);
        }
      }
    },
    [earned, earnAchievement]
  );

  const clearNewlyEarned = useCallback(() => {
    setNewlyEarned([]);
  }, []);

  const isEarned = useCallback(
    (id: string) => earned.some((e) => e.id === id),
    [earned]
  );

  const getEarnedDate = useCallback(
    (id: string) => earned.find((e) => e.id === id)?.earnedAt ?? null,
    [earned]
  );

  return {
    earned,
    newlyEarned,
    loaded,
    checkAchievements,
    clearNewlyEarned,
    isEarned,
    getEarnedDate,
    totalEarned: earned.length,
    totalAvailable: ALL_ACHIEVEMENTS.length,
  };
}
