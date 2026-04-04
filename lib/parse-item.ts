/**
 * Natural Language Item Parser
 * Parses user input like "2 lbs chicken breast" into structured item data.
 * Runs entirely offline — no API needed.
 */

export interface ParsedItem {
  text: string;
  quantity?: number;
  unit?: string;
  category?: string;
  note?: string;
}

const UNITS = [
  // Weight
  { pattern: /\b(lbs?|pounds?)\b/i, normalized: "lb" },
  { pattern: /\b(oz|ounces?)\b/i, normalized: "oz" },
  { pattern: /\b(kg|kilograms?|kilos?)\b/i, normalized: "kg" },
  { pattern: /\b(g|grams?)\b/i, normalized: "g" },
  // Volume
  { pattern: /\b(gal|gallons?)\b/i, normalized: "gal" },
  { pattern: /\b(L|liters?|litres?)\b/i, normalized: "L" },
  { pattern: /\b(ml|milliliters?|millilitres?)\b/i, normalized: "ml" },
  { pattern: /\b(fl\.?\s*oz|fluid\s+ounces?)\b/i, normalized: "fl oz" },
  // Count
  { pattern: /\b(doz(?:en)?)\b/i, normalized: "dozen" },
  { pattern: /\b(pk|packs?|packages?)\b/i, normalized: "pk" },
  { pattern: /\b(cans?)\b/i, normalized: "can" },
  { pattern: /\b(bottles?)\b/i, normalized: "bottle" },
  { pattern: /\b(boxes?)\b/i, normalized: "box" },
  { pattern: /\b(bags?)\b/i, normalized: "bag" },
  { pattern: /\b(bunches?)\b/i, normalized: "bunch" },
  { pattern: /\b(loaves?|loafs?)\b/i, normalized: "loaf" },
  { pattern: /\b(ct|counts?|pieces?|pcs?)\b/i, normalized: "ct" },
  { pattern: /\b(jars?)\b/i, normalized: "jar" },
  { pattern: /\b(cups?)\b/i, normalized: "cup" },
  { pattern: /\b(tbsp|tablespoons?)\b/i, normalized: "tbsp" },
  { pattern: /\b(tsp|teaspoons?)\b/i, normalized: "tsp" },
];

const CATEGORY_KEYWORDS: Array<{ keywords: RegExp; category: string }> = [
  { keywords: /\b(milk|cheese|yogurt|butter|cream|eggs?|dairy)\b/i, category: "dairy" },
  { keywords: /\b(chicken|beef|pork|lamb|turkey|fish|salmon|shrimp|seafood|meat|steak|bacon|sausage)\b/i, category: "meat" },
  { keywords: /\b(apple|banana|orange|grape|strawberr|blueberr|tomato|lettuce|spinach|carrot|broccoli|onion|garlic|potato|avocado|lemon|lime|mango|pepper|cucumber|celery|mushroom|zucchini|corn|pea|bean|fruit|vegetable|produce|herb|basil|cilantro|parsley)\b/i, category: "produce" },
  { keywords: /\b(bread|bagel|muffin|croissant|roll|bun|cake|cookie|pastry|bakery|tortilla|pita)\b/i, category: "bakery" },
  { keywords: /\b(frozen|ice cream|pizza|fries|nugget|waffle)\b/i, category: "frozen" },
  { keywords: /\b(water|juice|soda|beer|wine|coffee|tea|energy drink|sports drink|beverage|drink)\b/i, category: "beverages" },
  { keywords: /\b(chip|cracker|pretzel|popcorn|candy|chocolate|snack|nut|almond|cashew|granola|bar)\b/i, category: "snacks" },
  { keywords: /\b(soap|shampoo|conditioner|toothpaste|deodorant|razor|lotion|sunscreen|personal)\b/i, category: "personal" },
  { keywords: /\b(detergent|cleaner|bleach|paper towel|toilet paper|trash bag|dish soap|household|sponge|mop|broom)\b/i, category: "household" },
  { keywords: /\b(vitamin|medicine|supplement|pharmacy|ibuprofen|aspirin|bandage|prescription)\b/i, category: "pharmacy" },
];

