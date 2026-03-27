import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import {
  isFeatureHealthy,
  reportFeatureFailure,
  type FeatureId,
} from "./use-diagnostics";

// Lazy-load sensors to avoid crashes if the module isn't available
let Accelerometer: any = null;
let Gyroscope: any = null;
let Magnetometer: any = null;
let Barometer: any = null;
let DeviceMotion: any = null;
let LightSensor: any = null;
let Pedometer: any = null;

try {
  const sensors = require("expo-sensors");
  Accelerometer = sensors.Accelerometer;
  Gyroscope = sensors.Gyroscope;
  Magnetometer = sensors.Magnetometer;
  Barometer = sensors.Barometer;
  DeviceMotion = sensors.DeviceMotion;
  LightSensor = sensors.LightSensor;
  Pedometer = sensors.Pedometer;
} catch {
  // expo-sensors not available
}

export interface SensorReading {
  name: string;
  id: string;
  icon: string;
  value: string;
  unit: string;
  rawMagnitude: number;
  whatItMeasures: string;
  whyItMatters: string;
  available: boolean;
  baseline: number;
  current: number;
  deviation: number;
  deviationPercent: number;
  history: number[];
  status: "calibrating" | "baseline" | "shifting" | "active" | "failed";
}

export interface SensorEngineState {
  sensors: SensorReading[];
  overallScore: number;
  phase: "idle" | "calibrating" | "scanning" | "complete";
  elapsed: number;
  ticker: string;
  apparitionIntensity: number;
  diagnosticSummary: string; // Shows which sensors are active/skipped
}

const SENSOR_DEFS = [
  {
    id: "accelerometer",
    name: "Accelerometer",
    icon: "waveform.path",
    unit: "g",
    whatItMeasures: "Micro-movements & vibrations (in g-force)",
    whyItMatters: "Your body subtly shifts when you focus — even tiny tremors register",
    diagnosticId: "accelerometer" as FeatureId,
  },
  {
    id: "gyroscope",
    name: "Gyroscope",
    icon: "gyroscope",
    unit: "rad/s",
    whatItMeasures: "Rotation rate & body sway",
    whyItMatters: "Focus changes your postural stability — stillness shows deep concentration",
    diagnosticId: "gyroscope" as FeatureId,
  },
  {
    id: "magnetometer",
    name: "Magnetometer",
    icon: "magnet",
    unit: "μT",
    whatItMeasures: "Magnetic field strength around you",
    whyItMatters: "Electromagnetic fields shift with concentrated mental energy",
    diagnosticId: "magnetometer" as FeatureId,
  },
  {
    id: "barometer",
    name: "Barometer",
    icon: "barometer",
    unit: "hPa",
    whatItMeasures: "Atmospheric pressure in your environment",
    whyItMatters: "Air pressure responds to environmental energy changes",
    diagnosticId: "barometer" as FeatureId,
  },
  {
    id: "light",
    name: "Light Sensor",
    icon: "light.max",
    unit: "lux",
    whatItMeasures: "Ambient light level around you",
    whyItMatters: "Light perception shifts with heightened awareness and focus",
    diagnosticId: "light" as FeatureId,
  },
  {
    id: "devicemotion",
    name: "Device Motion",
    icon: "move.3d",
    unit: "°",
    whatItMeasures: "Combined orientation, gravity & acceleration",
    whyItMatters: "Your physical alignment changes during deep focus — the phone feels it all",
    diagnosticId: "devicemotion" as FeatureId,
  },
  {
    id: "pedometer",
    name: "Pedometer",
    icon: "figure.walk",
    unit: "steps",
    whatItMeasures: "Movement & step detection",
    whyItMatters: "Stillness indicates deep focus — fewer steps means stronger concentration",
    diagnosticId: "pedometer" as FeatureId,
  },
];

const TICKER_MESSAGES = [
  (s: SensorReading) =>
    `${s.name} shifted ${s.deviation > 0 ? "+" : ""}${s.deviation.toFixed(2)}${s.unit} from baseline — your focused energy is creating a measurable change`,
  (s: SensorReading) =>
    `${s.name} reading: ${s.current.toFixed(2)}${s.unit} — ${s.deviationPercent > 5 ? "significant" : "subtle"} variation detected`,
  (s: SensorReading) =>
    `${s.name} is ${s.status === "shifting" ? "actively responding" : "monitoring"} — ${s.whyItMatters.toLowerCase()}`,
];

function createInitialSensor(def: (typeof SENSOR_DEFS)[0]): SensorReading {
  return {
    name: def.name,
    id: def.id,
    icon: def.icon,
    value: "—",
    unit: def.unit,
    rawMagnitude: 0,
    whatItMeasures: def.whatItMeasures,
    whyItMatters: def.whyItMatters,
    available: false,
    baseline: 0,
    current: 0,
    deviation: 0,
    deviationPercent: 0,
    history: [],
    status: "calibrating",
  };
}

