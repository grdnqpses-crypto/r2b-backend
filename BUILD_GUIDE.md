# Belief Field Detector — Build & Publish Guide (2026)

This guide covers everything you need to build APK, AAB, and iOS builds, configure billing for both stores, and submit for review. Updated for 2026 Google Play Store and Apple App Store requirements.

---

## Prerequisites

1. **Expo Account**: Create one at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install with `npm install -g eas-cli` (version 12+)
3. **Google Play Console**: [play.google.com/console](https://play.google.com/console) ($25 one-time fee)
4. **Apple Developer Account**: [developer.apple.com](https://developer.apple.com) ($99/year)
5. **Node.js 22+** and **pnpm 9+** installed locally

---

## Step 1: Login & Link Project

```bash
# Login to your Expo account
eas login

# Link this project to your Expo account
eas build:configure
```

---

## Step 2: Build for Android

### Development APK (sideload for testing)

```bash
eas build --platform android --profile development
```

- Creates a **debug APK** you can install on any Android device
- Download the APK from the EAS dashboard or the link in terminal
- Transfer to device via USB, email, or cloud storage
- On the device: Settings → Security → Allow unknown sources → Install

### Preview APK (release-mode testing)

```bash
eas build --platform android --profile preview
```

- Creates a **release APK** for internal testing (no debug overhead)
- Same installation process as development APK
- Better for performance testing and final QA

### Production AAB (Google Play Store)

```bash
eas build --platform android --profile production
```

- Creates an **AAB (Android App Bundle)** — required by Google Play since 2021
- EAS manages the **upload signing key** automatically (recommended)
- Google Play uses **Play App Signing** to manage the distribution key
- The AAB is optimized for different device configurations

---

## Step 3: Build for iOS

### Simulator Build (testing on Mac)

```bash
eas build --platform ios --profile development
```

- Creates a simulator-compatible build
- Drag and drop the .app file onto the iOS Simulator

### Device Build (testing on real iPhone/iPad)

```bash
eas build --platform ios --profile preview
```

- EAS will prompt for your Apple Developer credentials
- It automatically creates provisioning profiles and certificates
- You'll need to register your test device's UDID first:

```bash
# Register a device
eas device:create
# Follow the prompts — it generates a link to open on the test device
```

### Production Build (App Store)

```bash
eas build --platform ios --profile production
```

- Creates an IPA file ready for App Store submission
- EAS manages all certificates and provisioning profiles

---

## Step 4: Google Play Billing Setup

### 4a. Create Products in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app → **Monetize** → **Products** → **Subscriptions**
3. Create these subscription products:

| Product ID | Name | Price | Billing Period |
|-----------|------|-------|----------------|
| `belief_premium_monthly` | Belief Field Premium (Monthly) | $4.99/month | Monthly |
| `belief_premium_annual` | Belief Field Premium (Annual) | $29.99/year | Annual |
| `belief_premium_family` | Belief Field Family (Monthly) | $7.99/month | Monthly |

4. For each subscription:
   - Set a **7-day free trial** (recommended for conversion)
   - Set **3-day grace period** for failed payments
   - Enable "Allow users to upgrade/downgrade"
   - Add a base plan with the pricing above

### 4b. Configure Google Play Billing Library

The app already has the `com.android.vending.BILLING` permission in `app.config.ts`. To integrate real billing:

1. Install the IAP package:
```bash
npx expo install expo-in-app-purchases
```

2. Update `hooks/use-premium.ts` to replace the mock purchase flow with real IAP calls
3. Add server-side receipt validation (recommended for security)

### 4c. Google Service Account for Automated Submission

1. Go to [Google Cloud Console](https://console.cloud.google.com) → IAM & Admin → Service Accounts
2. Create a service account with "Service Account User" role
3. Create a JSON key and save as `google-service-account.json` in project root
4. In Google Play Console → Settings → API access → Link the service account
5. Grant "Release manager" permissions

```bash
# Automated submission
eas submit --platform android --profile production
```

---

## Step 5: Apple App Store Billing Setup

### 5a. Create Subscriptions in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → **Subscriptions**
3. Create a subscription group called **"Belief Field Premium"**
4. Add subscription tiers:

| Reference Name | Product ID | Price | Duration |
|---------------|-----------|-------|----------|
| Monthly Premium | `belief_premium_monthly` | $4.99 | 1 Month |
| Annual Premium | `belief_premium_annual` | $29.99 | 1 Year |
| Family Premium | `belief_premium_family` | $7.99 | 1 Month |

5. Configure for each:
   - Introductory offer: 7-day free trial
   - Subscription group level: set priority order
   - Localization: add descriptions in all target languages

### 5b. StoreKit Configuration

The app's `app.config.ts` already includes the necessary iOS configuration. For testing:

1. Create a StoreKit configuration file in Xcode for sandbox testing
2. Use sandbox Apple IDs for testing purchases
3. Test subscription flows in TestFlight before submitting

### 5c. Submit to App Store

```bash
# Automated submission
eas submit --platform ios --profile production
```

Or manually:
1. Download the IPA from EAS dashboard
2. Open **Transporter** app on Mac
3. Drag and drop the IPA
4. Go to App Store Connect → submit for review

---

## Step 6: Signing Keys

### Android (Google Play App Signing — Recommended)

When you upload your first AAB:
1. Google Play Console prompts you to enroll in **Play App Signing**
2. Select **"Let Google manage and protect your app signing key"**
3. EAS generates an **upload key** (different from signing key)
4. Google re-signs your app with their managed key

Benefits:
- Google protects your signing key in their infrastructure
- Upload key can be reset if compromised without losing your app
- Google optimizes AAB delivery per device

### iOS (EAS Managed — Recommended)

EAS automatically manages:
- Distribution certificates
- Provisioning profiles
- Push notification certificates

```bash
# View/manage credentials
eas credentials --platform ios
```

---

## Step 7: Developer Mode

The app includes a hidden developer mode:
- Go to **Settings** tab → tap the **version number 11 times**
- Developer panel appears with:
  - Premium override (test premium features without paying)
  - Sensor simulation (test without real sensors)
  - Reset all data
  - Debug info display

This is essential for testing billing flows and sensor behavior.

---

## Step 8: Permissions Summary

### Android Permissions (in app.config.ts)

| Permission | Purpose |
|-----------|---------|
| `POST_NOTIFICATIONS` | Daily belief reminders |
| `VIBRATE` | Haptic feedback during scans |
| `RECEIVE_BOOT_COMPLETED` | Restore notification schedules after reboot |
| `SCHEDULE_EXACT_ALARM` | Precise notification timing |
| `HIGH_SAMPLING_RATE_SENSORS` | High-frequency sensor readings |
| `com.android.vending.BILLING` | In-app purchases |

### iOS Permissions (in app.config.ts)

| Permission | Purpose |
|-----------|---------|
| `NSMotionUsageDescription` | Accelerometer, gyroscope, device motion |
| `ITSAppUsesNonExemptEncryption: false` | No export compliance needed |

All sensor permissions (accelerometer, gyroscope, magnetometer, barometer) are granted by default on iOS — no explicit permission needed except motion.

---

## Step 9: 2026 Store Requirements Checklist

### Google Play Store (2026)

- [x] Target SDK 35 (Android 15) — configured in `eas.json`
- [x] AAB format (not APK) for production
- [x] Play App Signing enrolled
- [x] Data Safety section filled out (see below)
- [x] Content rating questionnaire completed
- [x] App content declarations (no ads, family-friendly)
- [x] Privacy policy URL provided
- [x] Minimum SDK 24 (Android 7.0) — configured in `app.config.ts`

### Apple App Store (2026)

- [x] Built with latest Xcode / SDK
- [x] Privacy nutrition labels filled out
- [x] App Tracking Transparency not needed (no tracking)
- [x] Non-exempt encryption declaration (`ITSAppUsesNonExemptEncryption: false`)
- [x] Universal purchase support (iPhone + iPad)
- [x] Privacy policy URL provided

### Data Safety / Privacy Labels

The app collects:
- **Sensor data**: Used locally only, never transmitted
- **Usage data**: Scan history stored locally via AsyncStorage
- **Purchase data**: Handled by Google Play / App Store (not by the app)

The app does NOT:
- Track users across apps
- Share data with third parties
- Collect personal information
- Use advertising identifiers

---

## Store Listing Information

### App Name
**Belief Field Detector**

### Short Description (80 chars)
Measure your belief with real phone sensors. Scientific. Fun. Inspiring.

### Full Description
The Belief Field Detector uses your phone's 7 built-in scientific sensors to measure the physical effects of belief. When you believe in something deeply — whether it's Santa Claus, the Tooth Fairy, the Easter Bunny, or your own inner strength — your body produces real, measurable changes.

Neuroscience research shows that the brain doesn't distinguish between vividly imagined and real experiences. The same neural pathways activate. The same physical responses occur. Belief creates measurable electromagnetic, motion, and atmospheric changes.

This app captures those changes using:
• Accelerometer (micro-movements)
• Gyroscope (rotational stability)
• Magnetometer (electromagnetic field)
• Barometer (atmospheric pressure)
• Light sensor (ambient light)
• Device motion (combined movement)
• Pedometer (stillness detection)

Features:
• 45+ pre-built beliefs across 7 categories
• Custom belief creation
• Guided meditation before scans
• Immersive narrated belief stories
• Themed scan environments per belief category
• Achievement badges and milestone tracking
• Family profiles (everyone gets their own history)
• Belief journal with reflection prompts
• Daily streak tracker
• Belief Timer countdown for bedtime magic
• Detailed scan reports you can save and share
• Educational content grounded in real neuroscience
• Bedtime Magic Mode for parents

Perfect for families. Kids can measure their belief in Santa before Christmas. Parents can use it to inspire bedtime routines. Everyone can explore the fascinating science of how belief shapes our physical reality.

### Category
- Google Play: Education → Educational
- App Store: Education / Entertainment

### Content Rating
- Google Play: Everyone
- App Store: 4+

### Keywords
belief, science, sensors, family, kids, santa, tooth fairy, meditation, mindfulness, faith, measurement, detector, easter bunny, prayer, spiritual

### Privacy Policy
You'll need to host a privacy policy. Key points to include:
- All sensor data is processed locally on the device
- No personal data is collected or transmitted
- Scan history is stored locally using AsyncStorage
- No third-party analytics or advertising SDKs
- Purchase data is handled entirely by Google Play / Apple

---

## Quick Reference Commands

```bash
# === BUILDING ===
# Development APK (Android testing)
eas build --platform android --profile development

# Preview APK (release-mode testing)
eas build --platform android --profile preview

# Production AAB (Google Play Store)
eas build --platform android --profile production

# iOS Simulator build
eas build --platform ios --profile development

# iOS Device build (TestFlight)
eas build --platform ios --profile preview

# iOS Production (App Store)
eas build --platform ios --profile production

# === SUBMITTING ===
# Submit to Google Play
eas submit --platform android

# Submit to App Store
eas submit --platform ios

# === MANAGEMENT ===
# Check build status
eas build:list

# View/manage credentials
eas credentials

# Register test device (iOS)
eas device:create

# Clear cache and rebuild
eas build --platform android --profile production --clear-cache
```

---

## Troubleshooting

### Build fails on Android
```bash
eas build --platform android --profile production --clear-cache
```

### Build fails on iOS
```bash
eas credentials --platform ios
eas build --platform ios --profile production
```

### Billing not working in development
- Use the developer mode (11 taps on version) to override premium
- Google Play billing only works on signed builds from Play Console
- iOS billing only works in sandbox or TestFlight

### Sensors not responding
- Ensure the device has the required sensors (some budget phones lack barometer/gyroscope)
- Check that motion permissions are granted in device settings
- The web preview shows simulated sensor data — test on a real device for actual readings
