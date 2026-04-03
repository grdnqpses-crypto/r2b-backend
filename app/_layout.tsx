// CRITICAL: These imports MUST be at the very top before any other code.
// TaskManager.defineTask and Notifications.setNotificationHandler must run at module scope.
import "@/lib/tasks";
import "@/lib/notifications";
import "@/lib/i18n"; // Initialize i18next with all 21 locales
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { SplashScreen } from "expo-router";
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
 * RootNavigator handles auth-gated navigation using useRouter + useSegments.
 * This is the stable pattern for expo-router 6.x — Stack.Protected does NOT
 * exist in this version and will crash the app when the guard condition changes.
 */
function RootNavigator() {
  const { isLoaded, isOnboardingComplete } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;

    // Hide splash once we know onboarding state
    SplashScreen.hideAsync();

    const inOnboarding = segments[0] === "onboarding";
    const inTabs = segments[0] === "(tabs)";

    if (!isOnboardingComplete && !inOnboarding) {
      // Not done onboarding — send to onboarding
      router.replace("/onboarding");
    } else if (isOnboardingComplete && !inTabs) {
      // Done onboarding — send to main app, then start geofencing
      router.replace("/(tabs)");
      // Delay geofencing start to avoid racing with navigation transition
      setTimeout(() => {
        autoStartGeofencing();
      }, 1000);
    }
  }, [isLoaded, isOnboardingComplete]);

  // Keep splash screen up until we know onboarding state
  if (!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="oauth/callback" />
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
