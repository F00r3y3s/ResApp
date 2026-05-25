import { describe, expect, it } from '@jest/globals';

import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import { buildTodaySummary, selectExpiringPantryAndSuggestions } from './today-model';

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

function recipeWith(title: string, ingredientNames: string[], extra: Partial<Recipe> = {}): Recipe {
  return {
    localId: `local-${title}`,
    seedId: `seed-${title.toLocaleLowerCase().replace(/\s+/g, '-')}`,
    title,
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
    ...extra,
  };
}

describe('today model', () => {
  it('summarizes guest-first offline state without requiring cloud services', () => {
    const summary = buildTodaySummary({
      pantryExpiringCount: 2,
      savedRecipeCount: 4,
      groceryOpenCount: 6,
      isOnline: false,
      hasAccount: false,
    });

    expect(summary.modeLabel).toBe('Guest offline');
    expect(summary.cards.map((card) => card.title)).toEqual([
      'Use soon',
      'Saved recipes',
      'Grocery queue',
    ]);
    expect(summary.networkMessage).toBe('Core cooking tools are available offline.');
  });

  it('reflects saved guest preferences in the offline dinner plan', () => {
    const summary = buildTodaySummary({
      pantryExpiringCount: 2,
      savedRecipeCount: 4,
      groceryOpenCount: 6,
      isOnline: false,
      hasAccount: false,
      preferences: {
        language: 'arabic',
        region: 'uae-gcc',
        householdSize: 5,
        dietaryRules: ['halal'],
        allergies: ['peanuts'],
        cuisines: ['indian', 'levantine'],
        goals: ['reduce-waste'],
        privacy: 'local-only',
        updatedAt: '2026-05-24T10:00:00.000Z',
      },
    });

    expect(summary.dinnerPlanLabel).toBe('Dinner plan for 5 · UAE / GCC · Indian, Levantine');
    expect(summary.preferenceMessage).toBe('Halal meals · avoiding peanuts · reduce waste');
  });
});


describe('selectExpiringPantryAndSuggestions', () => {
  // Reference "now" is 2026-05-24T12:00:00Z so that "today" buckets land on 2026-05-24.
  const now = new Date('2026-05-24T12:00:00.000Z');

  it('returns empty groups when the pantry is empty', () => {
    const result = selectExpiringPantryAndSuggestions({
      pantryItems: [],
      recipes: [recipeWith('Lentil Soup', ['Red lentils', 'Garlic'])],
      now,
    });

    expect(result.expiring).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('returns no expiring items when nothing is within the expiry window', () => {
    // 14 days out — outside the default 7-day expiring window.
    const fresh = pantryItem({ name: 'Carrots', expiresAt: '2026-06-07' });
    const result = selectExpiringPantryAndSuggestions({
      pantryItems: [fresh],
      recipes: [recipeWith('Carrot Soup', ['Carrots'])],
      now,
    });

    expect(result.expiring).toEqual([]);
    // No expiring items means no suggestions ranked by expiring usage.
    expect(result.suggestions).toEqual([]);
  });

  it('orders expiring items soonest-first and excludes items without an expiry date', () => {
    const noExpiry = pantryItem({ name: 'Salt', expiresAt: null });
    const inThreeDays = pantryItem({ name: 'Yogurt', expiresAt: '2026-05-27' });
    const expiredYesterday = pantryItem({ name: 'Spinach', expiresAt: '2026-05-23' });
    const today = pantryItem({ name: 'Tomatoes', expiresAt: '2026-05-24' });

    const result = selectExpiringPantryAndSuggestions({
      pantryItems: [noExpiry, inThreeDays, expiredYesterday, today],
      recipes: [],
      now,
    });

    // Soonest first: already-expired (most urgent) → today → 3 days. Items with no expiry are excluded.
    expect(result.expiring.map((item) => item.name)).toEqual([
      'Spinach',
      'Tomatoes',
      'Yogurt',
    ]);
  });

  it('ranks recipe suggestions by how many expiring items they consume, then by total pantry usage, then by title', () => {
    const expiringTomorrow = pantryItem({ name: 'Spinach', expiresAt: '2026-05-25' });
    const expiringInThreeDays = pantryItem({ name: 'Yogurt', expiresAt: '2026-05-27' });
    const expiringToday = pantryItem({ name: 'Tomatoes', expiresAt: '2026-05-24' });
    const longLife = pantryItem({ name: 'Garlic', expiresAt: '2026-09-01' });

    const usesAllExpiring = recipeWith('Spinach Yogurt Tomato Salad', [
      'Spinach',
      'Yogurt',
      'Tomatoes',
      'Olive oil', // not in pantry
    ]);
    const usesOneExpiringPlusGarlic = recipeWith('Garlic Tomato Pasta', [
      'Tomatoes', // expiring
      'Garlic', // pantry but not expiring
      'Pasta', // not in pantry
    ]);
    const usesNoneExpiring = recipeWith('Plain Garlic Bread', [
      'Bread', // not in pantry
      'Garlic', // pantry but not expiring
    ]);

    const result = selectExpiringPantryAndSuggestions({
      pantryItems: [expiringTomorrow, expiringInThreeDays, expiringToday, longLife],
      recipes: [usesNoneExpiring, usesOneExpiringPlusGarlic, usesAllExpiring],
      now,
    });

    // The recipe that uses the most expiring items ranks first.
    expect(result.suggestions.map((s) => s.recipe.title)).toEqual([
      'Spinach Yogurt Tomato Salad',
      'Garlic Tomato Pasta',
    ]);
    expect(result.suggestions[0].expiringMatchCount).toBe(3);
    expect(result.suggestions[0].pantryMatchCount).toBe(3);
    expect(result.suggestions[1].expiringMatchCount).toBe(1);
    expect(result.suggestions[1].pantryMatchCount).toBe(2);
  });

  it('breaks ties by total pantry coverage and finally by recipe title', () => {
    const expiringToday = pantryItem({ name: 'Tomatoes', expiresAt: '2026-05-24' });
    const garlic = pantryItem({ name: 'Garlic', expiresAt: '2026-09-01' });

    const aLowerCoverage = recipeWith('Apple Tomato Toast', [
      'Tomatoes',
      'Bread', // not in pantry
    ]);
    const bHigherCoverage = recipeWith('Bruschetta', [
      'Tomatoes',
      'Garlic',
      'Bread', // not in pantry
    ]);
    const cSameAsB = recipeWith('Cherry Tomato Garlic Crostini', [
      'Tomatoes',
      'Garlic',
      'Bread',
    ]);

    const result = selectExpiringPantryAndSuggestions({
      pantryItems: [expiringToday, garlic],
      recipes: [cSameAsB, aLowerCoverage, bHigherCoverage],
      now,
    });

    // All three use one expiring item. Ties: higher pantry coverage wins; then alphabetical by title.
    expect(result.suggestions.map((s) => s.recipe.title)).toEqual([
      'Bruschetta',
      'Cherry Tomato Garlic Crostini',
      'Apple Tomato Toast',
    ]);
  });

  it('does not include recipes that consume no expiring items', () => {
    const expiringToday = pantryItem({ name: 'Tomatoes', expiresAt: '2026-05-24' });
    const irrelevant = recipeWith('Plain Rice', ['Rice']);

    const result = selectExpiringPantryAndSuggestions({
      pantryItems: [expiringToday],
      recipes: [irrelevant],
      now,
    });

    expect(result.suggestions).toEqual([]);
  });
});
