// CRITICAL: These imports MUST be at the very top before any other code.
// TaskManager.defineTask and Notifications.setNotificationHandler must run at module scope.
import "@/lib/tasks";
import "@/lib/notifications";
import "@/lib/i18n"; // Initialize i18next with all 21 locales
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import { getSavedStores } from "@/lib/storage";
import { checkLocationPermissions, startGeofencing } from "@/lib/geofence";

// Keep the splash screen visible until we have loaded onboarding state
SplashScreen.preventAutoHideAsync();

/**
 * On every app launch, if background location is granted and stores exist,
 * restart geofencing automatically. Delayed to avoid racing with navigation.
 */
async function autoStartGeofencing() {
  try {
    const perms = await checkLocationPermissions();
    if (!perms.background) return;
    const stores = await getSavedStores();
    if (stores.length === 0) return;
    await startGeofencing(stores);
  } catch {
    // Non-fatal
  }
}

/**
 * RootNavigator — uses Stack.Protected to show/hide screens based on onboarding state.
 *
 * Stack.Protected with guard={false} excludes screens from the navigation stack entirely.
 * This is a STATIC FILTER — it never calls router.replace() or any imperative navigation.
 * React Navigation handles the transition internally when the guard prop changes.
 *
 * This is the correct, crash-free approach for expo-router 6.0.19 on Android New Architecture.
 *
 * How it works:
 * - When isOnboardingComplete=false: only "onboarding" is in the stack
 * - When isOnboardingComplete=true: only "(tabs)" is in the stack
 * - The transition happens automatically — no router.replace(), no Redirect, no useEffect navigation
 */
function RootNavigator() {
  const { isLoaded, isOnboardingComplete } = useOnboarding();
  const [geofenceStarted, setGeofenceStarted] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    // Hide splash once we know onboarding state
    SplashScreen.hideAsync().catch(() => {});
  }, [isLoaded]);

  useEffect(() => {
    if (!isOnboardingComplete || geofenceStarted) return;
    setGeofenceStarted(true);
    // Delay geofencing start to avoid racing with navigation transition
    const timer = setTimeout(() => {
      autoStartGeofencing();
    }, 2000);
    return () => clearTimeout(timer);
  }, [isOnboardingComplete, geofenceStarted]);

  // Keep splash screen up until we know onboarding state
  if (!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Onboarding screens — only accessible when onboarding is NOT complete */}
      <Stack.Protected guard={!isOnboardingComplete}>
        <Stack.Screen
          name="onboarding"
          options={{ animation: "none", gestureEnabled: false }}
        />
      </Stack.Protected>

      {/* Main app screens — only accessible when onboarding IS complete */}
      <Stack.Protected guard={isOnboardingComplete}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oauth/callback" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <OnboardingProvider>
                <RootNavigator />
                <StatusBar style="auto" />
              </OnboardingProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
