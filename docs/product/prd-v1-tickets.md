Using to-issues as the main slicing skill and BMAD epics/stories thinking as the structure. I’m treating every ticket below as a vertical slice: it must touch whatever layers are needed end-to-end: data model, local storage, Supabase/backend where relevant, UI, validation, tests, analytics/error handling.

No implementation yet. This is the v1 build map.

Vertical Slice Rule

A ticket is only valid if it produces something demoable. No tickets like “set up database only” or “build UI only.” Even foundation tickets must prove the app can run through a small user-visible path.

Phase 0: Product Decisions Before Build
T0.1 Confirm MVP Scope And Navigation Map
Type: HITL
Blocked by: None
Build: Lock the exact v1 tabs, auth flow, onboarding flow, and premium/free boundaries.
Acceptance:

Final v1 screen list approved.
Bottom tabs approved.
Features marked as Free, Premium, or Future.
Anything outside v1 moved to backlog.
T0.2 Confirm Freemium AI Strategy
Type: HITL
Blocked by: None
Build: Decide free AI-lite versus paid AI gateway behavior.
Acceptance:

Free users get local/rules-based Smart Chef Lite.
Paid users get server AI gateway.
Trial/limit behavior is defined.
No paid model keys stored in the app.
T0.3 Confirm Data Source And Seed Policy
Type: HITL
Blocked by: None
Build: Decide which real recipe/product/nutrition sources seed v1.
Acceptance:

Recipe seed source approved.
Product/barcode source approved.
Nutrition source approved.
Attribution/licensing requirements documented.
Phase 1: App Shell, Auth, And Local Storage
T1.1 First Launch To Authenticated Shell
Type: AFK
Blocked by: T0.1
Build: User can open the Expo app, see splash, authenticate, and land on an empty Today screen.
Acceptance:

Expo Router route groups exist for unauthenticated/authenticated users.
Supabase auth works with email/passwordless or chosen provider.
Session persists after app restart.
Today screen shows authenticated household placeholder.
Unit/integration tests cover auth session state.
T1.2 Offline Local Storage Foundation
Type: AFK
Blocked by: T1.1
Build: Authenticated user can save a local test record and see it after restart.
Acceptance:

SQLite/local storage layer exists.
Local schema versioning exists.
Basic repository pattern exists for offline entities.
Saved local record survives app restart.
Tests cover read/write/migration path.
T1.3 App Design System Slice
Type: AFK
Blocked by: T1.1
Build: Replace raw screen styling with reusable tokens/components on Today and Auth.
Acceptance:

Buttons, inputs, cards, chips, empty states, headers exist.
Light mode baseline works.
RTL-safe spacing patterns are established.
Accessibility labels exist on primary controls.
Visual smoke check on iOS and Android.
Phase 2: Onboarding To First Value
T2.1 Language, Region, And Household Setup
Type: AFK
Blocked by: T1.2
Build: New user completes language, region, household size, and lands on Today with preferences saved.
Acceptance:

Preferences stored locally and synced to Supabase profile.
User can edit onboarding choices before finishing.
Today reflects selected household size/region.
Tests cover required fields and persistence.
T2.2 Diet, Allergy, Cuisine, And Cooking Goals
Type: AFK
Blocked by: T2.1
Build: User selects dietary rules, allergies, cuisines, spice level, and goals.
Acceptance:

Preferences saved locally and remotely.
Allergy choices affect future recipe filtering.
Cuisine/goals appear in Today personalization placeholder.
Tests cover invalid/empty preference cases.
T2.3 First Pantry Or Recipe Action
Type: AFK
Blocked by: T2.2
Build: Onboarding ends by adding first pantry item manually or saving first seed recipe.
Acceptance:

User can skip, add pantry item, or save recipe.
Today shows the result immediately.
Offline persistence works.
Analytics event records onboarding completion.
Phase 3: Real Recipe Seed And Library
T3.1 Seed Real Recipes Into App
Type: AFK
Blocked by: T0.3, T1.2
Build: App ships with a small real recipe catalog usable offline.
Acceptance:

