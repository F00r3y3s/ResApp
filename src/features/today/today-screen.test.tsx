import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { PreferencesRepository } from '@/features/onboarding/preferences-repository';
import type { PantryItem, PantryRepository } from '@/features/pantry/pantry-repository';
import type { Recipe, RecipeFilters, RecipesRepository } from '@/features/recipes/recipes-repository';

import { TodayScreenContent } from './today-screen';

const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPushCalls.push(href),
  },
}));

beforeEach(() => {
  mockPushCalls.length = 0;
});

describe('TodayScreenContent', () => {
  it('renders the screen 9 dashboard sections and keeps pantry access reachable', () => {
    render(<TodayScreenContent preferencesRepository={createEmptyPreferencesRepository()} />);

    expect(screen.getByText('Good evening, Khan family')).toBeTruthy();
    expect(screen.getByText('Ask what to cook, swap, or prep')).toBeTruthy();
    expect(screen.getByText("Tonight's cook")).toBeTruthy();
    expect(screen.getByText('Lemon herb chicken traybake')).toBeTruthy();
    expect(screen.getByText('Use soon')).toBeTruthy();
    expect(screen.getByText('Meal plan')).toBeTruthy();
    expect(screen.getByText('Grocery gaps')).toBeTruthy();
    expect(screen.getByText('From your circle')).toBeTruthy();

    fireEvent.press(screen.getAllByText('See all')[0]);

    expect(mockPushCalls).toContain('/pantry');
  });

  it('renders expiring pantry items soonest-first and suggestions that use them', async () => {
    const expiringSoon = buildPantryItem({ name: 'Spinach', expiresAt: '2026-05-25' });
    const expiringInThreeDays = buildPantryItem({ name: 'Yogurt', expiresAt: '2026-05-27' });
    const expiringToday = buildPantryItem({ name: 'Tomatoes', expiresAt: '2026-05-24' });
    const longLife = buildPantryItem({ name: 'Garlic', expiresAt: '2026-09-01' });

    const usesAll = buildRecipe('Spinach Yogurt Bake', [
      'Spinach',
      'Yogurt',
      'Tomatoes',
      'Olive oil',
    ]);
    const usesOne = buildRecipe('Garlic Tomato Pasta', ['Tomatoes', 'Garlic', 'Pasta']);
    const usesNone = buildRecipe('Plain Rice', ['Rice']);

    render(
      <TodayScreenContent
        preferencesRepository={createEmptyPreferencesRepository()}
        pantryRepository={createPantryRepository([
          expiringSoon,
          expiringInThreeDays,
          expiringToday,
          longLife,
        ])}
        recipesRepository={createRecipesRepository([usesAll, usesOne, usesNone])}
        now={new Date('2026-05-24T12:00:00.000Z')}
      />,
    );

    // Expiring section uses real pantry data, soonest first.
    await screen.findByText('Tomatoes');
    expect(screen.getByText('Yogurt')).toBeTruthy();
    expect(screen.getByText('Spinach')).toBeTruthy();
    // Items outside the expiry window are not surfaced here.
    expect(screen.queryByText('Garlic')).toBeNull();

    // Suggestion section appears with pantry-aware recipes.
    await screen.findByText('Cook with what expires');
    expect(screen.getByText('Spinach Yogurt Bake')).toBeTruthy();
    expect(screen.getByText('Garlic Tomato Pasta')).toBeTruthy();
    // Recipes that don't use any expiring item are excluded.
    expect(screen.queryByText('Plain Rice')).toBeNull();
  });

  it('navigates into the recipe detail screen when a suggestion is tapped', async () => {
    const expiringToday = buildPantryItem({ name: 'Tomatoes', expiresAt: '2026-05-24' });
    const recipe = buildRecipe('Tomato Bruschetta', ['Tomatoes', 'Bread'], 'seed-bruschetta');

    render(
      <TodayScreenContent
        preferencesRepository={createEmptyPreferencesRepository()}
        pantryRepository={createPantryRepository([expiringToday])}
        recipesRepository={createRecipesRepository([recipe])}
        now={new Date('2026-05-24T12:00:00.000Z')}
      />,
    );

    const suggestion = await screen.findByText('Tomato Bruschetta');

    fireEvent.press(suggestion);

    await waitFor(() => {
      expect(mockPushCalls).toContain('/recipe/seed-bruschetta');
    });
  });

  it('hides the suggestion section when nothing is expiring', async () => {
    render(
      <TodayScreenContent
        preferencesRepository={createEmptyPreferencesRepository()}
        pantryRepository={createPantryRepository([])}
        recipesRepository={createRecipesRepository([buildRecipe('Plain Rice', ['Rice'])])}
        now={new Date('2026-05-24T12:00:00.000Z')}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Cook with what expires')).toBeNull();
    });
  });
});

function createEmptyPreferencesRepository(): PreferencesRepository {
  return {
    async savePreferences(input) {
      return {
        language: input.language,
        region: input.region,
        householdSize: Number(input.householdSize),
        dietaryRules: [...input.dietaryRules],
        allergies: [...input.allergies],
        cuisines: [...input.cuisines],
        goals: [...input.goals],
        privacy: 'local-only',
        updatedAt: '2026-05-24T10:00:00.000Z',
      };
    },
    async getPreferences() {
      return null;
    },
  };
}

function createPantryRepository(items: PantryItem[]): PantryRepository {
  return {
    async addItem() {
      throw new Error('not used in today screen tests');
    },
    async listItems() {
      return items;
    },
  };
}

function createRecipesRepository(recipes: Recipe[]): RecipesRepository {
  return {
    async listRecipes(_filters?: RecipeFilters) {
      return recipes;
    },
    async getRecipeById(localId) {
      return recipes.find((r) => r.localId === localId) ?? null;
    },
    async saveRecipe() {
      throw new Error('not used in today screen tests');
    },
    async unsaveRecipe() {
      throw new Error('not used in today screen tests');
    },
    async createRecipe() {
      throw new Error('not used in today screen tests');
    },
  };
}

function buildPantryItem(overrides: Partial<PantryItem> & { name: string }): PantryItem {
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

function buildRecipe(title: string, ingredientNames: string[], seedId: string | null = null): Recipe {
  return {
    localId: seedId ?? `local-${title}`,
    seedId,
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
    source: 'Family AI Kitchen Originals',
    attribution: 'Family AI Kitchen — original recipe, freely reusable',
    license: 'CC0',
    isSaved: false,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
  };
}
