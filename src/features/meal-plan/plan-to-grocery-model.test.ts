import { describe, expect, it } from '@jest/globals';

import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe, RecipeIngredient } from '@/features/recipes/recipes-repository';

import type { MealPlanEntry } from './meal-plan-repository';
import {
    aggregateIngredientsFromPlan,
    previewGroceryFromPlan,
} from './plan-to-grocery-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ingredient(name: string, quantity: string, unit: string): RecipeIngredient {
  return { name, quantity, unit };
}

function recipe(overrides: Partial<Recipe> & { localId: string }): Recipe {
  return {
    localId: overrides.localId,
    seedId: overrides.seedId ?? null,
    title: overrides.title ?? 'Test Recipe',
    cuisine: overrides.cuisine ?? 'test',
    dietTags: overrides.dietTags ?? [],
    allergens: overrides.allergens ?? [],
    prepMinutes: overrides.prepMinutes ?? 10,
    cookMinutes: overrides.cookMinutes ?? 20,
    servings: overrides.servings ?? 4,
    ingredients: overrides.ingredients ?? [],
    steps: overrides.steps ?? [],
    imageKey: overrides.imageKey ?? null,
    source: overrides.source ?? '',
    attribution: overrides.attribution ?? '',
    license: overrides.license ?? 'private',
    isSaved: overrides.isSaved ?? true,
    privacy: 'local-only',
    createdAt: overrides.createdAt ?? '2026-05-25T08:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-25T08:00:00.000Z',
  };
}

function entry(recipeId: string, day: number = 0, slot: 'breakfast' | 'lunch' | 'dinner' = 'dinner'): MealPlanEntry {
  return {
    weekStartIso: '2026-05-25',
    day: day as MealPlanEntry['day'],
    slot,
    recipeId,
    privacy: 'local-only',
    createdAt: '2026-05-25T08:00:00.000Z',
    updatedAt: '2026-05-25T08:00:00.000Z',
  };
}

function pantryItem(name: string): PantryItem {
  return {
    localId: `local-pantry-${name}`,
    name,
    normalizedName: name.trim().replace(/\s+/g, ' ').toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'pantry',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-25T08:00:00.000Z',
    updatedAt: '2026-05-25T08:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// aggregateIngredientsFromPlan
// ---------------------------------------------------------------------------

describe('aggregateIngredientsFromPlan', () => {
  it('returns an empty list when there are no entries', () => {
    const result = aggregateIngredientsFromPlan([], new Map());
    expect(result).toEqual([]);
  });

  it('returns ingredients from a single recipe', () => {
    const r = recipe({
      localId: 'r1',
      ingredients: [
        ingredient('Garlic', '3', 'cloves'),
        ingredient('Olive oil', '2', 'tbsp'),
      ],
    });
    const entries = [entry('r1')];
    const recipesById = new Map([['r1', r]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ normalizedName: 'garlic', quantity: '3', unit: 'cloves' }),
        expect.objectContaining({ normalizedName: 'olive oil', quantity: '2', unit: 'tbsp' }),
      ]),
    );
  });

  it('sums quantities when same ingredient + same unit appears in multiple recipes', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Garlic', '3', 'cloves')],
    });
    const r2 = recipe({
      localId: 'r2',
      ingredients: [ingredient('Garlic', '2', 'cloves')],
    });
    const entries = [entry('r1', 0), entry('r2', 1)];
    const recipesById = new Map([['r1', r1], ['r2', r2]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ normalizedName: 'garlic', quantity: '5', unit: 'cloves' }),
    );
  });

  it('keeps separate rows when same ingredient has different units', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Garlic', '3', 'cloves')],
    });
    const r2 = recipe({
      localId: 'r2',
      ingredients: [ingredient('Garlic', '1', 'head')],
    });
    const entries = [entry('r1', 0), entry('r2', 1)];
    const recipesById = new Map([['r1', r1], ['r2', r2]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ normalizedName: 'garlic', quantity: '3', unit: 'cloves' }),
        expect.objectContaining({ normalizedName: 'garlic', quantity: '1', unit: 'head' }),
      ]),
    );
  });

  it('handles non-numeric quantities by keeping them separate', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Salt', 'to taste', 'pinch')],
    });
    const r2 = recipe({
      localId: 'r2',
      ingredients: [ingredient('Salt', 'a dash', 'pinch')],
    });
    const entries = [entry('r1', 0), entry('r2', 1)];
    const recipesById = new Map([['r1', r1], ['r2', r2]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    // Non-numeric quantities cannot be summed, so keep separate
    expect(result).toHaveLength(2);
  });

  it('sums when one quantity is numeric and the other is also numeric', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Onion', '2', 'whole')],
    });
    const r2 = recipe({
      localId: 'r2',
      ingredients: [ingredient('Onion', '1', 'whole')],
    });
    const entries = [entry('r1', 0), entry('r2', 1)];
    const recipesById = new Map([['r1', r1], ['r2', r2]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ normalizedName: 'onion', quantity: '3', unit: 'whole' }),
    );
  });

  it('normalizes ingredient names (case, whitespace) for aggregation', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('  Olive Oil  ', '2', 'tbsp')],
    });
    const r2 = recipe({
      localId: 'r2',
      ingredients: [ingredient('olive oil', '1', 'tbsp')],
    });
    const entries = [entry('r1', 0), entry('r2', 1)];
    const recipesById = new Map([['r1', r1], ['r2', r2]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ normalizedName: 'olive oil', quantity: '3', unit: 'tbsp' }),
    );
  });

  it('skips entries whose recipeId is not in the recipesById map', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Garlic', '3', 'cloves')],
    });
    const entries = [entry('r1', 0), entry('missing-recipe', 1)];
    const recipesById = new Map([['r1', r1]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ normalizedName: 'garlic' }),
    );
  });

  it('deduplicates when the same recipe appears in multiple slots', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Rice', '1', 'cup')],
    });
    const entries = [entry('r1', 0, 'lunch'), entry('r1', 1, 'dinner')];
    const recipesById = new Map([['r1', r1]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ normalizedName: 'rice', quantity: '2', unit: 'cup' }),
    );
  });

  it('handles fractional quantities', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Butter', '0.5', 'cup')],
    });
    const r2 = recipe({
      localId: 'r2',
      ingredients: [ingredient('Butter', '0.25', 'cup')],
    });
    const entries = [entry('r1', 0), entry('r2', 1)];
    const recipesById = new Map([['r1', r1], ['r2', r2]]);

    const result = aggregateIngredientsFromPlan(entries, recipesById);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ normalizedName: 'butter', quantity: '0.75', unit: 'cup' }),
    );
  });
});

