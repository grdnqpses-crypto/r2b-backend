# Remember 2 Buy — Agent Memory & Conversation History
> This file is PERMANENT. It must NEVER be deleted. It contains all decisions, approvals, rejections, and context from every session.
> Last updated: Apr 4, 2026

---

## 1. APP IDENTITY

- **App Name**: Remember 2 Buy (also written as Remember2Buy)
- **Package**: com.remember2buy.shopping
- **Play Store App ID**: 4975791977629934804
- **Developer Account**: CryptoGRDN (ID: 5648952195722124814)
- **Google Account**: Grdn.qpses@gmail.com
- **Current Version**: 1.0.62 / versionCode 10062
- **Next Version**: 2.0.0 (mega feature build)
- **Project Path**: /home/ubuntu/belief-field-detector
- **Dev Server**: https://8081-ifo6r11d4vr5gw6ij3bz8-3135620c.us1.manus.computer

---

## 2. SUBSCRIPTION MODEL (LOCKED — DO NOT CHANGE)

- **Free tier**: 1 store, 3 items, no coupon section
- **Premium weekly**: $1.99/week auto-renewing (SKU: premium_weekly_199)
- **Premium annual**: $59.99/year auto-renewing (SKU: premium_annual_5999) — saves ~42%
- **NO monthly plan**
- **NO lifetime plan**
- **NO family plan**
- **7-day free trial** for new users (to be implemented)
- The annual plan should be shown as the recommended/default option in the paywall

---

## 3. STORE LISTING (UPDATED APR 4, 2026)

### Short Description (78/80 chars):
"Never forget what you went to buy! In-store reminders & coupons to save money."

### Full Description Core Message:
"Never forget what you went to the store to buy — ever again. Remember 2 Buy uses your phone's location to automatically remind you what's on your shopping list the moment you walk into a store."

### Status: Submitted for Google review (Apr 4, 2026). Expected review time: up to 7 days.

---

## 4. FEATURE DECISIONS (ALL 110 APPROVED — EXCEPT NOTED)

### APPROVED (build everything):
All 110 features in FEATURE_SUGGESTIONS.md and todo.md v2.0.0 section are APPROVED.

### REJECTED (do NOT build):
- #93: Monthly subscription — NO. Only weekly ($1.99) and annual ($59.99).
- Lifetime subscription — NO.
- Family plan subscription — NO.

### PRICING (LOCKED):
- Weekly: $1.99/week
- Annual: $59.99/year (save 42%)
- No other pricing tiers.

---

## 5. TECHNICAL ARCHITECTURE

### Stack:
- Expo SDK 54, React Native 0.81, TypeScript
- NativeWind 4 (Tailwind CSS)
- expo-router 6 (file-based routing)
- AsyncStorage (local persistence)
- i18next (21 languages)
- expo-location (geofencing)
- expo-notifications
- expo-image-picker
- expo-haptics
- react-native-maps (OpenStreetMap tiles)

### Key Files:
- `lib/storage.ts` — all data models and AsyncStorage CRUD
- `lib/geofence.ts` — geofencing logic
- `lib/notifications.ts` — notification setup
- `lib/nearby-stores.ts` — Overpass API store search
- `lib/i18n/` — 21 language locale files
- `app/(tabs)/index.tsx` — Dashboard (map + store list)
- `app/(tabs)/list.tsx` — Shopping list
- `app/(tabs)/stores.tsx` — Store management
- `app/(tabs)/coupons.tsx` — Coupon wallet
- `app/(tabs)/settings.tsx` — Settings
- `components/premium-paywall.tsx` — Paywall modal

### Current Data Models:
```typescript
ShoppingItem { id, text, checked, createdAt }
SavedStore { id, name, category, lat, lng, address, addedAt }
Coupon { id, imageUri, storeName, description, barcode, addedAt }
Tier = "free" | "premium"
```

### Free Limits:
- FREE_STORE_LIMIT = 1
- FREE_ITEM_LIMIT = 3

---

## 6. i18n — 21 SUPPORTED LANGUAGES

