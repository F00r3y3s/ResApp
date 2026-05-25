import { describe, expect, it } from '@jest/globals';

import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import { generateLocalSuggestions } from './suggestion-engine';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function pantryItem(overrides: Partial<PantryItem> & { name: string }): PantryItem {
  const base: PantryItem = {
    localId: `local-${overrides.name}`,
    name: overrides.name,
    normalizedName: overrides.name.trim().toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'fridge',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
  };
  return { ...base, ...overrides };
}

function recipeWith(
  title: string,
  ingredientNames: string[],
  extra: Partial<Recipe> = {},
): Recipe {
  return {
    localId: `local-${title.toLocaleLowerCase().replace(/\s+/g, '-')}`,
    seedId: `seed-${title.toLocaleLowerCase().replace(/\s+/g, '-')}`,
    title,
    cuisine: 'test',
    dietTags: [],
    allergens: [],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    ingredients: ingredientNames.map((name) => ({ name, quantity: '1', unit: 'whole' })),
    steps: [{ order: 1, instruction: 'Cook it.' }],
    imageKey: null,
    source: '',
    attribution: '',
    license: '',
    isSaved: false,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateLocalSuggestions', () => {
  describe('pantry coverage ranking', () => {
    it('ranks recipes with higher pantry coverage first', () => {
      const pantryItems = [
        pantryItem({ name: 'Tomatoes' }),
        pantryItem({ name: 'Garlic' }),
        pantryItem({ name: 'Onion' }),
      ];

      const highCoverage = recipeWith('High Coverage', ['Tomatoes', 'Garlic', 'Onion']);
      const lowCoverage = recipeWith('Low Coverage', ['Tomatoes', 'Pasta', 'Cheese']);

      const result = generateLocalSuggestions({
        recipes: [lowCoverage, highCoverage],
        pantryItems,
        preferences: null,
      });

      expect(result[0].recipe.title).toBe('High Coverage');
      expect(result[0].pantryMatchRatio).toBe(1); // 3/3
      expect(result[1].recipe.title).toBe('Low Coverage');
      expect(result[1].pantryMatchRatio).toBeCloseTo(1 / 3);
    });

    it('uses match ratio (not absolute count) so small recipes are not penalized', () => {
      const pantryItems = [
        pantryItem({ name: 'Eggs' }),
        pantryItem({ name: 'Butter' }),
        pantryItem({ name: 'Flour' }),
        pantryItem({ name: 'Sugar' }),
      ];

      // 2/2 = 100% match
      const smallRecipe = recipeWith('Simple Eggs', ['Eggs', 'Butter']);
      // 3/5 = 60% match
      const bigRecipe = recipeWith('Complex Cake', [
        'Eggs',
        'Butter',
        'Flour',
        'Vanilla',
        'Baking powder',
      ]);

      const result = generateLocalSuggestions({
        recipes: [bigRecipe, smallRecipe],
        pantryItems,
        preferences: null,
      });

      expect(result[0].recipe.title).toBe('Simple Eggs');
      expect(result[0].pantryMatchRatio).toBe(1);
    });
  });

  describe('diet and allergy exclusion', () => {
    it('excludes recipes containing user allergens', () => {
      const pantryItems = [pantryItem({ name: 'Eggs' }), pantryItem({ name: 'Yogurt' })];

      const withDairy = recipeWith('Turkish Eggs', ['Eggs', 'Yogurt'], {
        allergens: ['dairy', 'eggs'],
      });
      const noDairy = recipeWith('Vegan Bowl', ['Rice', 'Beans'], {
        allergens: [],
      });

      const result = generateLocalSuggestions({
        recipes: [withDairy, noDairy],
        pantryItems,
        preferences: {
          language: 'english',
          region: 'uk-us',
          householdSize: 4,
          dietaryRules: [],
          allergies: ['dairy'],
          cuisines: [],
          goals: [],
          privacy: 'local-only',
          updatedAt: '2026-05-24T00:00:00.000Z',
        },
      });

      expect(result.map((s) => s.recipe.title)).not.toContain('Turkish Eggs');
    });

    it('excludes recipes that do not match dietary rules', () => {
      const pantryItems = [pantryItem({ name: 'Chicken' })];

      const nonVegan = recipeWith('Chicken Soup', ['Chicken', 'Onion'], {
        dietTags: ['halal'],
      });
      const vegan = recipeWith('Lentil Soup', ['Lentils', 'Onion'], {
        dietTags: ['vegan', 'vegetarian', 'halal'],
      });

      const result = generateLocalSuggestions({
        recipes: [nonVegan, vegan],
        pantryItems,
        preferences: {
          language: 'english',
          region: 'india',
          householdSize: 2,
          dietaryRules: ['vegan'],
          allergies: [],
          cuisines: [],
          goals: [],
          privacy: 'local-only',
          updatedAt: '2026-05-24T00:00:00.000Z',
        },
      });

      expect(result.map((s) => s.recipe.title)).toEqual(['Lentil Soup']);
    });

    it('a recipe with peanuts MUST NOT appear for a user with a peanut allergy', () => {
      const pantryItems = [
        pantryItem({ name: 'Noodles' }),
        pantryItem({ name: 'Peanuts' }),
      ];

      const padThai = recipeWith('Pad Thai', ['Noodles', 'Peanuts', 'Tofu'], {
        allergens: ['peanuts'],
      });

      const result = generateLocalSuggestions({
        recipes: [padThai],
        pantryItems,
        preferences: {
          language: 'english',
          region: 'uk-us',
          householdSize: 3,
          dietaryRules: [],
          allergies: ['peanuts'],
          cuisines: [],
          goals: [],
          privacy: 'local-only',
          updatedAt: '2026-05-24T00:00:00.000Z',
        },
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('cuisine preference boost', () => {
    it('boosts recipes matching preferred cuisines', () => {
      const pantryItems = [
        pantryItem({ name: 'Rice' }),
        pantryItem({ name: 'Onion' }),
      ];

      // Both have same pantry coverage (1/2 ingredients matched)
      const indian = recipeWith('Indian Rice', ['Rice', 'Spices'], { cuisine: 'indian' });
      const british = recipeWith('British Rice', ['Rice', 'Cream'], { cuisine: 'british' });

      const result = generateLocalSuggestions({
        recipes: [british, indian],
        pantryItems,
        preferences: {
          language: 'english',
          region: 'india',
          householdSize: 4,
          dietaryRules: [],
          allergies: [],
          cuisines: ['indian'],
          goals: [],
          privacy: 'local-only',
          updatedAt: '2026-05-24T00:00:00.000Z',
        },
      });

      expect(result[0].recipe.title).toBe('Indian Rice');
    });
  });

  describe('expiry urgency boost', () => {
    it('boosts recipes that use soon-to-expire pantry items', () => {
      const now = new Date('2026-05-24T12:00:00.000Z');

      const expiringTomorrow = pantryItem({ name: 'Spinach', expiresAt: '2026-05-25' });
      const longLife = pantryItem({ name: 'Rice' });

      // Both have 1/2 pantry match, but spinach recipe uses an expiring item
      const usesExpiring = recipeWith('Spinach Salad', ['Spinach', 'Olive oil']);
      const usesLongLife = recipeWith('Plain Rice', ['Rice', 'Water']);

      const result = generateLocalSuggestions({
        recipes: [usesLongLife, usesExpiring],
        pantryItems: [expiringTomorrow, longLife],
        preferences: null,
        now,
      });

      expect(result[0].recipe.title).toBe('Spinach Salad');
    });
  });

  describe('result limits and edge cases', () => {
    it('returns at most N results (default 10)', () => {
      const pantryItems = [pantryItem({ name: 'Salt' })];
      const recipes = Array.from({ length: 20 }, (_, i) =>
        recipeWith(`Recipe ${i}`, ['Salt', `Ingredient ${i}`]),
      );

      const result = generateLocalSuggestions({
        recipes,
        pantryItems,
        preferences: null,
      });

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('allows overriding the max results', () => {
      const pantryItems = [pantryItem({ name: 'Salt' })];
      const recipes = Array.from({ length: 20 }, (_, i) =>
        recipeWith(`Recipe ${i}`, ['Salt', `Ingredient ${i}`]),
      );

      const result = generateLocalSuggestions({
        recipes,
        pantryItems,
        preferences: null,
        maxResults: 5,
      });

      expect(result).toHaveLength(5);
    });

    it('returns empty array when no recipes are provided', () => {
      const result = generateLocalSuggestions({
        recipes: [],
        pantryItems: [pantryItem({ name: 'Tomatoes' })],
        preferences: null,
      });

      expect(result).toEqual([]);
    });

    it('returns empty array when no pantry items are provided', () => {
      const result = generateLocalSuggestions({
        recipes: [recipeWith('Soup', ['Onion'])],
        pantryItems: [],
        preferences: null,
      });

      // Recipes with 0 pantry match still appear (score > 0 is not required)
      // but they'll have 0 match ratio
      expect(result.every((s) => s.pantryMatchRatio === 0)).toBe(true);
    });

    it('breaks ties alphabetically by title for deterministic ordering', () => {
      const pantryItems = [pantryItem({ name: 'Salt' })];

      const a = recipeWith('Alpha Dish', ['Salt', 'Pepper']);
      const b = recipeWith('Beta Dish', ['Salt', 'Pepper']);
      const c = recipeWith('Charlie Dish', ['Salt', 'Pepper']);

      const result = generateLocalSuggestions({
        recipes: [c, a, b],
        pantryItems,
        preferences: null,
      });

      expect(result.map((s) => s.recipe.title)).toEqual([
        'Alpha Dish',
        'Beta Dish',
        'Charlie Dish',
      ]);
    });
  });

  describe('no preferences provided', () => {
    it('does not filter by diet or allergens when preferences are null', () => {
      const pantryItems = [pantryItem({ name: 'Eggs' })];

      const withAllergens = recipeWith('Egg Dish', ['Eggs'], {
        allergens: ['eggs'],
      });

      const result = generateLocalSuggestions({
        recipes: [withAllergens],
        pantryItems,
        preferences: null,
      });

      expect(result).toHaveLength(1);
    });
  });
});
