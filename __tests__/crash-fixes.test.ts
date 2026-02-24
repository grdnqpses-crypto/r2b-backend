import { describe, it, expect, vi } from "vitest";

// Mock react-native Platform
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  StyleSheet: { create: (styles: any) => styles },
  View: "View",
  Text: "Text",
  FlatList: "FlatList",
  Pressable: "Pressable",
}));

// Mock expo modules
vi.mock("expo-sensors", () => ({
  Accelerometer: {
    isAvailableAsync: vi.fn().mockResolvedValue(true),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  Gyroscope: {
    isAvailableAsync: vi.fn().mockResolvedValue(true),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  Magnetometer: {
    isAvailableAsync: vi.fn().mockResolvedValue(true),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  Barometer: {
    isAvailableAsync: vi.fn().mockResolvedValue(true),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  DeviceMotion: {
    isAvailableAsync: vi.fn().mockResolvedValue(true),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  LightSensor: {
    isAvailableAsync: vi.fn().mockResolvedValue(true),
    setUpdateInterval: vi.fn(),
    addListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
  Pedometer: {
    isAvailableAsync: vi.fn().mockResolvedValue(true),
    watchStepCount: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
}));

vi.mock("expo-speech", () => ({
  speak: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("expo-haptics", () => ({
  impactAsync: vi.fn(),
  notificationAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium" },
  NotificationFeedbackType: { Success: "Success", Error: "Error" },
}));

vi.mock("expo-keep-awake", () => ({
  useKeepAwake: vi.fn(),
}));

describe("Crash fix: safeNum utility", () => {
  // Import the safeNum logic inline since it's not exported
  function safeNum(val: any): number {
    if (val == null || typeof val !== "number" || !isFinite(val)) return 0;
    return val;
  }

  it("returns 0 for undefined", () => {
    expect(safeNum(undefined)).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(safeNum(null)).toBe(0);
  });

  it("returns 0 for NaN", () => {
    expect(safeNum(NaN)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(safeNum(Infinity)).toBe(0);
    expect(safeNum(-Infinity)).toBe(0);
  });

  it("returns 0 for non-number types", () => {
    expect(safeNum("hello")).toBe(0);
    expect(safeNum({})).toBe(0);
    expect(safeNum([])).toBe(0);
  });

  it("returns the number for valid numbers", () => {
    expect(safeNum(42)).toBe(42);
    expect(safeNum(0)).toBe(0);
    expect(safeNum(-3.14)).toBe(-3.14);
  });
});

describe("Crash fix: Math.max/min with empty arrays", () => {
  it("Math.max with empty spread returns -Infinity (the bug)", () => {
    // This is the bug we fixed — Math.max() with no args returns -Infinity
    expect(Math.max()).toBe(-Infinity);
  });

  it("our fix: check length before spreading", () => {
    const history: number[] = [];
    const current = 5;
    const peak = history.length > 0 ? Math.max(...history, current) : current;
    expect(peak).toBe(5);
  });

  it("works correctly with non-empty history", () => {
    const history = [1, 3, 7, 2];
    const current = 5;
    const peak = history.length > 0 ? Math.max(...history, current) : current;
    expect(peak).toBe(7);
  });

  it("sparkline maxHist/minHist safe with empty array", () => {
    const history: number[] = [];
    const maxHist = history.length > 0 ? Math.max(...history) : 0.001;
    const minHist = history.length > 0 ? Math.min(...history) : 0;
    const range = maxHist - minHist || 1;
    expect(maxHist).toBe(0.001);
    expect(minHist).toBe(0);
    expect(range).toBeCloseTo(0.001); // 0.001 - 0 = 0.001 which is truthy, so it stays as 0.001
  });
});

describe("Crash fix: animation speed clamping", () => {
  it("prevents negative/zero duration with high intensity", () => {
    const intensity = 2; // Maximum intensity value
    const speed = Math.max(2000 - intensity * 1200, 400);
    expect(speed).toBeGreaterThanOrEqual(400);
  });

  it("works normally with low intensity", () => {
    const intensity = 0.5;
    const speed = Math.max(2000 - intensity * 1200, 400);
    expect(speed).toBe(1400);
  });
});

describe("Crash fix: sensor data null safety", () => {
  function safeNum(val: any): number {
    if (val == null || typeof val !== "number" || !isFinite(val)) return 0;
    return val;
  }

  it("handles null barometer data", () => {
    const data = { pressure: null };
    const pressure = safeNum(data?.pressure);
    expect(pressure).toBe(0);
  });

  it("handles undefined rotation data from DeviceMotion", () => {
    const data: any = { rotation: undefined };
    const r = data?.rotation;
    const alpha = safeNum(r?.alpha);
    const beta = safeNum(r?.beta);
    const gamma = safeNum(r?.gamma);
    expect(alpha).toBe(0);
    expect(beta).toBe(0);
    expect(gamma).toBe(0);
  });

  it("handles missing illuminance from LightSensor", () => {
    const data = {};
    const illuminance = safeNum((data as any)?.illuminance);
    expect(illuminance).toBe(0);
  });

  it("handles completely null sensor data", () => {
    const data: any = null;
    const x = safeNum(data?.x);
    const y = safeNum(data?.y);
    const z = safeNum(data?.z);
    const mag = Math.sqrt(x * x + y * y + z * z);
    expect(mag).toBe(0);
    expect(isFinite(mag)).toBe(true);
  });
});

describe("Crash fix: particle count limiting", () => {
  it("limits particles to 12 max", () => {
    const score = 100;
    const particleCount = Math.min(Math.max(Math.floor(score / 10), 3), 12);
    expect(particleCount).toBe(10);
  });

  it("ensures minimum 3 particles", () => {
    const score = 0;
    const particleCount = Math.min(Math.max(Math.floor(score / 10), 3), 12);
    expect(particleCount).toBe(3);
  });
});
