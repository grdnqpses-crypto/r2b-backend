import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { voiceRouter } from "./voiceRouter";

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
  }),
});

export type AppRouter = typeof appRouter;
