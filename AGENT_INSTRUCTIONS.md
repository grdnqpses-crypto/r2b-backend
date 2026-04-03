# Agent Operating Instructions — Remember2Buy
**PERMANENT. Do not delete. Survives sandbox resets.**
Last updated: April 3, 2026

---

## These are the standing rules for ALL work on this project, now and forever.

### 1. Deep Research First — Zero Guessing
- Before implementing ANYTHING, research it thoroughly.
- Read all relevant documentation, source files, and prior art.
- If a library, API, or tool is involved, read its official docs before writing a single line of code.
- **Never guess at an API, parameter, behavior, or fix.** If unsure, research until sure.
- Use the search tool, browser tool, and local Expo SDK docs at `/home/ubuntu/belief-field-detector_helper/docs/` before implementing any Expo feature.

### 2. Understand Before Acting
- Read and understand ALL necessary information before starting.
- Read every relevant source file in the project before making changes.
- Understand the full impact of a change before making it.
- If a change touches multiple files, audit all of them first.

### 3. First Pass Must Be Correct
- The goal is to get it right the first time, every time.
- Do not build, deploy, or submit until every known issue is fixed and verified.
- Run TypeScript (`npx tsc --noEmit`) and verify 0 errors before every build.
- Test logic mentally end-to-end before committing.

### 4. No Iterative Builds for Individual Bugs
- Do NOT trigger a build for each small fix.
- Audit ALL issues first, fix ALL of them in one pass, THEN build once.
- Every build costs time and quota. Treat each build as the final one.

### 5. Persist Everything — Survive Sandbox Resets
- All credentials, keystores, scripts, and documentation live INSIDE the project directory (`/home/ubuntu/belief-field-detector/`).
- Keystore is at `signing_keys/r2b-upload-key-2026.jks` (also backed up at `/home/ubuntu/r2b_keys/`).
- Restore script: `bash signing_keys/restore_keystore.sh`
- `credentials.json` points to `/home/ubuntu/r2b_keys/r2b-upload-key-2026.jks`
- `RELEASE.md` is the single source of truth for all release procedures.
- This file (`AGENT_INSTRUCTIONS.md`) must be re-read at the start of every session.

### 6. Save Key Files After Every Research Session
- After reading documentation or doing research, save key findings to a file in the project.
- Never rely on context memory alone — write it down.

### 7. Handle All Technical Tasks Automatically
- The user had a stroke. Do not ask the user to do technical tasks.
- Handle everything: building, signing, downloading, delivering the AAB.
- Only ask the user for input when a decision requires their personal preference or account access.

---

## Project Quick Reference

| Field | Value |
|-------|-------|
| App Name | Remember2Buy |
| Package | `com.remember2buy.shopping` |
| Expo Account | `cryptogrdn` / `grdn.qpses@gmail.com` |
| EAS Project ID | `21c9a0c3-1878-4688-8a82-1ed219c3045f` |
| Current Version | 1.0.58 / versionCode 10058 |
| Last Live Version | 1.0.56 / versionCode 10056 |
| Keystore SHA1 | `28:10:64:B1:1F:6E:CD:A0:A3:F2:1A:0D:D0:01:3F:A3:58:D3:FA:83` |
| Key Alias | `r2b-upload` |
| Store/Key Password | `R2B-Upload-2026!` |
| Project Path | `/home/ubuntu/belief-field-detector` |
| Maps | Leaflet + CARTO tiles via WebView (zero Google deps) |
| Store Data | Overpass API (OpenStreetMap) |
| Search | Nominatim (OpenStreetMap) |

## Build Command
```bash
cd /home/ubuntu/belief-field-detector
export PATH="/home/ubuntu/.nvm/versions/node/v22.13.0/bin:$PATH"
eas build --platform android --profile production --non-interactive
```

## After Sandbox Reset
```bash
bash /home/ubuntu/belief-field-detector/signing_keys/restore_keystore.sh
# or run the full setup script:
bash /home/ubuntu/belief-field-detector/scripts/setup-dev-environment.sh
```
