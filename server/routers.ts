import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { voiceRouter } from "./voiceRouter";

/**
 * Scan a receipt image using OCR.space API (free tier: 25k req/month).
 * Returns raw OCR text that we then parse with a simple regex/LLM pass.
 */
async function ocrSpaceExtract(imageBase64: string, mimeType: string): Promise<string> {
  const apiKey = ENV.ocrSpaceApiKey;
  const dataUri = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:${mimeType};base64,${imageBase64}`;

  const formData = new URLSearchParams();
  formData.append("base64Image", dataUri);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2"); // Engine 2 = better accuracy for receipts

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`OCR.space request failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as {
    IsErroredOnProcessing: boolean;
    ParsedResults?: Array<{ ParsedText: string }>;
    ErrorMessage?: string[];
  };

  if (result.IsErroredOnProcessing) {
    throw new Error(`OCR.space error: ${result.ErrorMessage?.join(", ") ?? "Unknown error"}`);
  }

  return result.ParsedResults?.[0]?.ParsedText ?? "";
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  voice: voiceRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  ai: router({
    /**
     * Given the user's purchase history and current list, suggest items they
     * commonly buy but haven't added yet.
     * Uses Groq Llama-3.3-70b for fast, free-tier inference.
     */
    suggestMissingItems: publicProcedure
      .input(
        z.object({
          purchaseHistory: z.array(z.string()).max(200),
          currentList: z.array(z.string()).max(100),
          storeName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { purchaseHistory, currentList, storeName } = input;

        if (purchaseHistory.length === 0) {
          return { suggestions: [] as string[], reasoning: "" };
        }

        const historyText = purchaseHistory.slice(0, 100).join(", ");
        const listText = currentList.length > 0 ? currentList.join(", ") : "nothing yet";
        const storeContext = storeName ? ` at ${storeName}` : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a smart shopping assistant. Your job is to look at a shopper's purchase history and their current shopping list, then suggest items they commonly buy but haven't added yet. 
              
Return ONLY a JSON object with this exact structure:
{
  "suggestions": ["item1", "item2", "item3", ...],
  "reasoning": "brief explanation"
}

Rules:
- Suggest 5-10 items maximum
- Only suggest items that appear in the purchase history
- Do NOT suggest items already on the current list
- Focus on everyday essentials and frequently bought items
- Keep item names short and natural (e.g. "milk", "eggs", "bread")
- Return empty suggestions array if nothing meaningful to suggest`,
            },
            {
              role: "user",
              content: `My purchase history includes: ${historyText}

My current shopping list has: ${listText}

I'm shopping${storeContext}. What am I likely forgetting?`,
            },
          ],
          response_format: { type: "json_object" },
        });

        try {
          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : "{}";
          const parsed = JSON.parse(content);
          return {
            suggestions: (parsed.suggestions ?? []) as string[],
            reasoning: (parsed.reasoning ?? "") as string,
          };
        } catch {
          return { suggestions: [] as string[], reasoning: "" };
        }
      }),

    /**
     * Scan a receipt image using OCR.space (free tier) for text extraction,
     * then parse the OCR text with Groq Llama-3.3-70b to extract structured data.
     * Accepts a base64-encoded image string (with or without data URI prefix).
     * Returns storeName, total, items array, and date.
     */
    scanReceipt: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().min(1),
          mimeType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ input }) => {
        const { imageBase64, mimeType } = input;

        // Step 1: Extract raw text from the receipt image via OCR.space
        let ocrText = "";
        try {
          ocrText = await ocrSpaceExtract(imageBase64, mimeType);
        } catch (ocrError) {
          console.error("[scanReceipt] OCR.space failed:", ocrError);
          // Return a graceful fallback instead of throwing
          return {
            storeName: "Unknown Store",
            total: 0,
            items: [] as { name: string; price: number }[],
            date: new Date().toISOString().split("T")[0],
          };
        }

        if (!ocrText.trim()) {
          return {
            storeName: "Unknown Store",
            total: 0,
            items: [] as { name: string; price: number }[],
            date: new Date().toISOString().split("T")[0],
          };
        }

        // Step 2: Parse the OCR text with Groq Llama-3.3-70b to extract structured data
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a receipt parser. Given raw OCR text from a receipt, extract structured data and return ONLY a JSON object with this exact structure:
{
  "storeName": "string (store or merchant name, or 'Unknown Store' if not found)",
  "total": number (final total amount as a number, 0 if not found),
  "items": [
    { "name": "string", "price": number }
  ],
  "date": "string (YYYY-MM-DD format, today's date if not found)"
}

Rules:
- storeName: the business/merchant name at the top of the receipt
- total: the final total charged (after tax), as a plain number (e.g. 47.83)
- items: list of purchased line items with their individual prices; omit subtotals/tax/tip lines
- date: transaction date in YYYY-MM-DD format
- Return your best guess with available data`,
            },
            {
              role: "user",
              content: `Here is the raw OCR text from the receipt:\n\n${ocrText}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        try {
          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : "{}";
          const parsed = JSON.parse(content);
          return {
            storeName: (parsed.storeName ?? "Unknown Store") as string,
            total: typeof parsed.total === "number" ? parsed.total : 0,
            items: Array.isArray(parsed.items)
              ? (parsed.items as { name: string; price: number }[]).filter(
                  (i) => i.name && typeof i.price === "number"
                )
              : [],
            date: (parsed.date ?? new Date().toISOString().split("T")[0]) as string,
          };
        } catch {
          return {
            storeName: "Unknown Store",
            total: 0,
            items: [] as { name: string; price: number }[],
            date: new Date().toISOString().split("T")[0],
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
