import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import { computePantryMatch } from '@/features/recipes/pantry-match';
import type { Recipe } from '@/features/recipes/recipes-repository';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoredSuggestion = {
  recipe: Recipe;
  /** Ratio of matched pantry items to total ingredients (0–1). */
  pantryMatchRatio: number;
  /** Number of pantry items matched. */
  matchedCount: number;
  /** Total ingredient count for the recipe. */
  totalCount: number;
  /** Final computed score used for ranking. */
  score: number;
};

export type SuggestionInput = {
  recipes: Recipe[];
  pantryItems: PantryItem[];
  preferences: GuestPreferences | null;
  /** Override the current time for expiry calculations. Defaults to `new Date()`. */
  now?: Date;
  /** Maximum number of results to return. Defaults to 10. */
  maxResults?: number;
};

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

/** Primary signal: pantry coverage ratio (0–1) scaled to this weight. */
const WEIGHT_PANTRY_COVERAGE = 100;

/** Boost per expiring pantry item the recipe uses. */
const WEIGHT_EXPIRY_BOOST = 15;

/** Flat boost if the recipe's cuisine matches a user preference. */
const WEIGHT_CUISINE_BOOST = 10;

/** Default expiry window in days (items expiring within this window get a boost). */
const EXPIRY_WINDOW_DAYS = 7;

const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Generates local recipe suggestions ranked by pantry coverage, dietary
 * compliance, cuisine preference, and expiry urgency.
 *
 * This is a pure function — no side effects, no network calls, no AI.
 *
 * Design decisions:
 * - Variety (deprioritizing recently cooked recipes) is NOT implemented in T7.1.
 *   Reason: tracking "recently cooked" requires cook-session history which is
 *   not yet available in the local schema. This can be added in a future ticket
 *   once cook-mode logs are persisted.
 */
export function generateLocalSuggestions(input: SuggestionInput): ScoredSuggestion[] {
  const { recipes, pantryItems, preferences, maxResults = 10 } = input;
  const now = input.now ?? new Date();

  // Pre-compute expiring item set
  const expiringNames = buildExpiringNameSet(pantryItems, now);

  // Pre-compute preferred cuisines set (lowercased)
  const preferredCuisines = new Set(
    (preferences?.cuisines ?? []).map((c) => c.toLocaleLowerCase()),
  );

  // Filter and score
  const scored: ScoredSuggestion[] = [];

  for (const recipe of recipes) {
    // --- Exclusion: allergens ---
    if (preferences && preferences.allergies.length > 0) {
      const userAllergens = new Set(preferences.allergies.map((a) => a.toLocaleLowerCase()));
      const hasAllergen = recipe.allergens.some((a) => userAllergens.has(a.toLocaleLowerCase()));
      if (hasAllergen) continue;
    }

    // --- Exclusion: dietary rules ---
    if (preferences && preferences.dietaryRules.length > 0) {
      const recipeTags = new Set(recipe.dietTags.map((t) => t.toLocaleLowerCase()));
      const meetsAllRules = preferences.dietaryRules.every((rule) =>
        recipeTags.has(rule.toLocaleLowerCase()),
      );
      if (!meetsAllRules) continue;
    }

    // --- Scoring ---
    const match = computePantryMatch(recipe, pantryItems);
    const matchRatio = match.totalCount > 0 ? match.matchedCount / match.totalCount : 0;

    let score = matchRatio * WEIGHT_PANTRY_COVERAGE;

    // Expiry urgency boost
    const expiringMatchCount = match.matched.reduce((count, m) => {
      const key = m.pantryItem.normalizedName;
      return expiringNames.has(key) ? count + 1 : count;
    }, 0);
    score += expiringMatchCount * WEIGHT_EXPIRY_BOOST;

    // Cuisine preference boost
    if (preferredCuisines.has(recipe.cuisine.toLocaleLowerCase())) {
      score += WEIGHT_CUISINE_BOOST;
    }

    scored.push({
      recipe,
      pantryMatchRatio: matchRatio,
      matchedCount: match.matchedCount,
      totalCount: match.totalCount,
      score,
    });
  }

  // Sort: score descending, then alphabetical by title for deterministic tie-breaking
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.recipe.title.toLocaleLowerCase().localeCompare(b.recipe.title.toLocaleLowerCase());
  });

  return scored.slice(0, maxResults);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a set of normalized pantry item names that are expiring within the
 * configured window (default 7 days).
 */
function buildExpiringNameSet(pantryItems: PantryItem[], now: Date): Set<string> {
  const startOfDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const cutoff = startOfDay + EXPIRY_WINDOW_DAYS * MS_PER_DAY;

  const expiringNames = new Set<string>();

  for (const item of pantryItems) {
    if (!item.expiresAt) continue;
    const expiryTime = Date.parse(`${item.expiresAt}T00:00:00.000Z`);
    if (Number.isNaN(expiryTime)) continue;
    if (expiryTime <= cutoff) {
      expiringNames.add(item.normalizedName);
    }
  }

  return expiringNames;
}
