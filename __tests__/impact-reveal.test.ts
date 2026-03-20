/**
 * Tests for ImpactReveal tier logic
 * Verifies that each score range maps to the correct tier sound, label, and visual config.
 */

import { describe, it, expect } from "vitest";

// Mirror the getTier logic from impact-reveal.tsx for unit testing
interface Tier {
  sound: string;
  label: string;
  color: string;
  ringCount: number;
  particleCount: number;
  flashOpacity: number;
}

function getTier(score: number): Tier {
  if (score >= 80) return {
    sound: "extraordinary",
    label: "EXTRAORDINARY",
    color: "#FFD700",
    ringCount: 5,
    particleCount: 12,
    flashOpacity: 0.55,
  };
  if (score >= 60) return {
    sound: "powerful",
    label: "POWERFUL",
    color: "#4ADE80",
    ringCount: 4,
    particleCount: 8,
    flashOpacity: 0.4,
  };
  if (score >= 40) return {
    sound: "strong",
    label: "STRONG",
    color: "#9B7AFF",
    ringCount: 3,
    particleCount: 6,
    flashOpacity: 0.3,
  };
  if (score >= 20) return {
    sound: "growing",
    label: "GROWING",
    color: "#FBBF24",
    ringCount: 2,
    particleCount: 4,
    flashOpacity: 0.2,
  };
  return {
    sound: "emerging",
    label: "EMERGING",
    color: "#60A5FA",
    ringCount: 1,
    particleCount: 2,
    flashOpacity: 0.15,
  };
}

describe("ImpactReveal getTier", () => {
  it("maps score 0 to emerging tier", () => {
    const tier = getTier(0);
    expect(tier.sound).toBe("emerging");
    expect(tier.label).toBe("EMERGING");
    expect(tier.ringCount).toBe(1);
    expect(tier.particleCount).toBe(2);
  });

  it("maps score 19 to emerging tier", () => {
    const tier = getTier(19);
    expect(tier.sound).toBe("emerging");
  });

  it("maps score 20 to growing tier", () => {
    const tier = getTier(20);
    expect(tier.sound).toBe("growing");
    expect(tier.label).toBe("GROWING");
    expect(tier.ringCount).toBe(2);
  });

  it("maps score 39 to growing tier", () => {
    const tier = getTier(39);
    expect(tier.sound).toBe("growing");
  });

  it("maps score 40 to strong tier", () => {
    const tier = getTier(40);
    expect(tier.sound).toBe("strong");
    expect(tier.label).toBe("STRONG");
    expect(tier.ringCount).toBe(3);
    expect(tier.particleCount).toBe(6);
  });

  it("maps score 59 to strong tier", () => {
    const tier = getTier(59);
    expect(tier.sound).toBe("strong");
  });

  it("maps score 60 to powerful tier", () => {
    const tier = getTier(60);
    expect(tier.sound).toBe("powerful");
    expect(tier.label).toBe("POWERFUL");
    expect(tier.ringCount).toBe(4);
  });

  it("maps score 79 to powerful tier", () => {
    const tier = getTier(79);
    expect(tier.sound).toBe("powerful");
  });

  it("maps score 80 to extraordinary tier", () => {
    const tier = getTier(80);
    expect(tier.sound).toBe("extraordinary");
    expect(tier.label).toBe("EXTRAORDINARY");
    expect(tier.ringCount).toBe(5);
    expect(tier.particleCount).toBe(12);
    expect(tier.flashOpacity).toBe(0.55);
  });

  it("maps score 100 to extraordinary tier", () => {
    const tier = getTier(100);
    expect(tier.sound).toBe("extraordinary");
    expect(tier.color).toBe("#FFD700");
  });

  it("higher tiers have more rings than lower tiers", () => {
    const emerging = getTier(10);
    const growing = getTier(25);
    const strong = getTier(45);
    const powerful = getTier(65);
    const extraordinary = getTier(85);
    expect(growing.ringCount).toBeGreaterThan(emerging.ringCount);
    expect(strong.ringCount).toBeGreaterThan(growing.ringCount);
    expect(powerful.ringCount).toBeGreaterThan(strong.ringCount);
    expect(extraordinary.ringCount).toBeGreaterThan(powerful.ringCount);
  });

  it("higher tiers have more particles than lower tiers", () => {
    const emerging = getTier(10);
    const extraordinary = getTier(90);
    expect(extraordinary.particleCount).toBeGreaterThan(emerging.particleCount);
  });

  it("higher tiers have stronger flash opacity", () => {
    const emerging = getTier(10);
    const extraordinary = getTier(90);
    expect(extraordinary.flashOpacity).toBeGreaterThan(emerging.flashOpacity);
  });
});
