# Family AI Kitchen Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the production-ready Expo foundation for the local-first family kitchen app.

**Architecture:** Expo Router route groups separate guest, authenticated, premium, and modal flows. PowerSync SQLite defines the local data model, while Supabase, RevenueCat, and OpenAI remain behind explicit backend/account/entitlement boundaries.

**Tech Stack:** Expo SDK 56, TypeScript, PowerSync, Supabase, RevenueCat, NativeWind/Tailwind v4, Jest/RNTL, Maestro, EAS.

---

## Task 1: Foundation Verification

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Create: `metro.config.js`
- Create: `postcss.config.mjs`
- Create: `eas.json`

- [x] Write failing tests for release gates, sync policy, and Today model.
- [x] Add Expo/Jest test configuration.
- [x] Add route groups and guest-first shell.
- [x] Add PowerSync schema and Supabase connector boundary.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm audit` and triage high vulnerabilities before release.
