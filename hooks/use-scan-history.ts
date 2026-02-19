import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ScanResult {
  id: string;
  beliefId: string;
  beliefName: string;
  beliefEmoji: string;
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
}

const STORAGE_KEY = "@belief_scan_history";

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
    if (history.length === 0) return { total: 0, avgScore: 0, strongestBelief: null };
    const avgScore = Math.round(history.reduce((s, h) => s + h.score, 0) / history.length);
    const sorted = [...history].sort((a, b) => b.score - a.score);
    return {
      total: history.length,
      avgScore,
      strongestBelief: sorted[0] || null,
    };
  }, [history]);

  return { history, loaded, saveScan, getStats };
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
    return `Your ${sensorName.toLowerCase()} ${direction} significantly (${absPercent.toFixed(0)}%) during peak focus — this suggests your belief energy created a strong measurable change in the ${unit} readings.`;
  } else if (absPercent > 5) {
    return `The ${sensorName.toLowerCase()} showed a moderate ${direction} of ${absPercent.toFixed(0)}% — your focused belief created a noticeable shift in the environment.`;
  } else if (absPercent > 1) {
    return `A subtle ${direction} of ${absPercent.toFixed(0)}% was detected — even small changes show your belief is having an effect on the readings.`;
  }
  return `The ${sensorName.toLowerCase()} remained relatively stable — this sensor may need more focused belief energy to show a measurable shift.`;
}

export function generateSummary(score: number, beliefName: string): string {
  if (score >= 80) {
    return `Incredible! Your belief in ${beliefName} generated an extraordinarily powerful field. Every sensor detected significant changes in your environment. Your conviction is creating real, measurable energy around you.`;
  } else if (score >= 60) {
    return `Impressive results! Your belief in ${beliefName} created a strong field that multiple sensors could detect. The environment around you shifted noticeably during your focused belief session.`;
  } else if (score >= 40) {
    return `Good session! Your belief in ${beliefName} produced a moderate field. Several sensors picked up changes in your environment. With deeper focus, your belief field could grow even stronger.`;
  } else if (score >= 20) {
    return `Your belief in ${beliefName} is starting to create a detectable field. The sensors picked up subtle shifts. Try focusing more deeply — close your eyes, breathe slowly, and really feel your belief.`;
  }
  return `Your belief field is just beginning to form. The sensors detected very subtle changes. Don't give up! The strongest belief fields come from people who keep practicing and believing harder each time.`;
}
