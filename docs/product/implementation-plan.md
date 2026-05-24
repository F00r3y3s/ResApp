# Family AI Kitchen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement phase tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full local-first family cooking app through small, testable vertical slices.

**Architecture:** Expo Router route groups separate guest, authenticated, premium, and modal flows. PowerSync SQLite is the primary local model, while Supabase, RevenueCat, and OpenAI remain behind explicit backend/account/entitlement boundaries.

**Tech Stack:** Expo SDK 56, React 19, React Native 0.85, TypeScript 6, PowerSync, Supabase, RevenueCat, NativeWind/Tailwind v4, Jest/RNTL, Maestro, EAS.

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
- [ ] Add first repository implementation for local pantry writes.
- [ ] Add Maestro offline smoke flow that launches Today and checks offline copy.

## Phase 1: Guest Pantry Persistence

- [ ] Write failing repository test for inserting a pantry item while offline.
- [ ] Implement local pantry repository against PowerSync SQLite.
- [ ] Wire Add Pantry Item form with validation for name, quantity, unit, location, and expiry.
- [ ] Persist and reload pantry items after app restart.
- [ ] Add Maestro offline add-item smoke test.

## Phase 2: Onboarding To First Value

- [ ] Add local preferences schema for language, region, diet, allergy, cuisine, and goals.
- [ ] Build onboarding routes under `(guest)` and persist locally.
- [ ] Update Today model to reflect preferences offline.
- [ ] Add sync-consent screen that explains local import before account sync.

## Phase 3: Recipe Core

- [ ] Add owned/permissive seed recipe format with attribution.
- [ ] Add recipe repository and search/filter tests.
- [ ] Build library, detail, save, manual entry, and import-review flows.
- [ ] Add pantry match status using local pantry aliases.

## Phase 4 And Later

Use `docs/product/prd-v1.md` as the source of truth for pantry, grocery, cook mode, entitlements, AI, kitchen lens, meal planner, social, monetization, and hardening.