/** Safe number check — returns 0 for NaN/undefined/null/Infinity */
function safeNum(val: any): number {
  if (val == null || typeof val !== "number" || !isFinite(val)) return 0;
  return val;
}

/**
 * Safely subscribe to a sensor with error handling and diagnostic integration.
 * If the sensor fails, it reports to the diagnostic engine and skips gracefully.
 */
async function safeSensorSubscribe(
  sensor: any,
  sensorId: FeatureId,
  interval: number,
  listener: (data: any) => void,
  subs: { remove: () => void }[]
): Promise<boolean> {
  if (!sensor) {
    reportFeatureFailure(sensorId, "Sensor module not loaded");
    return false;
  }

  // Check diagnostic health first — skip if already known to be broken
  if (!isFeatureHealthy(sensorId)) {
    return false;
  }

  try {
    const avail = await Promise.race([
      sensor.isAvailableAsync(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("Availability check timeout")), 3000)
      ),
    ]);
    if (!avail) {
      reportFeatureFailure(sensorId, "Sensor not available on device");
      return false;
    }

    try {
      sensor.setUpdateInterval(interval);
    } catch {
      // Some sensors don't support setUpdateInterval — non-fatal
    }

    // Wrap the listener in a try-catch to prevent runtime crashes
    const safeListener = (data: any) => {
      try {
        listener(data);
      } catch (err: any) {
        // Listener crashed — report and continue
        reportFeatureFailure(sensorId, `Listener error: ${err?.message}`);
      }
    };

    const sub = sensor.addListener(safeListener);
    if (sub && typeof sub.remove === "function") {
      subs.push(sub);
      return true;
    }
    return false;
  } catch (err: any) {
    reportFeatureFailure(sensorId, err?.message || "Subscribe failed");
    return false;
  }
}

