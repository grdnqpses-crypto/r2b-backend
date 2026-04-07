# Remember2Buy — TODO

## Core Foundation
- [x] Set up project with Expo SDK 54, TypeScript, NativeWind
- [x] Configure app.config.ts with location, camera, notifications, image-picker plugins
- [x] Set up brand colors (blue primary, premium gold) in theme.config.js
- [x] Add all required icon mappings to icon-symbol.tsx
- [x] Set up tab navigation (Dashboard, My List, Stores, Coupons, Settings)

## Data Layer
- [x] Build lib/storage.ts — shopping items, saved stores, coupons, tier, referral, onboarding
- [x] Build lib/store-data.ts — 200+ US grocery/pharmacy/retail chains database
- [x] Build lib/tasks.ts — TaskManager geofence background task definition
- [x] Build lib/notifications.ts — notification setup, test notification, sendTestNotification
- [x] Build lib/geofence.ts — geocodeAddress, startGeofencing, stopGeofencing, checkLocationPermissions, requestLocationPermissions, isGeofencingActive

## Screens
- [x] Dashboard screen (index.tsx) — summary cards, quick-add, nearby stores status
- [x] My List screen (list.tsx) — add/check/delete items, clear checked, item count
- [x] Stores screen (stores.tsx) — add custom store by address, chain picker modal, delete stores
- [x] Coupons screen (coupons.tsx) — camera scan, photo import, coupon gallery, premium gate
- [x] Settings screen (settings.tsx) — permissions, geofencing toggle, subscription, about
- [x] Onboarding screen (onboarding.tsx) — 4 steps: welcome, location, notifications, referral

## App Routing
- [x] Root _layout.tsx with OnboardingGuard — redirects to /onboarding on first launch
- [x] Stack.Screen for onboarding registered in root layout

## Branding
- [x] Generate app logo and set in app.config.ts
- [x] Update app name to "Remember2Buy"

## TypeScript
- [x] Fix all TypeScript errors (0 errors on tsc --noEmit)

## Pending / Future
- [ ] Generate Play Store screenshots and feature graphic
- [ ] Create and host privacy policy page
- [ ] Set up Play Console listing
- [ ] Add RevenueCat for production in-app purchases
- [ ] Add OCR for shopping list photo import (server-side LLM)

## Store Discovery Redesign
- [x] Research best free/no-key API for nearby store lookup (Overpass/OSM vs Google Places)
- [x] Implement getNearbyStores(lat, lng) function using chosen API
- [x] Rebuild Stores screen: get user location → show nearby stores list with real addresses → tap to add
- [x] Remove manual address entry form entirely
- [x] Show distance to each nearby store (e.g. "0.2 mi away")
- [x] Add pull-to-refresh to reload nearby stores
- [x] Handle location permission denied gracefully in the new flow

## Permission & Geofencing Fixes
- [x] Request notification permission automatically on first app open (not in Settings)
- [x] Request foreground location permission on first app open
- [x] Request background location permission on Android (separate step after foreground)
- [x] Auto-start geofencing immediately after permissions are granted
- [x] Show geofencing as active on Dashboard when stores exist and permissions are granted
- [x] Fix onboarding permission steps to actually trigger system dialogs
- [x] Ensure geofencing restarts automatically when app is reopened with existing stores

## Address Display Fix
- [x] Fix nearby stores showing no addresses — diagnose Overpass API response parsing
- [x] Ensure address field is correctly extracted and displayed in the stores list

## Real-Time Distance Display & Live Map
- [x] Add distanceUnit preference (miles/km) to storage with locale-based default
- [x] Add real-time location tracking on Dashboard to compute live distance to each store
- [x] Show distance to each store in the Dashboard store list (e.g. "0.4 mi away")
- [x] Add miles/km toggle in Settings screen
- [x] Fix stale Expo Router type cache so TypeScript recognizes list/stores/coupons routes
- [x] Add live map with store markers and geofence circles to Dashboard

