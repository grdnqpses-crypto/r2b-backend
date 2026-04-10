import { Share, Platform } from "react-native";
import type { ShoppingItem } from "./storage";

/**
 * Share a shopping list as plain text via the native share sheet.
 * This is the viral loop entry point — users share lists with family/friends
 * who then discover the app.
 */
export async function shareShoppingList(
  items: ShoppingItem[],
  listName: string = "My Shopping List"
): Promise<void> {
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  if (items.length === 0) {
    throw new Error("No items to share");
  }

  const lines: string[] = [];
  lines.push(`📋 ${listName}`);
  lines.push("");

  if (unchecked.length > 0) {
    lines.push("🛒 Still need:");
    unchecked.forEach((item) => {
      const qty = item.quantity ? ` (${item.quantity}${item.unit ? " " + item.unit : ""})` : "";
      lines.push(`  • ${item.text}${qty}`);
    });
  }

  if (checked.length > 0) {
    lines.push("");
    lines.push("✅ Already have:");
    checked.forEach((item) => {
      lines.push(`  ✓ ${item.text}`);
    });
  }

  lines.push("");
  lines.push("📱 Sent from Remember2Buy");
  lines.push("Get the app: https://play.google.com/store/apps/details?id=space.manus.belief.field.detector");

  const message = lines.join("\n");

  await Share.share(
    {
      message,
      title: listName,
    },
    {
      dialogTitle: `Share ${listName}`,
    }
  );
}

/**
 * Generate a shareable text snippet for a single store reminder.
 * Used when user wants to notify a family member about a nearby store.
 */
export function buildStoreReminderShareText(storeName: string, itemCount: number): string {
  return [
    `🛒 Heads up! I'm near ${storeName}.`,
    itemCount > 0 ? `I have ${itemCount} item${itemCount !== 1 ? "s" : ""} on my list.` : "",
    "",
    "📱 Shared via Remember2Buy — the smart shopping reminder app.",
    "https://play.google.com/store/apps/details?id=space.manus.belief.field.detector",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Share a store arrival notification with family/friends.
 */
export async function shareStoreArrival(storeName: string, itemCount: number): Promise<void> {
  const message = buildStoreReminderShareText(storeName, itemCount);
  await Share.share({ message, title: `Near ${storeName}` });
}