en, es, fr, de, pt, it, nl, ru, ja, ko, zh, ar, hi, tr, pl, sv, id, th, vi, el, he

RTL languages: ar (Arabic), he (Hebrew) — I18nManager.forceRTL() is implemented.

---

## 7. GEOFENCING BEHAVIOR (LOCKED)

- Trigger radius: 0.3 miles (≈480m)
- Two-stage notifications:
  1. Immediate alert when crossing 0.3mi boundary
  2. 6-minute follow-up reminder if still inside
- Notification format: "Remember to buy: [item1], [item2], [item3], and X more"
- Store search radius: 15 miles (24140m)

---

## 8. PLAY CONSOLE NOTES

- App is LIVE on Google Play
- Weekly subscription product (premium_weekly_199) is active
- Annual subscription product (premium_annual_5999) is ACTIVE in Play Console ✅ (confirmed Apr 4, 2026)
- Store listing update submitted Apr 4, 2026 — awaiting review

---

## 9. BRANDING

- App icon: custom blue shopping cart logo
- Primary color: #0a7ea4 (blue)
- Premium color: gold/amber
- App name display: "Remember 2 Buy" (with space and number)
- Package/slug: remember2buy

---

## 10. KNOWN ISSUES / HISTORY

- v1.0.58: Overpass query was missing Wawa and other store types — fixed in v1.0.61
- v1.0.58: Sort by distance broken — fixed in v1.0.61
- v1.0.58: Geofence triggered immediately — fixed (now 0.3mi + 6min)
- v1.0.58: Family Premium tier in paywall — removed
- v1.0.58: Upgrade button did nothing — fixed (opens Play Store)
- v1.0.58: Wrong notification text — fixed

---

## 11. AGENT INSTRUCTIONS (PERMANENT RULES)

1. ALWAYS save key decisions, approvals, and context to this file after every session.
2. NEVER delete this file or any file in /home/ubuntu/belief-field-detector/docs/
3. After every major build, save a checkpoint with webdev_save_checkpoint.
4. Subscription pricing is LOCKED: $1.99/week and $59.99/year ONLY.
5. Never add monthly, lifetime, or family plans.
6. All 21 languages must be kept in sync when adding new strings.
7. Free tier limits: 1 store, 3 items, no coupons.
8. Always bump version number before checkpoint.
9. The app name is "Remember 2 Buy" — never "Belief Field Detector" or any other name.
10. Before every session, read this file first to restore full context.

---

## 12. FEATURE SUGGESTIONS FULL LIST (ALL 114 ITEMS)

### Section 1 — Shopping List Upgrades
1. Voice Input — add items hands-free by speaking ✅ APPROVED
2. Barcode Scanner — scan product → auto-add item ✅ APPROVED
3. Item Categories / Aisle Tags — auto-sort list by aisle ✅ APPROVED
4. Quantity + Unit Fields — "2 lbs ground beef" ✅ APPROVED
5. Recurring / Staple Items — auto-add weekly staples ✅ APPROVED
6. Smart Autocomplete — 10,000+ product database ✅ APPROVED
7. Item Notes / Details — "Get the organic kind" ✅ APPROVED
8. Photo Attach to Item — attach photo for specific brands ✅ APPROVED
9. Multiple Lists — Grocery, Hardware, Pharmacy, Costco, Target ✅ APPROVED
10. List Templates — save "Weekly Groceries," "BBQ Party" ✅ APPROVED
11. Drag-to-Reorder — long-press to drag items ✅ APPROVED
12. Swipe Actions — swipe right to check off, swipe left to delete ✅ APPROVED
13. Undo Last Action — shake or tap Undo ✅ APPROVED
14. Item History / Past Purchases — one tap to re-add ✅ APPROVED
15. Smart Suggestions Based on History ✅ APPROVED

