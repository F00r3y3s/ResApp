# Handoff — Family AI Kitchen, Phase 3 Recipe Core (in progress)

**Date:** 2026-05-25
**Repo:** `/Users/omair/Documents/Recipie-app`
**Branch:** `codex-phase-1-pantry-persistence` (yes, name still references phase 1 — phase 2 and partial phase 3 are committed/uncommitted on top)
**Last commit:** `1be6896` "fix: resolve mobile layout and config issues (safe areas, NativeWind)"
**IDE:** Kiro (Claude Opus 4.7), Mac, zsh

## Sources of truth — read these first

- `AGENTS.md` — workspace rules (failing-tests-first, secrets policy, route composition rule)
- `docs/product/prd-v1.md` — product PRD with 12 phases, source of truth
- `docs/product/implementation-plan.md` — phase tracking with checkboxes
- `docs/product/v1-screen-reference-map.md` — every screen #1-27 mapped to `assets/recipee screens/N.png`
- `docs/security/privacy-contract.md`, `docs/security/threat-model.md` — required reading before any sync/AI/payments/storage/telemetry work
- `docs/release/app-store-approval-checklist.md` — release gate

## Where Phase 3 stands

Plan is in `docs/product/implementation-plan.md`. Status of the Phase 3 checkboxes:

- [x] Add owned/permissive seed recipe format with attribution → `src/features/recipes/seed-recipes.ts` (5 seeds, CC0)
- [x] Add recipe repository and search/filter tests → `src/features/recipes/recipes-repository.ts` already had filter logic; library tests added this session cover query / saved / cuisine paths via the screen.
- [x] Build library, detail flows → done this session (slices 1 & 2 below)
- [ ] **Slice 3 (next):** Add pantry match status using local pantry aliases (screen 13/14 cards show "Uses pantry" vs "Missing 2 ingredients")
- [ ] **Slice 4 (next):** Manual entry + import-review flows (screen 15)

## What I shipped this session

All TDD vertical slices, no horizontal slicing. 13 suites / 25 tests green. `npx tsc --noEmit` clean.

### Slice 1 — Recipe Library (screen 13) ✅
- `src/features/recipes/recipes-screen.tsx` — `RecipesScreenContent`. Header, search, filter chips (`All` / `Saved` / `Pantry friendly` / `Under 30 min`), cards with cuisine pill, prep+cook minutes, servings, diet tag pills, sage saved-dot.
- `src/features/recipes/recipes-screen.test.tsx` — 4 tests
- `src/app/(guest)/recipes.tsx` — replaced the placeholder with the new content + provider
- `src/features/recipes/recipes-repository-provider.native.ts` — AsyncStorage-backed (mirrors pantry pattern)

### Slice 2 — Recipe Detail (screen 14) ✅
- `src/features/recipes/recipe-detail-screen.tsx` — `RecipeDetailScreenContent`. Hero card (placeholder ChefHat icon — no real image yet), title, cuisine + source, diet pills, allergen warnings, servings stepper that scales ingredient quantities live, ingredients list, method preview (first 3 steps + cook-mode CTA), Save → Saved state via repository, missing-recipe state with back button.
- `src/features/recipes/recipe-detail-screen.test.tsx` — 3 tests
- `src/app/(guest)/recipe/[id].tsx` — dynamic route consuming `useLocalSearchParams`
- `src/app/(guest)/_layout.tsx` — added `recipe/[id]` as a hidden tab (`href: null`)

### Skill packs installed for Kiro and Claude Code
- gstack 47 skills: project hook + global at `~/.kiro/skills/gstack-*` and `~/.claude/skills/gstack/`
- Matt Pocock 14 skills: project at `.claude/skills/` and `.kiro/skills/` plus `skills-lock.json`
- `CLAUDE.md` extended with both sections

### Config fix
- **`package.json` `overrides`** got `"lightningcss": "1.30.1"`. This fixes a `react-native-css 3.0.7` + `lightningcss 1.32` Android bundling crash (`failed to deserialize; expected an object-like struct named Specifier, found ()`). Confirmed working: Android bundle now succeeds, iOS unaffected, all 25 tests still green.
- Reference: <https://github.com/nativewind/nativewind/issues/1657> — fix accepted by maintainer for Bun/npm/pnpm.

## Uncommitted state (from `git status`)

```
 M .claude/settings.json          ← gstack PreToolUse hook registered
 M CLAUDE.md                      ← gstack + Matt Pocock sections
 M package-lock.json              ← lightningcss 1.30.1 + Matt Pocock skills
 M package.json                   ← lightningcss override
 M src/app/(guest)/_layout.tsx    ← recipe/[id] hidden route added
 M src/app/(guest)/recipes.tsx    ← uses RecipesScreenContent now
 M src/features/local-first/schema.ts  ← pre-existing (NOT mine)
?? .claude/hooks/                 ← gstack enforcement hook
?? .claude/skills/                ← Matt Pocock skills
?? .kiro/                         ← Matt Pocock + gstack copy for Kiro
?? skills-lock.json               ← Matt Pocock lock
?? src/app/(guest)/recipe/        ← dynamic recipe detail route
?? src/features/recipes/          ← all four new slice files
```

