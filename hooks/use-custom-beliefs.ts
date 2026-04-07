import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ItemOption } from "@/constants/beliefs";

const STORAGE_KEY = "@r2b_custom_items";

export function useCustomItems() {
  const [customItems, setCustomItems] = useState<ItemOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            setCustomItems(JSON.parse(data));
          } catch {
            // Corrupted data, reset
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const addBelief = useCallback(async (item: ItemOption) => {
    setCustomItems((prev) => {
      const next = [item, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeBelief = useCallback(async (id: string) => {
    setCustomItems((prev) => {
      const next = prev.filter((b) => b.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { customItems, loaded, addBelief, removeBelief };
}
