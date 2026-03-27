import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREMIUM_KEY = "@r2b_premium";
const DAILY_SCANS_KEY = "@r2b_daily_scans";
const PROFILE_KEY = "@r2b_profiles";

// Free tier limits
export const FREE_SCAN_LIMIT = 3;
export const FREE_ITEM_IDS = ["santa", "tooth-fairy", "easter-bunny", "god", "guardian-angel"];
/** @deprecated Use FREE_ITEM_IDS */
export const FREE_CATEGORY_IDS = FREE_ITEM_IDS;
export const FREE_SCAN_DURATION = 30;

export interface PremiumState {
  isPremium: boolean;
  isFamilyPlan: boolean;
  // For demo/development, we simulate subscription
  activatedAt: string | null;
}

export interface DailyScans {
  date: string; // YYYY-MM-DD
  count: number;
}

const DEFAULT_STATE: PremiumState = {
  isPremium: false,
  isFamilyPlan: false,
  activatedAt: null,
};

export function usePremium() {
  const [premium, setPremium] = useState<PremiumState>(DEFAULT_STATE);
  const [dailyScans, setDailyScans] = useState<DailyScans>({ date: "", count: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [premStr, scanStr] = await Promise.all([
          AsyncStorage.getItem(PREMIUM_KEY),
          AsyncStorage.getItem(DAILY_SCANS_KEY),
        ]);
        if (premStr) setPremium(JSON.parse(premStr));
        
        const today = new Date().toISOString().split("T")[0];
        if (scanStr) {
          const parsed = JSON.parse(scanStr) as DailyScans;
          if (parsed.date === today) {
            setDailyScans(parsed);
          } else {
            setDailyScans({ date: today, count: 0 });
          }
        } else {
          setDailyScans({ date: today, count: 0 });
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const savePremium = useCallback(async (state: PremiumState) => {
    setPremium(state);
    await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(state));
  }, []);

  const recordDailyScan = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const updated: DailyScans =
      dailyScans.date === today
        ? { date: today, count: dailyScans.count + 1 }
        : { date: today, count: 1 };
    setDailyScans(updated);
    await AsyncStorage.setItem(DAILY_SCANS_KEY, JSON.stringify(updated));
  }, [dailyScans]);

  const canScanToday = premium.isPremium || dailyScans.count < FREE_SCAN_LIMIT;
  const scansRemaining = premium.isPremium ? Infinity : Math.max(0, FREE_SCAN_LIMIT - dailyScans.count);

  const isItemFree = useCallback((itemId: string) => {
    return FREE_ITEM_IDS.includes(itemId);
  }, []);

  const isItemAccessible = useCallback(
    (itemId: string) => {
      return premium.isPremium || FREE_ITEM_IDS.includes(itemId);
    },
    [premium.isPremium]
  );

  // Simulate activating premium (in production, this would be IAP)
  const activatePremium = useCallback(
    async (family: boolean = false) => {
      const state: PremiumState = {
        isPremium: true,
        isFamilyPlan: family,
        activatedAt: new Date().toISOString(),
      };
      await savePremium(state);
    },
    [savePremium]
  );

  const deactivatePremium = useCallback(async () => {
    await savePremium(DEFAULT_STATE);
  }, [savePremium]);

  return {
    premium,
    loaded,
    canScanToday,
    scansRemaining,
    dailyScans,
    isItemFree,
    isItemAccessible,
    recordDailyScan,
    activatePremium,
    deactivatePremium,
  };
}
