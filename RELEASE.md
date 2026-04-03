# Remember2Buy — Release & Signing Reference

**This file is the single source of truth for all release procedures.**
Keep it updated after every release. Never delete it.

---

## App Identity

| Field | Value |
|-------|-------|
| App Name | Remember2Buy |
| Package | `com.remember2buy.shopping` |
| Expo Slug | `remember2buy` |
| Play Store App ID | `4975791977629934804` |
| Developer Account | `5648952195722124814` |
| Google Account | `Grdn.qpses@gmail.com` |

---

## Version History

| Version | versionCode | Date | Notes |
|---------|-------------|------|-------|
| 1.0.51 | 10051 | Mar 2026 | Last live production build |
| 1.0.52 | 52 | — | WRONG — never uploaded (versionCode too low) |
| 1.0.53 | 10053 | Apr 3 2026 | Crash fix (Maps removed) + store search + distance badges + recent searches |

**Rule:** versionCode must ALWAYS be higher than 10051. Next release: 10054+.

---

## Signing Keys

### Upload Key (what YOU sign with before uploading to Play)

| Field | Value |
|-------|-------|
| Keystore file | `signing_keys/r2b-upload-key-2026.jks` |
| Key alias | `r2b-upload` |
| Store password | `R2B-Upload-2026!` |
| Key password | `R2B-Upload-2026!` |
| SHA1 fingerprint | `28:10:64:B1:1F:6E:CD:A0:A3:F2:1A:0D:D0:01:3F:A3:58:D3:FA:83` |
| SHA256 fingerprint | `25:04:C5:A1:B1:F3:3F:CA:FB:16:23:9A:06:5C:76:C7:43:93:E3:4A:F8:A0:DC:DF:56:21:4A:BA:DD:8F:43:71` |
| Valid until | August 15, 2053 |

### App Signing Key (held by Google — you do NOT have this)

| Field | Value |
|-------|-------|
| SHA1 | `94:7B:B0:3B:53:A9:B9:09:47:CE:CC:98:BA:08:96:E7:37:09:28:BE` |
| SHA256 | `43:70:B8:35:7A:91:B2:F9:42:71:15:FD:26:23:40:AF:8E:7D:5F:41:A9:F2:F1:32:16:0B:DD:B8:C5:D8:5C:E4` |

Google re-signs the AAB with this key before delivering to users. You only need the upload key.

### Restore Keystore After Sandbox Reset

```bash
bash signing_keys/restore_keystore.sh
```

This restores the keystore from the embedded Base64 inside the script to `/home/ubuntu/r2b_keys/r2b-upload-key-2026.jks`.

---

## Build Pipeline

This is an **Expo Managed Workflow** project. There is no local `android/` directory.
Builds are produced by **EAS Build** (Expo's cloud build service).

### Prerequisites

```bash
# Install EAS CLI
export PATH="/home/ubuntu/.nvm/versions/node/v22.13.0/bin:$PATH"
npm install -g eas-cli

# Log in to Expo account
eas login
# Email: Grdn.qpses@gmail.com
# Password: CryptoGRDN11#
```

### Build a Production AAB

```bash
cd /home/ubuntu/belief-field-detector

# Trigger production build (uses credentialsSource: "remote" from eas.json)
eas build --platform android --profile production --non-interactive
```

EAS will:
1. Bundle the JS code
2. Run `expo prebuild` to generate the Android project
3. Sign with the upload key stored in EAS credentials
4. Return a download URL for the signed AAB

### Download the Built AAB

```bash
# List recent builds and get download URL
eas build:list --platform android --limit 1
```

Or visit: https://expo.dev/accounts/[account]/projects/remember2buy/builds

### Upload to Google Play

1. Go to https://play.google.com/console
2. Sign in as `Grdn.qpses@gmail.com`
3. Remember2Buy → Production → Create new release
4. Upload the `.aab` file
5. Add release notes
6. Submit for review

---

## Critical Rules

1. **NEVER re-sign a pre-built AAB with jarsigner** — always build fresh from source via EAS
2. **ALWAYS check the live versionCode** before setting a new one — must be higher than current production
3. **NEVER use versionCode below 10052** — production is at 10051
4. **The `signing_keys/` directory** contains the master keystore — never delete it
5. **EAS credentials source is "remote"** — the upload key must be registered in EAS, not just local

---

## Crash History

| Date | Crash | Fix | Status |
|------|-------|-----|--------|
| Mar 2026 | `IllegalStateException: API key not found` (Google Maps) | Removed `react-native-maps`, replaced with native location card | Fixed in v1.0.53 |

---

## What's New in v1.0.53

- **Crash fix:** Removed Google Maps dependency that caused `IllegalStateException` on launch
- **Store search:** OpenStreetMap/Nominatim search for any store worldwide (no API key needed)
- **Distance badges:** Shows distance from user to each search result
- **Recent searches:** Last 5 searches saved and shown as quick-tap chips
- **Add manually:** "Can't find it?" form to add any store by name + address with geocoding

---

## EAS Credentials Setup (if reset)

If EAS credentials are lost, re-register the upload key:

```bash
cd /home/ubuntu/belief-field-detector
eas credentials --platform android
# Select: Set up a new keystore
# Choose: Use existing keystore
# Path: signing_keys/r2b-upload-key-2026.jks
# Alias: r2b-upload
# Password: R2B-Upload-2026!
```

---

*Last updated: April 3, 2026*
