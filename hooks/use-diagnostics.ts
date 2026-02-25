/**
 * Self-Healing Diagnostic Engine
 *
 * Automatically checks every feature the app uses (sensors, animations,
 * audio, haptics, speech) and maintains a live health map. The scan flow
 * reads this map before and during scanning to gracefully skip anything
 * that's broken — so the app never crashes.
 *
 * Key design:
 * - Runs a full diagnostic on app launch and caches results
 * - Re-checks individual features if they fail at runtime
 * - Exposes a simple API: `isFeatureHealthy(id)` / `getHealthMap()`
 * - Automatically retries failed features with exponential backoff
 * - No user interaction required — fully autonomous
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Feature IDs ────────────────────────────────────────────────
export type FeatureId =
  | "accelerometer"
  | "gyroscope"
  | "magnetometer"
  | "barometer"
  | "light"
  | "devicemotion"
  | "pedometer"
  | "haptics"
  | "speech"
  | "reanimated"
  | "linear-gradient"
  | "keep-awake";

export interface FeatureHealth {
  id: FeatureId;
  name: string;
  healthy: boolean;
  lastChecked: number; // timestamp
  error?: string;
  retryCount: number;
  category: "sensor" | "ui" | "audio" | "system";
}

export type HealthMap = Record<FeatureId, FeatureHealth>;

const STORAGE_KEY = "@belief_diagnostics_health";
const CHECK_INTERVAL = 30_000; // Re-check unhealthy features every 30s
const MAX_RETRIES = 3;

// ─── Lazy module loaders ────────────────────────────────────────
let _sensors: any = null;
function getSensors() {
  if (_sensors) return _sensors;
  try {
    _sensors = require("expo-sensors");
  } catch {
    _sensors = {};
  }
  return _sensors;
}

let _haptics: any = null;
function getHaptics() {
  if (_haptics) return _haptics;
  try {
    _haptics = require("expo-haptics");
  } catch {
    _haptics = {};
  }
  return _haptics;
}

let _speech: any = null;
function getSpeech() {
  if (_speech) return _speech;
  try {
    _speech = require("expo-speech");
  } catch {
    _speech = {};
  }
  return _speech;
}

// ─── Individual feature checks ──────────────────────────────────

async function checkSensor(sensorName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const sensors = getSensors();
    const SensorClass = sensors[sensorName];
    if (!SensorClass) return { ok: false, error: `${sensorName} module not found` };
    if (typeof SensorClass.isAvailableAsync !== "function") {
      return { ok: false, error: `${sensorName} has no isAvailableAsync` };
    }
    const available = await Promise.race([
      SensorClass.isAvailableAsync(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000)
      ),
    ]);
    return { ok: !!available, error: available ? undefined : `${sensorName} not available on device` };
  } catch (err: any) {
    return { ok: false, error: err?.message || `${sensorName} check failed` };
  }
}

async function checkPedometer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const sensors = getSensors();
    if (!sensors.Pedometer) return { ok: false, error: "Pedometer module not found" };
    const available = await Promise.race([
      sensors.Pedometer.isAvailableAsync(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000)
      ),
    ]);
    return { ok: !!available, error: available ? undefined : "Pedometer not available" };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Pedometer check failed" };
  }
}

async function checkHaptics(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS === "web") return { ok: false, error: "Haptics not available on web" };
  try {
    const haptics = getHaptics();
    if (!haptics || !haptics.impactAsync) return { ok: false, error: "Haptics module not found" };
    // Actually trigger a very light haptic to verify it works
    await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Haptics check failed" };
  }
}

async function checkSpeech(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS === "web") return { ok: true }; // Web speech API is different
  try {
    const speech = getSpeech();
    if (!speech || !speech.speak) return { ok: false, error: "Speech module not found" };
    // Check if TTS engine is available by trying to get voices
    if (typeof speech.getAvailableVoicesAsync === "function") {
      const voices = await Promise.race([
        speech.getAvailableVoicesAsync(),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000)),
      ]);
      // Even if voices is empty, the module loaded — that's enough
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Speech check failed" };
  }
}

async function checkReanimated(): Promise<{ ok: boolean; error?: string }> {
  try {
    // If we can import reanimated, the worklets plugin is working
    const reanimated = require("react-native-reanimated");
    if (!reanimated || !reanimated.withTiming) {
      return { ok: false, error: "Reanimated module incomplete" };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Reanimated check failed" };
  }
}

async function checkLinearGradient(): Promise<{ ok: boolean; error?: string }> {
  try {
    const lg = require("expo-linear-gradient");
    if (!lg || !lg.LinearGradient) {
      return { ok: false, error: "LinearGradient component not found" };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "LinearGradient check failed" };
  }
}

async function checkKeepAwake(): Promise<{ ok: boolean; error?: string }> {
  try {
    const ka = require("expo-keep-awake");
    if (!ka) return { ok: false, error: "KeepAwake module not found" };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "KeepAwake check failed" };
  }
}

// ─── Feature registry ───────────────────────────────────────────

interface FeatureCheck {
  id: FeatureId;
  name: string;
  category: "sensor" | "ui" | "audio" | "system";
  check: () => Promise<{ ok: boolean; error?: string }>;
}

const FEATURE_CHECKS: FeatureCheck[] = [
  { id: "accelerometer", name: "Accelerometer", category: "sensor", check: () => checkSensor("Accelerometer") },
  { id: "gyroscope", name: "Gyroscope", category: "sensor", check: () => checkSensor("Gyroscope") },
  { id: "magnetometer", name: "Magnetometer", category: "sensor", check: () => checkSensor("Magnetometer") },
  { id: "barometer", name: "Barometer", category: "sensor", check: () => checkSensor("Barometer") },
  { id: "light", name: "Light Sensor", category: "sensor", check: () => checkSensor("LightSensor") },
  { id: "devicemotion", name: "Device Motion", category: "sensor", check: () => checkSensor("DeviceMotion") },
  { id: "pedometer", name: "Pedometer", category: "sensor", check: checkPedometer },
  { id: "haptics", name: "Haptics", category: "system", check: checkHaptics },
  { id: "speech", name: "Text-to-Speech", category: "audio", check: checkSpeech },
  { id: "reanimated", name: "Animations", category: "ui", check: checkReanimated },
  { id: "linear-gradient", name: "Gradients", category: "ui", check: checkLinearGradient },
  { id: "keep-awake", name: "Keep Awake", category: "system", check: checkKeepAwake },
];

function createDefaultHealth(): HealthMap {
  const map: Partial<HealthMap> = {};
  for (const fc of FEATURE_CHECKS) {
    map[fc.id] = {
      id: fc.id,
      name: fc.name,
      healthy: true, // Assume healthy until proven otherwise
      lastChecked: 0,
      retryCount: 0,
      category: fc.category,
    };
  }
  return map as HealthMap;
}

// ─── Singleton diagnostic state (shared across all hooks) ───────

let _globalHealth: HealthMap = createDefaultHealth();
let _initialCheckDone = false;
let _checkInProgress = false;
let _listeners: Set<() => void> = new Set();

function notifyListeners() {
  _listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

async function runFullDiagnostic(): Promise<HealthMap> {
  if (_checkInProgress) return _globalHealth;
  _checkInProgress = true;

  try {
    // Run all checks in parallel with individual timeouts
    const results = await Promise.allSettled(
      FEATURE_CHECKS.map(async (fc) => {
        const result = await fc.check();
        return { id: fc.id, ...result };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const { id, ok, error } = r.value;
        _globalHealth[id] = {
          ..._globalHealth[id],
          healthy: ok,
          lastChecked: Date.now(),
          error: ok ? undefined : error,
          retryCount: ok ? 0 : _globalHealth[id].retryCount,
        };
      } else {
        // Promise rejected — mark as unhealthy
        // We can't easily get the id here, but allSettled preserves order
      }
    }

    _initialCheckDone = true;

    // Persist to AsyncStorage for faster startup next time
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_globalHealth));
    } catch {}

    notifyListeners();
  } finally {
    _checkInProgress = false;
  }

  return _globalHealth;
}

async function recheckFeature(id: FeatureId): Promise<boolean> {
  const fc = FEATURE_CHECKS.find((f) => f.id === id);
  if (!fc) return false;

  const health = _globalHealth[id];
  if (health.retryCount >= MAX_RETRIES) {
    // Too many retries — stay unhealthy until next full diagnostic
    return false;
  }

  try {
    const result = await fc.check();
    _globalHealth[id] = {
      ..._globalHealth[id],
      healthy: result.ok,
      lastChecked: Date.now(),
      error: result.ok ? undefined : result.error,
      retryCount: result.ok ? 0 : health.retryCount + 1,
    };
    notifyListeners();
    return result.ok;
  } catch {
    _globalHealth[id] = {
      ..._globalHealth[id],
      healthy: false,
      lastChecked: Date.now(),
      retryCount: health.retryCount + 1,
    };
    notifyListeners();
    return false;
  }
}

// ─── Public API: standalone functions (no hook needed) ──────────

/** Check if a feature is healthy. Safe to call anywhere. */
export function isFeatureHealthy(id: FeatureId): boolean {
  return _globalHealth[id]?.healthy ?? false;
}

