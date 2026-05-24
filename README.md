# Family AI Kitchen

Local-first Expo app for family cooking, pantry, recipes, groceries, cook mode, meal planning, household sharing, and premium AI.

## Current Foundation

- Expo SDK 56 with Expo Router route groups.
- Guest-first shell for Today, Pantry, Recipes, Grocery, Planner, and Settings.
- PowerSync schema skeleton for local SQLite.
- Supabase client boundary with SecureStore-compatible session storage.
- RevenueCat, Sentry, PostHog, camera, and image modules installed for later phases.
- App Store release checklist, privacy contract, and threat model in `docs/`.

## Commands

```bash
npm start
npm test
npm run typecheck
npm run lint
npm audit
```

## Rules

- No service-role, model, USDA, payment, or webhook secrets in the app.
- Core cooking flows work offline.
- AI calls go through a backend gateway only.
- Premium actions are enforced server-side.
- App Store gates in `docs/release/app-store-approval-checklist.md` block release until done.