### Section 2 — Coupon Section (Best on Market)
16. Receipt Scanner + Auto Cashback Matching (Ibotta/Fetch/Rakuten) ✅ APPROVED
17. Smart Coupon Matching to Shopping List ✅ APPROVED
18. Weekly Store Flyers (Flipp deep link) ✅ APPROVED
19. Coupon Wallet — digital loyalty cards ✅ APPROVED
20. Coupon Expiry Tracker + Alerts (3-day warning) ✅ APPROVED
21. Coupon Barcode Scanner ✅ APPROVED
22. Price Comparison Across Stores ✅ APPROVED
23. Price History Tracker (graph) ✅ APPROVED
24. "Best Time to Buy" Alerts ✅ APPROVED
25. Coupon Sharing (text/WhatsApp/email) ✅ APPROVED
26. Store-Specific Deal Alerts ✅ APPROVED
27. Cashback Earnings Tracker ✅ APPROVED
28. "Clip All" One-Tap Coupon Clipping ✅ APPROVED
29. Manufacturer Coupon Database ✅ APPROVED
30. "Stack This Deal" Advisor ✅ APPROVED
31. Coupon Organizer by Store ✅ APPROVED
32. Photo Coupon with OCR Text Extraction ✅ APPROVED
33. Geo-Triggered Coupon Alerts ✅ APPROVED
34. Coupon Swap Community Board ✅ APPROVED
35. "Never Pay Full Price" Mode ✅ APPROVED

### Section 3 — Smart Savings & Budget
36. Trip Budget Tracker ✅ APPROVED
37. Trip Log / Shopping History ✅ APPROVED
38. Monthly Spending Reports (charts) ✅ APPROVED
39. Per-Item Price Tracking (price book) ✅ APPROVED
40. Savings Goal (monthly goal + progress) ✅ APPROVED
41. Annual Subscription — $59.99/year ✅ APPROVED (LOCKED PRICE)
42. Unit Price Calculator ✅ APPROVED
43. "Cheapest Basket" Routing ✅ APPROVED

### Section 4 — Family & Sharing
44. Real-Time Shared Lists ✅ APPROVED
45. Family Profiles ✅ APPROVED
46. "I'm Shopping" Mode ✅ APPROVED
47. Assignment Tags ✅ APPROVED
48. List Sharing via Link ✅ APPROVED
49. Kids Mode ✅ APPROVED

### Section 5 — Smart Reminders
50. Enhanced Geofence (custom radius, time filters, snooze) ✅ APPROVED
51. "You're Running Low" Pantry Alerts ✅ APPROVED
52. Scheduled Shopping Reminders ✅ APPROVED
53. Weather-Aware Reminders ✅ APPROVED
54. Low Stock Auto-Restock ✅ APPROVED

### Section 6 — AI & Smart Features
55. AI List Builder from Meal Plan ✅ APPROVED
56. AI Dietary Filter ✅ APPROVED
57. AI "What Am I Forgetting?" Scan ✅ APPROVED
58. Smart Item Deduplication ✅ APPROVED
59. Natural Language Item Entry ✅ APPROVED
60. Photo-to-List Fridge/Pantry Scan ✅ APPROVED
61. Recipe Import → Shopping List ✅ APPROVED

### Section 7 — UX & Design Upgrades
62. Dark Mode ✅ APPROVED
63. Home Screen Widget (Android) ✅ APPROVED
64. Lock Screen Widget (iOS 16+) ✅ APPROVED
65. Apple Watch / Wear OS App ✅ APPROVED
66. Siri / Google Assistant Integration ✅ APPROVED
67. Haptic Feedback Enhancements ✅ APPROVED
68. Animated Check-Off Celebration (confetti) ✅ APPROVED
69. Customizable App Icon ✅ APPROVED
70. Font Size / Accessibility Settings ✅ APPROVED
71. Landscape Mode Support ✅ APPROVED

### Section 8 — Store Features Upgrades
72. Store Hours Display ✅ APPROVED
73. Store Phone + Website ✅ APPROVED
74. Store Notes ✅ APPROVED
75. Favorite Stores (star/pin) ✅ APPROVED
76. Store Categories / Tags ✅ APPROVED
77. Navigate to Store Button ✅ APPROVED
78. Store Visit Counter ✅ APPROVED
79. "On My Way" Family Notification ✅ APPROVED

