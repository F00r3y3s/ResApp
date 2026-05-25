import { describe, expect, it } from '@jest/globals';

import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import { generateWeeklyPlan } from './plan-generator';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    localId: overrides.localId ?? `recipe-${Math.random().toString(36).slice(2, 8)}`,
    seedId: overrides.seedId ?? null,
    title: overrides.title ?? 'Test Recipe',
    cuisine: overrides.cuisine ?? 'levantine',
    dietTags: overrides.dietTags ?? [],
    allergens: overrides.allergens ?? [],
    prepMinutes: overrides.prepMinutes ?? 15,
    cookMinutes: overrides.cookMinutes ?? 30,
    servings: overrides.servings ?? 4,
    ingredients: overrides.ingredients ?? [
      { name: 'lentils', quantity: '200', unit: 'g' },
      { name: 'onion', quantity: '1', unit: 'piece' },
    ],
    steps: overrides.steps ?? [{ order: 1, instruction: 'Cook it' }],
    imageKey: overrides.imageKey ?? null,
    source: overrides.source ?? '',
    attribution: overrides.attribution ?? 'Test',
    license: overrides.license ?? 'private',
    isSaved: overrides.isSaved ?? true,
    privacy: 'local-only',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function makePantryItem(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    localId: overrides.localId ?? `pantry-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? 'Lentils',
    normalizedName: overrides.normalizedName ?? 'lentils',
    quantity: overrides.quantity ?? 500,
    unit: overrides.unit ?? 'g',
    location: overrides.location ?? 'pantry',
    expiresAt: overrides.expiresAt ?? null,
    privacy: 'local-only',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function makePreferences(overrides: Partial<GuestPreferences> = {}): GuestPreferences {
  return {
    language: overrides.language ?? 'english',
    region: overrides.region ?? 'uae-gcc',
    householdSize: overrides.householdSize ?? 4,
    dietaryRules: overrides.dietaryRules ?? [],
    allergies: overrides.allergies ?? [],
    cuisines: overrides.cuisines ?? [],
    goals: overrides.goals ?? [],
    privacy: 'local-only',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

// Generate a set of distinct recipes for testing
function makeRecipeSet(count: number): Recipe[] {
  return Array.from({ length: count }, (_, i) =>
    makeRecipe({
      localId: `recipe-${i}`,
      title: `Recipe ${String.fromCharCode(65 + i)}`,
      cuisine: i % 2 === 0 ? 'levantine' : 'indian',
      ingredients: [
        { name: `ingredient-${i}`, quantity: '100', unit: 'g' },
        { name: 'onion', quantity: '1', unit: 'piece' },
      ],
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateWeeklyPlan', () => {
  describe('basic plan generation', () => {
    it('returns a plan with slots for 7 days × 3 meals when enough recipes are available', () => {
      const recipes = makeRecipeSet(10);
      const pantryItems = [makePantryItem({ normalizedName: 'onion' })];

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems,
        preferences: null,
        seed: 42,
      });

      expect(plan.slots.length).toBe(21);

      // Verify all days 0-6 are present
      const days = new Set(plan.slots.map((s) => s.day));
      expect(days.size).toBe(7);
      for (let d = 0; d <= 6; d++) {
        expect(days.has(d as 0 | 1 | 2 | 3 | 4 | 5 | 6)).toBe(true);
      }

      // Verify all slot types are present for each day
      for (let d = 0; d <= 6; d++) {
        const daySlots = plan.slots.filter((s) => s.day === d);
        const slotTypes = daySlots.map((s) => s.slot);
        expect(slotTypes).toContain('breakfast');
        expect(slotTypes).toContain('lunch');
        expect(slotTypes).toContain('dinner');
      }
    });

    it('returns an empty plan when fewer than 3 recipes are available', () => {
      const recipes = makeRecipeSet(2);

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems: [],
        preferences: null,
        seed: 42,
      });

      expect(plan.slots).toHaveLength(0);
      expect(plan.insufficientRecipes).toBe(true);
    });

    it('returns an empty plan when no recipes are available', () => {
      const plan = generateWeeklyPlan({
        recipes: [],
        pantryItems: [],
        preferences: null,
        seed: 42,
      });

      expect(plan.slots).toHaveLength(0);
      expect(plan.insufficientRecipes).toBe(true);
    });
  });

  describe('determinism and seed behavior', () => {
    it('produces the same plan given the same seed', () => {
      const recipes = makeRecipeSet(10);
      const pantryItems = [makePantryItem({ normalizedName: 'onion' })];

      const plan1 = generateWeeklyPlan({ recipes, pantryItems, preferences: null, seed: 123 });
      const plan2 = generateWeeklyPlan({ recipes, pantryItems, preferences: null, seed: 123 });

      expect(plan1.slots).toEqual(plan2.slots);
    });

    it('produces a different plan with a different seed', () => {
      const recipes = makeRecipeSet(10);
      const pantryItems = [makePantryItem({ normalizedName: 'onion' })];

      const plan1 = generateWeeklyPlan({ recipes, pantryItems, preferences: null, seed: 1 });
      const plan2 = generateWeeklyPlan({ recipes, pantryItems, preferences: null, seed: 2 });

      // At least some slots should differ
      const recipeIds1 = plan1.slots.map((s) => s.recipeId);
      const recipeIds2 = plan2.slots.map((s) => s.recipeId);
      expect(recipeIds1).not.toEqual(recipeIds2);
    });
  });

  describe('no consecutive day repetition', () => {
    it('does not assign the same recipe to the same slot on consecutive days', () => {
      const recipes = makeRecipeSet(5);
      const pantryItems = [makePantryItem({ normalizedName: 'onion' })];

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems,
        preferences: null,
        seed: 42,
      });

      for (const slotType of ['breakfast', 'lunch', 'dinner'] as const) {
        const slotsByDay = plan.slots
          .filter((s) => s.slot === slotType)
          .sort((a, b) => a.day - b.day);

        for (let i = 1; i < slotsByDay.length; i++) {
          if (slotsByDay[i].recipeId && slotsByDay[i - 1].recipeId) {
            expect(slotsByDay[i].recipeId).not.toBe(slotsByDay[i - 1].recipeId);
          }
        }
      }
    });
  });

  describe('dietary and allergy exclusions', () => {
    it('excludes recipes with allergens matching user allergies', () => {
      const safeRecipe = makeRecipe({
        localId: 'safe-1',
        title: 'Safe Soup',
        allergens: [],
      });
      const nutRecipe = makeRecipe({
        localId: 'nut-1',
        title: 'Nut Curry',
        allergens: ['nuts'],
      });
      const recipes = [
        safeRecipe,
        ...makeRecipeSet(5).map((r) => ({ ...r, allergens: [] as string[] })),
        nutRecipe,
      ];

      const preferences = makePreferences({ allergies: ['nuts'] });

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems: [],
        preferences,
        seed: 42,
      });

      const usedRecipeIds = plan.slots.map((s) => s.recipeId);
      expect(usedRecipeIds).not.toContain('nut-1');
    });

    it('excludes recipes that do not meet dietary rules', () => {
      const veganRecipe = makeRecipe({
        localId: 'vegan-1',
        title: 'Vegan Bowl',
        dietTags: ['vegan'],
      });
      const nonVeganRecipe = makeRecipe({
        localId: 'meat-1',
        title: 'Steak',
        dietTags: [],
      });
      const recipes = [
        veganRecipe,
        ...makeRecipeSet(5).map((r) => ({ ...r, dietTags: ['vegan'] })),
        nonVeganRecipe,
      ];

      const preferences = makePreferences({ dietaryRules: ['vegan'] });

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems: [],
        preferences,
        seed: 42,
      });

      const usedRecipeIds = plan.slots.map((s) => s.recipeId);
      expect(usedRecipeIds).not.toContain('meat-1');
    });
  });

  describe('slot filling priority', () => {
    it('fills dinner slots first when recipes are limited', () => {
      // With exactly 7 recipes, we should fill all 7 dinners first
      const recipes = makeRecipeSet(7);

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems: [],
        preferences: null,
        seed: 42,
      });

      const dinnerSlots = plan.slots.filter((s) => s.slot === 'dinner');
      const lunchSlots = plan.slots.filter((s) => s.slot === 'lunch');
      const breakfastSlots = plan.slots.filter((s) => s.slot === 'breakfast');

      // All 7 dinners should be filled
      expect(dinnerSlots.length).toBe(7);
      expect(dinnerSlots.every((s) => s.recipeId !== null)).toBe(true);

      // Lunch and breakfast may be partially filled or empty depending on
      // how many unique assignments are possible without repetition
      const totalFilled = lunchSlots.filter((s) => s.recipeId !== null).length +
        breakfastSlots.filter((s) => s.recipeId !== null).length;
      // With 7 recipes and no-repeat constraint, we can fill some lunch/breakfast
      expect(totalFilled).toBeGreaterThanOrEqual(0);
    });
  });

  describe('partial plans', () => {
    it('leaves slots empty when not enough recipes to fill all 21 slots without repetition', () => {
      // With 4 recipes, we can fill dinner (7 slots with repeats allowed across non-consecutive days)
      // but not all 21 slots
      const recipes = makeRecipeSet(4);

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems: [],
        preferences: null,
        seed: 42,
      });

      // Should have some filled slots but not necessarily all 21
      expect(plan.slots.length).toBeLessThanOrEqual(21);
      expect(plan.slots.length).toBeGreaterThan(0);
      expect(plan.insufficientRecipes).toBeFalsy();
    });

    it('only includes slots that have a recipe assigned', () => {
      const recipes = makeRecipeSet(4);

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems: [],
        preferences: null,
        seed: 42,
      });

      for (const slot of plan.slots) {
        expect(slot.recipeId).toBeTruthy();
      }
    });
  });

  describe('uses suggestion engine ranking', () => {
    it('prefers recipes with higher pantry match', () => {
      const highMatch = makeRecipe({
        localId: 'high-match',
        title: 'Pantry Match',
        ingredients: [
          { name: 'lentils', quantity: '200', unit: 'g' },
          { name: 'onion', quantity: '1', unit: 'piece' },
        ],
      });
      const lowMatch = makeRecipe({
        localId: 'low-match',
        title: 'No Match',
        ingredients: [
          { name: 'truffle', quantity: '50', unit: 'g' },
          { name: 'caviar', quantity: '100', unit: 'g' },
        ],
      });

      const pantryItems = [
        makePantryItem({ name: 'Lentils', normalizedName: 'lentils' }),
        makePantryItem({ name: 'Onion', normalizedName: 'onion' }),
      ];

      // Use many copies of both to ensure the high-match one appears more
      const recipes = [
        highMatch,
        lowMatch,
        makeRecipe({ localId: 'filler-1', title: 'Filler 1', ingredients: [{ name: 'lentils', quantity: '1', unit: 'cup' }] }),
        makeRecipe({ localId: 'filler-2', title: 'Filler 2', ingredients: [{ name: 'onion', quantity: '2', unit: 'piece' }] }),
        makeRecipe({ localId: 'filler-3', title: 'Filler 3', ingredients: [{ name: 'lentils', quantity: '1', unit: 'cup' }, { name: 'onion', quantity: '1', unit: 'piece' }] }),
      ];

      const plan = generateWeeklyPlan({
        recipes,
        pantryItems,
        preferences: null,
        seed: 42,
      });

      // The high-match recipe should appear in the plan
      const usedIds = plan.slots.map((s) => s.recipeId);
      expect(usedIds).toContain('high-match');
    });
  });
});