Seed recipes include title, cuisine, ingredients, steps, image/source metadata.
Recipes are searchable locally.
Licensing/attribution metadata is preserved.
Tests verify seed import shape.
T3.2 Recipe Library Search And Filters
Type: AFK
Blocked by: T3.1, T2.2
Build: User browses recipes filtered by diet, cuisine, time, and pantry match placeholder.
Acceptance:

Search works offline.
Filters respect diet/allergy preferences.
Empty states are helpful.
Recipe cards show real data, not fake placeholders.
T3.3 Recipe Detail And Save
Type: AFK
Blocked by: T3.2
Build: User opens recipe detail, sees ingredients/steps, saves to personal library.
Acceptance:

Recipe detail shows image, tags, servings, time, ingredients, steps.
Save/unsave works offline.
Saved recipes survive restart.
Tests cover save state and detail rendering.
T3.4 Manual Recipe Entry
Type: AFK
Blocked by: T3.3
Build: User manually creates a recipe and sees it in library.
Acceptance:

Form validates title, ingredients, and steps.
Created recipe appears in search.
Local-first save works.
Sync queue records pending remote creation.
Phase 4: Pantry Core
T4.1 Manual Pantry CRUD
Type: AFK
Blocked by: T2.3
Build: User adds, edits, deletes pantry items across fridge/freezer/pantry.
Acceptance:

Pantry tabs work.
Quantity, unit, location, expiry date, and local name are supported.
Changes persist offline.
Tests cover CRUD and validation.
T4.2 Expiry-Aware Today Cards
Type: AFK
Blocked by: T4.1, T3.2
Build: Today shows expiring pantry items and recipe suggestions using those items.
Acceptance:

Expiring soon grouping works.
Suggestions use real saved/seed recipes.
User can tap suggestion into recipe detail.
Tests cover expiry ordering.
T4.3 Pantry Match Percentage
Type: AFK
Blocked by: T4.1, T3.2
Build: Recipe cards show how many ingredients are already in pantry.
Acceptance:

Match calculation handles ingredient aliases/basic normalization.
Recipe detail shows missing ingredients.
Pantry updates change match score.
Unit tests cover matching logic.
Phase 5: Grocery List
T5.1 Generate Grocery List From Recipe
Type: AFK
Blocked by: T3.3, T4.3
Build: User adds a recipe to grocery list and pantry-owned ingredients are subtracted.
Acceptance:

Missing ingredients become grocery items.
Pantry-owned ingredients are skipped or marked “already have.”
Grocery list persists offline.
Tests cover subtraction rules.
T5.2 Shared Grocery List Sync
Type: AFK
Blocked by: T5.1, T1.1
Build: Grocery list syncs with Supabase for household members.
Acceptance:

Checked/unchecked state syncs.
Realtime update works between two sessions/devices.
Offline changes queue and sync later.
Integration tests cover sync conflict basics.
T5.3 Grocery Organization And Assignments
Type: AFK
Blocked by: T5.2
Build: Grocery items are grouped by store section and assignable to household members.
Acceptance:

Sections like Produce, Dairy, Spices, Meat, Pantry exist.
Assignment UI works.
Checked items collapse.
Tests cover grouping and assignment persistence.
Phase 6: Cook Mode
T6.1 Basic Cook Mode
Type: AFK
Blocked by: T3.3
Build: User starts cook mode from recipe detail and moves through steps.
Acceptance:

Large readable step screen.
Previous/next navigation.
Keep-awake behavior.
Progress indicator.
Tests cover step navigation.
T6.2 Timers And Conversions
Type: AFK
Blocked by: T6.1
Build: User can start timers and convert simple units during cook mode.
Acceptance:

Timer can start/pause/finish.
App shows local notification or in-app alert.
Common conversions work.
Tests cover timer state and conversion utility.
T6.3 Voice-Lite Cook Controls
Type: AFK
Blocked by: T6.1
Build: User can use device speech input for simple commands like next, back, repeat.
Acceptance:

Voice command permission flow exists.
Supported commands are recognized.
Fallback buttons always remain available.
Device QA covers iOS and Android.
Phase 7: Smart Chef Lite And Premium AI Gateway
T7.1 Smart Chef Lite Local Suggestions
Type: AFK
Blocked by: T4.3, T3.2
Build: Free user asks “what can I cook?” and gets local pantry/recipe suggestions.
Acceptance:

