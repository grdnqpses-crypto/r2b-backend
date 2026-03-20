import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { runDiagnostic } from "@/hooks/use-diagnostics";
import { ScanHistoryProvider } from "@/lib/scan-history-provider";
import { initSentry, Sentry } from "@/lib/sentry";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenCapture from "expo-screen-capture";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  // Initialize Sentry crash reporting + device user ID
  useEffect(() => {
    const setup = async () => {
      await initSentry().catch(() => {});

      // Set a stable anonymous device ID so crashes can be grouped by device
      try {
        let deviceId = await AsyncStorage.getItem("@sentry_device_id");
        if (!deviceId) {
          // Generate a random stable ID (no PII)
          deviceId = `device_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
          await AsyncStorage.setItem("@sentry_device_id", deviceId);
        }
        Sentry.setDeviceUser(deviceId);
      } catch {
        // Never block startup for analytics
      }
    };
    setup();
  }, []);

  // Screenshot listener — log breadcrumb so screenshot crashes appear in Sentry trail
  useEffect(() => {
    if (Platform.OS === "web") return;
    let subscription: { remove: () => void } | null = null;
    const addListener = async () => {
      try {
        subscription = ScreenCapture.addScreenshotListener(() => {
          Sentry.addBreadcrumb({
            message: "User took a screenshot",
            category: "ui.screenshot",
            level: "info",
          });
        });
      } catch {
        // Screenshot listener is optional — never crash for this
      }
    };
    addListener();
    return () => {
      subscription?.remove();
    };
  }, []);

  // Run self-healing diagnostic engine on app startup
  // This checks all sensors, animations, audio, haptics, speech
  // and caches results so the scan flow knows what to skip
  useEffect(() => {
    runDiagnostic().catch((err) => {
      // Diagnostic itself should never crash the app
      Sentry.captureException(err, { context: "runDiagnostic" });
    });
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Sentry error boundary wraps the entire app to catch unhandled errors */}
      <ScanHistoryProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
      </ScanHistoryProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
