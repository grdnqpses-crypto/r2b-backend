# Google Play Billing Integration Guide

## Overview

This document explains how to integrate real Google Play Billing (and Apple App Store subscriptions) into the Belief Field Detector app.

The current implementation uses a **mock paywall** — tapping "Start Free Trial" immediately activates premium locally. To charge real users, you need to integrate a billing SDK.

---

## Recommended: RevenueCat

[RevenueCat](https://revenuecat.com) is the easiest way to handle subscriptions on both Google Play and Apple App Store from a single SDK.

### Subscription Configuration

| Field | Value |
|-------|-------|
| Product ID (Google Play) | `belief_weekly_099` |
| Product ID (App Store) | `belief_weekly_099` |
| Price | $0.99/week |
| Free Trial | 3 days |
| Renewal | Auto-renewing weekly |
| Entitlement | `premium` |

### Setup Steps

1. **Create a RevenueCat account** at https://app.revenuecat.com

2. **Install the SDK:**
   ```bash
   pnpm add react-native-purchases
   ```

3. **Configure in app startup** (`app/_layout.tsx`):
   ```ts
   import Purchases from "react-native-purchases";
   
   // In useEffect on mount:
   await Purchases.configure({
     apiKey: Platform.OS === "android"
       ? "YOUR_REVENUECAT_ANDROID_KEY"
       : "YOUR_REVENUECAT_IOS_KEY",
   });
   ```

4. **Replace the mock `onActivate` in `PremiumPaywall`:**
   ```ts
   import Purchases from "react-native-purchases";
   
   const handlePurchase = async () => {
     try {
       const offerings = await Purchases.getOfferings();
       const weekly = offerings.current?.weekly;
       if (!weekly) throw new Error("No weekly offering found");
       
       const { customerInfo } = await Purchases.purchasePackage(weekly);
       const isPremium = customerInfo.entitlements.active["premium"] !== undefined;
       if (isPremium) {
         onActivate(false); // Success
       }
     } catch (e: any) {
       if (!e.userCancelled) {
         Alert.alert("Purchase Failed", e.message);
       }
     }
   };
   ```

5. **Check subscription status** (replace `usePremium` hook):
   ```ts
   import Purchases from "react-native-purchases";
   
   const checkPremium = async () => {
     const info = await Purchases.getCustomerInfo();
     return info.entitlements.active["premium"] !== undefined;
   };
   ```

6. **Restore purchases** (add to Settings):
   ```ts
   const restorePurchases = async () => {
     const info = await Purchases.restorePurchases();
     const isPremium = info.entitlements.active["premium"] !== undefined;
     if (isPremium) activatePremium(false);
   };
   ```

---

## Google Play Console Setup

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Monetize → Subscriptions**
3. Create a new subscription:
   - **Product ID:** `belief_weekly_099`
   - **Name:** Believer — Weekly
   - **Description:** Unlimited scans, all beliefs, group sessions, and more
   - **Base plan:** Weekly, $0.99/week
   - **Free trial:** 3 days
4. Create a second subscription for family plan:
   - **Product ID:** `belief_family_weekly_199`
   - **Price:** $1.99/week
   - **Free trial:** 3 days

---

## Referral Integration with RevenueCat

To properly credit referrals server-side:

1. When a user enters a referral code, send it to your backend
2. Backend validates the code and extends the trial period via RevenueCat's API
3. Use RevenueCat's `setAttributes` to track referral source:
   ```ts
   await Purchases.setAttributes({ referral_code: "ABC123" });
   ```

---

## Testing

- Use [Google Play License Testing](https://developer.android.com/google/play/billing/test) accounts for sandbox purchases
- RevenueCat provides a sandbox environment for testing without real charges
- Test the 3-day trial by using a test account and verifying the `customerInfo.entitlements` object

---

## Current Mock Implementation

The current `usePremium` hook (`hooks/use-premium.ts`) stores premium state in AsyncStorage. This is fine for development and testing. When you integrate RevenueCat, replace the AsyncStorage checks with RevenueCat's `getCustomerInfo()`.