export function useSensorEngine(
  isScanning: boolean,
  activityIntensity: number,
  scanDuration: number = 60
) {
  const [state, setState] = useState<SensorEngineState>({
    sensors: SENSOR_DEFS.map(createInitialSensor),
    overallScore: 0,
    phase: "idle",
    elapsed: 0,
    ticker: "Preparing sensors...",
    apparitionIntensity: 0,
    diagnosticSummary: "",
  });

  const sensorsRef = useRef<SensorReading[]>(SENSOR_DEFS.map(createInitialSensor));
  const baselinesRef = useRef<Record<string, number[]>>({});
  const startTimeRef = useRef<number>(0);
  const tickerIdxRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const activeSensorCountRef = useRef(0);
  const failedSensorsRef = useRef<Set<string>>(new Set());

  // Track mounted state to prevent updates after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateSensor = useCallback(
    (id: string, magnitude: number, displayValue: string) => {
      if (!mountedRef.current) return;

      const idx = sensorsRef.current.findIndex((s) => s.id === id);
      if (idx === -1) return;

      // Ensure magnitude is a safe number
      const safeMag = safeNum(magnitude);

      const sensor = { ...sensorsRef.current[idx] };
      sensor.available = true;
      sensor.current = safeMag;
      sensor.rawMagnitude = safeMag;
      sensor.value = displayValue;

      // Build history (keep last 30 readings)
      sensor.history = [...sensor.history, safeMag].slice(-30);

      // Calibration: first 5 seconds build baseline
      if (!baselinesRef.current[id]) baselinesRef.current[id] = [];

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed < 5) {
        baselinesRef.current[id].push(safeMag);
        sensor.status = "calibrating";
        const baselineArr = baselinesRef.current[id];
        sensor.baseline =
          baselineArr.length > 0
            ? baselineArr.reduce((a, b) => a + b, 0) / baselineArr.length
            : 0;
      } else {
        sensor.deviation = safeMag - sensor.baseline;
        const baselineAbs = Math.abs(sensor.baseline) || 1;
        sensor.deviationPercent = Math.abs(sensor.deviation / baselineAbs) * 100;

        // Apply activity intensity multiplier
        const intensityMultiplier = 0.5 + (activityIntensity / 10) * 1.5;
        sensor.deviationPercent *= intensityMultiplier;

        // Clamp to prevent crazy numbers
        sensor.deviationPercent = Math.min(sensor.deviationPercent, 200);

        sensor.status = sensor.deviationPercent > 3 ? "shifting" : sensor.deviationPercent > 1 ? "active" : "baseline";
      }

      sensorsRef.current[idx] = sensor;
    },
    [activityIntensity]
  );

  /** Mark a sensor as failed in the local state */
  const markSensorFailed = useCallback((id: string) => {
    failedSensorsRef.current.add(id);
    const idx = sensorsRef.current.findIndex((s) => s.id === id);
    if (idx !== -1) {
      sensorsRef.current[idx] = {
        ...sensorsRef.current[idx],
        status: "failed",
        available: false,
        value: "N/A",
      };
    }
  }, []);

  // Subscribe to all sensors — with diagnostic pre-check
  useEffect(() => {
    if (!isScanning) {
      sensorsRef.current = SENSOR_DEFS.map(createInitialSensor);
      baselinesRef.current = {};
      failedSensorsRef.current = new Set();
      activeSensorCountRef.current = 0;
      setState((prev) => ({
        ...prev,
        phase: "idle",
        elapsed: 0,
        overallScore: 0,
        apparitionIntensity: 0,
        diagnosticSummary: "",
      }));
      return;
    }

    startTimeRef.current = Date.now();
    setState((prev) => ({ ...prev, phase: "calibrating" }));

    const subs: { remove: () => void }[] = [];
    const UPDATE_INTERVAL = 250;
    let activeCount = 0;
    const skipped: string[] = [];

    // Stagger sensor subscriptions — skip unhealthy ones automatically
    const setupSensors = async () => {
      try {
        // Accelerometer
        const accelOk = await safeSensorSubscribe(
          Accelerometer,
          "accelerometer",
          UPDATE_INTERVAL,
          (data: any) => {
            const x = safeNum(data?.x);
            const y = safeNum(data?.y);
            const z = safeNum(data?.z);
            const mag = Math.sqrt(x * x + y * y + z * z);
            updateSensor("accelerometer", mag, `${mag.toFixed(3)}`);
          },
          subs
        );
        if (accelOk) activeCount++;
        else { skipped.push("Accelerometer"); markSensorFailed("accelerometer"); }

        await new Promise((r) => setTimeout(r, 100));

        // Gyroscope
        const gyroOk = await safeSensorSubscribe(
          Gyroscope,
          "gyroscope",
          UPDATE_INTERVAL,
          (data: any) => {
            const x = safeNum(data?.x);
            const y = safeNum(data?.y);
            const z = safeNum(data?.z);
            const mag = Math.sqrt(x * x + y * y + z * z);
            updateSensor("gyroscope", mag, `${mag.toFixed(3)}`);
          },
          subs
        );
        if (gyroOk) activeCount++;
        else { skipped.push("Gyroscope"); markSensorFailed("gyroscope"); }

        await new Promise((r) => setTimeout(r, 100));

        // Magnetometer
        const magOk = await safeSensorSubscribe(
          Magnetometer,
          "magnetometer",
          UPDATE_INTERVAL,
          (data: any) => {
            const x = safeNum(data?.x);
            const y = safeNum(data?.y);
            const z = safeNum(data?.z);
            const mag = Math.sqrt(x * x + y * y + z * z);
            updateSensor("magnetometer", mag, `${mag.toFixed(1)}`);
          },
          subs
        );
        if (magOk) activeCount++;
        else { skipped.push("Magnetometer"); markSensorFailed("magnetometer"); }

        await new Promise((r) => setTimeout(r, 100));

        // Barometer
        const baroOk = await safeSensorSubscribe(
          Barometer,
          "barometer",
          1000,
          (data: any) => {
            const pressure = safeNum(data?.pressure);
            if (pressure > 0) {
              updateSensor("barometer", pressure, `${pressure.toFixed(2)}`);
            }
          },
          subs
        );
        if (baroOk) activeCount++;
        else { skipped.push("Barometer"); markSensorFailed("barometer"); }

        await new Promise((r) => setTimeout(r, 100));

        // Light Sensor (Android only)
        if (Platform.OS === "android" && LightSensor) {
          const lightOk = await safeSensorSubscribe(
            LightSensor,
            "light",
            UPDATE_INTERVAL,
            (data: any) => {
              const illuminance = safeNum(data?.illuminance);
              if (illuminance >= 0) {
                updateSensor("light", illuminance, `${illuminance.toFixed(0)}`);
              }
            },
            subs
          );
          if (lightOk) activeCount++;
          else { skipped.push("Light Sensor"); markSensorFailed("light"); }
        } else {
          // On iOS, mark as available with estimated ambient value
          const idx = sensorsRef.current.findIndex((s) => s.id === "light");
          if (idx !== -1) {
            sensorsRef.current[idx] = {
              ...sensorsRef.current[idx],
              available: true,
              value: "est.",
            };
            activeCount++;
          }
        }

        await new Promise((r) => setTimeout(r, 100));

        // Device Motion
        const dmOk = await safeSensorSubscribe(
          DeviceMotion,
          "devicemotion",
          UPDATE_INTERVAL,
          (data: any) => {
            const r = data?.rotation;
            const alpha = safeNum(r?.alpha);
            const beta = safeNum(r?.beta);
            const gamma = safeNum(r?.gamma);
            const mag = Math.sqrt(alpha ** 2 + beta ** 2 + gamma ** 2);
            const degrees = (mag * 180) / Math.PI;
            updateSensor("devicemotion", safeNum(degrees), `${safeNum(degrees).toFixed(1)}`);
          },
          subs
        );
        if (dmOk) activeCount++;
        else { skipped.push("Device Motion"); markSensorFailed("devicemotion"); }

        await new Promise((r) => setTimeout(r, 100));

        // Pedometer
        if (Pedometer && isFeatureHealthy("pedometer")) {
          try {
            const avail = await Promise.race([
              Pedometer.isAvailableAsync(),
              new Promise<boolean>((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 3000)
              ),
            ]);
            if (avail) {
              const sub = Pedometer.watchStepCount((result: any) => {
                try {
                  const steps = safeNum(result?.steps);
                  updateSensor("pedometer", steps, `${steps}`);
                } catch (err: any) {
                  reportFeatureFailure("pedometer", err?.message);
                  markSensorFailed("pedometer");
                }
              });
              if (sub && typeof sub.remove === "function") {
                subs.push(sub);
                activeCount++;
              }
            } else {
              skipped.push("Pedometer");
              markSensorFailed("pedometer");
              reportFeatureFailure("pedometer", "Not available");
            }
          } catch (err: any) {
            skipped.push("Pedometer");
            markSensorFailed("pedometer");
            reportFeatureFailure("pedometer", err?.message);
          }
        } else {
          skipped.push("Pedometer");
          markSensorFailed("pedometer");
        }

        activeSensorCountRef.current = activeCount;

        // Build diagnostic summary
        const summary = skipped.length > 0
          ? `${activeCount} sensors active, ${skipped.length} skipped (${skipped.join(", ")})`
          : `All ${activeCount} sensors active`;

        if (mountedRef.current) {
          setState((prev) => ({ ...prev, diagnosticSummary: summary }));
        }
      } catch (err) {
        console.warn("Sensor setup error:", err);
      }
    };

    setupSensors();

    return () => {
      subs.forEach((s) => {
        try {
          s.remove();
        } catch {
          // Already removed
        }
      });
    };
  }, [isScanning, updateSensor, markSensorFailed]);

  // Tick loop: update state from refs every 500ms
  useEffect(() => {
    if (!isScanning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;

      try {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const sensors = [...sensorsRef.current];

        // Calculate overall score — only from non-failed sensors
        const availableSensors = sensors.filter(
          (s) => s.available && s.status !== "calibrating" && s.status !== "failed"
        );
        let totalDeviation = 0;
        if (availableSensors.length > 0) {
          totalDeviation =
            availableSensors.reduce((sum, s) => sum + Math.min(s.deviationPercent, 50), 0) /
            availableSensors.length;
        }
        // Score: 0-100, weighted by activity intensity
        const rawScore = Math.min(totalDeviation * 2, 100);
        const score = Math.round(safeNum(rawScore));

        // Apparition intensity: 0-1
        const apparitionIntensity = Math.min(safeNum(rawScore) / 80, 1);

        // Ticker message
        const shiftingSensors = sensors.filter(
          (s) => s.status === "shifting" || s.status === "active"
        );
        let ticker = "Monitoring all sensors...";
        if (shiftingSensors.length > 0) {
          const s = shiftingSensors[tickerIdxRef.current % shiftingSensors.length];
          const msgFn = TICKER_MESSAGES[tickerIdxRef.current % TICKER_MESSAGES.length];
          try {
            ticker = msgFn(s);
          } catch {
            ticker = `${s.name} is responding to your activity`;
          }
          tickerIdxRef.current++;
        } else if (elapsed < 5) {
          ticker = "Calibrating sensors — establishing your baseline environment...";
        }

        // scanDuration === 0 means "manual stop" mode — never auto-complete
        const phase = elapsed < 5 ? "calibrating" : (scanDuration > 0 && elapsed >= scanDuration) ? "complete" : "scanning";

        setState((prev) => ({
          sensors,
          overallScore: score,
          phase,
          elapsed,
          ticker,
          apparitionIntensity,
          diagnosticSummary: prev.diagnosticSummary,
        }));
      } catch (err) {
        // Tick loop crashed — this should never happen but just in case
        console.warn("Tick loop error:", err);
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isScanning, scanDuration]);

  return state;
}

export { SENSOR_DEFS };
