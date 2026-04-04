# Remember 2 Buy — Sessions Log
> PERMANENT FILE — DO NOT DELETE. Contains full history of all conversations and decisions.
> Agent must read this file at the start of every session to restore context.

---

## SESSION 1 — February 2026 (Approximate)

### What Was Built:
- Project initialized from Expo template as "belief-field-detector"
- Renamed to "Remember 2 Buy" / "Remember2Buy"
- Package name set to: com.remember2buy.shopping
- Core screens built: Dashboard, My List, Stores, Coupons, Settings, Onboarding
- Geofencing implemented with expo-location (0.3 mile radius)
- Push notifications implemented (arrival alerts with item list)
- Subscription model: Free (1 store, 3 items) + Premium ($1.99/week)
- App icon generated (blue shopping cart)
- Published to Google Play

### Key Decisions Made:
- Free tier: 1 store max, 3 items max, no coupon access
- Premium: $1.99/week auto-renewing (SKU: premium_weekly_199)
- Geofence radius: 0.3 miles (≈480m)
- Store search radius: 15 miles
- Uses Overpass API (OpenStreetMap) for nearby store discovery — no Google API key needed

---

## SESSION 2 — February-March 2026

### What Was Built:
- i18n added: 21 languages (en, es, fr, de, pt, it, nl, ru, ja, ko, zh, ar, hi, tr, pl, sv, id, th, vi, el, he)
- RTL support added for Arabic (ar) and Hebrew (he) via I18nManager
- Notification strings localized in all 21 languages
- Live map added to Dashboard (OpenStreetMap tiles via react-native-maps)
- Distance badges on store search results
- Recent searches history (last 5 searches)
- "Report missing store" button with manual entry form
- Multiple onboarding bug fixes
- App version bumped through 1.0.39 → 1.0.54

### Key Decisions Made:
- Use OpenStreetMap tiles (no Google Maps API key required)
- Distance unit defaults to miles for US locale, km for others
- Onboarding permissions are MANDATORY (no skip buttons)

---

## SESSION 3 — April 3, 2026

### Issues Fixed (v1.0.58 → v1.0.62):
- Overpass query was missing Wawa and other store types (convenience_store, fuel, gas_station) — expanded OSM tags
- Sort by distance and A-Z not working on Nearby tab — fixed
- Map on dashboard not showing saved store pins — fixed
- Geofence triggered immediately on add (wrong) — fixed: now requires 0.3mi radius AND 6 minutes inside
- "Family Premium" tier shown in paywall — removed (no family plan)
- Upgrade button in paywall dismissed modal but did nothing — fixed: now opens Play Store subscription page
- Notification text wrong ("You have items on your list") — fixed: now "Remember to buy: item1, item2, item3"

### Store Listing Updated:
- New short description: "Never forget what you went to buy! In-store reminders & coupons to save money."
- New full description: Opens with "Never forget what you went to the store to buy — ever again..."
- Submitted for Google review on Apr 4, 2026

---

## SESSION 4 — April 4, 2026

### Conversation Summary:
User: "iot never times out." (referring to sandbox reset issue)
Agent: Logged in to Google Play Console (Grdn.qpses@gmail.com / CryptoGRDN11#)
Agent: Navigated to Remember 2 Buy store listing
Agent: Updated short description and full description with "never forget" messaging
Agent: Submitted changes for Google review
User: Suggested new description: "Never forget what you went to the store to buy. With our in-store technology that reminds you what's on your shopping list when you are actually in the store, and with our coupon feature, we'll help you save on your budget"
Agent: Updated descriptions with this messaging
Agent: Saved changes, submitted for review

User: "give me a list of every single suggestion you can think of to make the app better"
Agent: Presented 114-item feature suggestions list (saved to FEATURE_SUGGESTIONS.md)

User decisions on suggestions:
- #92 Annual subscription: YES, price is $59.99/year
- #93 Monthly subscription: NO
- No lifetime plan
- No family plan
- "Build everything else"

User: "Research it first. Understand exactly how it will work, then build it in one pass."
Agent: Started research and build process

User: "save every single item, including our conversations so a reset deletes NOTHING"
Agent: Created AGENT_MEMORY.md, FEATURE_SUGGESTIONS.md (with decisions), SESSIONS_LOG.md (this file)

### Current Status (Apr 4, 2026):
- Store listing: Submitted for review ✅
- All 110 features: Approved and tracked in todo.md ✅
- Context saved to permanent files ✅
- Build: IN PROGRESS (starting v2.0.0 mega build)

---

## HOW TO RESTORE CONTEXT AFTER A RESET

1. Read `/home/ubuntu/belief-field-detector/AGENT_MEMORY.md` — full context, decisions, architecture
2. Read `/home/ubuntu/belief-field-detector/FEATURE_SUGGESTIONS.md` — all feature decisions
3. Read `/home/ubuntu/belief-field-detector/SESSIONS_LOG.md` — this file, session history
4. Read `/home/ubuntu/belief-field-detector/todo.md` — current build status
5. Check current app version in `app.config.ts`
6. Check dev server status with webdev_check_status

### Key Facts to Remember:
- Subscription: $1.99/week + $59.99/year ONLY (no monthly, no lifetime, no family)
- SKUs: premium_weekly_199 (weekly), premium_annual_5999 (annual — needs Play Console setup)
- Free tier: 1 store, 3 items, no coupons
- 21 languages with RTL for Arabic/Hebrew
- Geofence: 0.3mi radius, 6-minute dwell time before notification
- Store search: 15 miles radius via Overpass API
- Google Play account: Grdn.qpses@gmail.com
- App package: com.remember2buy.shopping
- Play Store App ID: 4975791977629934804
- Developer ID: 5648952195722124814
