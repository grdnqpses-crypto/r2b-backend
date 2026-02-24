import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";

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
  status: "calibrating" | "baseline" | "shifting" | "active";
}

export interface SensorEngineState {
  sensors: SensorReading[];
  overallScore: number;
  phase: "idle" | "calibrating" | "scanning" | "complete";
  elapsed: number;
  ticker: string;
  apparitionIntensity: number;
}

const SENSOR_DEFS = [
  {
    id: "accelerometer",
    name: "Accelerometer",
    icon: "waveform.path",
    unit: "g",
    whatItMeasures: "Micro-movements & vibrations (in g-force)",
    whyItMatters: "Your body subtly shifts when you focus belief — even tiny tremors show conviction",
  },
  {
    id: "gyroscope",
    name: "Gyroscope",
    icon: "gyroscope",
    unit: "rad/s",
    whatItMeasures: "Rotation rate & body sway",
    whyItMatters: "Belief focus changes your postural stability — stillness shows deep concentration",
  },
  {
    id: "magnetometer",
    name: "Magnetometer",
    icon: "magnet",
    unit: "μT",
    whatItMeasures: "Magnetic field strength around you",
    whyItMatters: "Electromagnetic fields shift with concentrated mental energy",
  },
  {
    id: "barometer",
    name: "Barometer",
    icon: "barometer",
    unit: "hPa",
    whatItMeasures: "Atmospheric pressure in your environment",
    whyItMatters: "Air pressure responds to environmental energy changes",
    platformNote: "iOS & Android",
  },
  {
    id: "light",
    name: "Light Sensor",
    icon: "light.max",
    unit: "lux",
    whatItMeasures: "Ambient light level around you",
    whyItMatters: "Light perception shifts with heightened awareness and focus",
    platformNote: "Android only — iOS uses estimated values",
  },
  {
    id: "devicemotion",
    name: "Device Motion",
    icon: "move.3d",
    unit: "°",
    whatItMeasures: "Combined orientation, gravity & acceleration",
    whyItMatters: "Your physical alignment changes during deep focus — the phone feels it all",
  },
  {
    id: "pedometer",
    name: "Pedometer",
    icon: "figure.walk",
    unit: "steps",
    whatItMeasures: "Movement & step detection",
    whyItMatters: "Stillness during belief indicates deep focus — fewer steps means stronger concentration",
  },
];

