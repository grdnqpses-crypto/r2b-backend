/**
 * Server environment configuration.
 *
 * Production (Render/Railway) — set these environment variables:
 *   GROQ_API_KEY        — Groq API key (voice STT + AI suggestions)
 *   OCR_SPACE_API_KEY   — OCR.space API key (receipt scanning)
 *   DATABASE_URL        — PostgreSQL connection string
 *   JWT_SECRET          — Session cookie signing secret
 *
 * Local sandbox — BUILT_IN_FORGE_API_KEY/URL are injected automatically by Manus.
 * The forge endpoint is OpenAI-compatible, so it is used as a fallback for
 * the Groq LLM path when GROQ_API_KEY is not set.
 */

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // ── Groq (voice STT via Whisper-large-v3 + AI suggestions via Llama-3.3-70b) ──
  // Falls back to the Manus forge endpoint for local sandbox development.
  groqApiKey: process.env.GROQ_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? "",
  groqApiUrl: process.env.GROQ_API_KEY
    ? "https://api.groq.com/openai"
    : (process.env.BUILT_IN_FORGE_API_URL ?? "https://api.groq.com/openai"),

  // ── OCR.space (receipt image scanning) ──
  // Free tier: 25,000 requests/month. Get key at https://ocr.space/ocrapi
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY ?? "helloworld", // "helloworld" = free demo key

  // ── Legacy forge fields — kept for backward compat with _core/llm.ts internals ──
  forgeApiUrl: process.env.GROQ_API_KEY
    ? "https://api.groq.com/openai"
    : (process.env.BUILT_IN_FORGE_API_URL ?? ""),
  forgeApiKey: process.env.GROQ_API_KEY ?? process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
