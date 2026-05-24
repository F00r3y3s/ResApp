# Threat Model

## Assets

- Local pantry, grocery, recipe, preference, cook progress, chat, and scan review data.
- Supabase identity sessions and household membership.
- RevenueCat entitlement state and backend mirrored entitlement.
- AI gateway secrets and third-party API keys.
- Images uploaded for scans, cooksnaps, and recipe import.

## Trust Boundaries

- Mobile app to local SQLite.
- Mobile app to Supabase Auth and PowerSync.
- Mobile app to Supabase Edge Functions.
- Backend functions to OpenAI, USDA FoodData Central, RevenueCat webhooks, and Postgres.
- Storage buckets for user-uploaded media.

## Release-Blocking Risks

- Service-role, model, USDA, payment, or webhook keys in the app bundle.
- RLS bypass across households or private circles.
- Premium AI action allowed from client-only entitlement state.
- AI output saved without schema validation or allergy/diet conflict checks.
- Analytics leaking recipe text, pantry contents, allergy details, photos, or chat content.
- Offline launch crash or white screen.
- Dynamic code execution surface that violates App Store Guideline 2.5.2.

## Required Tests By Feature

- RLS negative tests for each shared table and storage bucket.
- Entitlement negative tests for each premium backend action.
- Prompt-injection tests for scan/chat/meal-plan functions.
- Offline airplane-mode tests for guest Today, pantry, recipes, grocery, and cook mode.
- Dependency and secret scans before release.
