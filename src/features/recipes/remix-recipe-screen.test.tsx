import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Recipe, RecipesRepository } from './recipes-repository';

const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: (href: string) => mockPushCalls.push(href),
  },
}));

import { RemixRecipeScreenContent } from './remix-recipe-screen';

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

function makeRepo(overrides: Partial<RecipesRepository> = {}): RecipesRepository {
  return {
    async listRecipes() {
      return [];
    },
    async getRecipeById() {
      return makeRecipe();
    },
    async saveRecipe() {
      throw new Error('not used');
    },
    async unsaveRecipe() {},
    async createRecipe(_input): Promise<Recipe> {
      return {
        localId: 'remixed-789',
        seedId: null,
        title: 'Family Lentil Soup',
        cuisine: 'levantine',
        dietTags: [],
        allergens: [],
        prepMinutes: 10,
        cookMinutes: 30,
        servings: 4,
        ingredients: [],
        steps: [],
        imageKey: null,
        source: '',
        attribution: '',
        license: 'private',
        isSaved: true,
        privacy: 'local-only',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
    },
    ...overrides,
  };
}

describe('RemixRecipeScreenContent', () => {
  beforeEach(() => {
    mockPushCalls.length = 0;
  });

  it('renders the original recipe title and a "Remix this recipe" button', async () => {
    render(
      <RemixRecipeScreenContent
        recipe={makeRecipe()}
        repository={makeRepo()}
      />,
    );

    expect(screen.getByText('Family Lentil Soup')).toBeTruthy();
    expect(screen.getByText('Remix this recipe')).toBeTruthy();
  });

  it('shows the attribution badge "Remixed from [original]"', async () => {
    render(
      <RemixRecipeScreenContent
        recipe={makeRecipe()}
        repository={makeRepo()}
      />,
    );

    expect(screen.getByText(/Remixed from Family Lentil Soup/)).toBeTruthy();
  });

  it('calls createRecipe and navigates to the new recipe on remix', async () => {
    let createCalled = false;
    const repo = makeRepo({
      async createRecipe(_input): Promise<Recipe> {
        createCalled = true;
        return {
          localId: 'remixed-789',
          seedId: null,
          title: 'Family Lentil Soup',
          cuisine: 'levantine',
          dietTags: [],
          allergens: [],
          prepMinutes: 10,
          cookMinutes: 30,
          servings: 4,
          ingredients: [],
          steps: [],
          imageKey: null,
          source: '',
          attribution: '',
          license: '',
          isSaved: true,
          privacy: 'local-only',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        };
      },
    });

    render(
      <RemixRecipeScreenContent
        recipe={makeRecipe()}
        repository={repo}
      />,
    );

    fireEvent.press(screen.getByText('Remix this recipe'));

    await waitFor(() => {
      expect(createCalled).toBe(true);
    });

    await waitFor(() => {
      expect(mockPushCalls.length).toBe(1);
      expect(mockPushCalls[0]).toContain('remixed-789');
    });
  });

  it('shows the remix relationship when the original is itself a remix', () => {
    const recipe = makeRecipe({
      remixedFrom: {
        recipeId: 'root-000',
        title: 'Original Root Recipe',
        attribution: 'Chef Original',
      },
    });

    render(
      <RemixRecipeScreenContent
        recipe={recipe}
        repository={makeRepo()}
      />,
    );

    // Should show the immediate parent attribution
    expect(screen.getByText(/Remixed from Family Lentil Soup/)).toBeTruthy();
  });

  it('disables the remix button while creating', async () => {
    let resolveCreate: (value: Recipe) => void;
    const createPromise = new Promise<Recipe>((resolve) => {
      resolveCreate = resolve;
    });

    const repo = makeRepo({
      createRecipe: () => createPromise,
    });

    render(
      <RemixRecipeScreenContent
        recipe={makeRecipe()}
        repository={repo}
      />,
    );

    const button = screen.getByText('Remix this recipe');
    fireEvent.press(button);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Creating remix…')).toBeTruthy();
    });

    // Resolve the promise
    resolveCreate!({
      localId: 'remixed-789',
      seedId: null,
      title: 'Family Lentil Soup',
      cuisine: 'levantine',
      dietTags: [],
      allergens: [],
      prepMinutes: 10,
      cookMinutes: 30,
      servings: 4,
      ingredients: [],
      steps: [],
      imageKey: null,
      source: '',
      attribution: 'Remixed from Family Lentil Soup',
      license: 'CC0',
      isSaved: true,
      privacy: 'local-only',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    await waitFor(() => {
      expect(mockPushCalls.length).toBe(1);
    });
  });
});
