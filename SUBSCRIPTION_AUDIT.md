# Subscription Audit — Remember 2 Buy

## Play Console Findings (verified Apr 3, 2026)

### Product
- **Product ID**: `premium_weekly_199` ✅ (matches app code exactly)
- **Name**: Remember 2 Buy Premium
- **Status**: Active ✅

### Base Plan
- **Base Plan ID**: `premium-weekly`
- **Type**: Weekly, auto-renewing ✅
- **Status**: Active ✅
- **Grace period**: 3 days
- **Account hold**: 57 days (auto-calculated)
- **Countries**: 174 countries / regions ✅
- **US Price**: $1.99 ✅

### App Code (use-subscription.ts)
- SKU used: `premium_weekly_199` ✅ matches
- Base plan ID used for offerToken lookup: fetched from `subscriptionOfferDetailsAndroid` ✅
- requestPurchase format: `{ type: "subs", request: { google: { skus: [...], subscriptionOffers: [...] } } }` ✅

### Root Cause of Upgrade Button Doing Nothing
1. `purchase()` does NOT throw when IAP is unavailable — it sets `error` state and returns
2. `onActivate` in settings.tsx wraps `subscription.purchase()` in try/catch — catch never fires
3. `subscription.error` is never displayed in the paywall UI
4. `connectionRef.current` may be false if user opens paywall before initConnection() completes

### Fixes Needed
1. `purchase()` must THROW when connection is not ready so settings.tsx catch block fires
2. Show `subscription.error` in the paywall UI
3. Add "Connecting to store..." loading state while initConnection() is in progress
4. The Play Store fallback URL must use the correct package: `com.remember2buy.shopping`
   - Current URL in settings.tsx: `https://play.google.com/store/apps/details?id=space.manus.remember2buy`
   - **WRONG** — actual package is `com.remember2buy.shopping`
   - Fix: `https://play.google.com/store/apps/details?id=com.remember2buy.shopping`

### Google Cloud / API Check
- No server-side subscription validation is implemented (local AsyncStorage only)
- This is acceptable for v1 but means subscription status is not verified server-side
- No Google Cloud service account or Play Developer API integration needed for basic IAP

### Conclusion
The subscription product is correctly configured in Play Console.
The bug is entirely in the app code — specifically the error handling and fallback URL.
