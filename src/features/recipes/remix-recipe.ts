/**
 * Remix Recipe — creates a new recipe input from an existing recipe.
 *
 * The remixed recipe preserves attribution to the immediate parent,
 * keeping the remix chain traceable. The new recipe is private (local-only)
 * and saved to the user's collection.
 *
 * ## Circle post integration (deferred)
 * `src/features/cooksnap/` should eventually show a "Remixed from" badge
 * on cooksnap cards when the recipe has `remixedFrom`. This is not yet
 * implemented — do NOT modify cooksnap files.
 */

import type { Recipe, RecipeIngredient, RecipeStep, RemixedFrom } from './recipes-repository';

export type RemixRecipeInput = {
  title: string;
  cuisine: string;
  dietTags: string[];
  allergens: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  imageKey: string | null;
  source: string;
  attribution: string;
  license: string;
  /** Remix provenance — references the immediate parent recipe */
  remixedFrom: RemixedFrom;
};

export type RemixOverrides = Partial<Pick<Recipe, 'title' | 'ingredients' | 'steps'>>;

/**
 * Creates a new recipe input by remixing an existing recipe.
 *
 * - Copies all content fields from the original.
 * - Sets `remixedFrom` to reference the immediate parent (not the root).
 * - Sets `attribution` to "Remixed from [parent title]".
 * - Applies optional overrides for title, ingredients, or steps.
 */
export function remixRecipe(original: Recipe, overrides?: RemixOverrides): RemixRecipeInput {
  return {
    title: overrides?.title ?? original.title,
    cuisine: original.cuisine,
    dietTags: [...original.dietTags],
    allergens: [...original.allergens],
    prepMinutes: original.prepMinutes,
    cookMinutes: original.cookMinutes,
    servings: original.servings,
    ingredients: overrides?.ingredients
      ? overrides.ingredients.map((i) => ({ ...i }))
      : original.ingredients.map((i) => ({ ...i })),
    steps: overrides?.steps
      ? overrides.steps.map((s) => ({ ...s }))
      : original.steps.map((s) => ({ ...s })),
    imageKey: original.imageKey,
    source: original.source,
    attribution: `Remixed from ${original.title}`,
    license: original.license,
    remixedFrom: {
      recipeId: original.localId,
      title: original.title,
      attribution: original.attribution,
    },
  };
}
