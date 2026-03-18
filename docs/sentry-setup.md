# Sentry Crash Reporting Setup

Belief Field Detector includes full Sentry crash reporting integration. Follow these steps to activate it.

## Step 1 — Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up for a free account
2. Create a new project: **Create Project → React Native**
3. Name it `belief-field-detector`

## Step 2 — Get Your DSN

1. In your Sentry project, go to **Settings → Projects → belief-field-detector → Client Keys (DSN)**
2. Copy the DSN — it looks like: `https://abc123@o123456.ingest.sentry.io/789012`

## Step 3 — Add the DSN to the App

Add this to your `.env` file (create it in the project root if it doesn't exist):

```
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn-here@sentry.io/project-id
```

The app will automatically start reporting crashes on the next launch.

## What Gets Reported

| Event | Description |
|-------|-------------|
| **Crashes** | Unhandled JavaScript exceptions and native crashes |
| **Errors** | Caught exceptions passed to `Sentry.captureException()` |
| **Breadcrumbs** | User actions leading up to a crash (scan started, belief selected, etc.) |
| **Performance** | App startup time, screen load times (20% sample rate in production) |
| **Sessions** | Active user sessions and crash-free session rate |

## What Is NOT Reported

- User belief content or journal entries (privacy-protected)
- Email addresses or personal identifiers
- Sensor raw data

## Using Sentry in Code

```typescript
import { Sentry } from "@/lib/sentry";

// Capture an error
try {
  await doSomething();
} catch (err) {
  Sentry.captureException(err, { screen: "LiveScanner", beliefId: "santa" });
}

// Add a breadcrumb (appears in issue timeline)
Sentry.addBreadcrumb({
  message: "User started scan",
  category: "scan",
  data: { beliefId: "santa", intensity: 8 },
});

// Set user context (after profile selection)
Sentry.setUser({ id: profileId, username: profileName });

// Clear user on logout/profile switch
Sentry.setUser(null);

// Tag all events with a custom value
Sentry.setTag("subscription", "premium");
```

## Source Maps (Production)

For readable stack traces in production, run the Sentry wizard after building:

```bash
npx @sentry/wizard@latest -i reactNative
```

This sets up automatic source map uploads during EAS builds.

## Free Tier Limits

Sentry's free tier includes:
- **5,000 errors/month**
- **10,000 performance transactions/month**
- **1 team member**
- **30-day data retention**

This is more than sufficient for a new app. Upgrade to a paid plan when you exceed these limits.
