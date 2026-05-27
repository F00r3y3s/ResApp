import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import { computePantryMatch, normalizePantryMatchName } from '@/features/recipes/pantry-match';
import type { Recipe } from '@/features/recipes/recipes-repository';

export type TodaySummaryInput = {
  pantryExpiringCount: number;
  savedRecipeCount: number;
  groceryOpenCount: number;
  isOnline: boolean;
  hasAccount: boolean;
  preferences?: GuestPreferences | null;
};

export type TodayCard = {
  title: string;
  value: string;
  detail: string;
};

export type TodaySummary = {
  modeLabel: string;
  networkMessage: string;
  dinnerPlanLabel: string;
  preferenceMessage: string;
  cards: TodayCard[];
};

export function buildTodaySummary(input: TodaySummaryInput): TodaySummary {
  const modeLabel = input.hasAccount
    ? input.isOnline
      ? 'Synced household'
      : 'Account offline'
    : input.isOnline
      ? 'Guest local'
      : 'Guest offline';

  return {
    modeLabel,
    dinnerPlanLabel: buildDinnerPlanLabel(input.preferences),
    preferenceMessage: buildPreferenceMessage(input.preferences),
    networkMessage: input.isOnline
      ? 'Sync and online services unlock after account consent.'
      : 'Core cooking tools are available offline.',
    cards: [
      {
        title: 'Use soon',
        value: String(input.pantryExpiringCount),
        detail: 'Pantry items nearing expiry',
      },
      {
        title: 'Saved recipes',
        value: String(input.savedRecipeCount),
        detail: 'Available from local storage',
      },
      {
        title: 'Grocery queue',
        value: String(input.groceryOpenCount),
        detail: 'Offline edits wait for sync',
      },
    ],
  };
}

function buildDinnerPlanLabel(preferences: GuestPreferences | null | undefined): string {
  if (!preferences) {
    return 'Dinner plan for today';
  }

  const cuisineLabel = preferences.cuisines.slice(0, 2).map(formatOptionLabel).join(', ');
  const parts = [`Dinner plan for ${preferences.householdSize}`, formatRegionLabel(preferences.region)];

  if (cuisineLabel) {
    parts.push(cuisineLabel);
  }

  return parts.join(' · ');
}

function buildPreferenceMessage(preferences: GuestPreferences | null | undefined): string {
  if (!preferences) {
    return 'Cook from what your family already has.';
  }

  const parts: string[] = [];

  if (preferences.dietaryRules.length > 0) {
    parts.push(`${preferences.dietaryRules.map(formatOptionLabel).join(', ')} meals`);
  }

  if (preferences.allergies.length > 0) {
    parts.push(`avoiding ${preferences.allergies.map(formatOptionLabel).join(', ').toLocaleLowerCase()}`);
  }

  if (preferences.goals.length > 0) {
    parts.push(preferences.goals.slice(0, 1).map(formatOptionLabel).join(', ').toLocaleLowerCase());
  }

  return parts.length > 0 ? parts.join(' · ') : 'Cook from what your family already has.';
}

function formatRegionLabel(region: GuestPreferences['region']): string {
  const labels: Record<GuestPreferences['region'], string> = {
    'uae-gcc': 'UAE / GCC',
    india: 'India',
    pakistan: 'Pakistan',
    bangladesh: 'Bangladesh',
    turkey: 'Turkey',
    'uk-us': 'UK / US',
  };

  return labels[region];
}

function formatOptionLabel(option: string): string {
  return option
    .split('-')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}


// ---------------------------------------------------------------------------
// Expiry-aware Today selection (T4.2)
// ---------------------------------------------------------------------------

/**
 * Default window in days to treat a pantry item as "expiring soon".
 * 7 days mirrors the "This week" bucket the pantry screen uses.
 */
export const DEFAULT_EXPIRY_WINDOW_DAYS = 7;

export type ExpiringTodaySelectionInput = {
  pantryItems: PantryItem[];
  recipes: Recipe[];
  now: Date;
  /** Override the expiry window. Defaults to {@link DEFAULT_EXPIRY_WINDOW_DAYS}. */
  expiryWindowDays?: number;
};

export type RecipeSuggestion = {
  recipe: Recipe;
  /** Number of soon-expiring pantry items the recipe consumes. */
  expiringMatchCount: number;
  /** Number of total pantry items (expiring or not) the recipe consumes. */
  pantryMatchCount: number;
  /** Total ingredient count for the recipe. */
  totalIngredientCount: number;
};

export type ExpiringTodaySelection = {
  expiring: PantryItem[];
  suggestions: RecipeSuggestion[];
};

/**
 * Picks pantry items that are within the expiry window and recipe suggestions
 * that consume them.
 *
 * Ordering rules:
 * - Expiring items: soonest expiry first. Already-expired items are still
 *   surfaced (most urgent). Items without an `expiresAt` date are excluded —
 *   the pantry shape allows null expiries and we can't reason about urgency
 *   for them.
 * - Suggestions: ranked by `expiringMatchCount` (descending), then total
 *   pantry coverage (descending), then alphabetical by title (case-insensitive)
 *   for deterministic tie-breaking.
 * - Recipes that don't use any expiring item are excluded — they aren't
 *   "use-it-up" suggestions.
 */
export function selectExpiringPantryAndSuggestions(
  input: ExpiringTodaySelectionInput,
): ExpiringTodaySelection {
  const windowDays = input.expiryWindowDays ?? DEFAULT_EXPIRY_WINDOW_DAYS;
  const startOfDay = startOfUtcDay(input.now);
  const cutoff = startOfDay + windowDays * MS_PER_DAY;

  const expiring = input.pantryItems
    .map((item) => ({ item, expiryTime: parseExpiryTime(item.expiresAt) }))
    .filter(
      (entry): entry is { item: PantryItem; expiryTime: number } =>
        entry.expiryTime !== null && entry.expiryTime <= cutoff,
    )
    .sort((a, b) => a.expiryTime - b.expiryTime || compareNormalized(a.item.name, b.item.name))
    .map((entry) => entry.item);

  const expiringNormalizedNames = new Set(
    expiring.map((item) => normalizePantryMatchName(item.name)),
  );

  const suggestions: RecipeSuggestion[] = [];

  if (expiringNormalizedNames.size > 0) {
    for (const recipe of input.recipes) {
      const match = computePantryMatch(recipe, input.pantryItems);
      const expiringMatchCount = match.matched.reduce((count, current) => {
        const key = normalizePantryMatchName(current.ingredient.name);
        return expiringNormalizedNames.has(key) ? count + 1 : count;
      }, 0);

      if (expiringMatchCount === 0) {
        continue;
      }

      suggestions.push({
        recipe,
        expiringMatchCount,
        pantryMatchCount: match.matchedCount,
        totalIngredientCount: match.totalCount,
      });
    }

    suggestions.sort((a, b) => {
      if (b.expiringMatchCount !== a.expiringMatchCount) {
        return b.expiringMatchCount - a.expiringMatchCount;
      }
      if (b.pantryMatchCount !== a.pantryMatchCount) {
        return b.pantryMatchCount - a.pantryMatchCount;
      }
      return compareNormalized(a.recipe.title, b.recipe.title);
    });
  }

  return { expiring, suggestions };
}

const MS_PER_DAY = 86_400_000;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseExpiryTime(expiresAt: string | null): number | null {
  if (!expiresAt) {
    return null;
  }
  const time = Date.parse(`${expiresAt}T00:00:00.000Z`);
  return Number.isNaN(time) ? null : time;
}

function compareNormalized(a: string, b: string): number {
  return a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());
}
