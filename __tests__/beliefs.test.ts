import { describe, it, expect } from "vitest";
import {
  BELIEF_CATEGORIES,
  ALL_BELIEFS,
  getBeliefById,
} from "../constants/beliefs";
import {
  generateInterpretation,
  generateSummary,
} from "../hooks/use-scan-history";

describe("Belief Categories", () => {
  it("should have at least 5 categories", () => {
    expect(BELIEF_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it("each category should have an id, name, emoji, and beliefs array", () => {
    for (const cat of BELIEF_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.emoji).toBeTruthy();
      expect(Array.isArray(cat.beliefs)).toBe(true);
      expect(cat.beliefs.length).toBeGreaterThan(0);
    }
  });

  it("each belief should have required fields", () => {
    for (const belief of ALL_BELIEFS) {
      expect(belief.id).toBeTruthy();
      expect(belief.name).toBeTruthy();
      expect(belief.emoji).toBeTruthy();
      expect(belief.category).toBeTruthy();
      expect(belief.description).toBeTruthy();
      expect(belief.encouragement).toBeTruthy();
      expect(belief.bedtimeMessage).toBeTruthy();
    }
  });

  it("should include Santa, Tooth Fairy, and Easter Bunny", () => {
    const names = ALL_BELIEFS.map((b) => b.name.toLowerCase());
    expect(names).toContain("santa claus");
    expect(names).toContain("tooth fairy");
    expect(names).toContain("easter bunny");
  });

  it("should include world religions", () => {
    const ids = ALL_BELIEFS.map((b) => b.id);
    expect(ids).toContain("god");
    expect(ids).toContain("jesus");
    expect(ids).toContain("allah");
    expect(ids).toContain("buddha");
    expect(ids).toContain("krishna");
    expect(ids).toContain("jewish-faith");
  });

  it("should have unique belief ids", () => {
    const ids = ALL_BELIEFS.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("getBeliefById", () => {
  it("should find santa by id", () => {
    const santa = getBeliefById("santa");
    expect(santa).toBeDefined();
    expect(santa!.name).toBe("Santa Claus");
  });

  it("should return undefined for unknown id", () => {
    expect(getBeliefById("nonexistent")).toBeUndefined();
  });
});

describe("generateInterpretation", () => {
  it("should return significant message for high deviation", () => {
    const result = generateInterpretation("Magnetometer", 20, "μT", 5);
    expect(result).toContain("significantly");
  });

  it("should return moderate message for medium deviation", () => {
    const result = generateInterpretation("Accelerometer", 8, "g", 0.5);
    expect(result).toContain("moderate");
  });

  it("should return subtle message for low deviation", () => {
    const result = generateInterpretation("Gyroscope", 3, "rad/s", 0.1);
    expect(result).toContain("subtle");
  });

  it("should return stable message for very low deviation", () => {
    const result = generateInterpretation("Barometer", 0.5, "hPa", 0.01);
    expect(result).toContain("stable");
  });
});

describe("generateSummary", () => {
  it("should return extraordinary message for score >= 80", () => {
    const result = generateSummary(85, "Santa Claus");
    expect(result).toContain("Incredible");
    expect(result).toContain("Santa Claus");
  });

  it("should return impressive message for score >= 60", () => {
    const result = generateSummary(65, "Tooth Fairy");
    expect(result).toContain("Impressive");
  });

  it("should return good message for score >= 40", () => {
    const result = generateSummary(45, "Easter Bunny");
    expect(result).toContain("Good");
  });

  it("should return encouraging message for score >= 20", () => {
    const result = generateSummary(25, "Guardian Angels");
    expect(result).toContain("starting");
  });

  it("should return beginning message for low score", () => {
    const result = generateSummary(10, "Luck");
    expect(result).toContain("beginning");
  });
});