const TICKER_MESSAGES = [
  (s: SensorReading) =>
    `${s.name} shifted ${s.deviation > 0 ? "+" : ""}${s.deviation.toFixed(2)}${s.unit} from baseline — your focused energy is creating a measurable change`,
  (s: SensorReading) =>
    `${s.name} reading: ${s.current.toFixed(2)}${s.unit} — ${s.deviationPercent > 5 ? "significant" : "subtle"} variation detected in your belief field`,
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

/** Safely subscribe to a sensor with error handling */
async function safeSensorSubscribe(
  sensor: any,
  interval: number,
  listener: (data: any) => void,
  subs: { remove: () => void }[]
): Promise<void> {
  if (!sensor) return;
  try {
    const avail = await sensor.isAvailableAsync();
    if (!avail) return;
    try {
      sensor.setUpdateInterval(interval);
    } catch {
      // Some sensors don't support setUpdateInterval
    }
    const sub = sensor.addListener(listener);
    if (sub && typeof sub.remove === "function") {
      subs.push(sub);
    }
  } catch (err) {
    // Sensor not available or permission denied — silently skip
    console.warn("Sensor subscribe error:", err);
  }
}

export function useSensorEngine(
  isScanning: boolean,
  beliefIntensity: number,
  scanDuration: number = 60
) {
  const [state, setState] = useState<SensorEngineState>({
    sensors: SENSOR_DEFS.map(createInitialSensor),
    overallScore: 0,
    phase: "idle",
    elapsed: 0,
    ticker: "Preparing sensors...",
    apparitionIntensity: 0,
  });

  const sensorsRef = useRef<SensorReading[]>(SENSOR_DEFS.map(createInitialSensor));
  const baselinesRef = useRef<Record<string, number[]>>({});
  const startTimeRef = useRef<number>(0);
  const tickerIdxRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

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

        // Apply belief intensity multiplier (stronger belief = more responsive)
        const intensityMultiplier = 0.5 + (beliefIntensity / 10) * 1.5;
        sensor.deviationPercent *= intensityMultiplier;

        // Clamp to prevent crazy numbers
        sensor.deviationPercent = Math.min(sensor.deviationPercent, 200);

        sensor.status = sensor.deviationPercent > 3 ? "shifting" : sensor.deviationPercent > 1 ? "active" : "baseline";
      }

      sensorsRef.current[idx] = sensor;
    },
    [beliefIntensity]
  );

  // Subscribe to all sensors
  useEffect(() => {
    if (!isScanning) {
      sensorsRef.current = SENSOR_DEFS.map(createInitialSensor);
      baselinesRef.current = {};
      setState((prev) => ({ ...prev, phase: "idle", elapsed: 0, overallScore: 0, apparitionIntensity: 0 }));
      return;
    }

    startTimeRef.current = Date.now();
    setState((prev) => ({ ...prev, phase: "calibrating" }));

    const subs: { remove: () => void }[] = [];
    const UPDATE_INTERVAL = 250; // Slightly slower to reduce load

    // Stagger sensor subscriptions to avoid overwhelming the device
    const setupSensors = async () => {
      try {
        // Accelerometer
        await safeSensorSubscribe(
          Accelerometer,
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

        // Small delay between sensor subscriptions
        await new Promise((r) => setTimeout(r, 100));

        // Gyroscope
        await safeSensorSubscribe(
          Gyroscope,
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

        await new Promise((r) => setTimeout(r, 100));

        // Magnetometer
        await safeSensorSubscribe(
          Magnetometer,
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

        await new Promise((r) => setTimeout(r, 100));

        // Barometer — slower update, data can be null on some devices
        await safeSensorSubscribe(
          Barometer,
          1000,
          (data: any) => {
            const pressure = safeNum(data?.pressure);
            if (pressure > 0) {
              updateSensor("barometer", pressure, `${pressure.toFixed(2)}`);
            }
          },
          subs
        );

        await new Promise((r) => setTimeout(r, 100));

        // Light Sensor (Android only)
        if (Platform.OS === "android" && LightSensor) {
          await safeSensorSubscribe(
            LightSensor,
            UPDATE_INTERVAL,
            (data: any) => {
              const illuminance = safeNum(data?.illuminance);
              if (illuminance >= 0) {
                updateSensor("light", illuminance, `${illuminance.toFixed(0)}`);
              }
            },
            subs
          );
        } else {
          // On iOS, mark as available with estimated ambient value
          const idx = sensorsRef.current.findIndex((s) => s.id === "light");
          if (idx !== -1) {
            sensorsRef.current[idx] = {
              ...sensorsRef.current[idx],
              available: true,
              value: "est.",
            };
          }
        }

        await new Promise((r) => setTimeout(r, 100));

        // Device Motion — rotation data can be null/undefined
        await safeSensorSubscribe(
          DeviceMotion,
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

        await new Promise((r) => setTimeout(r, 100));

        // Pedometer — uses watchStepCount, not addListener
        if (Pedometer) {
          try {
            const avail = await Pedometer.isAvailableAsync();
            if (avail) {
              const sub = Pedometer.watchStepCount((result: any) => {
                const steps = safeNum(result?.steps);
                updateSensor("pedometer", steps, `${steps}`);
              });
              if (sub && typeof sub.remove === "function") {
                subs.push(sub);
              }
            }
          } catch (err) {
            console.warn("Pedometer error:", err);
          }
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
  }, [isScanning, updateSensor]);

  // Tick loop: update state from refs every 500ms
  useEffect(() => {
    if (!isScanning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const sensors = [...sensorsRef.current];

      // Calculate overall score
      const availableSensors = sensors.filter((s) => s.available && s.status !== "calibrating");
      let totalDeviation = 0;
      if (availableSensors.length > 0) {
        totalDeviation =
          availableSensors.reduce((sum, s) => sum + Math.min(s.deviationPercent, 50), 0) /
          availableSensors.length;
      }
      // Score: 0-100, weighted by belief intensity
      const rawScore = Math.min(totalDeviation * 2, 100);
      const score = Math.round(safeNum(rawScore));

      // Apparition intensity: 0-1
      const apparitionIntensity = Math.min(safeNum(rawScore) / 80, 1);

      // Ticker message
      const shiftingSensors = sensors.filter((s) => s.status === "shifting" || s.status === "active");
      let ticker = "Monitoring all sensors — focus your belief...";
      if (shiftingSensors.length > 0) {
        const s = shiftingSensors[tickerIdxRef.current % shiftingSensors.length];
        const msgFn = TICKER_MESSAGES[tickerIdxRef.current % TICKER_MESSAGES.length];
        try {
          ticker = msgFn(s);
        } catch {
          ticker = `${s.name} is responding to your belief field`;
        }
        tickerIdxRef.current++;
      } else if (elapsed < 5) {
        ticker = "Calibrating sensors — establishing your baseline environment...";
      }

      const phase = elapsed < 5 ? "calibrating" : elapsed >= scanDuration ? "complete" : "scanning";

      setState({
        sensors,
        overallScore: score,
        phase,
        elapsed,
        ticker,
        apparitionIntensity,
      });
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isScanning, scanDuration]);

  return state;
}

export { SENSOR_DEFS };
