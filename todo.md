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
