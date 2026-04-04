# Remember 2 Buy v2.0.0 — Technical Implementation Plan
# Generated: 2026-04-04 | Based on deep research of all 110 features

## RESEARCH CONCLUSIONS

### Libraries to Install
```
pnpm add react-native-gesture-handler react-native-draggable-flatlist
pnpm add react-native-gifted-charts react-native-svg
pnpm add date-fns
pnpm add parse-ingredient
pnpm add expo-print expo-sharing
pnpm add react-native-barcode-svg
```

**IMPORTANT NOTES from research:**
- `react-native-draggable-flatlist` works with Expo SDK 54 + Reanimated 4 (already installed)
- `expo-camera` CameraView already supports barcode scanning — NO new package needed
- Voice input: use `expo-audio` (already installed) + record audio + send to free Puter.js API
- Charts: `react-native-gifted-charts` is the best for Expo (bar, line, pie, donut)
- Swipe gestures: use `react-native-gesture-handler` Swipeable (already installed)
- NFC: NOT supported in Expo Go — skip for now, add to future native build features
- Delivery integration: Deep link to Instacart/DoorDash web URLs — no SDK needed
- Price comparison: Deep link to Flipp/Ibotta/Google Shopping — no API needed
- Receipt OCR: Use server-side LLM vision (already available in backend)
- Export to PDF: `expo-print` + `expo-sharing`
- Loyalty card barcodes: `react-native-barcode-svg` renders CODE128/EAN/QR

### Architecture Decisions
1. **All data stays local** (AsyncStorage) — no backend needed for new features
2. **Voice input**: Record with expo-audio → send to server LLM for transcription (free, already available)
3. **Barcode lookup**: expo-camera CameraView → Open Food Facts API (free, no key)
4. **Price comparison**: Deep links to Ibotta, Flipp, Google Shopping, Kroger (no API needed)
5. **Charts**: react-native-gifted-charts for spending/savings visualization
6. **Drag reorder**: react-native-draggable-flatlist
7. **Swipe actions**: react-native-gesture-handler Swipeable (already installed)
8. **Coupon expiry**: Local notifications via expo-notifications (already installed)
9. **Meal planning**: TheMealDB free API (no key) + parse-ingredient for list generation
10. **PDF export**: expo-print + expo-sharing

---

## FEATURE BUILD PLAN

### PHASE 1: Storage Layer Expansion
New data types to add to storage.ts:
- `ShoppingItem` extended: add `category`, `quantity`, `unit`, `note`, `photoUri`, `barcode`, `price`, `isRecurring`, `addedFrom`
- `ShoppingList` (named lists): `id`, `name`, `icon`, `color`, `items`, `createdAt`
- `ListTemplate`: `id`, `name`, `items[]`
- `TripLog`: `id`, `date`, `storeName`, `storeId`, `itemsBought`, `totalSpent`, `savedAmount`
- `CouponEnhanced` extended: add `expiryDate`, `discount`, `discountType`, `storeName`, `category`, `barcode`, `source`, `notificationId`, `isUsed`
- `LoyaltyCard`: `id`, `storeName`, `cardNumber`, `barcode`, `barcodeType`, `color`, `logoEmoji`
- `BudgetGoal`: `id`, `weeklyBudget`, `monthlyBudget`
- `PurchaseHistory`: `id`, `itemText`, `price`, `date`, `storeName`, `category`
- `Achievement`: `id`, `title`, `desc`, `emoji`, `unlockedAt`, `progress`, `target`
- `SeasonalItem`: produce calendar data (static)
- `MealPlan`: `id`, `date`, `mealType`, `recipeName`, `ingredients[]`
- `SavingsGoal`: `id`, `name`, `targetAmount`, `currentAmount`, `emoji`

### PHASE 2: Shopping List Upgrades
**list.tsx** — major rebuild:
- Voice input button (mic icon) → record → transcribe → add item
- Barcode scanner button → open camera → scan → lookup Open Food Facts → add item name
- Category tags (Produce, Dairy, Meat, Bakery, Frozen, Beverages, Snacks, Household, Personal Care, Other)
- Quantity + unit fields (tap item to expand: qty, unit, note, price)
- Swipe right = check off (green), swipe left = delete (red)
- Drag handle for reordering
- Item history (recently added items, one-tap re-add)
- List templates (save current list, load template)
- Multiple named lists (tabs or list picker)
- Smart autocomplete from history
- "Undo" last delete (snackbar with undo button)
- Photo attach to item (premium)
- Item notes field
- Recurring items toggle

### PHASE 3: World-Class Coupon Section
**coupons.tsx** — complete rebuild into tabbed interface:

