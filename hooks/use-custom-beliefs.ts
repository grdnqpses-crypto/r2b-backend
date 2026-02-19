import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BeliefOption } from "@/constants/beliefs";

const STORAGE_KEY = "belief-field-custom-beliefs";

export function useCustomBeliefs() {
  const [customBeliefs, setCustomBeliefs] = useState<BeliefOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            setCustomBeliefs(JSON.parse(data));
          } catch {
            // Corrupted data, reset
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const addBelief = useCallback(async (belief: BeliefOption) => {
    setCustomBeliefs((prev) => {
      const next = [belief, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeBelief = useCallback(async (id: string) => {
    setCustomBeliefs((prev) => {
      const next = prev.filter((b) => b.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { customBeliefs, loaded, addBelief, removeBelief };
}
