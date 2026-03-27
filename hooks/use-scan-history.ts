import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ScanResult {
  id: string;
  itemId: string;
  itemName: string;
  itemEmoji: string;
  intensity: number;
  score: number;
  date: string;
  sensorBreakdown: {
    sensorId: string;
    sensorName: string;
    baseline: number;
    peak: number;
    deviation: number;
    deviationPercent: number;
    unit: string;
    interpretation: string;
  }[];
  summary: string;
  journalEntry?: string;
}

const STORAGE_KEY = "@r2b_scan_history";

export function useScanHistory() {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setHistory(JSON.parse(data));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const saveScan = useCallback(
    async (scan: ScanResult) => {
      const updated = [scan, ...history].slice(0, 100);
      setHistory(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [history]
  );

  const getStats = useCallback(() => {
    if (history.length === 0) return { total: 0, avgScore: 0, strongestItem: null };
    const avgScore = Math.round(history.reduce((s, h) => s + h.score, 0) / history.length);
    const sorted = [...history].sort((a, b) => b.score - a.score);
    return {
      total: history.length,
      avgScore,
      strongestItem: sorted[0] || null,
    };
  }, [history]);

  const updateJournal = useCallback(
    async (scanId: string, entry: string) => {
      const updated = history.map((h) =>
        h.id === scanId ? { ...h, journalEntry: entry } : h
      );
      setHistory(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [history]
  );

  return { history, loaded, saveScan, getStats, updateJournal };
}

export function generateInterpretation(
  sensorName: string,
  deviationPercent: number,
  unit: string,
  deviation: number
): string {
  const absPercent = Math.abs(deviationPercent);
  const direction = deviation > 0 ? "increased" : "decreased";

  if (absPercent > 15) {
    return `Your ${sensorName.toLowerCase()} ${direction} significantly (${absPercent.toFixed(0)}%) during peak focus — this suggests your activity created a strong measurable change in the ${unit} readings.`;
  } else if (absPercent > 5) {
    return `The ${sensorName.toLowerCase()} showed a moderate ${direction} of ${absPercent.toFixed(0)}% — your focused created a noticeable shift in the environment.`;
  } else if (absPercent > 1) {
    return `A subtle ${direction} of ${absPercent.toFixed(0)}% was detected — even small changes show your activity is registering on the readings.`;
  }
  return `The ${sensorName.toLowerCase()} remained relatively stable — this sensor may need more focused activity to show a measurable shift.`;
}

export function generateSummary(score: number, itemName: string): string {
  if (score >= 80) {
    return `Incredible! Your list for ${itemName} generated an extraordinarily powerful field. Every sensor detected significant changes in your environment. Your conviction is creating real, measurable energy around you.`;
  } else if (score >= 60) {
    return `Impressive results! Your list for ${itemName} created a strong field that multiple sensors could detect. The environment around you shifted noticeably during your focused shopping session.`;
  } else if (score >= 40) {
    return `Good session! Your list for ${itemName} produced a moderate field. Several sensors picked up changes in your environment. With deeper focus, your shopping activity could grow even stronger.`;
  } else if (score >= 20) {
    return `Your list for ${itemName} is starting to create a detectable field. The sensors picked up subtle shifts. Try focusing more deeply — close your eyes, breathe slowly, and really feel your list.`;
  }
  return `Your shopping activity is just beginning to form. The activity detected very subtle changes. Don't give up! The strongest shopping activitys come from people who keep practicing and trying harder each time.`;
}
