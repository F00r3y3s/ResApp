# Privacy Contract

## Data Classes

| Class | Examples | Default Storage | Sync Rule |
| --- | --- | --- | --- |
| Local-only | unsynced drafts, guest-only records, device flags | On-device SQLite/SecureStore | Never sync |
| Syncable | pantry, grocery, saved recipes, meal plans, preferences, cook progress | On-device SQLite first | Sync only after account and explicit consent |
| Server-required | AI scans, recipe parsing, USDA lookup, entitlement checks | Backend request | Requires network and user-visible reason |
| Analytics-safe | screen events, coarse feature usage, crash metadata | Telemetry SDK | No recipe text, pantry contents, allergy details, images, or chat content |

## Secrets Rules

- Supabase service-role keys, database passwords, OpenAI keys, USDA keys, RevenueCat webhook secrets, and Sentry auth tokens are never bundled in the app.
- The mobile app may contain public Supabase anon configuration and public telemetry keys only when the data sent is privacy-safe.
- Backend functions validate auth, entitlements, input shape, allergy/diet constraints, and output schemas.

## AI Consent

Before the first AI scan, recipe parse, chat request, or generated meal plan, the app must state that Family AI Kitchen uses OpenAI through a secure backend processing partner and ask for consent to send the relevant photo/text for processing.

## Delete And Export

Authenticated settings must include account deletion. Guest settings must include local export and local data clearing before release.
