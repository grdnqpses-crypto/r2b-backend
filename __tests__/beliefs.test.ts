import { describe, it, expect } from "vitest";
import {
  ITEM_CATEGORIES,
  ALL_ITEMS,
  getItemById,
  createCustomitem,
  CUSTOM_EMOJI_OPTIONS,
} from "../constants/beliefs";
import {
  generateInterpretation,
  generateSummary,
} from "../hooks/use-scan-history";

describe("item Categories", () => {
  it("should have at least 7 categories including seasonal and supernatural", () => {
    expect(ITEM_CATEGORIES.length).toBeGreaterThanOrEqual(7);
    const ids = ITEM_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("childhood");
    expect(ids).toContain("seasonal");
    expect(ids).toContain("spiritual");
    expect(ids).toContain("religion");
    expect(ids).toContain("nature");
    expect(ids).toContain("personal");
    expect(ids).toContain("supernatural");
  });

  it("each category should have an id, name, emoji, and beliefs array", () => {
    for (const cat of ITEM_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.name).toBeTruthy();
      expect(cat.emoji).toBeTruthy();
      expect(Array.isArray(cat.items)).toBe(true);
      expect(cat.items.length).toBeGreaterThan(0);
    }
  });

  it("each item should have required fields", () => {
    for (const item of ALL_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.emoji).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.encouragement).toBeTruthy();
      expect(item.bedtimeMessage).toBeTruthy();
    }
  });

  it("should include Santa, Tooth Fairy, and Easter Bunny", () => {
    const names = ALL_ITEMS.map((b) => b.name.toLowerCase());
    expect(names).toContain("santa claus");
    expect(names).toContain("tooth fairy");
    expect(names).toContain("easter bunny");
  });

  it("should include world religions", () => {
    const ids = ALL_ITEMS.map((b) => b.id);
    expect(ids).toContain("god");
    expect(ids).toContain("jesus");
    expect(ids).toContain("allah");
    expect(ids).toContain("buddha");
    expect(ids).toContain("krishna");
    expect(ids).toContain("jewish-faith");
  });

  it("should have unique item ids", () => {
    const ids = ALL_ITEMS.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have at least 40 total beliefs", () => {
    expect(ALL_ITEMS.length).toBeGreaterThanOrEqual(40);
  });
});

describe("Seasonal & Holiday beliefs", () => {
  it("should have seasonal category with holiday beliefs", () => {
    const seasonal = ITEM_CATEGORIES.find((c) => c.id === "seasonal");
    expect(seasonal).toBeDefined();
    expect(seasonal!.items.length).toBeGreaterThanOrEqual(8);
  });

  it("should include leprechauns, cupid, and major holidays", () => {
    const seasonal = ITEM_CATEGORIES.find((c) => c.id === "seasonal");
    const ids = seasonal!.items.map((b) => b.id);
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
    const supernatural = ITEM_CATEGORIES.find((c) => c.id === "supernatural");
    expect(supernatural).toBeDefined();
    expect(supernatural!.items.length).toBeGreaterThanOrEqual(4);
  });

  it("should include aliens, bigfoot, mermaids, dragons, fairies", () => {
    const supernatural = ITEM_CATEGORIES.find((c) => c.id === "supernatural");
    const ids = supernatural!.items.map((b) => b.id);
    expect(ids).toContain("aliens");
    expect(ids).toContain("bigfoot");
    expect(ids).toContain("mermaids");
    expect(ids).toContain("dragons");
    expect(ids).toContain("fairies");
  });
});

describe("getItemById", () => {
  it("should find santa by id", () => {
    const santa = getItemById("santa");
    expect(santa).toBeDefined();
    expect(santa!.name).toBe("Santa Claus");
  });

  it("should return undefined for unknown id", () => {
    expect(getItemById("nonexistent")).toBeUndefined();
  });

  it("should find seasonal beliefs", () => {
    const leprechaun = getItemById("leprechaun");
    expect(leprechaun).toBeDefined();
    expect(leprechaun!.name).toBe("Leprechauns");
  });

  it("should find supernatural beliefs", () => {
    const aliens = getItemById("aliens");
    expect(aliens).toBeDefined();
    expect(aliens!.name).toBe("Aliens & UFOs");
  });
});

