import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

/**
 * A draft of a grocery item produced by subtracting the pantry from a recipe.
 * The repository is responsible for assigning a `localId`, timestamps, and
 * persistence; this draft is intentionally storage-agnostic.
 */
export type GroceryItemDraft = {
  name: string;
  normalizedName: string;
  quantity: string;
  unit: string;
  recipeId: string | null;
  recipeTitle: string | null;
};

export type SubtractPantryFromRecipeInput = {
  recipe: Recipe;
  pantryItems: PantryItem[];
};

export type SubtractPantryFromRecipeResult = {
  /** Drafts for every recipe ingredient that still needs to be bought. */
  missing: GroceryItemDraft[];
  /** The original recipe ingredients that the pantry already covered. */
  alreadyHave: Recipe['ingredients'];
};

/**
 * Subtract the pantry from a recipe to produce missing-ingredient grocery drafts.
 *
 * Decisions (intentional for T5.1):
 * - Match by normalized ingredient name only. Whitespace and case are ignored.
 *   Simple plural/singular aliases (e.g. "tomato" vs "tomatoes") are also
 *   treated as the same ingredient via {@link buildAliasKeys}.
 * - Unit/quantity reconciliation across unit families (cups vs grams, etc.) is
 *   intentionally out of scope. If a recipe calls for "2 tbsp Olive oil" and
 *   the pantry has "1 litre Olive oil", we still treat the pantry as covering
 *   it. Quantity-aware subtraction is deferred to T5.3+.
 * - Duplicate ingredients in a single recipe are de-duplicated by their
 *   normalized name so we don't double-add to the grocery list.
 *
 * Pure function; safe to call repeatedly without side effects.
 */
export function subtractPantryFromRecipe({
  recipe,
  pantryItems,
}: SubtractPantryFromRecipeInput): SubtractPantryFromRecipeResult {
  const pantryKeys = new Set<string>();
  for (const item of pantryItems) {
    for (const key of buildAliasKeys(item.normalizedName)) {
      pantryKeys.add(key);
    }
  }

  const missing: GroceryItemDraft[] = [];
  const alreadyHave: Recipe['ingredients'] = [];
  const seenInRecipe = new Set<string>();

  for (const ingredient of recipe.ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);
    const aliasKeys = buildAliasKeys(normalizedName);

    if (seenInRecipe.has(normalizedName)) {
      continue;
    }
    seenInRecipe.add(normalizedName);

    const covered = aliasKeys.some((key) => pantryKeys.has(key));
    if (covered) {
      alreadyHave.push(ingredient);
    } else {
      missing.push({
        name: cleanWhitespace(ingredient.name),
        normalizedName,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        recipeId: recipe.seedId ?? recipe.localId ?? null,
        recipeTitle: recipe.title ?? null,
      });
    }
  }

  return { missing, alreadyHave };
}

/**
 * Normalize an ingredient name so equivalent strings hash to the same key.
 * Trims, collapses internal whitespace, and lowercases.
 */
export function normalizeIngredientName(name: string): string {
  return cleanWhitespace(name).toLocaleLowerCase();
}

/**
 * Generate the set of alias keys that should be considered equivalent to the
 * given normalized name. Used by both pantry-side and recipe-side lookup.
 *
 * The set covers simple English plural/singular morphology in both
 * directions:
 *   "tomatoes" -> {"tomatoes", "tomatoe", "tomato"}
 *   "tomato"   -> {"tomato", "tomatos", "tomatoes"}
 *   "onions"   -> {"onions", "onion"}
 *   "onion"    -> {"onion", "onions", "oniones"}
 *
 * Two ingredients are considered the same when their alias key sets share at
 * least one element. Anything richer (synonyms, ingredient taxonomies, unit
 * normalization) belongs in a later ticket.
 */
export function buildAliasKeys(normalizedName: string): string[] {
  const keys = new Set<string>();
  keys.add(normalizedName);
  if (normalizedName.length > 4 && normalizedName.endsWith('es')) {
    keys.add(normalizedName.slice(0, -2));
  }
  if (normalizedName.length > 3 && normalizedName.endsWith('s')) {
    keys.add(normalizedName.slice(0, -1));
  }
  if (normalizedName.length > 2 && !normalizedName.endsWith('s')) {
    keys.add(`${normalizedName}s`);
    keys.add(`${normalizedName}es`);
  }
  return [...keys];
}

function cleanWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
