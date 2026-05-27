import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPushCalls.push(href),
  },
}));

import { SmartChefScreenContent } from './smart-chef-screen';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function pantryItem(name: string, expiresAt: string | null = null): PantryItem {
  return {
    localId: `local-${name}`,
    name,
    normalizedName: name.trim().toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'fridge',
    expiresAt,
    privacy: 'local-only',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
  };
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
    cuisine: 'indian',
    dietTags: ['vegetarian'],
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

const defaultPreferences: GuestPreferences = {
  language: 'english',
  region: 'uk-us',
  householdSize: 4,
  dietaryRules: [],
  allergies: [],
  cuisines: ['indian'],
  goals: [],
  privacy: 'local-only',
  updatedAt: '2026-05-24T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SmartChefScreenContent', () => {
  beforeEach(() => {
    mockPushCalls.length = 0;
  });

  it('renders suggestions based on pantry items and recipes', async () => {
    const pantryItems = [
      pantryItem('Tomatoes'),
      pantryItem('Garlic'),
      pantryItem('Onion'),
    ];
    const recipes = [
      recipeWith('Tomato Garlic Pasta', ['Tomatoes', 'Garlic', 'Pasta']),
      recipeWith('Onion Soup', ['Onion', 'Butter', 'Stock']),
    ];

    render(
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
      />,
    );

    await screen.findByText('What can I cook?');
    expect(screen.getByText('Tomato Garlic Pasta')).toBeTruthy();
    expect(screen.getByText('Onion Soup')).toBeTruthy();
  });

  it('excludes recipes that violate user allergies', async () => {
    const pantryItems = [pantryItem('Eggs'), pantryItem('Yogurt')];
    const recipes = [
      recipeWith('Turkish Eggs', ['Eggs', 'Yogurt'], { allergens: ['dairy', 'eggs'] }),
      recipeWith('Vegan Bowl', ['Rice', 'Beans'], { allergens: [] }),
    ];

    const prefs: GuestPreferences = {
      ...defaultPreferences,
      allergies: ['dairy'],
    };

    render(
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={prefs}
      />,
    );

    await screen.findByText('What can I cook?');
    expect(screen.queryByText('Turkish Eggs')).toBeNull();
    expect(screen.getByText('Vegan Bowl')).toBeTruthy();
  });

  it('ranks suggestions by pantry coverage (higher match first)', async () => {
    const pantryItems = [
      pantryItem('Tomatoes'),
      pantryItem('Garlic'),
      pantryItem('Onion'),
    ];
    const recipes = [
      recipeWith('Low Match', ['Tomatoes', 'Cheese', 'Cream']),
      recipeWith('High Match', ['Tomatoes', 'Garlic', 'Onion']),
    ];

    render(
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
      />,
    );

    await screen.findByText('What can I cook?');

    const allTexts = screen.getAllByTestId('suggestion-title');
    expect(allTexts[0].props.children).toBe('High Match');
    expect(allTexts[1].props.children).toBe('Low Match');
  });

  it('navigates to recipe detail when a suggestion card is tapped', async () => {
    const pantryItems = [pantryItem('Tomatoes')];
    const recipes = [recipeWith('Tomato Soup', ['Tomatoes', 'Onion'])];

    render(
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
      />,
    );

    await screen.findByText('Tomato Soup');
    fireEvent.press(screen.getByText('Tomato Soup'));

    expect(mockPushCalls).toContain('/recipe/local-tomato-soup');
  });

  it('shows empty state when no pantry items and no recipes', async () => {
    render(
      <SmartChefScreenContent
        recipes={[]}
        pantryItems={[]}
        preferences={defaultPreferences}
      />,
    );

    await screen.findByText('What can I cook?');
    expect(
      screen.getByText('Add pantry items or save recipes to get suggestions.'),
    ).toBeTruthy();
  });

  it('shows pantry match percentage on each card', async () => {
    const pantryItems = [pantryItem('Tomatoes'), pantryItem('Garlic')];
    const recipes = [
      recipeWith('Two Match', ['Tomatoes', 'Garlic']), // 100%
    ];

    render(
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
      />,
    );

    await screen.findByText('100% match');
  });

  it('shows prep time on each card', async () => {
    const pantryItems = [pantryItem('Tomatoes')];
    const recipes = [
      recipeWith('Quick Dish', ['Tomatoes'], { prepMinutes: 5, cookMinutes: 10 }),
    ];

    render(
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
      />,
    );

    await screen.findByText('15 min');
  });

  it('shows cuisine label on each card', async () => {
    const pantryItems = [pantryItem('Tomatoes')];
    const recipes = [
      recipeWith('Indian Dish', ['Tomatoes'], { cuisine: 'indian' }),
    ];

    render(
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={defaultPreferences}
      />,
    );

    await screen.findByText('indian');
  });
});
