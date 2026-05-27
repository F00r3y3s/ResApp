import { describe, expect, it } from '@jest/globals';

import type { PantryItem } from '@/features/pantry/pantry-repository';

import { computePantryMatch } from './pantry-match';
import type { Recipe } from './recipes-repository';

function pantryItem(name: string, normalizedName?: string): PantryItem {
  return {
    localId: `local-${name}`,
    name,
    normalizedName: normalizedName ?? name.toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'pantry',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
  };
}

function recipeWith(ingredientNames: string[]): Recipe {
  return {
    localId: 'test-recipe',
    seedId: null,
    title: 'Test',
    cuisine: 'test',
    dietTags: [],
    allergens: [],
    prepMinutes: 0,
    cookMinutes: 0,
    servings: 2,
    ingredients: ingredientNames.map((name) => ({ name, quantity: '1', unit: 'whole' })),
    steps: [],
    imageKey: null,
    source: '',
    attribution: '',
    license: '',
    isSaved: false,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
  };
}

describe('computePantryMatch', () => {
  it('returns every ingredient as missing when the pantry is empty', () => {
    const recipe = recipeWith(['Red lentils', 'Garlic', 'Cumin']);

    const match = computePantryMatch(recipe, []);

    expect(match.matched).toEqual([]);
    expect(match.missing.map((m) => m.ingredient.name)).toEqual([
      'Red lentils',
      'Garlic',
      'Cumin',
    ]);
    expect(match.matchedCount).toBe(0);
    expect(match.totalCount).toBe(3);
  });

  it('matches ingredients to pantry items by normalized name', () => {
    const recipe = recipeWith(['Red lentils', 'Garlic', 'Cumin']);
    const pantry = [pantryItem('Red lentils'), pantryItem('Garlic')];

    const match = computePantryMatch(recipe, pantry);

    expect(match.matched.map((m) => m.ingredient.name)).toEqual(['Red lentils', 'Garlic']);
    expect(match.missing.map((m) => m.ingredient.name)).toEqual(['Cumin']);
    expect(match.matchedCount).toBe(2);
    expect(match.totalCount).toBe(3);
    expect(match.matched[0].pantryItem.name).toBe('Red lentils');
  });

  it('matches case- and whitespace-insensitive ingredient names', () => {
    const recipe = recipeWith(['  RED LENTILS  ', 'GaRlIc']);
    const pantry = [
      pantryItem('red lentils', 'red lentils'),
      pantryItem('Garlic', 'garlic'),
    ];

    const match = computePantryMatch(recipe, pantry);

    expect(match.matchedCount).toBe(2);
    expect(match.missing).toEqual([]);
  });
});
