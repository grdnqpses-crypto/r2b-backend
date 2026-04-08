// CRITICAL: These imports MUST be at the very top before any other code.
// TaskManager.defineTask and Notifications.setNotificationHandler must run at module scope.
import "@/lib/tasks";
import "@/lib/notifications";
import "@/lib/i18n"; // Initialize i18next with all 21 locales
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, SplashScreen, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import { SubscriptionProvider } from "@/lib/subscription-context";
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
  const router = useRouter();
  const notifListenerRef = useRef<Notifications.EventSubscription | null>(null);

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

  // ── Notification tap deep-link handler ────────────────────────────────────
  // When the user taps a "geofence_forgot" notification, navigate to /forgot-check.
  // This listener handles both foreground and background (cold-start) taps.
  useEffect(() => {
    if (!isOnboardingComplete) return;

    notifListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        if (data?.type === "geofence_forgot") {
          // Small delay to ensure navigation stack is ready
          setTimeout(() => {
            router.push("/forgot-check" as never);
          }, 300);
        }
      }
    );

    return () => {
      notifListenerRef.current?.remove();
    };
  }, [isOnboardingComplete, router]);

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
        {/* Deep-link target for "Did you forget something?" geofence-exit notification */}
        <Stack.Screen name="forgot-check" options={{ animation: "slide_from_bottom" }} />
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
                <SubscriptionProvider>
                  <RootNavigator />
                  <StatusBar style="auto" />
                </SubscriptionProvider>
              </OnboardingProvider>
            </QueryClientProvider>
          </trpc.Provider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
