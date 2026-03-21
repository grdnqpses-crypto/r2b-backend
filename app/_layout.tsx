// CRITICAL: These imports MUST be at the very top before any other code.
// TaskManager.defineTask and Notifications.setNotificationHandler must run at module scope.
import "@/lib/tasks";
import "@/lib/notifications";
import "@/global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { isOnboardingDone, getSavedStores } from "@/lib/storage";
import { checkLocationPermissions, startGeofencing } from "@/lib/geofence";

/**
 * On every app launch, if background location is granted and stores exist,
 * restart geofencing automatically. This handles the case where the app
 * was killed and reopened.
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

export const unstable_settings = {
  anchor: "(tabs)",
};

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const done = await isOnboardingDone();
      const inOnboarding = (segments[0] as string) === "onboarding";
      if (!done && !inOnboarding) {
        router.replace("/onboarding" as any);
      } else if (done) {
        // Onboarding complete — auto-restart geofencing in background
        autoStartGeofencing();
      }
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;
  return <>{children}</>;
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
              <OnboardingGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
                  <Stack.Screen name="oauth/callback" />
                </Stack>
              </OnboardingGuard>
              <StatusBar style="auto" />
            </QueryClientProvider>
          </trpc.Provider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
