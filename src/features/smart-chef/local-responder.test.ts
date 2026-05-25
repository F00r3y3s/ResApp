import { describe, expect, it } from '@jest/globals';

import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import { generateLocalResponse } from './local-responder';

function pantryItem(name: string): PantryItem {
  return {
    localId: `local-${name}`,
    name,
    normalizedName: name.trim().toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'fridge',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
  };
}

function recipeWith(title: string, ingredients: string[], extra: Partial<Recipe> = {}): Recipe {
  return {
    localId: `local-${title.toLocaleLowerCase().replace(/\s+/g, '-')}`,
    seedId: null,
    title,
    cuisine: 'indian',
    dietTags: [],
    allergens: [],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    ingredients: ingredients.map((name) => ({ name, quantity: '1', unit: 'whole' })),
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

const defaultPreferences: GuestPreferences = {
  language: 'english',
  region: 'uk-us',
  householdSize: 4,
  dietaryRules: [],
  allergies: [],
  cuisines: [],
  goals: [],
  privacy: 'local-only',
  updatedAt: '2026-05-24T00:00:00.000Z',
};

describe('local responder', () => {
  it('generates a friendly response with the top suggestion', () => {
    const result = generateLocalResponse({
      userMessage: 'What can I cook?',
      recipes: [recipeWith('Tomato Pasta', ['Tomatoes', 'Pasta'])],
      pantryItems: [pantryItem('Tomatoes'), pantryItem('Pasta')],
      preferences: defaultPreferences,
    });

    expect(result.text).toContain('Tomato Pasta');
    expect(result.text).toContain('100% pantry match');
    expect(result.suggestions).toHaveLength(1);
  });

  it('lists multiple suggestions when available', () => {
    const result = generateLocalResponse({
      userMessage: 'What can I cook tonight?',
      recipes: [
        recipeWith('Tomato Pasta', ['Tomatoes', 'Pasta']),
        recipeWith('Garlic Bread', ['Garlic', 'Bread']),
        recipeWith('Onion Soup', ['Onion', 'Stock']),
      ],
      pantryItems: [
        pantryItem('Tomatoes'),
        pantryItem('Pasta'),
        pantryItem('Garlic'),
        pantryItem('Bread'),
        pantryItem('Onion'),
      ],
      preferences: defaultPreferences,
    });

    expect(result.text).toContain('Tomato Pasta');
    expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('uses time-of-day greeting from user message', () => {
    const result = generateLocalResponse({
      userMessage: 'What should I make for breakfast?',
      recipes: [recipeWith('Oatmeal', ['Oats', 'Milk'])],
      pantryItems: [pantryItem('Oats'), pantryItem('Milk')],
      preferences: defaultPreferences,
    });

    expect(result.text).toContain('breakfast');
  });

  it('returns helpful fallback when no recipes saved', () => {
    const result = generateLocalResponse({
      userMessage: 'What can I cook?',
      recipes: [],
      pantryItems: [pantryItem('Tomatoes')],
      preferences: defaultPreferences,
    });

    expect(result.text).toContain('recipes');
    expect(result.suggestions).toHaveLength(0);
  });

  it('returns helpful fallback when pantry is empty', () => {
    const result = generateLocalResponse({
      userMessage: 'What can I cook?',
      recipes: [recipeWith('Pasta', ['Pasta'])],
      pantryItems: [],
      preferences: defaultPreferences,
    });

    expect(result.text).toContain('pantry');
    expect(result.suggestions).toHaveLength(0);
  });
});