**Tab 1: My Coupons**
- Photo coupons (existing) + expiry date field
- Expiry badges (green/orange/red based on days remaining)
- Sort by: Expiry (soonest), Store, Added
- Filter by: Store, Category, Active/Expired
- "Used" toggle to mark coupon as redeemed
- Expiry notification scheduling (3 days before)
- Coupon categories: Grocery, Restaurant, Retail, Online, Other

**Tab 2: Loyalty Cards**
- Digital wallet for loyalty cards
- Add card: store name, card number, barcode type (CODE128/EAN13/QR)
- Full-screen barcode display (brightness boost)
- Popular stores with logos: Kroger, Safeway, CVS, Walgreens, Target, Costco, Walmart, Publix, HEB, Albertsons, Whole Foods, Aldi, Trader Joe's
- Card color customization

**Tab 3: Smart Savings**
- "Find deals for my list" button → shows each list item with deal links
- Per-item buttons: Ibotta, Flipp, Google Shopping, Kroger Weekly Ad
- Deep links: `ibotta://` → fallback `https://ibotta.com/search?q={item}`
- Deep links: `flipp://` → fallback `https://flipp.com/flyers?q={item}`  
- "Best Deal of the Day" section (rotating tips)
- Cashback tracker: manually log cashback earned, running total
- Weekly savings summary

**Tab 4: Cashback Tracker**
- Log cashback: amount, source (Ibotta/Fetch/Flipp/Other), date, item
- Running total saved this week/month/year
- Bar chart of savings by month (react-native-gifted-charts)
- "Savings Milestone" badges

### PHASE 4: Budget & Trip Tracker
**New screen: budget.tsx** (or integrated into dashboard):
- Trip logging: when you check off items, prompt "Log this trip?" → enter total spent
- Trip history: list of past trips with store, date, items, amount
- Budget goals: set weekly/monthly budget
- Spending vs budget progress bar
- Line chart: spending over last 8 weeks
- Category breakdown pie chart
- "You're on track!" / "Over budget" status
- Price book: track price of recurring items over time

### PHASE 5: AI & Meal Planning
**New screen: meals.tsx** (premium):
- Search TheMealDB: "What can I make with chicken?"
- Browse by category: Beef, Chicken, Pasta, Seafood, Vegetarian, etc.
- Recipe detail: ingredients list → "Add all to shopping list" button
- Meal planner: assign meals to days of week
- Auto-generate shopping list from meal plan
- Dietary filters: Vegetarian, Vegan, Gluten-Free, Dairy-Free

### PHASE 6: Gamification
- Achievement badges (15 total): First item, First store, 7-day streak, 100 items bought, $100 saved, etc.
- Savings counter on dashboard: "You've saved $47.23 this year!"
- Shopping streak: "3 trips this week 🔥"
- Confetti animation on milestone (lottie or simple animated emoji)
- Progress rings on dashboard

### PHASE 7: Seasonal & Creative Features
- Seasonal produce guide: built-in static data, show what's in season this month
- "Healthy swap" suggestions when adding items (soda → sparkling water, etc.)
- Pre-built seasonal templates: Thanksgiving, Christmas, BBQ, Back to School
- "What's on sale" section: links to weekly ad aggregators
- Shopping buddy mode: split list view

### PHASE 8: Export & Share
- Export list to PDF (expo-print)
- Share list as text (already exists, enhance)
- Share list as image (screenshot)
- Email list (expo-mail-composer)

### PHASE 9: i18n Updates
- Add all new string keys to en.json
- Use parallel translation for all 20 other languages

---

## PACKAGES TO INSTALL
```bash
pnpm add react-native-draggable-flatlist
pnpm add react-native-gifted-charts
pnpm add date-fns
pnpm add react-native-barcode-svg
pnpm add expo-print
pnpm add expo-sharing
```

## SCREENS TO CREATE/MODIFY
- `app/(tabs)/list.tsx` — major rebuild
- `app/(tabs)/coupons.tsx` — complete rebuild (tabbed)
- `app/(tabs)/index.tsx` — add savings counter, achievements, streak
- `app/(tabs)/settings.tsx` — add budget settings, notification prefs
- `app/(tabs)/meals.tsx` — NEW (meal planning, premium)
- `app/budget.tsx` — NEW (trip log, spending charts)
- `app/achievements.tsx` — NEW (badges gallery)
- `app/seasonal.tsx` — NEW (produce calendar)
- `components/voice-input.tsx` — NEW
- `components/barcode-scanner.tsx` — NEW  
- `components/loyalty-card-display.tsx` — NEW
- `components/trip-logger.tsx` — NEW
- `components/savings-chart.tsx` — NEW
- `lib/meal-api.ts` — NEW (TheMealDB integration)
- `lib/product-lookup.ts` — NEW (Open Food Facts)
- `lib/storage.ts` — MAJOR EXPANSION
