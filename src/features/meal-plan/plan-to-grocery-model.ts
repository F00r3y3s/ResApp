import type { GroceryItemDraft } from '@/features/grocery/grocery-model';
import { buildAliasKeys, normalizeIngredientName } from '@/features/grocery/grocery-model';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import type { MealPlanEntry } from './meal-plan-repository';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AggregatedIngredient = {
  name: string;
  normalizedName: string;
  quantity: string;
  unit: string;
};

export type PreviewGroceryFromPlanInput = {
  entries: MealPlanEntry[];
  recipesById: Map<string, Recipe>;
  pantryItems: PantryItem[];
};

export type PreviewGroceryFromPlanResult = {
  toAdd: GroceryItemDraft[];
  alreadyHave: AggregatedIngredient[];
  summary: {
    totalItems: number;
    pantryCovers: number;
    toBuy: number;
  };
};

// ---------------------------------------------------------------------------
// aggregateIngredientsFromPlan
// ---------------------------------------------------------------------------

/**
 * Aggregate ingredients across all meal plan entries for the week.
 *
 * Rules:
 * - Same normalized name + same unit → sum numeric quantities.
 * - Same normalized name + different unit → keep separate rows.
 * - Non-numeric quantities → keep as separate rows (cannot sum "to taste" + "a dash").
 * - Entries whose recipeId is not in recipesById are skipped.
 */
export function aggregateIngredientsFromPlan(
  entries: MealPlanEntry[],
  recipesById: Map<string, Recipe>,
): AggregatedIngredient[] {
  // Key: `${normalizedName}::${unit}` → accumulated value
  const aggregation = new Map<string, AggregatedIngredient>();
  // Track non-summable entries separately
  const nonSummable: AggregatedIngredient[] = [];

  for (const entry of entries) {
    const recipe = recipesById.get(entry.recipeId);
    if (!recipe) continue;

    for (const ing of recipe.ingredients) {
      const normalizedName = normalizeIngredientName(ing.name);
      const cleanName = cleanWhitespace(ing.name);
      const unit = ing.unit.trim().toLocaleLowerCase();
      const key = `${normalizedName}::${unit}`;

      const numericQty = parseFloat(ing.quantity);

      if (Number.isNaN(numericQty)) {
        // Non-numeric quantity — cannot aggregate, keep as separate row
        nonSummable.push({
          name: cleanName,
          normalizedName,
          quantity: ing.quantity,
          unit: ing.unit,
        });
      } else {
        const existing = aggregation.get(key);
        if (existing) {
          const existingQty = parseFloat(existing.quantity);
          if (Number.isNaN(existingQty)) {
            // Existing was non-numeric (shouldn't happen in this branch), keep separate
            nonSummable.push({
              name: cleanName,
              normalizedName,
              quantity: ing.quantity,
              unit: ing.unit,
            });
          } else {
            // Sum the quantities
            const sum = existingQty + numericQty;
            existing.quantity = formatQuantity(sum);
          }
        } else {
          aggregation.set(key, {
            name: cleanName,
            normalizedName,
            quantity: formatQuantity(numericQty),
            unit: ing.unit,
          });
        }
      }
    }
  }

  return [...aggregation.values(), ...nonSummable];
}

// ---------------------------------------------------------------------------
// previewGroceryFromPlan
// ---------------------------------------------------------------------------

/**
 * Preview what a "generate grocery from plan" action would produce.
 * Aggregates ingredients, then subtracts pantry items using the same alias
 * matching logic as the grocery model.
 */
export function previewGroceryFromPlan(
  input: PreviewGroceryFromPlanInput,
): PreviewGroceryFromPlanResult {
  const { entries, recipesById, pantryItems } = input;

  const aggregated = aggregateIngredientsFromPlan(entries, recipesById);

  // Build pantry lookup using alias keys
  const pantryKeys = new Set<string>();
  for (const item of pantryItems) {
    for (const key of buildAliasKeys(item.normalizedName)) {
      pantryKeys.add(key);
    }
  }

  const toAdd: GroceryItemDraft[] = [];
  const alreadyHave: AggregatedIngredient[] = [];

  for (const agg of aggregated) {
    const aliasKeys = buildAliasKeys(agg.normalizedName);
    const covered = aliasKeys.some((key) => pantryKeys.has(key));

    if (covered) {
      alreadyHave.push(agg);
    } else {
      toAdd.push({
        name: agg.name,
        normalizedName: agg.normalizedName,
        quantity: agg.quantity,
        unit: agg.unit,
        recipeId: null,
        recipeTitle: null,
      });
    }
  }

  return {
    toAdd,
    alreadyHave,
    summary: {
      totalItems: aggregated.length,
      pantryCovers: alreadyHave.length,
      toBuy: toAdd.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function formatQuantity(num: number): string {
  // Avoid floating point artifacts like 0.30000000000000004
  return parseFloat(num.toFixed(10)).toString();
}