## Onboarding Ad + Tutorial
- [x] Add value-prop ad splash screen as first onboarding step with the "cost of a bottled soda" message
- [x] Add 3-step tutorial walkthrough (Add Items, Add Stores, Get Alerted) before permission steps
- [x] Animate between slides with smooth horizontal transitions
- [x] Show dot pagination indicators for all steps

## Typo Fixes
- [x] Fix all typos in onboarding ad screen copy (Remeber2Buy → Remember2Buy, etc.) — copy was already correct in code

## Onboarding Critical Bugs
- [x] Fix unicode escape sequences rendering as raw text (e.g. \uD83D\uDCA1 instead of 💡)
- [x] Fix app closing after tutorial steps instead of proceeding to permission steps

## Critical Bug Fixes (Round 2)
- [x] Fix raw unicode escape sequences in onboarding.tsx (use real UTF-8 emoji via file tool)
- [x] Fix app closing after tutorial — remove Skip setup from tutorial steps
- [x] Add error boundary component to catch and display crashes

## Three New Features
- [x] Android inline text input for referral code (replace Alert.alert with TextInput in onboarding)
- [x] Arrival notification shows top 3 unchecked shopping list items in notification body
- [x] List tab icon badge count showing number of unchecked items

## Sort & Share Features
- [x] Sort by distance toggle on Stores tab (nearest stores first)
- [x] Share sheet button on My List screen to send shopping list via text/email

## CRITICAL: Onboarding Close Bug
- [x] App closes immediately after tutorial steps — fixed: animation callback was interrupted by system dialogs, leaving opacity at 0. Now sets step immediately and fades in.