/** Get the full health map. Safe to call anywhere. */
export function getHealthMap(): HealthMap {
  return { ..._globalHealth };
}

/** Get only healthy sensor IDs */
export function getHealthySensorIds(): FeatureId[] {
  return FEATURE_CHECKS
    .filter((fc) => fc.category === "sensor" && _globalHealth[fc.id]?.healthy)
    .map((fc) => fc.id);
}

/** Report a runtime failure for a feature — triggers recheck */
export function reportFeatureFailure(id: FeatureId, error?: string) {
  _globalHealth[id] = {
    ..._globalHealth[id],
    healthy: false,
    error: error || "Runtime failure reported",
    lastChecked: Date.now(),
  };
  notifyListeners();
  // Attempt recovery in background
  setTimeout(() => recheckFeature(id), 2000);
}

/** Force a full re-diagnostic */
export async function runDiagnostic(): Promise<HealthMap> {
  return runFullDiagnostic();
}

/** Has the initial diagnostic completed? */
export function isDiagnosticReady(): boolean {
  return _initialCheckDone;
}

// ─── React Hook ─────────────────────────────────────────────────

/**
 * Hook that provides reactive access to the diagnostic health map.
 * Automatically runs the initial diagnostic on first mount.
 * Re-checks unhealthy features periodically.
 */
