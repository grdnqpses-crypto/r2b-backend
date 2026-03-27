/**
 * ScanHistoryProvider — shared context for scan history across all tabs.
 *
 * Problem: When useScanHistory() was a standalone hook, each tab (Detect, History, Settings)
 * created its own separate useState. Saving a scan in the Detect tab updated AsyncStorage
 * but the History tab's local state was stale.
 *
 * Solution: A single React Context at the app root so all consumers share one state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ScanResult } from "@/hooks/use-scan-history";

const STORAGE_KEY = "@r2b_scan_history";

interface ScanHistoryContextValue {
  history: ScanResult[];
  loaded: boolean;
  saveScan: (scan: ScanResult) => Promise<void>;
  getStats: () => {
    total: number;
    avgScore: number;
    strongestItem: ScanResult | null;
  };
  updateJournal: (scanId: string, entry: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const ScanHistoryContext = createContext<ScanHistoryContextValue | null>(null);

export function ScanHistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
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
      setHistory((prev) => {
        const updated = [scan, ...prev].slice(0, 100);
        // Fire-and-forget save to AsyncStorage
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    []
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
      setHistory((prev) => {
        const updated = prev.map((h) =>
          h.id === scanId ? { ...h, journalEntry: entry } : h
        );
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    []
  );

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ScanHistoryContext.Provider
      value={{ history, loaded, saveScan, getStats, updateJournal, clearHistory }}
    >
      {children}
    </ScanHistoryContext.Provider>
  );
}

/**
 * Hook to access the shared scan history.
 * Must be used inside <ScanHistoryProvider>.
 */
export function useScanHistoryContext() {
  const ctx = useContext(ScanHistoryContext);
  if (!ctx) {
    throw new Error("useScanHistoryContext must be used inside <ScanHistoryProvider>");
  }
  return ctx;
}