## Dashboard Crash + Screenshots Fix (Round 3)
- [x] Root cause: react-native-maps MapView on Dashboard crashes Android with Expo SDK 54 + New Architecture (confirmed bug #5699, #5759)
- [x] Remove MapView from Dashboard entirely — replaced with live store list with real-time distance
- [x] Fix onboarding navigation: replaced router.replace() with Stack.Protected pattern (confirmed router.replace crash on Android)
- [x] Generate app screenshots (shopping list + notification alert mockups) and add to onboarding ad step
- [x] Make onboarding ad step scrollable so screenshots + feature rows fit on small screens

## Bug Fix + Feature (Round 4)
- [ ] Fix duplicate "Open Settings" button on notifications permission screen — Alert.alert shows "Open Settings" while bottom button also shows "Open Settings"
- [ ] Add developer mode easter egg: tap "Remember2Buy" title 11 times on dashboard to unlock dev panel

## Notification Permission Blocked Fix (Round 5)
- [x] Fix "Notifications Blocked" state — when user denies notifications, the app must re-check permission status when returning from device Settings
- [x] Fix Settings screen to show notification permission status and provide a direct "Enable Notifications" button that opens device Settings
- [x] Ensure notification status is re-checked on app foreground resume (AppState listener) so the UI updates automatically after user enables in Settings
- [x] Fix duplicate "Open Settings" button on onboarding notification step (already in progress)
- [x] Add developer mode easter egg (11 taps on title) — already in progress

## Mandatory Permission Flow (Round 6)
- [x] Remove all "Skip setup" buttons from permission steps — permissions are mandatory
- [x] Remove "Open Settings" redirect pattern — app must request permissions inline
- [x] Notifications: request on the notification step, if denied show a "Why we need this" explanation and a "Try Again" button that re-requests
- [x] Foreground location: request inline, if denied show explanation + "Try Again"
- [x] Background "Always" location: request inline after foreground granted, if denied show explanation + "Try Again"
- [x] If a permission is permanently denied (canAskAgain=false on Android), only then show "Open Settings" as the only option with clear explanation
- [x] Remove skip buttons from Settings screen permission rows — they should always show the correct action

## Bundle ID / Package Name Fix (Critical)
- [x] Update app.config.ts: set androidPackage to com.remember2buy.shopping
- [x] Update app.config.ts: set iosBundleId to com.remember2buy.shopping
- [x] Set version to 2.3.0 and versionCode to 23 in app.config.ts

## Branding Cleanup (Critical)
- [x] Remove all "belief-field-detector" / "Belief" references from app.config.ts, package.json, and any other project files — replace with Remember2Buy everywhere

## Internationalization & Worldwide Release
- [x] Audit all user-facing strings in the app
- [x] Create i18n translation files for 21 world languages using i18next (en, es, fr, de, pt, it, nl, ru, ja, ko, zh, ar, hi, tr, pl, sv, id, th, vi, el, he)
- [x] Implement i18next in the app and wire up all translated strings (index, list, stores, coupons, settings, onboarding)
- [x] Set up Play Store listing with translated titles and descriptions for 28 languages
- [x] Save checkpoint with i18n changes and rebuild AAB

## RTL + Notification i18n (Round 7)
- [x] Add RTL layout support for Arabic and Hebrew locales using I18nManager
- [x] Localize push notification strings in lib/notifications.ts and lib/tasks.ts
- [x] Save checkpoint ready for AAB rebuild (version 3.0.0, versionCode 30)

## Notification Polish (Round 8)
- [x] Add localized "and X more" overflow string to all 21 locale files and wire into tasks.ts
- [x] Localize Android notification channel name via Expo notifications plugin string resources (handled at runtime via i18n.t() in notifications.ts)

## Branding Cleanup
- [x] Remove all "belief" / "believe" references from every file (SKU, storage keys, comments, strings, AsyncStorage keys, notification strings)
- [x] Fix SKU mismatch: update SUBSCRIPTION_SKU to match Play Console product ID premium_weekly_199

## Premium Upgrade Flow Fixes (Release 1.0.39)
- [x] Bug fix: Show PremiumPaywall modal when user hits store limit (instead of plain Alert with no upgrade path)
- [x] Bug fix: Wire Settings "Upgrade to Premium" button to real Google Play Billing purchase flow via useSubscription hook (instead of faking premium locally)

## Release 1.0.41 — Restore + Dev Unlock
- [x] Verify premium_weekly_199 subscription product exists and is active in Play Console
- [x] Wire Restore Purchases button in Settings to real subscription.restore() flow
- [x] Add 11-tap secret developer unlock on Remember2Buy dashboard title (sets tier to premium)

## Release 1.0.42 — Dashboard Map Upgrade
- [x] Add real-time live map to dashboard showing user location pin and all store pins with distance labels
- [x] Expand geofence/store detection radius from 0.3 miles to 15 miles
- [x] Optimize dashboard and map load speed (parallel data fetching, lazy map init, cached location)
- [x] Bump version to 1.0.42 / versionCode 42

## Release 1.0.43 — Loading State
- [x] Add animated loading indicator with friendly patience message while nearby stores are being fetched
- [x] Bump version to 1.0.43 / versionCode 43

## Release 1.0.44 — Cleanup
- [x] Delete unused legacy hooks use-belief-story.ts and use-belief-streak.ts to clear 14 TypeScript warnings
- [x] Bump version to 1.0.44 / versionCode 44

## Release 1.0.45 — Build Fix
- [x] Fix react-native-gesture-handler Gradle build failure (Cannot query the value of this provider)
- [x] Bump version to 1.0.45 / versionCode 45

## Release 1.0.46 — Build Fix (Kotlin version)
- [x] Fix Kotlin version from 1.9.25 to 2.1.20 (KSP compatibility)
- [x] Bump version to 1.0.46 / versionCode 46

## Search Improvements (Round 9)
- [x] Distance badge on search results (use user location to show how far each result is)
- [x] Recent searches history saved in AsyncStorage (last 5 searches, quick re-run)
- [x] Report missing store button with manual name/address entry form

## Release 1.0.54 — OpenStreetMap Map on Dashboard
- [x] Add react-native-maps with OpenStreetMap tile provider to Dashboard home screen (no Google API key)
- [x] Show user location pin and saved store pins on the map
- [x] Bump version to 1.0.54 / versionCode 10054

## Issues reported Apr 3 2026 (post v1.0.58)
- [x] Overpass query missing store types: Wawa (convenience_store, fuel, gas_station) and other chains not returned — expand OSM tags
- [x] Sort by distance and A-Z not working on Nearby tab
- [x] Map on dashboard does not show saved store pins
- [x] Geofence triggers immediately on add (wrong): must trigger at 0.3 miles (≈480m) radius AND only AFTER user has been inside for 6 minutes
- [x] "Family Premium" tier shown in paywall but not in subscriptions — remove it
- [x] Upgrade button in paywall dismisses modal but does nothing — must open Play Store subscription page
- [x] Notification text wrong: says "You have items on your list" — change to "Remember to buy: [item1], [item2], [item3]" format for both immediate and 6-min follow-up

## Issues fixed in v1.0.61 (Apr 3 2026)
- [x] Store lookup radius: changed from 5 miles (8047m) to 15 miles (24140m) in nearby-stores.ts
- [x] Two-stage geofence notifications: (1) immediate approach alert at 0.3mi boundary, (2) 6-minute in-store reminder
- [x] Sort order confirmed: closest-to-furthest (default) and A-Z both working
- [x] Manual store entry confirmed: Search tab + "Add manually" modal with name+address geocoding

## v2.0.0 — Mega Feature Build (110 Approved Features)

### SECTION 1 — Shopping List Upgrades
- [x] Voice input — mic button to add items hands-free
- [x] Barcode scanner — camera scan to add item by barcode
- [x] Item categories / aisle tags — auto-sort by category
- [ ] Quantity + unit fields
- [x] Recurring / staple items — auto-add weekly staples
- [x] Smart autocomplete — suggest from product database + personal history
- [x] Item notes / details — per-item notes field
- [x] Photo attach to item — attach photo to any list item
- [x] Multiple lists — separate lists (Grocery, Hardware, Pharmacy, etc.)
- [x] List templates — save/load list templates
- [ ] Drag-to-reorder items — long-press drag reorder
- [x] Swipe actions — swipe right to check, swipe left to delete
- [x] Undo last action — shake/button to undo
- [x] Item history / past purchases — re-add from history
- [x] Smart suggestions based on history — proactive item suggestions

### SECTION 2 — Coupon Section (Best on Market)
- [x] Receipt scanner + auto cashback matching (Ibotta/Fetch/Rakuten deep links)
- [ ] Smart coupon matching to shopping list (pre-shop savings estimate)
- [ ] Weekly store flyers (Flipp deep link integration)
- [ ] Coupon wallet — digital loyalty cards (barcode storage)
- [x] Coupon expiry tracker + alerts (3-day warning)
- [x] Coupon barcode scanner (scan paper coupons)
- [ ] Price comparison across stores
- [ ] Price history tracker (graph over time)
- [ ] Best time to buy alerts
- [ ] Coupon sharing (share via text/WhatsApp/email)
- [ ] Store-specific deal alerts (follow stores)
- [ ] Cashback earnings tracker (running total)
- [ ] Clip All one-tap coupon clipping
- [ ] Manufacturer coupon database
- [ ] Stack This Deal advisor
- [ ] Coupon organizer by store
- [ ] Photo coupon with OCR text extraction
- [ ] Geo-triggered coupon alerts
- [ ] Coupon swap community board
- [x] Never Pay Full Price mode

### SECTION 3 — Smart Savings and Budget
- [x] Trip budget tracker
- [ ] Trip log / shopping history
- [x] Monthly spending reports (charts)
- [x] Per-item price tracking (personal price book)
- [ ] Savings goal (monthly goal with progress)
- [ ] Annual subscription 59.99/year
- [x] Unit price calculator
- [ ] Cheapest basket routing

### SECTION 4 — Family and Sharing
- [ ] Real-time shared lists
- [ ] Family profiles
- [ ] Im Shopping mode
- [ ] Assignment tags
- [ ] List sharing via link
- [ ] Kids mode

### SECTION 5 — Smart Reminders
- [ ] Enhanced geofence (custom radius, time filters, snooze)
- [ ] Pantry low stock alerts
- [ ] Scheduled shopping reminders
- [ ] Weather-aware reminders
- [ ] Low stock auto-restock

### SECTION 6 — AI and Smart Features
- [ ] AI list builder from meal plan
- [ ] AI dietary filter
- [ ] AI What am I forgetting scan
- [ ] Smart item deduplication
- [ ] Natural language item entry
- [ ] Photo-to-list fridge/pantry scan
- [ ] Recipe import to shopping list (paste URL)

### SECTION 7 — UX and Design Upgrades
- [ ] Dark mode
- [ ] Home screen widget (Android)
- [ ] Lock screen widget (iOS 16+)
- [ ] Apple Watch / Wear OS app
- [ ] Siri / Google Assistant integration
- [ ] Haptic feedback enhancements
- [ ] Animated check-off celebration (confetti)
- [ ] Customizable app icon
- [ ] Font size / accessibility settings
- [ ] Landscape mode support

### SECTION 8 — Store Features Upgrades
- [ ] Store hours display
- [ ] Store phone + website
- [x] Store notes
- [ ] Favorite stores (star/pin)
- [ ] Store categories / tags
- [ ] Navigate to store button
- [x] Store visit counter
- [x] On My Way family notification

### SECTION 9 — Gamification
- [ ] Savings streak counter
- [x] Achievement badges
- [ ] Weekly savings challenge
- [ ] Lifetime savings counter
- [ ] Referral program
- [ ] Shopping efficiency score

### SECTION 10 — Export and Integration
- [ ] Export list to PDF
- [ ] Export to email / SMS
- [ ] Import from notes / clipboard
- [ ] Google Keep / Apple Reminders sync
- [ ] Alexa / Google Home integration
- [ ] CSV export of shopping history

### SECTION 11 — Monetization
- [ ] Annual subscription 59.99/year in paywall
- [ ] 7-day free trial for new users
- [ ] Affiliate revenue from coupon links
- [ ] Sponsored Featured Deals section

### SECTION 12 — Creative Outside the Box
- [ ] Surprise Me meal idea button
- [x] Pantry mode
- [ ] Best Deal of the Day daily push notification
- [ ] Store crowd level indicator
- [x] Shopping buddy mode
- [x] Healthy Swap suggestions
- [ ] Seasonal shopping lists
- [x] Whats in Season produce guide
- [x] Carbon footprint tracker
- [ ] Shop Local mode
- [ ] Grocery delivery integration
- [x] Price Drop watchlist
- [ ] Shopping list as wallpaper generator
- [ ] NFC tag support
- [x] I Forgot Something mode

## v2.1.0 — UX Reorganization & Remaining Features

- [ ] Create dedicated Tools screen with all features organized by category (Savings, Budget, AI & Smart, Store Tools, Export)
- [ ] Simplify Dashboard — remove 14-card Quick Access grid, add single "Tools & Features" button
- [ ] Add Price Drop Watchlist as 5th tab in Coupons screen
- [ ] Add contextual prompts (log trip after last item checked off, coupon alert when adding item)
- [ ] Build drag-to-reorder items in list
- [ ] Build natural language item entry (parse "2 lbs organic chicken" into fields)
- [ ] Build smart item deduplication
- [ ] Build clipboard import (paste list from Notes app)
- [ ] Build coupon barcode scanner (scan paper coupons)
- [ ] Build geo-triggered coupon alerts
- [ ] Build clip-all coupons button
- [ ] Build coupon organizer by store
- [ ] Build manufacturer coupon database
- [ ] Build coupon sharing (share via text/email)
- [ ] Build AI dietary filter
- [ ] Build photo-to-list (fridge scan via AI vision)
- [ ] Build recipe URL import → shopping list
- [ ] Build AI "What Am I Forgetting?" scan
- [ ] Build confetti animation on list completion
- [ ] Build font size / accessibility settings
- [ ] Build haptic enhancements (celebratory pattern on list complete)
- [ ] Build dark mode toggle in settings
- [ ] Build weekly savings challenge
- [ ] Build lifetime savings counter (prominent display)
- [ ] Build shopping efficiency score
- [ ] Build referral program
- [ ] Build I'm Shopping mode (notify family when entering store)
- [ ] Build assignment tags (assign items to people)
- [ ] Build share list via link (browser viewable)
- [ ] Build Kids mode
- [ ] Build Surprise Me meal idea
- [ ] Build Best Deal of Day push notification
- [ ] Build delivery integration (Instacart/DoorDash/Shipt)
- [ ] Build wallpaper generator (list as phone wallpaper)
- [ ] Build store crowd level indicator
- [ ] Build email/SMS list export
- [ ] Build CSV shopping history export
- [ ] Build store hours display
- [ ] Build store phone/website links
- [ ] Build store categories/tags
- [ ] Build cheapest basket routing
- [ ] Build weather-aware reminders
- [ ] Build price history tracker
- [ ] Build best time to buy alerts
- [ ] Build coupon swap community
- [ ] Build NFC tag support

## v2.2.0 — Batch Feature Implementation (Apr 2026)
- [x] Simplify Dashboard — remove 14-card Quick Access grid, add single "Tools & Features" button
- [x] Create dedicated Tools screen with all features organized by category
- [x] Build dark mode toggle in settings (Light / Dark / System)
- [x] Build confetti animation on list completion with haptic celebration
- [x] Build contextual "Log this trip?" prompt after last item checked off
- [x] Build natural language item entry (parse "2 lbs chicken breast" into qty/unit/name/category)
- [x] Build NL parse preview hint below input field
- [x] Build smart suggestions from purchase history on Dashboard ("Frequently Bought" chips)
- [x] Build weekly savings challenge in Achievements screen (auto-rotating weekly goal)
- [x] Build lifetime savings counter on Dashboard (week/month/all-time)
- [x] Build clipboard import (detect pasted list, offer to import all items)
- [x] Build email list export (via mail composer)
- [x] Build SMS list export (via SMS)
- [x] Add store phone/website fields to store detail modal
- [x] Fix useEffect/useRouter missing imports in list.tsx

## v2.3.0 — AI Suggestions & Savings Streak (Apr 2026)
- [ ] Build AI "What Am I Forgetting?" screen using server LLM + purchase history
- [ ] Build Savings Streak counter on Dashboard (fire badge for consecutive weeks meeting goal)

## v1.0.64 — AI Suggestions & Savings Streak (Apr 2026)
- [x] Build AI "What Am I Forgetting?" screen using server LLM + purchase history
- [x] Build Savings Streak counter on Dashboard (fire badge for consecutive weeks meeting goal)

## v1.0.65 — Voice Input, Streak Notification & Play Store Fix (Apr 2026)
- [x] Voice input mic button on list screen → Whisper transcription → parse item
- [x] Sunday streak reminder push notification (weekly, expo-notifications)
- [x] Audit and fix all critical Play Store bugs (crashes, blank screens, broken flows)

## v1.0.67 — Geofencing Fix (Apr 2026)
- [x] Fix geofencing: dual-radius approach (480m outer = approaching, 50m inner = arrived)
- [x] Approaching notification at 0.3 miles: "You're approaching [Store] — your list is ready!"
- [x] Arrived notification: 6-minute delay after entering store radius: "You're at [Store] — don't forget your list!"
- [x] Remove false "You're Here" trigger when user is miles away

## v1.0.68 — IAP Subscription Fix (Apr 2026)
- [x] Fix "Connecting to store" hang in subscription/IAP flow
- [x] Ensure correct product IDs match Play Store subscription setup
- [x] Verify react-native-iap initialization and connection lifecycle
- [x] Add proper error handling and retry logic for IAP connection failures

## Build 71 — Android Persistence Fixes (Apr 7 2026)
- [x] Add FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, ACCESS_BACKGROUND_LOCATION, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS to android.permissions in app.config.ts
- [x] Add expo-location plugin with isAndroidForegroundServiceEnabled: true and isAndroidBackgroundLocationEnabled: true to app.config.ts
- [x] Add expo-task-manager plugin declaration to app.config.ts
- [x] Create components/LocationDisclosureModal.tsx — Google Play prominent disclosure modal
- [x] Create hooks/use-permissions.ts — centralized two-step background location + battery optimization exemption hook
- [x] Wire usePermissions + LocationDisclosureModal into app/(tabs)/settings.tsx
- [x] Add Battery Optimization row to Settings Permissions card (Android only, shows Fix/Exempt status)
- [x] Replace old single-step requestLocationPermissions with two-step foreground→disclosure→background flow

## Master Directive — R2B Persistence, Compliance & Subscription Overhaul (Apr 7 2026)

**Phase 1 — Dependencies & Configuration**
- [x] Install expo-intent-launcher and expo-device
- [x] Add ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, FOREGROUND_SERVICE_SPECIAL_USE, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, POST_NOTIFICATIONS, WAKE_LOCK to android.permissions in app.config.ts
- [x] Configure expo-location plugin with isAndroidBackgroundLocationEnabled: true and isAndroidForegroundServiceEnabled: true

**Phase 2 — UI Components (Google Play Compliance)**
- [x] Create components/LocationDisclosureModal.tsx with exact disclosure text and Not Now / Got It buttons
- [x] Create components/BatteryDisclosureModal.tsx with exact disclosure text and Not Now / Got It buttons

**Phase 3 — Permissions Engine**
- [x] Rewrite hooks/use-permissions.ts with chronological flow: Notifications → Foreground → Background (two-step) → Battery Optimization
- [x] Use expo-intent-launcher for android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS with package:com.remember2buy.shopping
- [x] Persist battery exemption state via AsyncStorage key r2b_battery_exemption_granted

**Phase 4 — Background Task Registration**
- [x] Verified R2B_GEOFENCE_TASK is defined in lib/tasks.ts and imported at top of app/_layout.tsx
- [x] Verified Location.startGeofencingAsync uses GEOFENCE_TASK_NAME with dual-ring regions
- [x] Added Phase 4 comment block to geofence.ts documenting deferred-update strategy via ring radii and 6-min trigger

**Phase 5 — Subscription System Audit & Hardening**
- [x] Identified subscription library: react-native-iap v14 (Nitro Modules)
- [x] Created lib/subscription-context.tsx — SubscriptionProvider + useSubscriptionContext() for single global IAP connection
- [x] Created normalizeIAPError() utility covering USER_CANCELED, network, pending, already-owned, unavailable
- [x] Wired SubscriptionProvider into app/_layout.tsx (wraps RootNavigator)
- [x] Switched app/(tabs)/settings.tsx from useSubscription() to useSubscriptionContext()
- [x] Switched app/(tabs)/stores.tsx from useSubscription() to useSubscriptionContext()
- [x] Verified Restore Purchases button exists in paywall.tsx and calls subscription.restore()
- [x] Verified purchaseErrorListener silently dismisses user-cancelled errors (line 251 use-subscription.ts)

**Phase 6 — Verification**
- [x] TypeScript check: 0 errors (exit code 0)

## Final UI Wiring — Build 71 Pre-Compile (Apr 7 2026)

- [x] Wire normalizeIAPError() into paywall.tsx handlePurchase and handleRestore catch blocks
- [x] Replace raw subscription.error displays in paywall.tsx with normalizeIAPError(err).message
- [x] Add startup permissions banner to Dashboard/Home screen with useFocusEffect
- [x] Banner checks background location + battery optimization, is dismissible, high-visibility
