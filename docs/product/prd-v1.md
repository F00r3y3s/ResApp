# Family AI Kitchen V1 PRD

## Goal

Build a cross-platform Expo app for family cooking that works locally first and unlocks cloud sync, household sharing, premium AI, scans, and purchases only when the user opts in.

## Locked Architecture

- App: Expo SDK 56, Expo Router, TypeScript.
- Local-first storage: PowerSync with on-device SQLite as the app read/write model.
- Cloud: Supabase Auth, Postgres, RLS, Realtime, Storage, and Edge Functions.
- AI: OpenAI behind a backend gateway only. The app never stores or calls with model keys.
- Purchases: RevenueCat for app purchase state, with server-side entitlement enforcement.
- QA: Jest/RNTL, Maestro flows, simulator/device smoke tests, security tests, RLS negative tests.

## Product Boundaries

- Guest-first: onboarding, pantry, groceries, recipes, meal plan drafts, and cook progress must work offline.
- Account-required: sync, household sharing, social, premium AI, image upload, and purchases.
- Data sources: owned/curated recipes and USDA FoodData Central through backend lookup.
- Excluded from core: Open Food Facts unless ODbL obligations are explicitly accepted later.

## V1 Feature Phases

1. Foundation: Expo shell, route groups, design tokens, test tooling, local-first schema, privacy contract.
2. Onboarding: language, region, household, allergies, diet, cuisines, goals, first pantry-or-recipe action.
3. Recipes: seed catalog, recipe detail, save, manual entry, import review.
4. Pantry: manual CRUD, expiry, units, aliases, pantry matching.
5. Grocery: generated lists, pantry subtraction, shared list sync, offline reconcile.
6. Cook mode: large steps, progress, keep-awake, timers, conversions, voice-lite.
7. Entitlements and AI: RevenueCat, backend enforcement, Smart Chef Lite, OpenAI gateway.
8. Kitchen Lens: camera/gallery, photo/receipt/label scans, confirmation review.
9. Meal planner: manual weekly plan, Lite plans, Premium AI plans, grocery impact.
10. Social V1: private household/circle, cooksnaps, profiles, follow, remix attribution.
11. Monetization: honest paywall, restore purchases, limits, fail-closed premium actions.
12. Hardening: privacy-safe telemetry, security scans, RLS tests, prompt-injection tests, device QA.

## First Vertical Slice

The first demoable slice is: launch offline as guest, see Today, add a local pantry record, restart, and see the record persist. No account, backend, or network is required.
