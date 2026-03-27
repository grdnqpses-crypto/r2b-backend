import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@r2b_onboarding_done";

export function useOnboarding() {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((val) => {
      setDone(val === "true");
    });
  }, []);

  const complete = async () => {
    await AsyncStorage.setItem(KEY, "true");
    setDone(true);
  };

  const reset = async () => {
    await AsyncStorage.removeItem(KEY);
    setDone(false);
  };

  return { done, complete, reset };
}