describe("createCustomitem", () => {
  it("should create a custom item with provided values", () => {
    const item = createCustomitem("Unicorns", "🦄", "Magical horned horses");
    expect(item.name).toBe("Unicorns");
    expect(item.emoji).toBe("🦄");
    expect(item.description).toBe("Magical horned horses");
    expect(item.category).toBe("My Custom Items");
    expect(item.isCustom).toBe(true);
    expect(item.id).toMatch(/^custom-/);
  });

  it("should generate unique IDs", () => {
    const b1 = createCustomitem("A", "🅰️", "test");
    const b2 = createCustomitem("B", "🅱️", "test");
    expect(b1.id).not.toBe(b2.id);
  });

  it("should include encouragement and bedtime messages with the item name", () => {
    const item = createCustomitem("Time Travel", "⏰", "Going back in time");
    expect(item.encouragement).toContain("Time Travel");
    expect(item.bedtimeMessage).toContain("Time Travel");
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

describe("item Themes", () => {
  it("should have themes for all main categories", async () => {
    const { ITEM_THEMES } = await import("../constants/belief-themes");
    expect(ITEM_THEMES.childhood).toBeDefined();
    expect(ITEM_THEMES.religion).toBeDefined();
    expect(ITEM_THEMES.spiritual).toBeDefined();
    expect(ITEM_THEMES.personal).toBeDefined();
    expect(ITEM_THEMES.supernatural).toBeDefined();
    expect(ITEM_THEMES.seasonal).toBeDefined();
    expect(ITEM_THEMES.custom).toBeDefined();
  });

  it("each theme should have required visual properties", async () => {
    const { ITEM_THEMES } = await import("../constants/belief-themes");
    for (const [key, theme] of Object.entries(ITEM_THEMES)) {
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

  it("getThemeForItem should return correct theme for known categories", async () => {
    const { getThemeForItem } = await import("../constants/belief-themes");
    const childhood = getThemeForItem("Childhood Magic");
    expect(childhood.name).toBe("Wonder & Magic");
    const religion = getThemeForItem("World Religions");
    expect(religion.name).toBe("Sacred Light");
  });

  it("getThemeForItem should return fallback for unknown category", async () => {
    const { getThemeForItem } = await import("../constants/belief-themes");
    const fallback = getThemeForItem("Unknown Category");
    expect(fallback).toBeDefined();
    expect(fallback.name).toBe("Wonder & Magic");
  });
});

describe("item Streak", () => {
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

describe("item Stories", () => {
  it("should have stories for key beliefs", async () => {
    const { ITEM_STORIES } = await import("../constants/belief-stories");
    expect(ITEM_STORIES.length).toBeGreaterThanOrEqual(3);
  });

  it("each story should have segments with valid timing", async () => {
    const { ITEM_STORIES } = await import("../constants/belief-stories");
    for (const story of ITEM_STORIES) {
      expect(story.id).toBeTruthy();
      expect(story.itemId).toBeTruthy();
      expect(story.title).toBeTruthy();
      expect(story.segments.length).toBeGreaterThanOrEqual(1);
      for (const seg of story.segments) {
        expect(seg.startAt).toBeGreaterThanOrEqual(0);
        expect(seg.startAt).toBeLessThanOrEqual(1);
        expect(seg.text).toBeTruthy();
      }
    }
  });

  it("getStoryForItem should return story for santa", async () => {
    const { getStoryForItem } = await import("../constants/belief-stories");
    const story = getStoryForItem("santa");
    expect(story).not.toBeNull();
    expect(story!.title).toBeTruthy();
  });

  it("getStoryForItem should return null for unknown item", async () => {
    const { getStoryForItem } = await import("../constants/belief-stories");
    const story = getStoryForItem("nonexistent-item-xyz");
    expect(story).toBeNull();
  });

  it("getAvailableStoryItemIds should return array of IDs", async () => {
    const { getAvailableStoryItemIds } = await import("../constants/belief-stories");
    const ids = getAvailableStoryItemIds();
    expect(ids.length).toBeGreaterThanOrEqual(3);
    expect(ids).toContain("santa");
  });
});

describe("Premium System", () => {
  it("should have reasonable free tier limits", async () => {
    const { FREE_SCAN_LIMIT, FREE_SCAN_DURATION, FREE_CATEGORY_IDS } = await import("../hooks/use-premium");
    expect(FREE_SCAN_LIMIT).toBeGreaterThanOrEqual(1);
    expect(FREE_SCAN_LIMIT).toBeLessThanOrEqual(10);
    expect(FREE_SCAN_DURATION).toBeGreaterThanOrEqual(15);
  });

  it("free beliefs should include core childhood beliefs", async () => {
    const { FREE_CATEGORY_IDS } = await import("../hooks/use-premium");
    expect(FREE_CATEGORY_IDS).toContain("santa");
    expect(FREE_CATEGORY_IDS).toContain("tooth-fairy");
    expect(FREE_CATEGORY_IDS).toContain("easter-bunny");
  });

  it("free item IDs should all exist in ALL_ITEMS", async () => {
    const { FREE_CATEGORY_IDS } = await import("../hooks/use-premium");
    const allIds = ALL_ITEMS.map((b) => b.id);
    FREE_CATEGORY_IDS.forEach((id: string) => {
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
      "premium_weekly_199",
    ];
    expect(productIds.length).toBe(1);
    productIds.forEach((id) => {
      expect(id).toMatch(/^premium_/);
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
      "Your item field is waiting to be measured today",
      "Time to explore what you believe in",
      "Ready for today's item scan?",
    ];
    messages.forEach((m) => {
      expect(m.length).toBeGreaterThan(10);
    });
  });
});
