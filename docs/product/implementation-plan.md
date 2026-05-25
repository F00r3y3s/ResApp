# Family AI Kitchen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement phase tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full local-first family cooking app through small, testable vertical slices.

**Architecture:** Expo Router route groups separate guest, authenticated, premium, and modal flows. PowerSync SQLite is the primary local model, while Supabase, RevenueCat, and OpenAI remain behind explicit backend/account/entitlement boundaries.

**Tech Stack:** Expo, Expo Router, React 19, React Native, TypeScript, PowerSync, Supabase, RevenueCat, Jest/RNTL, Maestro, EAS.

**Current branch note:** This branch is temporarily aligned to Expo SDK 54 so the app can run in the current App Store Expo Go client, which reports client version 54.0.8 and supported SDK 54. The production native stack still needs a development build path before returning to SDK 56-only native modules.

---

## Phase Gate Rules

- [ ] Every feature starts with a failing unit/component/integration test.
- [ ] Every Supabase-backed feature includes positive and negative RLS tests in the same slice.
- [ ] Every AI feature includes consent, entitlement, schema validation, allergy/diet checks, and prompt-injection tests.
- [ ] Every premium feature fails closed when server entitlement cannot be verified.
- [ ] Every screen meets 44 by 44 point tap targets before App Store submission.
- [ ] Every phase updates `docs/release/app-store-approval-checklist.md` when a gate changes status.

## Phase 0: Foundation

- [x] Scaffold Expo Router app with TypeScript and SDK 56.
- [x] Install local-first, Supabase, RevenueCat, OpenAI-adjacent backend, telemetry, and QA dependencies.
- [x] Add App Store gate model and release checklist.
- [x] Add privacy contract and threat model.
- [x] Add PowerSync schema skeleton and Supabase connector boundary.
- [x] Add first repository implementation for local pantry writes.
- [x] Add Maestro offline smoke flow that launches Today and checks offline copy.

## Phase 1: Guest Pantry Persistence

- [x] Write failing repository test for inserting a pantry item while offline.
- [x] Implement local pantry repository against PowerSync SQLite.
- [x] Wire Add Pantry Item form with validation for name, quantity, unit, location, and expiry.
- [x] Persist and reload pantry items after app restart.
- [x] Add Maestro offline add-item smoke test.

## Phase 2: Onboarding To First Value

- [x] Add local preferences schema for language, region, diet, allergy, cuisine, and goals.
- [x] Build onboarding routes under `(guest)` and persist locally.
- [x] Update Today model to reflect preferences offline.
- [x] Add sync-consent screen that explains local import before account sync.

## Phase 3: Recipe Core

- [x] Add owned/permissive seed recipe format with attribution.
- [x] Add recipe repository and search/filter tests.
- [x] Build library, detail, save, manual entry, and import-review flows.
  - [x] Library (screen 13) — search, filter chips, cards with cuisine/time/diet pills, saved indicator.
  - [x] Detail (screen 14) — hero, ingredients, method preview, save toggle, servings stepper.
  - [x] Manual entry (screen 15) — title/cuisine/servings + add/remove ingredient and step rows, Zod validation, modal route.
  - [ ] Import review (screen 15 variant) — deferred. URL/photo/paste import will land alongside Phase 8 Kitchen Lens (T8.4 / receipt + label flows).
- [x] Add pantry match status using local pantry aliases.

## Phase 4 And Later

Use `docs/product/prd-v1.md` as the source of truth for pantry, grocery, cook mode, entitlements, AI, kitchen lens, meal planner, social, monetization, and hardening.
