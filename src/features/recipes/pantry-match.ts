import type { PantryItem } from '@/features/pantry/pantry-repository';

import type { Recipe, RecipeIngredient } from './recipes-repository';

export type IngredientMatch = {
  ingredient: RecipeIngredient;
  pantryItem: PantryItem;
};

export type IngredientMiss = {
  ingredient: RecipeIngredient;
};

export type PantryMatchResult = {
  matched: IngredientMatch[];
  missing: IngredientMiss[];
  matchedCount: number;
  totalCount: number;
};

export function computePantryMatch(
  recipe: Recipe,
  pantryItems: PantryItem[],
): PantryMatchResult {
  const pantryByNormalized = new Map<string, PantryItem>();
  for (const item of pantryItems) {
    if (!pantryByNormalized.has(item.normalizedName)) {
      pantryByNormalized.set(item.normalizedName, item);
    }
  }

  const matched: IngredientMatch[] = [];
  const missing: IngredientMiss[] = [];

  for (const ingredient of recipe.ingredients) {
    const key = normalizeIngredientName(ingredient.name);
    const pantryItem = pantryByNormalized.get(key);
    if (pantryItem) {
      matched.push({ ingredient, pantryItem });
    } else {
      missing.push({ ingredient });
    }
  }

  return {
    matched,
    missing,
    matchedCount: matched.length,
    totalCount: recipe.ingredients.length,
  };
}

function normalizeIngredientName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/**
 * Exposed for views that need to look up an individual ingredient's match
 * status without recomputing the whole result. Callers should compare against
 * the `normalizedName` of pantry items.
 */
export function normalizePantryMatchName(name: string): string {
  return normalizeIngredientName(name);
}
