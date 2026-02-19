# Belief Field Detector — Build & Publish Guide

This guide covers everything you need to build and publish the app to Google Play Store and Apple App Store.

---

## Prerequisites

1. **Expo Account**: Create one at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install with `npm install -g eas-cli`
3. **Google Play Console**: [play.google.com/console](https://play.google.com/console) ($25 one-time fee)
4. **Apple Developer Account**: [developer.apple.com](https://developer.apple.com) ($99/year)

---

## Step 1: Login to EAS

```bash
eas login
```

---

## Step 2: Configure the Project

```bash
eas build:configure
```

This links your project to your Expo account.

---

## Step 3: Build for Android (Google Play Store)

### Development APK (for testing)

```bash
eas build --platform android --profile development
```

This creates a debug APK you can install directly on any Android device.

### Production AAB (for Google Play Store)

```bash
eas build --platform android --profile production
```

**Important notes:**
- This creates an **AAB (Android App Bundle)** which is required by Google Play Store
- EAS manages the signing key by default — this is the **recommended approach** by Google
- The signing key is stored securely on Expo's servers and used automatically
- Google Play Store will use **Play App Signing** which is their recommended key management

### Upload to Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Go to **Release** → **Production** (or Internal Testing first)
4. Upload the AAB file downloaded from EAS
5. Fill in the store listing (see Store Listing section below)

Or use EAS Submit (automated):

```bash
# First, create a Google Service Account key:
# 1. Go to Google Cloud Console → IAM & Admin → Service Accounts
# 2. Create a service account with "Service Account User" role
# 3. Create a JSON key and save as google-service-account.json in project root
# 4. In Google Play Console, go to Settings → API access → Link the service account

eas submit --platform android --profile production
```

---

## Step 4: Build for iOS (App Store)

### Simulator Build (for testing)

```bash
eas build --platform ios --profile development
```

### Production Build (for App Store)

```bash
eas build --platform ios --profile production
```

**Important notes:**
- EAS will prompt you for your Apple Developer credentials
- It automatically manages provisioning profiles and certificates
- The build produces an IPA file ready for App Store submission

### Upload to App Store

```bash
eas submit --platform ios --profile production
```

Or manually:
1. Download the IPA from EAS
2. Open **Transporter** app on Mac
3. Upload the IPA
4. Go to [App Store Connect](https://appstoreconnect.apple.com)
5. Create a new app, fill in details, and submit for review

---

## Step 5: Google Play Billing Setup

### In Google Play Console:

1. Go to **Monetize** → **Products** → **Subscriptions**
2. Create these subscription products:

| Product ID | Name | Price |
|-----------|------|-------|
| `belief_premium_monthly` | Belief Field Premium (Monthly) | $4.99/month |
| `belief_premium_annual` | Belief Field Premium (Annual) | $29.99/year |
| `belief_premium_family` | Belief Field Premium (Family) | $7.99/month |

3. For each subscription:
   - Set the billing period
   - Add a free trial period (7 days recommended)
   - Set grace period (3 days recommended)
   - Enable "Allow users to upgrade/downgrade"

### In App Store Connect (iOS):

1. Go to your app → **Subscriptions**
2. Create a subscription group called "Belief Field Premium"
3. Add the same three subscription tiers with matching prices
4. Configure free trial periods

### In the App Code:

The app is pre-configured with product IDs matching the above. When you're ready to integrate real billing:

1. Install `react-native-iap` or `expo-in-app-purchases`
2. Replace the mock purchase flow in `hooks/use-premium.ts` with real IAP calls
3. Add receipt validation on your server

---

## Step 6: Signing Keys (Google Play)

**Recommended: Let Google manage your signing key (Play App Signing)**

When you upload your first AAB to Google Play:
1. Google Play Console will prompt you to enroll in **Play App Signing**
2. Select "Let Google manage and protect your app signing key" (recommended)
3. EAS generates an **upload key** which is different from the signing key
4. Google re-signs your app with their managed key for distribution

This is the most secure approach because:
- Google protects your signing key in their infrastructure
- If your upload key is compromised, you can reset it without losing your app
- Google can optimize your AAB for different device configurations

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
- Accelerometer (micro-movements)
- Gyroscope (rotational stability)
- Magnetometer (electromagnetic field)
- Barometer (atmospheric pressure)
- Light sensor (ambient light)
- Device motion (combined movement)
- Pedometer (stillness detection)

Features:
- 45+ pre-built beliefs across 7 categories
- Custom belief creation
- Guided meditation before scans
- Immersive narrated belief stories
- Themed scan environments
- Achievement badges
- Family profiles
- Belief journal
- Daily streak tracker
- Detailed scan reports
- Educational content about the science of belief

Perfect for families. Kids can measure their belief in Santa before Christmas. Parents can use it to inspire bedtime routines. Everyone can explore the fascinating science of how belief shapes our physical reality.

### Category
- Google Play: Education / Entertainment
- App Store: Education / Entertainment

### Content Rating
- Everyone / 4+

### Keywords
belief, science, sensors, family, kids, santa, tooth fairy, meditation, mindfulness, faith, measurement, detector

---

## Troubleshooting

### Build fails on Android
```bash
# Clear cache and rebuild
eas build --platform android --profile production --clear-cache
```

### Build fails on iOS
```bash
# Reset credentials
eas credentials --platform ios
# Then rebuild
eas build --platform ios --profile production
```

### Need to update the signing key
```bash
# For Android upload key reset (signing key stays with Google)
eas credentials --platform android
```

---

## Quick Reference Commands

```bash
# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Google Play
eas build --platform android --profile production

# Build for App Store
eas build --platform ios --profile production

# Submit to Google Play
eas submit --platform android

# Submit to App Store
eas submit --platform ios

# Check build status
eas build:list

# View credentials
eas credentials
```
