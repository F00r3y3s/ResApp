import { describe, expect, it } from '@jest/globals';

import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import { subtractPantryFromRecipe } from './grocery-model';

function pantry(name: string, overrides: Partial<PantryItem> = {}): PantryItem {
  const normalizedName =
    overrides.normalizedName ?? name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  return {
    localId: overrides.localId ?? `local-${normalizedName}`,
    name,
    normalizedName,
    quantity: overrides.quantity ?? 1,
    unit: overrides.unit ?? 'whole',
    location: overrides.location ?? 'pantry',
    expiresAt: overrides.expiresAt ?? null,
    privacy: 'local-only',
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
  };
}

function recipeWith(ingredients: { name: string; quantity?: string; unit?: string }[]): Recipe {
  return {
    localId: 'seed-001',
    seedId: 'seed-001',
    title: 'Family Lentil Soup',
    cuisine: 'levantine',
    dietTags: [],
    allergens: [],
    prepMinutes: 0,
    cookMinutes: 0,
    servings: 2,
    ingredients: ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity ?? '1',
      unit: i.unit ?? 'whole',
    })),
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

describe('subtractPantryFromRecipe', () => {
  it('returns every ingredient as missing when the pantry is empty', () => {
    const recipe = recipeWith([
      { name: 'Red lentils' },
      { name: 'Garlic' },
      { name: 'Cumin' },
    ]);

    const result = subtractPantryFromRecipe({ recipe, pantryItems: [] });

    expect(result.alreadyHave).toEqual([]);
    expect(result.missing.map((m) => m.name)).toEqual(['Red lentils', 'Garlic', 'Cumin']);
  });

  it('marks every ingredient as already-have when the pantry covers all of them', () => {
    const recipe = recipeWith([{ name: 'Red lentils' }, { name: 'Garlic' }]);
    const pantryItems = [pantry('Red lentils'), pantry('Garlic')];

    const result = subtractPantryFromRecipe({ recipe, pantryItems });

    expect(result.missing).toEqual([]);
    expect(result.alreadyHave.map((i) => i.name)).toEqual(['Red lentils', 'Garlic']);
  });

  it('splits a partial match into missing and already-have', () => {
    const recipe = recipeWith([
      { name: 'Red lentils' },
      { name: 'Garlic' },
      { name: 'Cumin' },
    ]);
    const pantryItems = [pantry('Garlic')];

    const result = subtractPantryFromRecipe({ recipe, pantryItems });

    expect(result.missing.map((m) => m.name)).toEqual(['Red lentils', 'Cumin']);
    expect(result.alreadyHave.map((i) => i.name)).toEqual(['Garlic']);
  });

  it('matches case- and whitespace-insensitive names', () => {
    const recipe = recipeWith([{ name: '  RED LENTILS  ' }, { name: 'GaRlIc' }]);
    const pantryItems = [
      pantry('red lentils', { normalizedName: 'red lentils' }),
      pantry('Garlic', { normalizedName: 'garlic' }),
    ];

    const result = subtractPantryFromRecipe({ recipe, pantryItems });

    expect(result.missing).toEqual([]);
    expect(result.alreadyHave).toHaveLength(2);
  });

  it('matches simple plural/singular aliases (tomato vs tomatoes)', () => {
    const recipe = recipeWith([{ name: 'Tomatoes' }, { name: 'Onion' }]);
    const pantryItems = [
      pantry('Tomato', { normalizedName: 'tomato' }),
      pantry('Onions', { normalizedName: 'onions' }),
    ];

    const result = subtractPantryFromRecipe({ recipe, pantryItems });

    expect(result.missing).toEqual([]);
    expect(result.alreadyHave.map((i) => i.name)).toEqual(['Tomatoes', 'Onion']);
  });

  it('still subtracts by name when the unit differs (documented decision)', () => {
    // T5.1 deliberately matches by name only. Quantity reconciliation across
    // unit families (e.g. cups vs grams) is out of scope; that's T5.3+.
    const recipe = recipeWith([{ name: 'Olive oil', quantity: '2', unit: 'tbsp' }]);
    const pantryItems = [pantry('Olive oil', { unit: 'litres', quantity: 1 })];

    const result = subtractPantryFromRecipe({ recipe, pantryItems });

    expect(result.alreadyHave.map((i) => i.name)).toEqual(['Olive oil']);
    expect(result.missing).toEqual([]);
  });

  it('produces grocery item drafts with normalized names and recipe attribution for missing items', () => {
    const recipe = recipeWith([
      { name: ' Red lentils ', quantity: '1.5', unit: 'cups' },
      { name: 'Garlic', quantity: '3', unit: 'cloves' },
    ]);
    const pantryItems = [pantry('Garlic')];

    const result = subtractPantryFromRecipe({ recipe, pantryItems });

    expect(result.missing).toEqual([
      {
        name: 'Red lentils',
        normalizedName: 'red lentils',
        quantity: '1.5',
        unit: 'cups',
        recipeId: 'seed-001',
        recipeTitle: 'Family Lentil Soup',
      },
    ]);
  });

  it('does not double-count when the recipe lists the same ingredient twice', () => {
    const recipe = recipeWith([
      { name: 'Garlic', quantity: '2', unit: 'cloves' },
      { name: 'garlic', quantity: '1', unit: 'clove' },
    ]);

    const result = subtractPantryFromRecipe({ recipe, pantryItems: [] });

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].name).toBe('Garlic');
  });
});
