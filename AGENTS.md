# Family AI Kitchen Agent Notes

- Read the exact Expo versioned docs at https://docs.expo.dev/versions/v56.0.0/ before changing Expo APIs.
- Use the roadmap in `docs/product/prd-v1.md` as the product source of truth.
- Use `docs/security/privacy-contract.md` and `docs/security/threat-model.md` before adding sync, AI, payments, storage, or telemetry.
- Use `docs/release/app-store-approval-checklist.md` as a release gate.
- Keep route files focused on route composition. Put behavior in `src/features/*`.
- Never put Supabase service-role keys, OpenAI keys, USDA keys, RevenueCat webhook secrets, database passwords, or Sentry auth tokens in the app bundle.
- Write failing tests before feature implementation.
