import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';
import { generateLocalSuggestions } from '@/features/smart-chef/suggestion-engine';

import type { MealPlanDay, MealSlot } from './meal-plan-repository';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeneratedPlanSlot = {
  day: MealPlanDay;
  slot: MealSlot;
  recipeId: string;
};

export type GeneratedPlan = {
  slots: GeneratedPlanSlot[];
  /** True when fewer than 3 recipes passed filtering — UI should show a message. */
  insufficientRecipes?: boolean;
};

export type PlanGeneratorInput = {
  recipes: Recipe[];
  pantryItems: PantryItem[];
  preferences: GuestPreferences | null;
  /** Seed for deterministic shuffling. Change to regenerate a different plan. */
  seed: number;
  /** Override current time for suggestion engine. */
  now?: Date;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS: readonly MealPlanDay[] = [0, 1, 2, 3, 4, 5, 6];
const SLOT_PRIORITY: readonly MealSlot[] = ['dinner', 'lunch', 'breakfast'];
const MIN_RECIPES_REQUIRED = 3;

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generates a weekly meal plan using ranked suggestions from the local
 * suggestion engine. Pure function — deterministic given the same input + seed.
 *
 * Algorithm:
 * 1. Get ranked suggestions via `generateLocalSuggestions` (handles diet/allergy filtering).
 * 2. Shuffle the ranked list using the seed for variety while preserving relative ranking.
 * 3. Fill slots in priority order: dinner → lunch → breakfast.
 * 4. Avoid assigning the same recipe to the same slot type on consecutive days.
 * 5. If not enough recipes to fill all 21 slots, leave some empty.
 */
export function generateWeeklyPlan(input: PlanGeneratorInput): GeneratedPlan {
  const { recipes, pantryItems, preferences, seed, now } = input;

  // Get ranked suggestions (this handles allergy/diet exclusions)
  const suggestions = generateLocalSuggestions({
    recipes,
    pantryItems,
    preferences,
    now,
    maxResults: recipes.length, // Get all eligible recipes
  });

  // Check minimum recipe threshold
  if (suggestions.length < MIN_RECIPES_REQUIRED) {
    return { slots: [], insufficientRecipes: true };
  }

  // Create a shuffled-but-ranked list: apply a partial shuffle that preserves
  // ranking influence while introducing variety via the seed.
  const rankedIds = suggestions.map((s) => s.recipe.localId);
  const shuffledIds = seededWeightedShuffle(rankedIds, seed);

  // Fill slots in priority order
  const result: GeneratedPlanSlot[] = [];

  for (const slotType of SLOT_PRIORITY) {
    fillSlotType(shuffledIds, slotType, result);
  }

  return { slots: result };
}

// ---------------------------------------------------------------------------
// Slot filling
// ---------------------------------------------------------------------------

function fillSlotType(
  rankedRecipeIds: string[],
  slotType: MealSlot,
  result: GeneratedPlanSlot[],
): void {
  for (const day of DAYS) {
    const previousDaySlot = result.find(
      (s) => s.slot === slotType && s.day === ((day - 1 + 7) % 7) as MealPlanDay,
    );
    const previousRecipeId = previousDaySlot?.recipeId ?? null;

    // Also avoid using the same recipe already assigned to this day in another slot
    const sameDayIds = new Set(
      result.filter((s) => s.day === day).map((s) => s.recipeId),
    );

    // Find the best available recipe that doesn't violate constraints
    const chosen = rankedRecipeIds.find(
      (id) => id !== previousRecipeId && !sameDayIds.has(id),
    );

    if (chosen) {
      result.push({ day, slot: slotType, recipeId: chosen });
    }
  }
}

// ---------------------------------------------------------------------------
// Seeded weighted shuffle
// ---------------------------------------------------------------------------

/**
 * Weighted shuffle that preserves ranking influence while introducing variety.
 * Higher-ranked items (lower index) are more likely to stay near the front.
 * Uses a technique where each item gets a random key biased by its rank,
 * then items are sorted by that key.
 */
function seededWeightedShuffle(items: string[], seed: number): string[] {
  const rng = mulberry32(seed);

  // Assign each item a sort key: rank-based weight + random jitter
  const keyed = items.map((item, index) => {
    // Weight decreases with rank (higher ranked = higher weight)
    const rankWeight = (items.length - index) / items.length;
    // Random jitter scaled to be smaller than rank differences
    const jitter = rng() * 0.5;
    return { item, key: rankWeight + jitter };
  });

  // Sort by key descending (highest key first)
  keyed.sort((a, b) => b.key - a.key);

  return keyed.map((k) => k.item);
}

/**
 * Mulberry32 — a simple, fast 32-bit seeded PRNG.
 * Returns a function that produces values in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