/**
 * Parse a natural language item string into structured data.
 * Examples:
 *   "2 lbs chicken breast" → { text: "chicken breast", quantity: 2, unit: "lb", category: "meat" }
 *   "3 cans of tomatoes" → { text: "tomatoes", quantity: 3, unit: "can" }
 *   "a dozen eggs" → { text: "eggs", quantity: 12, unit: "dozen", category: "dairy" }
 *   "milk" → { text: "milk", category: "dairy" }
 */
export function parseItemInput(input: string): ParsedItem {
  let remaining = input.trim();
  let quantity: number | undefined;
  let unit: string | undefined;

  // Handle "a dozen" → 12, "a couple" → 2, "a few" → 3
  remaining = remaining.replace(/\ba\s+dozen\b/i, "12 dozen");
  remaining = remaining.replace(/\ba\s+couple(\s+of)?\b/i, "2");
  remaining = remaining.replace(/\ba\s+few\b/i, "3");
  remaining = remaining.replace(/\bone\b/i, "1");
  remaining = remaining.replace(/\btwo\b/i, "2");
  remaining = remaining.replace(/\bthree\b/i, "3");
  remaining = remaining.replace(/\bfour\b/i, "4");
  remaining = remaining.replace(/\bfive\b/i, "5");
  remaining = remaining.replace(/\bsix\b/i, "6");
  remaining = remaining.replace(/\bseven\b/i, "7");
  remaining = remaining.replace(/\beight\b/i, "8");
  remaining = remaining.replace(/\bnine\b/i, "9");
  remaining = remaining.replace(/\bten\b/i, "10");

  // Extract leading number (e.g., "2", "1.5", "½")
  const fractionMap: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.333, "⅔": 0.667 };
  for (const [frac, val] of Object.entries(fractionMap)) {
    if (remaining.startsWith(frac)) {
      quantity = val;
      remaining = remaining.slice(frac.length).trim();
      break;
    }
  }

  if (!quantity) {
    const numMatch = remaining.match(/^(\d+(?:\.\d+)?)\s*/);
    if (numMatch) {
      quantity = parseFloat(numMatch[1]);
      remaining = remaining.slice(numMatch[0].length);
    }
  }

  // Extract unit
  for (const { pattern, normalized } of UNITS) {
    const unitMatch = remaining.match(new RegExp(`^${pattern.source}\\s*`, "i"));
    if (unitMatch) {
      unit = normalized;
      remaining = remaining.slice(unitMatch[0].length);
      break;
    }
  }

  // Remove "of" connector (e.g., "3 cans of tomatoes" → "tomatoes")
  remaining = remaining.replace(/^of\s+/i, "");

  // Clean up the item name
  let text = remaining.trim();

  // Remove trailing punctuation
  text = text.replace(/[.,;!?]+$/, "").trim();

  // Capitalize first letter
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Detect category from the full original input
  let category: string | undefined;
  for (const { keywords, category: cat } of CATEGORY_KEYWORDS) {
    if (keywords.test(input)) {
      category = cat;
      break;
    }
  }

  return {
    text: text || input.trim(),
    quantity: quantity && quantity > 0 ? quantity : undefined,
    unit,
    category,
  };
}

/**
 * Check if input looks like it has quantity/unit info worth parsing.
 * Used to decide whether to show a "parsed preview" hint.
 */
export function hasStructuredInput(input: string): boolean {
  const trimmed = input.trim();
  // Has a leading number
  if (/^\d/.test(trimmed)) return true;
  // Has a fraction
  if (/^[½¼¾⅓⅔]/.test(trimmed)) return true;
  // Has word number
  if (/^(a\s+dozen|a\s+couple|a\s+few|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(trimmed)) return true;
  return false;
}