User has not asked to commit yet. Don't auto-commit; ask first.

## Known issue / quirk

- **Test waitFor fragility under React 19 + react-test-renderer:** dual `expect()` calls inside one `waitFor` can race. Pattern that works: put the disappear assertion in `waitFor` with `{ timeout: 3000, interval: 100 }`, then assert the appear case after waitFor exits. Both Phase 3 tests use this. See `recipes-screen.test.tsx` `"filters recipes by search query"` and `"toggles the Saved filter"`.
- **Test imports:** `beforeEach` is **not** a global — must be imported from `@jest/globals` like `describe/it/expect/jest`. TypeScript will fail otherwise (caught me once).

## Environment

- Node 24.13 (fnm), Bun 1.3.13, npm 11.6.2, git 2.x
- Expo SDK 54 (per branch note in implementation-plan: temporarily aligned to 54 because the App Store Expo Go reports SDK 54)
- React 19.1.0, React Native 0.81.5
- NativeWind 5.0.0-preview.4, Tailwind 4, react-native-css 3.0.7, lightningcss 1.30.1 (pinned)
- Test stack: jest-expo 54, @testing-library/react-native 13.3.3, react-test-renderer 19.1.0
- LAN-only Expo Go on `exp://192.168.1.169:8081` (tunnel needs ngrok which isn't installed; LAN works for the user's iPhone on same wifi)

## Next session — pick up here

User asked for Slice 3 and Slice 4 next. Suggested order:

### Slice 3: Pantry-match status on library + detail
1. Failing test: `recipes-screen.test.tsx` — render with a pantry repo containing matching items, expect a "Uses pantry" or "Missing N" badge on cards. Use both pantry repo and recipes repo as injected deps.
2. Failing test: `recipe-detail-screen.test.tsx` — render with mock pantry, expect ingredients show ✓ for matched and a "Need to buy" pill for missing.
3. Implement pure function `computePantryMatch(recipe, pantryItems): { matched: PantryMatch[], missing: string[] }` in `src/features/recipes/pantry-match.ts` with its own unit tests.
4. Use `normalized_name` for matching (already populated in pantry repo). Aliases (e.g., "yogurt" ↔ "Greek yogurt") are out of scope for this slice — note as a TODO.
5. Wire into both screens via a new prop `pantryRepository?: PantryRepository`. Provider files inject it.

### Slice 4: Manual entry + import review (screen 15)
1. Failing test for `RecipeFormScreenContent`: title + cuisine + ingredients list (add/remove rows) + steps list + servings + Save calls `repository.createRecipe()` with parsed input.
2. `recipeInputSchema` already exists in `recipes-repository.ts` — reuse it. Surface Zod messages on each field.
3. Modal route under `(modals)/recipe-edit.tsx` since it should be presentation: 'modal' (root layout already has the group). Confirm with the user whether they want it as a full-screen push instead.
4. The library screen's `+` FAB currently does nothing — wire it to `router.push('/recipe-edit')` once the modal exists.
5. Stretch: the import-review variant accepts a parsed payload (URL, photo, or paste). For V1 keep it manual-only and stub the import entry points.

### After both slices
- Phase 3 implementation-plan checkboxes — flip them.
- Update `CHANGELOG.md` if the user wants it (they said don't auto-commit).
- Run `npm test`, `npx tsc --noEmit`, `npm run lint` before declaring done.

## Suggested skills (in order)

1. **`tdd`** — same red-green workflow as this session. Both slices map cleanly to vertical slices.
2. **`zoom-out`** before Slice 3 if unsure how pantry + recipes intersect — there's no shared module yet, you're building it.
3. **`grill-with-docs`** if Slice 4 scope is fuzzy. Manual entry vs. import review is a fork: confirm with the user before testing.
4. **`design-review`** (gstack) on the live Expo Go after Slice 3+4 ship — Phase 3 needs to match `assets/recipee screens/13.png` `14.png` `15.png` per `v1-screen-reference-map.md`. The seed images aren't wired yet; the hero is a placeholder icon. User will care about this.
5. **`investigate`** if any Android-specific bundling weirdness comes back. The `lightningcss` override is the known fix; if a different CSS error appears, check `react-native-css` version next.

## Don't do

- Don't put behavior in route files. Routes compose; behavior lives in `src/features/*` (`AGENTS.md` rule).
- Don't add Supabase service-role / OpenAI / USDA / RevenueCat / Sentry secrets to the app bundle (`AGENTS.md`).
- Don't write all tests up front. One test → one piece of impl → next test (TDD vertical slicing).
- Don't auto-commit. User asked for handoff before continuing — they'll review and decide.
- Don't bump Expo SDK off 54 — implementation-plan explicitly pins to 54 for App Store Expo Go compatibility.

## Background processes

When this handoff was written, Expo Go dev server was running in Kiro terminal `7` on port 8081 (`npx expo start --lan`). It is fine to leave running or stop and restart in the next session. To restart fresh:

```
npx expo start --lan
```

QR code prints in the terminal output; user scans with Expo Go on Android or Camera on iOS.
