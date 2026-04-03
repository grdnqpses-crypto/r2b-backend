// CRITICAL: These imports MUST be at the very top before any other code.
// TaskManager.defineTask and Notifications.setNotificationHandler must run at module scope.
import "@/lib/tasks";
import "@/lib/notifications";
import "@/lib/i18n"; // Initialize i18next with all 21 locales
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect, SplashScreen } from "expo-router";
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
 * RootNavigator — uses <Redirect> instead of router.replace() to avoid
 * the Android New Architecture crash where calling router.replace() during
 * a React state update while a screen is still mounted causes a native exception.
 *
 * The <Redirect> component is rendered as part of the React tree, so it
 * participates in the normal render cycle and never races with navigation state.
 * This is the officially supported pattern for expo-router 6.
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
  }, [isOnboardingComplete]);

  // Keep splash screen up until we know onboarding state
  if (!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="oauth/callback" />
      {/* <Redirect> is safe on Android New Architecture — it never calls router imperatively */}
      {!isOnboardingComplete && <Redirect href="/onboarding" />}
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