// ---------------------------------------------------------------------------
// previewGroceryFromPlan
// ---------------------------------------------------------------------------

describe('previewGroceryFromPlan', () => {
  it('returns all items as toAdd when pantry is empty', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [
        ingredient('Garlic', '3', 'cloves'),
        ingredient('Olive oil', '2', 'tbsp'),
      ],
    });
    const entries = [entry('r1')];
    const recipesById = new Map([['r1', r1]]);

    const result = previewGroceryFromPlan({
      entries,
      recipesById,
      pantryItems: [],
    });

    expect(result.toAdd).toHaveLength(2);
    expect(result.alreadyHave).toHaveLength(0);
    expect(result.summary).toEqual({
      totalItems: 2,
      pantryCovers: 0,
      toBuy: 2,
    });
  });

  it('subtracts pantry items from the aggregated list', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [
        ingredient('Garlic', '3', 'cloves'),
        ingredient('Olive oil', '2', 'tbsp'),
        ingredient('Cumin', '1', 'tsp'),
      ],
    });
    const entries = [entry('r1')];
    const recipesById = new Map([['r1', r1]]);

    const result = previewGroceryFromPlan({
      entries,
      recipesById,
      pantryItems: [pantryItem('Garlic'), pantryItem('Cumin')],
    });

    expect(result.toAdd).toHaveLength(1);
    expect(result.toAdd[0]).toEqual(
      expect.objectContaining({ normalizedName: 'olive oil' }),
    );
    expect(result.alreadyHave).toHaveLength(2);
    expect(result.summary).toEqual({
      totalItems: 3,
      pantryCovers: 2,
      toBuy: 1,
    });
  });

  it('handles plural/singular pantry matching (tomatoes vs tomato)', () => {
    const r1 = recipe({
      localId: 'r1',
      ingredients: [ingredient('Tomatoes', '4', 'whole')],
    });
    const entries = [entry('r1')];
    const recipesById = new Map([['r1', r1]]);

    const result = previewGroceryFromPlan({
      entries,
      recipesById,
      pantryItems: [pantryItem('Tomato')],
    });

    expect(result.toAdd).toHaveLength(0);
    expect(result.alreadyHave).toHaveLength(1);
    expect(result.summary.pantryCovers).toBe(1);
  });

  it('produces GroceryItemDraft with null recipeId/recipeTitle for aggregated items', () => {
    const r1 = recipe({
      localId: 'r1',
      title: 'Soup',
      ingredients: [ingredient('Garlic', '3', 'cloves')],
    });
    const entries = [entry('r1')];
    const recipesById = new Map([['r1', r1]]);

    const result = previewGroceryFromPlan({
      entries,
      recipesById,
      pantryItems: [],
    });

    expect(result.toAdd[0]).toEqual(
      expect.objectContaining({
        name: 'Garlic',
        normalizedName: 'garlic',
        quantity: '3',
        unit: 'cloves',
        recipeId: null,
        recipeTitle: null,
      }),
    );
  });

  it('returns empty results when no entries are provided', () => {
    const result = previewGroceryFromPlan({
      entries: [],
      recipesById: new Map(),
      pantryItems: [pantryItem('Garlic')],
    });

    expect(result.toAdd).toHaveLength(0);
    expect(result.alreadyHave).toHaveLength(0);
    expect(result.summary).toEqual({
      totalItems: 0,
      pantryCovers: 0,
      toBuy: 0,
    });
  });
});
