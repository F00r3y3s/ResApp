import { describe, expect, it } from '@jest/globals';

import type { Recipe } from './recipes-repository';
import { remixRecipe } from './remix-recipe';

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    localId: 'original-123',
    seedId: 'seed-001',
    title: 'Family Lentil Soup',
    cuisine: 'levantine',
    dietTags: ['vegan', 'vegetarian', 'halal'],
    allergens: [],
    prepMinutes: 10,
    cookMinutes: 30,
    servings: 4,
    ingredients: [
      { name: 'Red lentils', quantity: '1.5', unit: 'cups' },
      { name: 'Onion', quantity: '1', unit: 'large' },
    ],
    steps: [
      { order: 1, instruction: 'Dice onion and mince garlic.' },
      { order: 2, instruction: 'Heat olive oil in a large pot.' },
    ],
    imageKey: null,
    source: 'Family AI Kitchen Originals',
    attribution: 'Family AI Kitchen — original recipe, freely reusable',
    license: 'CC0',
    isSaved: true,
    privacy: 'local-only',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('remixRecipe', () => {
  it('copies all recipe fields from the original', () => {
    const original = makeRecipe();
    const input = remixRecipe(original);

    expect(input.title).toBe(original.title);
    expect(input.cuisine).toBe(original.cuisine);
    expect(input.dietTags).toEqual(original.dietTags);
    expect(input.allergens).toEqual(original.allergens);
    expect(input.prepMinutes).toBe(original.prepMinutes);
    expect(input.cookMinutes).toBe(original.cookMinutes);
    expect(input.servings).toBe(original.servings);
    expect(input.ingredients).toEqual(original.ingredients);
    expect(input.steps).toEqual(original.steps);
    expect(input.imageKey).toBe(original.imageKey);
    expect(input.source).toBe(original.source);
    expect(input.license).toBe(original.license);
  });

  it('sets remixedFrom with the original recipe id, title, and attribution', () => {
    const original = makeRecipe();
    const input = remixRecipe(original);

    expect(input.remixedFrom).toEqual({
      recipeId: 'original-123',
      title: 'Family Lentil Soup',
      attribution: 'Family AI Kitchen — original recipe, freely reusable',
    });
  });

  it('sets attribution to "Remixed from [original title]"', () => {
    const original = makeRecipe({ title: 'Spicy Chickpea Bowl' });
    const input = remixRecipe(original);

    expect(input.attribution).toBe('Remixed from Spicy Chickpea Bowl');
  });

  it('references the immediate parent when remixing a recipe that is itself a remix', () => {
    const parentRemix = makeRecipe({
      localId: 'remix-456',
      title: 'My Spicy Lentil Soup',
      attribution: 'Remixed from Family Lentil Soup',
      remixedFrom: {
        recipeId: 'original-123',
        title: 'Family Lentil Soup',
        attribution: 'Family AI Kitchen — original recipe, freely reusable',
      },
    });

    const input = remixRecipe(parentRemix);

    // Should reference the immediate parent, not the root
    expect(input.remixedFrom).toEqual({
      recipeId: 'remix-456',
      title: 'My Spicy Lentil Soup',
      attribution: 'Remixed from Family Lentil Soup',
    });
    expect(input.attribution).toBe('Remixed from My Spicy Lentil Soup');
  });

  it('allows overriding title', () => {
    const original = makeRecipe();
    const input = remixRecipe(original, { title: 'My Custom Soup' });

    expect(input.title).toBe('My Custom Soup');
    // remixedFrom still references the original
    expect(input.remixedFrom!.title).toBe('Family Lentil Soup');
  });

  it('allows overriding ingredients', () => {
    const original = makeRecipe();
    const newIngredients = [{ name: 'Green lentils', quantity: '2', unit: 'cups' }];
    const input = remixRecipe(original, { ingredients: newIngredients });

    expect(input.ingredients).toEqual(newIngredients);
  });

  it('allows overriding steps', () => {
    const original = makeRecipe();
    const newSteps = [{ order: 1, instruction: 'Do everything at once.' }];
    const input = remixRecipe(original, { steps: newSteps });

    expect(input.steps).toEqual(newSteps);
  });

  it('does not mutate the original recipe object', () => {
    const original = makeRecipe();
    const originalCopy = JSON.parse(JSON.stringify(original));
    remixRecipe(original);

    expect(original).toEqual(originalCopy);
  });
});
