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
- [ ] Add value-prop ad splash screen as first onboarding step with the "cost of a bottled soda" message
- [ ] Add 3-step tutorial walkthrough (Add Items, Add Stores, Get Alerted) before permission steps
- [ ] Animate between slides with smooth horizontal transitions
- [ ] Show dot pagination indicators for all steps

## Typo Fixes
- [x] Fix all typos in onboarding ad screen copy (Remeber2Buy → Remember2Buy, etc.) — copy was already correct in code
