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
