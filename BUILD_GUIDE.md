# Belief Field Detector — Complete Build & Publishing Guide (2026)

This guide covers everything you need to build APK, AAB, and iOS builds, configure billing for both stores, and submit for review. Updated for **2026 Google Play Store and Apple App Store requirements**.

---

## Table of Contents

1. [Quick Start (3 Commands)](#quick-start)
2. [Build Android APK (Testing)](#build-android-apk)
3. [Build Android AAB (Google Play Store)](#build-android-aab)
4. [Build iOS Archive (App Store)](#build-ios-archive)
5. [Google Play Billing Setup](#google-play-billing)
6. [Apple In-App Purchases Setup](#apple-in-app-purchases)
7. [Signing Keys](#signing-keys)
8. [Developer Mode](#developer-mode)
9. [Store Submission Checklist](#store-submission-checklist)
10. [Store Listing Copy](#store-listing-copy)
11. [Privacy Policy](#privacy-policy)
12. [Quick Reference Commands](#quick-reference-commands)
13. [Troubleshooting](#troubleshooting)
14. [Cost Summary](#cost-summary)

---

## Quick Start

### Three commands to get a test APK on your phone:

```bash
npm install -g eas-cli          # Step 1: Install build tool
eas login                        # Step 2: Create free account & login
./scripts/build.sh apk           # Step 3: Build APK in the cloud
```

EAS Build compiles your app on Expo's cloud servers — **no Android SDK, Xcode, or special setup needed on your machine.** You get a download link in ~15 minutes.

---

## Build Android APK

An APK is an installable file you can put directly on any Android phone for testing.

```bash
# Option A: Use the build script
./scripts/build.sh apk

# Option B: Use EAS directly
eas build --platform android --profile preview
```

**Installing on your phone:**
1. Download the APK from the link EAS provides
2. Transfer to your Android phone (email it, Google Drive, or USB cable)
3. Tap the APK file on your phone
4. If prompted, enable "Install from unknown sources" in Settings
5. The app installs and appears on your home screen with the Belief Field Detector icon

---

## Build Android AAB

An AAB (Android App Bundle) is **required** for Google Play Store. Google uses it to generate optimized APKs for each device type.

### Prerequisites
- Google Play Console account ($25 one-time fee at [play.google.com/console](https://play.google.com/console))

### Build

```bash
# Option A: Use the build script
./scripts/build.sh aab

# Option B: Use EAS directly
eas build --platform android --profile production
```

### Upload to Google Play

1. Download the AAB from the EAS build link
2. Go to [Google Play Console](https://play.google.com/console)
3. Create your app (or select existing)
4. Go to **Release** → **Production** → **Create new release**
5. Upload the AAB file
6. Add release notes
7. Submit for review

### Automated Submission (Optional)

```bash
# After setting up Google Service Account (see Billing section)
eas submit --platform android --profile production
# Or: ./scripts/build.sh submit-android
```

---

## Build iOS Archive

An IPA archive is required for App Store and TestFlight. **No Mac or Xcode needed** — EAS builds in the cloud!

### Prerequisites
- Apple Developer account ($99/year at [developer.apple.com](https://developer.apple.com))

### Build

```bash
# Option A: Use the build script
./scripts/build.sh ios

# Option B: Use EAS directly
eas build --platform ios --profile production
```

**First time:** EAS will prompt you to log in with your Apple ID and select your Developer team. It automatically creates certificates and provisioning profiles.

### Test via TestFlight

```bash
# Submit to TestFlight
eas submit --platform ios --profile production
```

Then in [App Store Connect](https://appstoreconnect.apple.com):
1. Go to your app → TestFlight
2. The build appears after processing (5-30 minutes)
3. Add testers (internal or external)
4. Testers install via the TestFlight app on their iPhone

### Submit to App Store

1. In App Store Connect, go to your app → App Store tab
2. Create a new version
3. Select the build from TestFlight
4. Fill in all required metadata
5. Submit for review

---

## Google Play Billing

### Create In-App Products

1. Go to [Google Play Console](https://play.google.com/console) → Your App
2. Navigate to **Monetize** → **Products** → **Subscriptions**
3. Create these products:

| Product ID | Type | Price | Description |
|---|---|---|---|
| `belief_field_premium_monthly` | Subscription | $4.99/month | Monthly Premium Access |
| `belief_field_premium_yearly` | Subscription | $29.99/year | Yearly Premium (Save 50%) |
| `belief_field_premium_lifetime` | One-time purchase | $49.99 | Lifetime Premium Access |

4. Create a **Subscription Group** called "Belief Field Premium"
5. Set 7-day free trial (recommended for conversion)
6. Set 3-day grace period for failed payments

### Google Service Account (for automated submission)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → IAM → Service Accounts
2. Create a service account with "Service Account User" role
3. Download the JSON key file
4. Save as `google-service-account.json` in the project root
5. In Google Play Console → Settings → API access → Link the service account

### Test Purchases

1. In Google Play Console → Settings → License testing
2. Add your test email addresses
3. Test accounts can make purchases without being charged

---

## Apple In-App Purchases

### Create Subscriptions

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Your App
2. Navigate to **Subscriptions**
3. Create subscription group: **"Belief Field Premium"**
4. Add these products:

| Reference Name | Product ID | Price | Duration |
|---|---|---|---|
| Monthly Premium | `belief_field_premium_monthly` | $4.99 | 1 Month |
| Yearly Premium | `belief_field_premium_yearly` | $29.99 | 1 Year |
| Lifetime Premium | `belief_field_premium_lifetime` | $49.99 | Non-Renewing |

5. Add introductory offer: 7-day free trial
6. Add localized display names and descriptions

### Sandbox Testing

1. In App Store Connect → Users and Access → Sandbox Testers
2. Create sandbox test accounts
3. On your test device, sign in with the sandbox account
4. Purchases are simulated (no real charges)

---

## Signing Keys

### Android — Google Play App Signing (Recommended)

When you upload your first AAB to Google Play:
1. Google prompts you to enroll in **Play App Signing**
2. Select **"Let Google manage and protect your app signing key"** (recommended)
3. EAS generates an **upload key** (separate from the signing key)
4. Google re-signs your app with their managed key for distribution

Benefits: Google protects your key, upload key can be reset if compromised, optimized delivery.

### iOS — EAS Managed (Recommended)

EAS automatically manages all iOS credentials:
- Distribution certificates
- Provisioning profiles
- Push notification certificates

```bash
# View/manage iOS credentials
eas credentials --platform ios
```

---

## Developer Mode

Hidden developer mode for testing and development:

1. Open the **Settings** tab in the app
2. Scroll to the bottom where the version number is displayed
3. **Tap the version number 11 times rapidly**
4. Developer panel unlocks with:
   - **Bypass Premium** — Access all premium features without payment
   - **Reset Onboarding** — Re-show welcome screens
   - **Clear All Data** — Reset history, achievements, streaks
   - **Force Achievement** — Test achievement animations
   - **Sensor Debug** — View raw sensor data
   - **Skip Meditation** — Bypass meditation countdown
   - **Test Notifications** — Send test push notification

---

## Store Submission Checklist

### Google Play Store (2026)

- [ ] Target SDK 35+ (Android 15) — ✅ Already configured
- [ ] AAB format for production — ✅ Already configured
- [ ] Play App Signing enrolled — Automatic with EAS
- [ ] Privacy Policy URL hosted — You need to create this
- [ ] Data Safety form completed — See Privacy section below
- [ ] Content Rating questionnaire — Rate as "Everyone"
- [ ] Store listing complete (title, description, screenshots)
- [ ] App icon 512x512 PNG — ✅ Already generated
- [ ] Feature graphic 1024x500 PNG — You need to create this
- [ ] Min 2 phone screenshots — You need to capture these
- [ ] In-app purchase products created and active
- [ ] `com.android.vending.BILLING` permission — ✅ Already configured

### Apple App Store (2026)

- [ ] Privacy Policy URL — You need to host this
- [ ] App Privacy nutrition labels — Declare: No data collected
- [ ] Age Rating questionnaire — Rate as 4+
- [ ] Screenshots for 6.7" and 5.5" iPhone — You need to capture
- [ ] App description and keywords
- [ ] Support URL
- [ ] In-app purchase products created
- [ ] `ITSAppUsesNonExemptEncryption: false` — ✅ Already configured

---

## Store Listing Copy

### App Name
**Belief Field Detector**

### Short Description (80 chars)
Measure your belief with real phone sensors. Scientific. Fun. Inspiring.

### Full Description

> The Belief Field Detector uses your phone's 7 built-in scientific sensors to measure the physical effects of belief.
>
> When you believe in something deeply — whether it's Santa Claus, the Tooth Fairy, the Easter Bunny, or your own inner strength — your body produces real, measurable changes. Neuroscience research shows that the brain doesn't distinguish between vividly imagined and real experiences. The same neural pathways activate. The same physical responses occur.
>
> This app captures those changes using:
> - Accelerometer (micro-movements)
> - Gyroscope (rotational stability)
> - Magnetometer (electromagnetic field)
> - Barometer (atmospheric pressure)
> - Light sensor (ambient light)
> - Device motion (combined movement)
> - Pedometer (stillness detection)
>
> **Features:**
> - 45+ pre-built beliefs across 7 categories
> - Custom belief creation
> - Guided meditation before scans
> - Immersive narrated belief stories
> - Themed scan environments per belief category
> - Achievement badges and milestone tracking
> - Family profiles (everyone gets their own history)
> - Belief journal with reflection prompts
> - Daily streak tracker
> - Belief Timer countdown for bedtime magic
> - Detailed scan reports you can save and share
> - Educational content grounded in real neuroscience
> - Bedtime Magic Mode for parents
>
> Perfect for families. Kids can measure their belief in Santa before Christmas. Parents can use it to inspire bedtime routines. Everyone can explore the fascinating science of how belief shapes our physical reality.

### Category
- Google Play: **Education**
- App Store: **Education** / **Entertainment**

### Content Rating
- Google Play: **Everyone**
- App Store: **4+**

### Keywords (100 chars max for Apple)
belief, science, sensors, family, kids, santa, tooth fairy, meditation, faith, detector, spiritual

---

## Privacy Policy

You need to host a privacy policy at a public URL. Key points to include:

**Data Collection:** The Belief Field Detector does not collect, store, or transmit any personal data. All sensor readings and scan history are stored locally on your device using AsyncStorage and are never sent to any server.

**Sensor Data:** The app accesses device sensors (accelerometer, gyroscope, magnetometer, barometer, light sensor, device motion, pedometer) solely for the purpose of measuring belief field intensity. This data is processed in real-time on your device and is not recorded or transmitted.

**Purchases:** In-app purchase transactions are handled entirely by Google Play (Android) or Apple App Store (iOS). The app does not process or store any payment information.

**Children's Privacy:** The app is designed to be family-friendly and does not collect any data from children or adults.

**Third Parties:** The app does not include any third-party analytics, advertising, or tracking SDKs.

---

## Quick Reference Commands

```bash
# === BUILDING (use the build script) ===
./scripts/build.sh apk           # Test APK for Android
./scripts/build.sh aab           # AAB for Google Play Store
./scripts/build.sh ios           # iOS archive for App Store
./scripts/build.sh all           # Build all three

# === BUILDING (use EAS directly) ===
eas build --platform android --profile preview      # Test APK
eas build --platform android --profile production   # Production AAB
eas build --platform ios --profile production        # Production iOS

# === SUBMITTING ===
eas submit --platform android    # Submit to Google Play
eas submit --platform ios        # Submit to App Store

# === MANAGEMENT ===
eas build:list                   # Check build status
eas credentials                  # View/manage signing credentials
eas device:create                # Register iOS test device
eas build --clear-cache          # Clear cache and rebuild
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Build fails on Android | `eas build --platform android --profile production --clear-cache` |
| Build fails on iOS | `eas credentials --platform ios` then rebuild |
| Billing not working in dev | Use Developer Mode (11 taps on version) to bypass |
| Sensors not responding | Test on real device — web preview shows simulated data |
| "Module not found" | `rm -rf node_modules && npm install && npx expo prebuild --clean` |
| Build takes too long | Free tier: ~15-20 min. Paid priority: ~5-8 min |

---

## Cost Summary

| Item | Cost | Frequency |
|---|---|---|
| Expo/EAS Account | **Free** | — |
| EAS Build (free tier) | **Free** | 30 builds/month |
| Google Play Console | **$25** | One-time |
| Apple Developer Program | **$99** | Annual |
| **Total to launch** | **$124** | — |