No paid AI call needed.
Suggestions use pantry, preferences, allergies, and saved recipes.
User can open suggested recipe.
Tests cover ranking rules.
T7.2 AI Gateway Backend Slice
Type: AFK
Blocked by: T1.1, T0.2
Build: Paid/trial user sends one AI Chef text request through backend gateway.
Acceptance:

App never contains model keys.
Backend validates auth/subscription entitlement.
AI interaction is logged safely.
Errors return user-friendly messages.
Integration test covers authorized/unauthorized access.
T7.3 AI Chef Chat UI
Type: AFK
Blocked by: T7.1, T7.2
Build: Chat screen supports Free Lite responses and Premium AI responses.
Acceptance:

Free users see local answer and upgrade affordance.
Premium users get gateway response.
Suggested prompts work.
Chat history persists locally.
T7.4 Substitutions And Allergy Guardrails
Type: AFK
Blocked by: T7.3, T2.2
Build: User asks for substitutions and app warns against allergy conflicts.
Acceptance:

Free mode uses local substitution table.
Premium mode can ask AI but still validates allergy conflicts locally.
Dangerous suggestions are blocked or warned.
Tests cover allergy guardrails.
Phase 8: Kitchen Lens
T8.1 Camera Capture To Review Screen
Type: AFK
Blocked by: T1.3
Build: User captures or imports an image and lands on a scan review screen.
Acceptance:

Camera permission flow works.
Gallery import works.
Review screen displays image.
User can cancel/rescan.
Device QA covers camera on iOS/Android.
T8.2 Pantry Photo Scan To Confirmed Items
Type: AFK
Blocked by: T8.1, T7.2, T4.1
Build: Premium/trial user scans pantry photo, confirms detected items, and saves them.
Acceptance:

AI result includes item names, confidence, quantity guess where possible.
User must confirm before saving.
Low confidence items are highlighted.
Confirmed items appear in Pantry and Today.
T8.3 Receipt Scan To Pantry/Grocery Update
Type: AFK
Blocked by: T8.2, T5.1
Build: User scans receipt and converts detected purchases into pantry or grocery items.
Acceptance:

Receipt items are reviewable.
User chooses add to pantry or grocery.
Duplicate detection prompts merge.
Tests cover review-to-save flow.
T8.4 Label/Barcode Product Lookup
Type: AFK
Blocked by: T8.1, T0.3
Build: User scans barcode/label and sees product info from real data source where available.
Acceptance:

Barcode lookup works through backend.
Missing product state is handled.
Allergen/diet warnings display when data exists.
Attribution requirements are met.
Phase 9: Meal Planner
T9.1 Manual Weekly Meal Plan
Type: AFK
Blocked by: T3.3
Build: User adds saved recipes to weekly meal slots.
Acceptance:

Week calendar exists.
Breakfast/lunch/dinner slots supported.
Meal plan persists offline.
Recipe detail can add to a slot.
T9.2 Generate Plan With Smart Chef Lite
Type: AFK
Blocked by: T9.1, T7.1, T4.3
Build: Free user generates a simple meal plan from pantry/preferences.
Acceptance:

Plan uses saved/seed recipes only.
Allergies/diet rules are respected.
User can accept, edit, or regenerate.
Tests cover rule-based planner.
T9.3 Premium AI Meal Plan
Type: AFK
Blocked by: T9.2, T7.2
Build: Premium user generates a more flexible AI meal plan.
Acceptance:

Request includes preferences, pantry, budget/time constraints.
AI output is validated before display.
Invalid recipes/unsafe allergy conflicts are rejected.
Accepted plan updates grocery impact.
T9.4 Meal Plan To Grocery
Type: AFK
Blocked by: T9.1, T5.1
Build: User generates grocery list from the weekly plan.
Acceptance:

Ingredients aggregate across meals.
Pantry subtraction works.
User sees grocery impact before confirming.
Tests cover aggregation.
Phase 10: Social V1
T10.1 Private Household Circle
Type: AFK
Blocked by: T1.1
Build: User creates or joins a private household/circle.
Acceptance:

Circle has members and privacy state.
Invite link/code flow exists.
RLS prevents non-members from reading circle data.
Integration tests cover access control.
T10.2 Share Cooksnap From Cooked Recipe
Type: AFK
Blocked by: T6.1, T10.1
Build: User shares a dish photo/caption to a private circle after cooking.
Acceptance:

Cooksnap links to recipe.
User chooses circle visibility.
Image uploads to storage.
Circle feed shows post.
T10.3 Creator Profiles And Follow
Type: AFK
Blocked by: T3.1
Build: User browses seed creator profiles and follows one.
Acceptance:

Creator profile shows real/curated recipes.
Follow state persists.
Today can show creator highlight.
Tests cover follow/unfollow.
T10.4 Remix Community Recipe
Type: AFK
Blocked by: T10.2, T3.4
Build: User remixes a shared recipe into their own saved recipe.
Acceptance:

Original attribution is preserved.
Remixed recipe is editable privately.
Circle post can show remix relationship.
Tests cover remix creation.
Phase 11: Subscription And Limits
T11.1 RevenueCat Subscription Entitlement
Type: AFK
Blocked by: T7.2
Build: App detects Free, Trial, and Premium entitlement.
Acceptance:

RevenueCat is integrated.
Entitlement is mirrored to backend safely.
Restore purchases works.
Tests/mock checks cover entitlement states.
T11.2 Freemium Limits
Type: AFK
Blocked by: T11.1, T7.3, T8.2, T9.3
Build: Free users have clear limits on premium AI, scans, and advanced meal planning.
Acceptance:

Limits are enforced server-side.
UI shows remaining free usage where relevant.
Upgrade prompts are contextual.
No premium action succeeds by client bypass.
T11.3 Paywall
Type: AFK
Blocked by: T11.1, T0.2
Build: User sees subscription screen and can upgrade.
Acceptance:

Paywall compares Free Lite vs Premium AI.
Trial/price/restore shown.
Purchase updates entitlement immediately.
Failed purchase is handled cleanly.
Phase 12: Quality, Privacy, And Launch Hardening
T12.1 Analytics And Error Monitoring
Type: AFK
Blocked by: T1.1
Build: Privacy-safe events and crash reporting across critical flows.
Acceptance:

PostHog/Sentry configured.
No sensitive recipe/user content sent by default.
Events cover onboarding, save recipe, scan, plan, grocery, subscribe.
Error boundaries exist.
T12.2 Security And RLS Review
Type: HITL
Blocked by: T5.2, T7.2, T10.1, T11.1
Build: Verify Supabase policies and backend gateway protections.
Acceptance:

RLS tested for household/circle isolation.
AI gateway validates auth and entitlement.
Storage buckets are scoped.
No secrets in app bundle.
T12.3 Offline Sync Hardening
Type: AFK
Blocked by: T5.2, T9.1, T4.1
Build: Core saved data behaves safely offline and syncs later.
Acceptance:

Pantry, grocery, saved recipes, and meal plan work offline.
Queued writes retry.
Conflict handling rules exist.
Device QA covers airplane mode.
T12.4 End-To-End MVP Acceptance Flow
Type: AFK
Blocked by: All core phases
Build: Automated and manual QA for the complete v1 loop.
Acceptance:

User can onboard.
Add pantry item.
Save recipe.
Generate grocery list.
Cook recipe.
Ask Smart Chef Lite or Premium AI.
Create meal plan.
Share cooksnap.
Tests pass on iOS and Android.
Recommended Build Order

T0 decisions
Phase 1 foundation
Phase 2 onboarding
Phase 3 recipes
Phase 4 pantry
Phase 5 grocery
Phase 6 cook mode
Phase 7 AI
Phase 9 meal planner
Phase 8 kitchen lens
Phase 10 social
Phase 11 monetization
Phase 12 hardening
I would build Kitchen Lens after the core recipe/pantry/grocery loop, even though it is flashy, because scans become much more useful once there is somewhere real for the detected data to land.