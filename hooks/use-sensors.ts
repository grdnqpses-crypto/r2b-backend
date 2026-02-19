import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import {
  Accelerometer,
  Gyroscope,
  Magnetometer,
  Barometer,
  DeviceMotion,
  LightSensor,
  Pedometer,
} from "expo-sensors";

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

  const updateSensor = useCallback(
    (id: string, magnitude: number, displayValue: string) => {
      const idx = sensorsRef.current.findIndex((s) => s.id === id);
      if (idx === -1) return;

      const sensor = { ...sensorsRef.current[idx] };
      sensor.available = true;
      sensor.current = magnitude;
      sensor.rawMagnitude = magnitude;
      sensor.value = displayValue;

      // Build history (keep last 30 readings)
      sensor.history = [...sensor.history, magnitude].slice(-30);

      // Calibration: first 5 seconds build baseline
      if (!baselinesRef.current[id]) baselinesRef.current[id] = [];

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed < 5) {
        baselinesRef.current[id].push(magnitude);
        sensor.status = "calibrating";
        sensor.baseline =
          baselinesRef.current[id].reduce((a, b) => a + b, 0) /
          baselinesRef.current[id].length;
      } else {
        sensor.deviation = magnitude - sensor.baseline;
        const baselineAbs = Math.abs(sensor.baseline) || 1;
        sensor.deviationPercent = Math.abs(sensor.deviation / baselineAbs) * 100;

        // Apply belief intensity multiplier (stronger belief = more responsive)
        const intensityMultiplier = 0.5 + (beliefIntensity / 10) * 1.5;
        sensor.deviationPercent *= intensityMultiplier;

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
    const UPDATE_INTERVAL = 200;

    // Accelerometer
    Accelerometer.isAvailableAsync().then((avail) => {
      if (!avail) return;
      Accelerometer.setUpdateInterval(UPDATE_INTERVAL);
      subs.push(
        Accelerometer.addListener(({ x, y, z }) => {
          const mag = Math.sqrt(x * x + y * y + z * z);
          updateSensor("accelerometer", mag, `${mag.toFixed(3)}`);
        })
      );
    });

    // Gyroscope
    Gyroscope.isAvailableAsync().then((avail) => {
      if (!avail) return;
      Gyroscope.setUpdateInterval(UPDATE_INTERVAL);
      subs.push(
        Gyroscope.addListener(({ x, y, z }) => {
          const mag = Math.sqrt(x * x + y * y + z * z);
          updateSensor("gyroscope", mag, `${mag.toFixed(3)}`);
        })
      );
    });

    // Magnetometer
    Magnetometer.isAvailableAsync().then((avail) => {
      if (!avail) return;
      Magnetometer.setUpdateInterval(UPDATE_INTERVAL);
      subs.push(
        Magnetometer.addListener(({ x, y, z }) => {
          const mag = Math.sqrt(x * x + y * y + z * z);
          updateSensor("magnetometer", mag, `${mag.toFixed(1)}`);
        })
      );
    });

    // Barometer
    Barometer.isAvailableAsync().then((avail) => {
      if (!avail) return;
      Barometer.setUpdateInterval(1000);
      subs.push(
        Barometer.addListener((data) => {
          updateSensor("barometer", data.pressure, `${data.pressure.toFixed(2)}`);
        })
      );
    });

    // Light Sensor (Android only)
    if (Platform.OS === "android") {
      LightSensor.isAvailableAsync().then((avail) => {
        if (!avail) return;
        LightSensor.setUpdateInterval(UPDATE_INTERVAL);
        subs.push(
          LightSensor.addListener((data) => {
            updateSensor("light", data.illuminance, `${data.illuminance.toFixed(0)}`);
          })
        );
      });
    } else {
      // On iOS, mark as available with estimated ambient value
      const idx = sensorsRef.current.findIndex((s) => s.id === "light");
      if (idx !== -1) {
        sensorsRef.current[idx].available = true;
        sensorsRef.current[idx].value = "est.";
      }
    }

    // Device Motion
    DeviceMotion.isAvailableAsync().then((avail) => {
      if (!avail) return;
      DeviceMotion.setUpdateInterval(UPDATE_INTERVAL);
      subs.push(
        DeviceMotion.addListener((data) => {
          const r = data.rotation || { alpha: 0, beta: 0, gamma: 0 };
          const mag = Math.sqrt(
            (r.alpha || 0) ** 2 + (r.beta || 0) ** 2 + (r.gamma || 0) ** 2
          );
          const degrees = (mag * 180) / Math.PI;
          updateSensor("devicemotion", degrees, `${degrees.toFixed(1)}`);
        })
      );
    });

    // Pedometer
    Pedometer.isAvailableAsync().then((avail) => {
      if (!avail) return;
      subs.push(
        Pedometer.watchStepCount((result) => {
          updateSensor("pedometer", result.steps, `${result.steps}`);
        })
      );
    });

    return () => {
      subs.forEach((s) => s.remove());
    };
  }, [isScanning, updateSensor]);

  // Tick loop: update state from refs every 500ms
  useEffect(() => {
    if (!isScanning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
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
      const score = Math.round(rawScore);

      // Apparition intensity: 0-1
      const apparitionIntensity = Math.min(rawScore / 80, 1);

      // Ticker message
      const shiftingSensors = sensors.filter((s) => s.status === "shifting" || s.status === "active");
      let ticker = "Monitoring all sensors — focus your belief...";
      if (shiftingSensors.length > 0) {
        const s = shiftingSensors[tickerIdxRef.current % shiftingSensors.length];
        const msgFn = TICKER_MESSAGES[tickerIdxRef.current % TICKER_MESSAGES.length];
        ticker = msgFn(s);
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
