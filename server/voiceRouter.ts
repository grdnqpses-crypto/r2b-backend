import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";

export const voiceRouter = router({
  transcribe: publicProcedure
    .input(
      z.object({
        audioBase64: z.string(), // base64-encoded audio data
        mimeType: z.string().default("audio/m4a"),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Decode base64 to buffer
      const buffer = Buffer.from(input.audioBase64, "base64");
      const ext = input.mimeType.includes("m4a") ? "m4a" : input.mimeType.includes("wav") ? "wav" : "mp3";
      const key = `voice/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      // Upload to S3
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Transcribe via Whisper
      const result = await transcribeAudio({
        audioUrl: url,
        language: input.language,
        prompt: "Shopping list items. Return the item names separated by commas.",
      });

      // Handle error response
      if ("error" in result) {
        throw new Error(result.error);
      }
      return { text: result.text ?? "" };
    }),
});
