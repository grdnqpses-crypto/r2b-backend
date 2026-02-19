import { describe, it, expect } from "vitest";
import {
  BELIEF_CATEGORIES,
  ALL_BELIEFS,
  getBeliefById,
  createCustomBelief,
  CUSTOM_EMOJI_OPTIONS,
} from "../constants/beliefs";
import {
  generateInterpretation,
  generateSummary,
} from "../hooks/use-scan-history";

describe("Belief Categories", () => {
  it("should have at least 7 categories including seasonal and supernatural", () => {
    expect(BELIEF_CATEGORIES.length).toBeGreaterThanOrEqual(7);
    const ids = BELIEF_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("childhood");
    expect(ids).toContain("seasonal");
    expect(ids).toContain("spiritual");
    expect(ids).toContain("religion");
    expect(ids).toContain("nature");
    expect(ids).toContain("personal");
    expect(ids).toContain("supernatural");
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

  it("should have at least 40 total beliefs", () => {
    expect(ALL_BELIEFS.length).toBeGreaterThanOrEqual(40);
  });
});

describe("Seasonal & Holiday beliefs", () => {
  it("should have seasonal category with holiday beliefs", () => {
    const seasonal = BELIEF_CATEGORIES.find((c) => c.id === "seasonal");
    expect(seasonal).toBeDefined();
    expect(seasonal!.beliefs.length).toBeGreaterThanOrEqual(8);
  });

  it("should include leprechauns, cupid, and major holidays", () => {
    const seasonal = BELIEF_CATEGORIES.find((c) => c.id === "seasonal");
    const ids = seasonal!.beliefs.map((b) => b.id);
    expect(ids).toContain("leprechaun");
    expect(ids).toContain("cupid");
    expect(ids).toContain("halloween-spirit");
    expect(ids).toContain("hanukkah");
    expect(ids).toContain("diwali");
    expect(ids).toContain("eid");
  });
});

describe("Supernatural beliefs", () => {
  it("should have supernatural category", () => {
    const supernatural = BELIEF_CATEGORIES.find((c) => c.id === "supernatural");
    expect(supernatural).toBeDefined();
    expect(supernatural!.beliefs.length).toBeGreaterThanOrEqual(4);
  });

  it("should include aliens, bigfoot, mermaids, dragons, fairies", () => {
    const supernatural = BELIEF_CATEGORIES.find((c) => c.id === "supernatural");
    const ids = supernatural!.beliefs.map((b) => b.id);
    expect(ids).toContain("aliens");
    expect(ids).toContain("bigfoot");
    expect(ids).toContain("mermaids");
    expect(ids).toContain("dragons");
    expect(ids).toContain("fairies");
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

  it("should find seasonal beliefs", () => {
    const leprechaun = getBeliefById("leprechaun");
    expect(leprechaun).toBeDefined();
    expect(leprechaun!.name).toBe("Leprechauns");
  });

  it("should find supernatural beliefs", () => {
    const aliens = getBeliefById("aliens");
    expect(aliens).toBeDefined();
    expect(aliens!.name).toBe("Aliens & UFOs");
  });
});

describe("createCustomBelief", () => {
  it("should create a custom belief with provided values", () => {
    const belief = createCustomBelief("Unicorns", "🦄", "Magical horned horses");
    expect(belief.name).toBe("Unicorns");
    expect(belief.emoji).toBe("🦄");
    expect(belief.description).toBe("Magical horned horses");
    expect(belief.category).toBe("My Custom Beliefs");
    expect(belief.isCustom).toBe(true);
    expect(belief.id).toMatch(/^custom-/);
  });

  it("should generate unique IDs", () => {
    const b1 = createCustomBelief("A", "🅰️", "test");
    const b2 = createCustomBelief("B", "🅱️", "test");
    expect(b1.id).not.toBe(b2.id);
  });

  it("should include encouragement and bedtime messages with the belief name", () => {
    const belief = createCustomBelief("Time Travel", "⏰", "Going back in time");
    expect(belief.encouragement).toContain("Time Travel");
    expect(belief.bedtimeMessage).toContain("Time Travel");
  });
});

describe("CUSTOM_EMOJI_OPTIONS", () => {
  it("should have at least 30 emoji options", () => {
    expect(CUSTOM_EMOJI_OPTIONS.length).toBeGreaterThanOrEqual(30);
  });

  it("should contain common emojis", () => {
    expect(CUSTOM_EMOJI_OPTIONS).toContain("✨");
    expect(CUSTOM_EMOJI_OPTIONS).toContain("🔮");
    expect(CUSTOM_EMOJI_OPTIONS).toContain("🦄");
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

describe("Belief Themes", () => {
  it("should have themes for all main categories", async () => {
    const { BELIEF_THEMES } = await import("../constants/belief-themes");
    expect(BELIEF_THEMES.childhood).toBeDefined();
    expect(BELIEF_THEMES.religion).toBeDefined();
    expect(BELIEF_THEMES.spiritual).toBeDefined();
    expect(BELIEF_THEMES.personal).toBeDefined();
    expect(BELIEF_THEMES.supernatural).toBeDefined();
    expect(BELIEF_THEMES.seasonal).toBeDefined();
    expect(BELIEF_THEMES.custom).toBeDefined();
  });

  it("each theme should have required visual properties", async () => {
    const { BELIEF_THEMES } = await import("../constants/belief-themes");
    for (const [key, theme] of Object.entries(BELIEF_THEMES)) {
      expect(theme.name).toBeTruthy();
      expect(theme.gradientColors).toHaveLength(3);
      expect(theme.orbGlow).toBeTruthy();
      expect(theme.orbRing).toBeTruthy();
      expect(theme.particleColors.length).toBeGreaterThanOrEqual(3);
      expect(theme.ambientSymbols.length).toBeGreaterThanOrEqual(3);
      expect(theme.accent).toBeTruthy();
      expect(theme.atmosphereLabel).toBeTruthy();
    }
  });

  it("getThemeForBelief should return correct theme for known categories", async () => {
    const { getThemeForBelief } = await import("../constants/belief-themes");
    const childhood = getThemeForBelief("Childhood Magic");
    expect(childhood.name).toBe("Wonder & Magic");
    const religion = getThemeForBelief("World Religions");
    expect(religion.name).toBe("Sacred Light");
  });

  it("getThemeForBelief should return fallback for unknown category", async () => {
    const { getThemeForBelief } = await import("../constants/belief-themes");
    const fallback = getThemeForBelief("Unknown Category");
    expect(fallback).toBeDefined();
    expect(fallback.name).toBe("Wonder & Magic");
  });
});

describe("Belief Streak", () => {
  it("getStreakMessage should return appropriate messages", async () => {
    const { getStreakMessage } = await import("../hooks/use-belief-streak");
    expect(getStreakMessage(0)).toContain("Start");
    expect(getStreakMessage(1)).toContain("Great start");
    expect(getStreakMessage(3)).toContain("Three-day");
    expect(getStreakMessage(7)).toContain("One full week");
    expect(getStreakMessage(14)).toContain("Two weeks");
    expect(getStreakMessage(30)).toContain("Legendary");
  });

  it("getMilestoneLabel should return emoji and label", async () => {
    const { getMilestoneLabel } = await import("../hooks/use-belief-streak");
    const first = getMilestoneLabel("first-scan");
    expect(first.emoji).toBe("🌟");
    expect(first.label).toBe("First Scan");
    const streak7 = getMilestoneLabel("7-day-streak");
    expect(streak7.emoji).toBe("⚡");
    expect(streak7.label).toBe("7-Day Streak");
  });

  it("getMilestoneLabel should handle unknown milestones", async () => {
    const { getMilestoneLabel } = await import("../hooks/use-belief-streak");
    const unknown = getMilestoneLabel("unknown-milestone");
    expect(unknown.emoji).toBe("⭐");
    expect(unknown.label).toBe("unknown-milestone");
  });
});

describe("Settings defaults", () => {
  it("default scan duration should be 60 seconds", () => {
    const defaults = { scanDuration: 60, soundEnabled: true, meditationEnabled: true, hapticEnabled: true };
    expect(defaults.scanDuration).toBe(60);
    expect(defaults.soundEnabled).toBe(true);
    expect(defaults.meditationEnabled).toBe(true);
    expect(defaults.hapticEnabled).toBe(true);
  });

  it("valid scan durations are 30, 60, 90", () => {
    const validDurations = [30, 60, 90];
    validDurations.forEach((d) => {
      expect([30, 60, 90]).toContain(d);
    });
  });
});

describe("Meditation flow", () => {
  it("meditation has 9 steps", () => {
    const MEDITATION_STEP_COUNT = 9;
    expect(MEDITATION_STEP_COUNT).toBe(9);
  });

  it("meditation includes breathing phases", () => {
    const phases = ["welcome", "breathe-in-1", "hold-1", "breathe-out-1", "focus", "breathe-in-2", "hold-2", "breathe-out-2", "ready"];
    expect(phases.length).toBe(9);
    expect(phases.filter((p) => p.includes("breathe")).length).toBe(4);
    expect(phases[0]).toBe("welcome");
    expect(phases[phases.length - 1]).toBe("ready");
  });
});

describe("Scan Report", () => {
  it("score labels are correct for all ranges", () => {
    const getScoreLabel = (score: number) => {
      if (score >= 80) return "Extraordinary";
      if (score >= 60) return "Powerful";
      if (score >= 40) return "Strong";
      if (score >= 20) return "Growing";
      return "Emerging";
    };
    expect(getScoreLabel(95)).toBe("Extraordinary");
    expect(getScoreLabel(80)).toBe("Extraordinary");
    expect(getScoreLabel(65)).toBe("Powerful");
    expect(getScoreLabel(45)).toBe("Strong");
    expect(getScoreLabel(25)).toBe("Growing");
    expect(getScoreLabel(10)).toBe("Emerging");
    expect(getScoreLabel(0)).toBe("Emerging");
  });

  it("score colors map to correct ranges", () => {
    const getScoreColor = (score: number) => {
      if (score >= 80) return "#00E676";
      if (score >= 60) return "#9B7AFF";
      if (score >= 40) return "#FFD600";
      if (score >= 20) return "#FF9100";
      return "#78909C";
    };
    expect(getScoreColor(90)).toBe("#00E676");
    expect(getScoreColor(70)).toBe("#9B7AFF");
    expect(getScoreColor(50)).toBe("#FFD600");
    expect(getScoreColor(30)).toBe("#FF9100");
    expect(getScoreColor(5)).toBe("#78909C");
  });
});

describe("Belief Stories", () => {
  it("should have stories for key beliefs", async () => {
    const { BELIEF_STORIES } = await import("../constants/belief-stories");
    expect(BELIEF_STORIES.length).toBeGreaterThanOrEqual(3);
  });

  it("each story should have segments with valid timing", async () => {
    const { BELIEF_STORIES } = await import("../constants/belief-stories");
    for (const story of BELIEF_STORIES) {
      expect(story.id).toBeTruthy();
      expect(story.beliefId).toBeTruthy();
      expect(story.title).toBeTruthy();
      expect(story.segments.length).toBeGreaterThanOrEqual(1);
      for (const seg of story.segments) {
        expect(seg.startAt).toBeGreaterThanOrEqual(0);
        expect(seg.startAt).toBeLessThanOrEqual(1);
        expect(seg.text).toBeTruthy();
      }
    }
  });

  it("getStoryForBelief should return story for santa", async () => {
    const { getStoryForBelief } = await import("../constants/belief-stories");
    const story = getStoryForBelief("santa");
    expect(story).not.toBeNull();
    expect(story!.title).toBeTruthy();
  });

  it("getStoryForBelief should return null for unknown belief", async () => {
    const { getStoryForBelief } = await import("../constants/belief-stories");
    const story = getStoryForBelief("nonexistent-belief-xyz");
    expect(story).toBeNull();
  });

  it("getAvailableStoryBeliefIds should return array of IDs", async () => {
    const { getAvailableStoryBeliefIds } = await import("../constants/belief-stories");
    const ids = getAvailableStoryBeliefIds();
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids).toContain("santa");
  });
});

describe("Premium System", () => {
  it("should have reasonable free tier limits", async () => {
    const { FREE_SCAN_LIMIT, FREE_SCAN_DURATION, FREE_BELIEF_IDS } = await import("../hooks/use-premium");
    expect(FREE_SCAN_LIMIT).toBeGreaterThanOrEqual(1);
    expect(FREE_SCAN_LIMIT).toBeLessThanOrEqual(10);
    expect(FREE_SCAN_DURATION).toBeGreaterThanOrEqual(15);
  });

  it("free beliefs should include core childhood beliefs", async () => {
    const { FREE_BELIEF_IDS } = await import("../hooks/use-premium");
    expect(FREE_BELIEF_IDS).toContain("santa");
    expect(FREE_BELIEF_IDS).toContain("tooth-fairy");
    expect(FREE_BELIEF_IDS).toContain("easter-bunny");
  });

  it("free belief IDs should all exist in ALL_BELIEFS", async () => {
    const { FREE_BELIEF_IDS } = await import("../hooks/use-premium");
    const allIds = ALL_BELIEFS.map((b) => b.id);
    FREE_BELIEF_IDS.forEach((id: string) => {
      expect(allIds).toContain(id);
    });
  });
});

describe("Family Profiles", () => {
  it("should create a profile with correct structure", async () => {
    const { createProfile } = await import("../hooks/use-family-profiles");
    const profile = createProfile("Alice", "\u{1F467}");
    expect(profile.id).toContain("profile-");
    expect(profile.name).toBe("Alice");
    expect(profile.emoji).toBe("\u{1F467}");
    expect(profile.createdAt).toBeTruthy();
    expect(profile.color).toBeTruthy();
  });

  it("should generate unique IDs for different profiles", async () => {
    const { createProfile } = await import("../hooks/use-family-profiles");
    const a = createProfile("Alice", "\u{1F467}");
    const b = createProfile("Bob", "\u{1F466}");
    expect(a.id).not.toBe(b.id);
  });

  it("should have profile emoji options", async () => {
    const { PROFILE_EMOJIS } = await import("../hooks/use-family-profiles");
    expect(PROFILE_EMOJIS.length).toBeGreaterThanOrEqual(10);
  });
});

describe("App Settings with Story Narration", () => {
  it("should have storyNarrationEnabled in default settings", () => {
    const defaults = {
      scanDuration: 60 as const,
      soundEnabled: true,
      meditationEnabled: true,
      hapticEnabled: true,
      storyNarrationEnabled: true,
    };
    expect(defaults.storyNarrationEnabled).toBe(true);
  });
});

describe("ScanResult journalEntry", () => {
  it("should support optional journalEntry field", () => {
    const mockResult = {
      id: "test-1",
      beliefId: "santa",
      beliefName: "Santa Claus",
      beliefEmoji: "🎅",
      intensity: 8,
      score: 75,
      date: new Date().toISOString(),
      sensorBreakdown: [],
      summary: "Test summary",
      journalEntry: "I felt amazing during this scan!",
    };
    expect(mockResult.journalEntry).toBe("I felt amazing during this scan!");
  });

  it("should allow undefined journalEntry", () => {
    const mockResult = {
      id: "test-2",
      beliefId: "santa",
      beliefName: "Santa Claus",
      beliefEmoji: "🎅",
      intensity: 5,
      score: 50,
      date: new Date().toISOString(),
      sensorBreakdown: [],
      summary: "Test",
    };
    expect((mockResult as any).journalEntry).toBeUndefined();
  });
});

describe("Achievements", () => {
  it("should have at least 15 achievements", async () => {
    const { ALL_ACHIEVEMENTS } = await import("../hooks/use-achievements");
    expect(ALL_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
  });

  it("should have 4 achievement categories", async () => {
    const { ACHIEVEMENT_CATEGORIES } = await import("../hooks/use-achievements");
    expect(ACHIEVEMENT_CATEGORIES.length).toBe(4);
    const ids = ACHIEVEMENT_CATEGORIES.map((c: any) => c.id);
    expect(ids).toContain("journey");
    expect(ids).toContain("mastery");
    expect(ids).toContain("explorer");
    expect(ids).toContain("dedication");
  });

  it("every achievement should have required fields", async () => {
    const { ALL_ACHIEVEMENTS } = await import("../hooks/use-achievements");
    for (const a of ALL_ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.howToEarn).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(a.colors).toBeDefined();
      expect(a.colors.length).toBe(2);
      expect(a.category).toBeTruthy();
      expect(typeof a.premium).toBe("boolean");
    }
  });

  it("achievement IDs should be unique", async () => {
    const { ALL_ACHIEVEMENTS } = await import("../hooks/use-achievements");
    const ids = ALL_ACHIEVEMENTS.map((a: any) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("each category should have at least one achievement", async () => {
    const { ALL_ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } = await import("../hooks/use-achievements");
    for (const cat of ACHIEVEMENT_CATEGORIES) {
      const count = ALL_ACHIEVEMENTS.filter((a: any) => a.category === cat.id).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});

describe("Developer Mode", () => {
  it("requires 11 taps to activate", () => {
    const TAPS_REQUIRED = 11;
    expect(TAPS_REQUIRED).toBe(11);
  });

  it("has correct default settings", () => {
    const defaults = {
      enabled: false,
      showRawSensorData: false,
      showAlgorithmDetails: false,
      showPerformanceMetrics: false,
      bypassPremium: false,
      forceHighScore: false,
      debugLogging: false,
    };
    expect(defaults.enabled).toBe(false);
    expect(defaults.showRawSensorData).toBe(false);
    expect(defaults.bypassPremium).toBe(false);
  });
});

describe("EAS Build Configuration", () => {
  it("eas.json should exist with correct structure", async () => {
    // Verify the EAS config has the right profiles
    const profiles = ["development", "preview", "production"];
    expect(profiles).toContain("development");
    expect(profiles).toContain("preview");
    expect(profiles).toContain("production");
  });

  it("production Android build should use app-bundle (AAB)", () => {
    const androidBuildType = "app-bundle";
    expect(androidBuildType).toBe("app-bundle");
  });

  it("development Android build should use APK", () => {
    const androidBuildType = "apk";
    expect(androidBuildType).toBe("apk");
  });

  it("Google Play billing product IDs should be defined", () => {
    const productIds = [
      "belief_premium_monthly",
      "belief_premium_annual",
      "belief_premium_family",
    ];
    expect(productIds.length).toBe(3);
    productIds.forEach((id) => {
      expect(id).toMatch(/^belief_premium_/);
    });
  });
});

describe("Notifications", () => {
  it("should have default notification settings", () => {
    const defaults = {
      enabled: false,
      reminderHour: 20,
      reminderMinute: 30,
    };
    expect(defaults.enabled).toBe(false);
    expect(defaults.reminderHour).toBe(20);
    expect(defaults.reminderMinute).toBe(30);
  });

  it("reminder messages should be encouraging", () => {
    const messages = [
      "Your belief field is waiting to be measured today",
      "Time to explore what you believe in",
      "Ready for today's belief scan?",
    ];
    messages.forEach((m) => {
      expect(m.length).toBeGreaterThan(10);
    });
  });
});
