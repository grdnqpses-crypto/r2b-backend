/**
 * item Themes — visual environments for each item category.
 * Each theme defines gradient colors, particle colors, orb glow,
 * and ambient symbols that appear during a scan.
 * Scientific, sensitive, and fun.
 */

export interface ItemTheme {
  /** Category ID this theme applies to */
  categoryId: string;
  /** Display name */
  name: string;
  /** Background gradient colors (top → bottom) */
  gradientColors: [string, string, string];
  /** Primary glow color for the orb */
  orbGlow: string;
  /** Secondary orb ring color */
  orbRing: string;
  /** Particle/sparkle colors (cycled through) */
  particleColors: string[];
  /** Floating symbols that drift around the orb */
  ambientSymbols: string[];
  /** Accent color for UI elements during scan */
  accent: string;
  /** Subtle description shown during scan */
  atmosphereLabel: string;
}

export const ITEM_THEMES: Record<string, ItemTheme> = {
  childhood: {
    categoryId: "childhood",
    name: "Wonder & Magic",
    gradientColors: ["#0a0a2e", "#1a1040", "#0d0d30"],
    orbGlow: "#9B7AFF",
    orbRing: "#C4A8FF",
    particleColors: ["#FFD700", "#FF69B4", "#87CEEB", "#98FB98", "#DDA0DD"],
    ambientSymbols: ["✨", "⭐", "🌟", "💫", "🪄"],
    accent: "#9B7AFF",
    atmosphereLabel: "Magical energy field detected",
  },
  religion: {
    categoryId: "religion",
    name: "Sacred Light",
    gradientColors: ["#1a1000", "#2a1800", "#1a1200"],
    orbGlow: "#FFD700",
    orbRing: "#FFA500",
    particleColors: ["#FFD700", "#FFF8DC", "#FAFAD2", "#FFE4B5", "#F5DEB3"],
    ambientSymbols: ["✝️", "☪️", "✡️", "🕉️", "☸️", "🙏"],
    accent: "#FFD700",
    atmosphereLabel: "Spiritual resonance field active",
  },
  spiritual: {
    categoryId: "spiritual",
    name: "Ethereal Flow",
    gradientColors: ["#0a0a20", "#150a30", "#0d0a25"],
    orbGlow: "#E0B0FF",
    orbRing: "#DDA0DD",
    particleColors: ["#E0B0FF", "#D8BFD8", "#DA70D6", "#BA55D3", "#9370DB"],
    ambientSymbols: ["🔮", "🌙", "💜", "🦋", "🌸"],
    accent: "#DA70D6",
    atmosphereLabel: "Ethereal vibrations detected",
  },
  personal: {
    categoryId: "personal",
    name: "Inner Strength",
    gradientColors: ["#001020", "#002040", "#001530"],
    orbGlow: "#00BFFF",
    orbRing: "#1E90FF",
    particleColors: ["#00BFFF", "#87CEEB", "#4FC3F7", "#29B6F6", "#03A9F4"],
    ambientSymbols: ["💪", "⚡", "🌊", "💎", "🔥"],
    accent: "#00BFFF",
    atmosphereLabel: "Personal energy field strengthening",
  },
  nature: {
    categoryId: "nature",
    name: "Earth Connection",
    gradientColors: ["#001a00", "#002a10", "#001f0a"],
    orbGlow: "#00FF7F",
    orbRing: "#32CD32",
    particleColors: ["#00FF7F", "#98FB98", "#90EE90", "#7CFC00", "#ADFF2F"],
    ambientSymbols: ["🌿", "🍃", "🌱", "🌍", "🌳"],
    accent: "#00FF7F",
    atmosphereLabel: "Natural harmonic resonance active",
  },
  supernatural: {
    categoryId: "supernatural",
    name: "Beyond the Veil",
    gradientColors: ["#0a0020", "#1a0040", "#0f0030"],
    orbGlow: "#FF4500",
    orbRing: "#FF6347",
    particleColors: ["#FF4500", "#FF6347", "#FF7F50", "#FF8C00", "#FFA07A"],
    ambientSymbols: ["👁️", "🌀", "🛸", "🔭", "🌌"],
    accent: "#FF4500",
    atmosphereLabel: "Anomalous field fluctuations detected",
  },
  seasonal: {
    categoryId: "seasonal",
    name: "Holiday Spirit",
    gradientColors: ["#100010", "#1a0020", "#150018"],
    orbGlow: "#FF1493",
    orbRing: "#FF69B4",
    particleColors: ["#FF1493", "#FF69B4", "#FFB6C1", "#FFC0CB", "#FFD700"],
    ambientSymbols: ["🎄", "🎃", "💘", "☘️", "🕎", "🪔"],
    accent: "#FF1493",
    atmosphereLabel: "Holiday energy field resonating",
  },
  custom: {
    categoryId: "custom",
    name: "Your Unique Field",
    gradientColors: ["#0a0a2e", "#1a1040", "#0d0d30"],
    orbGlow: "#9B7AFF",
    orbRing: "#C4A8FF",
    particleColors: ["#9B7AFF", "#C4A8FF", "#FFD700", "#00BFFF", "#FF69B4"],
    ambientSymbols: ["✨", "🌟", "💫", "🔮", "⚡"],
    accent: "#9B7AFF",
    atmosphereLabel: "Unique item signature detected",
  },
};

/** Get the theme for a item category, with fallback to childhood/wonder */
export function getThemeForCategory(categoryId: string): ItemTheme {
  return ITEM_THEMES[categoryId] || ITEM_THEMES.childhood;
}

/** Get the theme for a specific item by looking up its category */
export function getThemeForItem(itemCategory: string): ItemTheme {
  // Map item category names to theme IDs
  const categoryMap: Record<string, string> = {
    "Childhood Magic": "childhood",
    "World Religions": "religion",
    "Spiritual & Mystical": "spiritual",
    "item in Yourself": "personal",
    "Nature & Universe": "nature",
    "Supernatural": "supernatural",
    "Seasonal & Holiday": "seasonal",
    "My Custom Items": "custom",
  };
  const themeId = categoryMap[itemCategory] || "childhood";
  return ITEM_THEMES[themeId] || ITEM_THEMES.childhood;
}