### Section 9 — Gamification
80. Savings Streak Counter ✅ APPROVED
81. Achievement Badges ✅ APPROVED
82. Weekly Savings Challenge ✅ APPROVED
83. Lifetime Savings Counter ✅ APPROVED
84. Referral Program ✅ APPROVED (already partially built)
85. Shopping Efficiency Score ✅ APPROVED

### Section 10 — Export & Integration
86. Export List to PDF ✅ APPROVED
87. Export to Email / SMS ✅ APPROVED
88. Import from Notes / Clipboard ✅ APPROVED
89. Google Keep / Apple Reminders Sync ✅ APPROVED
90. Alexa / Google Home Integration ✅ APPROVED
91. CSV Export of Shopping History ✅ APPROVED

### Section 11 — Monetization
92. Annual Subscription $59.99/year ✅ APPROVED (LOCKED)
93. Monthly Subscription ❌ REJECTED — NO MONTHLY PLAN
94. Lifetime Subscription ❌ REJECTED — NO LIFETIME
95. Family Plan ❌ REJECTED — NO FAMILY PLAN
96. 7-Day Free Trial ✅ APPROVED
97. Affiliate Revenue from Coupon Links ✅ APPROVED
98. Sponsored "Featured Deals" Section ✅ APPROVED

### Section 12 — Creative / Outside the Box
99. "Surprise Me" Meal Idea Button ✅ APPROVED
100. Pantry Mode ✅ APPROVED
101. "Best Deal of the Day" Daily Push Notification ✅ APPROVED
102. Store Crowd Level Indicator ✅ APPROVED
103. Shopping Buddy Mode ✅ APPROVED
104. "Healthy Swap" Suggestions ✅ APPROVED
105. Seasonal Shopping Lists ✅ APPROVED
106. "What's in Season" Produce Guide ✅ APPROVED
107. Carbon Footprint Tracker ✅ APPROVED
108. "Shop Local" Mode ✅ APPROVED
109. Grocery Delivery Integration ✅ APPROVED
110. "Price Drop" Watchlist ✅ APPROVED
111. Shopping List as Wallpaper Generator ✅ APPROVED
112. NFC Tag Support ✅ APPROVED
113. "I Forgot Something" Mode ✅ APPROVED
114. "Shopping Buddy" Split-List Mode ✅ APPROVED (same as 103)

---

## 13. PLAY CONSOLE TRANSLATIONS STATUS

- Store listing submitted for English (Apr 4, 2026)
- TODO: Add translated store listing descriptions for all 21 languages in Play Console
- The app itself already has i18n for all 21 languages (implemented)

---

## 14. SESSION LOG

### Session 1 (Feb 2026)
- Project initialized as "belief-field-detector" (Expo template)
- Renamed to Remember 2 Buy
- Built core: shopping list, stores, coupons, geofencing, notifications, onboarding

### Session 2 (Feb-Mar 2026)
- Added i18n for 21 languages
- Added RTL support (Arabic, Hebrew)
- Fixed multiple onboarding bugs
- Added live map on dashboard
- Added distance badges
- Added recent searches

### Session 3 (Apr 3, 2026)
- Fixed v1.0.58 bugs: Overpass query, sort order, geofence timing, paywall issues
- Updated to v1.0.61/v1.0.62
- Updated Play Store listing with new "never forget" messaging
- Store listing submitted for review

### Session 4 (Apr 4, 2026)
- User approved all 110 features
- Subscription locked: $1.99/week + $59.99/year ONLY
- Starting mega v2.0.0 build
- This AGENT_MEMORY.md file created to prevent future context loss

## 15. BUILD FORMAT (CRITICAL)

- **Build format: AAB (Android App Bundle) ONLY** — never APK
- AABs are uploaded to Google Play Console via the Publish button in the Manus UI
- Never attempt to build APKs — always AAB
- Confirmed by user: Apr 4, 2026
