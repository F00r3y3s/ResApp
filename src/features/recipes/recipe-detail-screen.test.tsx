import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { PantryItem, PantryRepository } from '@/features/pantry/pantry-repository';

import type { Recipe, RecipesRepository } from './recipes-repository';
import { SEED_RECIPES } from './seed-recipes';

const mockBackCalls: number[] = [];
const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
    push: (href: string) => mockPushCalls.push(href),
  },
}));

import { RecipeDetailScreenContent } from './recipe-detail-screen';

function seedToRecipe(seedId: string, isSaved = false): Recipe {
  const seed = SEED_RECIPES.find((r) => r.id === seedId)!;
  return {
    localId: seed.id,
    seedId: seed.id,
    title: seed.title,
    cuisine: seed.cuisine,
    dietTags: seed.dietTags,
    allergens: seed.allergens,
    prepMinutes: seed.prepMinutes,
    cookMinutes: seed.cookMinutes,
    servings: seed.servings,
    ingredients: seed.ingredients,
    steps: seed.steps,
    imageKey: seed.imageKey,
    source: seed.source,
    attribution: seed.attribution,
    license: seed.license,
    isSaved,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
  };
}

function makeRepo(overrides: Partial<RecipesRepository> = {}): RecipesRepository {
  return {
    async listRecipes() {
      return [];
    },
    async getRecipeById(id) {
      return seedToRecipe(id);
    },
    async saveRecipe(seed) {
      return seedToRecipe(seed.id, true);
    },
    async unsaveRecipe() {},
    async createRecipe() {
      throw new Error('not used');
    },
    ...overrides,
  };
}

function pantryItem(name: string): PantryItem {
  return {
    localId: `local-${name}`,
    name,
    normalizedName: name.toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'pantry',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
  };
}

function makePantryRepo(items: PantryItem[]): PantryRepository {
  return {
    async addItem() {
      throw new Error('not used');
    },
    async listItems() {
      return items;
    },
  };
}

describe('RecipeDetailScreenContent — screen 14', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
    mockPushCalls.length = 0;
  });

  it('renders title, cook time, servings, ingredients, and step count', async () => {
    render(<RecipeDetailScreenContent recipeId="seed-001" repository={makeRepo()} />);

    await screen.findByText('Family Lentil Soup');
    expect(screen.getByText('40 min')).toBeTruthy();
    expect(screen.getByText('Serves 4')).toBeTruthy();
    expect(screen.getByText('Red lentils')).toBeTruthy();
    expect(screen.getByText('1.5 cups')).toBeTruthy();
    // Step preview shows "7 steps" or similar count
    expect(screen.getByText(/7 steps/i)).toBeTruthy();
    // Diet tag pills
    expect(screen.getByText(/Vegan/)).toBeTruthy();
  });

  it('shows a Save button that becomes Saved after pressing', async () => {
    let saveCalled = false;
    const repo = makeRepo({
      async saveRecipe(seed) {
        saveCalled = true;
        return seedToRecipe(seed.id, true);
      },
    });

    render(<RecipeDetailScreenContent recipeId="seed-002" repository={repo} />);
    await screen.findByText('Lemon Herb Chicken Traybake');

    fireEvent.press(screen.getByText('Save'));

    await waitFor(
      () => {
        expect(screen.getByText('Saved')).toBeTruthy();
      },
      { timeout: 3000, interval: 100 },
    );
    expect(saveCalled).toBe(true);
  });

  it('shows a missing-recipe state when the id is unknown', async () => {
    const repo = makeRepo({
      async getRecipeById() {
        return null;
      },
    });

    render(<RecipeDetailScreenContent recipeId="seed-zzz" repository={repo} />);

    await screen.findByText("We couldn't find that recipe");
    expect(screen.getByText('Back to recipes')).toBeTruthy();
  });

  it('marks ingredients you have in the pantry and labels missing ones as "Need to buy"', async () => {
    // Lentil Soup (seed-001) has 9 ingredients; we provide 2 of them
    const pantryItems = [
      pantryItem('Red lentils'),
      pantryItem('Garlic'),
    ];

    render(
      <RecipeDetailScreenContent
        recipeId="seed-001"
        repository={makeRepo()}
        pantryRepository={makePantryRepo(pantryItems)}
      />,
    );

    await screen.findByText('Family Lentil Soup');

    // Two ingredients that are pantry-matched should show the "In pantry" status
    await screen.findAllByLabelText('In pantry');

    // The summary line shows the missing count (9 - 2 = 7 missing)
    await screen.findByText('Missing 7 of 9');

    // At least one ingredient row shows "Need to buy"
    const needToBuyTags = screen.getAllByText('Need to buy');
    expect(needToBuyTags.length).toBeGreaterThan(0);
  });

  it('shows Add to plan and Cook mode actions plus an estimated nutrition card', async () => {
    render(<RecipeDetailScreenContent recipeId="seed-001" repository={makeRepo()} />);

    await screen.findByText('Family Lentil Soup');

    expect(screen.getByLabelText('Add to plan')).toBeTruthy();
    expect(screen.getByLabelText('Open cook mode')).toBeTruthy();

    // Nutrition estimate card with honest "Estimated" framing
    expect(screen.getByText(/Nutrition/i)).toBeTruthy();
    expect(screen.getByText(/Estimated/i)).toBeTruthy();
  });
});