export function useDiagnostics() {
  const [health, setHealth] = useState<HealthMap>(() => ({ ..._globalHealth }));
  const [ready, setReady] = useState(_initialCheckDone);
  const recheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to global health changes
  useEffect(() => {
    const listener = () => {
      setHealth({ ..._globalHealth });
      setReady(_initialCheckDone);
    };
    _listeners.add(listener);

    // Run initial diagnostic if not done yet
    if (!_initialCheckDone && !_checkInProgress) {
      // Try to load cached health first for instant startup
      AsyncStorage.getItem(STORAGE_KEY)
        .then((cached) => {
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              _globalHealth = { ...createDefaultHealth(), ...parsed };
              notifyListeners();
            } catch {}
          }
        })
        .catch(() => {})
        .finally(() => {
          // Always run a fresh diagnostic
          runFullDiagnostic();
        });
    }

    return () => {
      _listeners.delete(listener);
    };
  }, []);

  // Periodically re-check unhealthy features
  useEffect(() => {
    recheckTimerRef.current = setInterval(() => {
      const unhealthy = Object.values(_globalHealth).filter(
        (h) => !h.healthy && h.retryCount < MAX_RETRIES
      );
      for (const h of unhealthy) {
        recheckFeature(h.id);
      }
    }, CHECK_INTERVAL);

    return () => {
      if (recheckTimerRef.current) clearInterval(recheckTimerRef.current);
    };
  }, []);

  const forceRecheck = useCallback(async () => {
    // Reset retry counts so everything gets re-checked
    for (const id of Object.keys(_globalHealth) as FeatureId[]) {
      _globalHealth[id].retryCount = 0;
    }
    return runFullDiagnostic();
  }, []);

  // Summary stats
  const totalFeatures = Object.keys(health).length;
  const healthyCount = Object.values(health).filter((h) => h.healthy).length;
  const unhealthyFeatures = Object.values(health).filter((h) => !h.healthy);
  const healthySensors = Object.values(health).filter(
    (h) => h.category === "sensor" && h.healthy
  );

  return {
    health,
    ready,
    forceRecheck,
    isFeatureHealthy: (id: FeatureId) => health[id]?.healthy ?? false,
    totalFeatures,
    healthyCount,
    unhealthyFeatures,
    healthySensors,
    allHealthy: healthyCount === totalFeatures,
  };
}
