/**
 * OnboardingContext
 *
 * Provides a shared onboarding state to the entire app.
 * The root layout reads `isOnboardingComplete` to decide which screens
 * to protect via Stack.Protected — NO router.replace() is used anywhere.
 *
 * This pattern is the officially recommended approach for SDK 53+ (Expo Router v5+).
 * See: https://docs.expo.dev/router/advanced/protected/
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { isOnboardingDone, markOnboardingDone } from "@/lib/storage";

interface OnboardingContextValue {
  /** True once we have read AsyncStorage (prevents flash of wrong screen) */
  isLoaded: boolean;
  /** True if the user has completed onboarding */
  isOnboardingComplete: boolean;
  /** Call this when the user finishes onboarding — updates state immediately */
  completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  isLoaded: false,
  isOnboardingComplete: false,
  completeOnboarding: async () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    isOnboardingDone()
      .then((done) => {
        setIsOnboardingComplete(done);
      })
      .catch(() => {
        setIsOnboardingComplete(false);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const completeOnboarding = async () => {
    await markOnboardingDone();
    // Update state AFTER persisting — this triggers Stack.Protected to re-evaluate
    // and the router automatically navigates to (tabs). No router.replace() needed.
    setIsOnboardingComplete(true);
  };

  return (
    <OnboardingContext.Provider value={{ isLoaded, isOnboardingComplete, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
