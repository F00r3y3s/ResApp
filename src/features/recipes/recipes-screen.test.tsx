import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { PantryItem, PantryRepository } from '@/features/pantry/pantry-repository';

import type { RecipesRepository } from './recipes-repository';
import { SEED_RECIPES } from './seed-recipes';

const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPushCalls.push(href),
  },
}));

import { RecipesScreenContent } from './recipes-screen';

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

function createPantryRepo(items: PantryItem[]): PantryRepository {
  return {
    async addItem() {
      throw new Error('not used in screen 13 tests');
    },
    async listItems() {
      return items;
    },
  };
}

function createTestRepository(): RecipesRepository {
  const savedSeedIds = new Set<string>();

  return {
    async listRecipes(filters) {
      return SEED_RECIPES.filter((seed) => {
        if (filters?.savedOnly && !savedSeedIds.has(seed.id)) {
          return false;
        }
        if (filters?.cuisine && seed.cuisine !== filters.cuisine) {
          return false;
        }
        if (filters?.dietTag && !seed.dietTags.includes(filters.dietTag)) {
          return false;
        }
        if (filters?.query) {
          const q = filters.query.toLowerCase();
          if (!seed.title.toLowerCase().includes(q) && !seed.cuisine.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      }).map((seed) => ({
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
        isSaved: savedSeedIds.has(seed.id),
        privacy: 'local-only' as const,
        createdAt: '',
        updatedAt: '',
      }));
    },
    async getRecipeById(localId) {
      const seed = SEED_RECIPES.find((r) => r.id === localId);
      if (!seed) return null;
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
        isSaved: savedSeedIds.has(seed.id),
        privacy: 'local-only',
        createdAt: '',
        updatedAt: '',
      };
    },
    async saveRecipe(seed) {
      savedSeedIds.add(seed.id);
      return {
        localId: `local-${seed.id}`,
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
        isSaved: true,
        privacy: 'local-only',
        createdAt: '2026-05-25T00:00:00.000Z',
        updatedAt: '2026-05-25T00:00:00.000Z',
      };
    },
    async unsaveRecipe() {
      // not used in screen 13 tests
    },
    async createRecipe() {
      throw new Error('not used in screen 13 tests');
    },
  };
}

describe('RecipesScreenContent — screen 13 Recipe Library', () => {
  beforeEach(() => {
    mockPushCalls.length = 0;
  });

  it('renders the library header, search, and seed recipe cards with prep+cook time', async () => {
    render(<RecipesScreenContent repository={createTestRepository()} />);

    await screen.findByText('Recipes');
    expect(screen.getByPlaceholderText('Search recipes')).toBeTruthy();

    // All 5 seed recipes show by default
    expect(screen.getByText('Family Lentil Soup')).toBeTruthy();
    expect(screen.getByText('Lemon Herb Chicken Traybake')).toBeTruthy();
    expect(screen.getByText('Tomato Rice Skillet')).toBeTruthy();
    expect(screen.getByText('Chickpea and Spinach Curry')).toBeTruthy();
    expect(screen.getByText('Turkish Eggs (Çılbır)')).toBeTruthy();

    // Prep+cook badge for one card (10 + 30 = 40 min)
    expect(screen.getByText('40 min')).toBeTruthy();
  });

  it('filters recipes by search query', async () => {
    render(<RecipesScreenContent repository={createTestRepository()} />);
    await screen.findByText('Family Lentil Soup');

    fireEvent.changeText(screen.getByPlaceholderText('Search recipes'), 'lemon');

    await waitFor(
      () => {
        expect(screen.queryByText('Family Lentil Soup')).toBeNull();
      },
      { timeout: 3000, interval: 100 },
    );
    expect(screen.getByText('Lemon Herb Chicken Traybake')).toBeTruthy();
  });

  it('navigates to recipe detail when a card is pressed', async () => {
    render(<RecipesScreenContent repository={createTestRepository()} />);
    await screen.findByText('Family Lentil Soup');

    fireEvent.press(screen.getByText('Family Lentil Soup'));

    expect(mockPushCalls).toContain('/recipe/seed-001');
  });

  it('navigates to the manual entry route when the add FAB is pressed', async () => {
    render(<RecipesScreenContent repository={createTestRepository()} />);
    await screen.findByText('Family Lentil Soup');

    fireEvent.press(screen.getByLabelText('Add recipe'));

    expect(mockPushCalls).toContain('/recipe-edit');
  });

  it('toggles the Saved filter and shows only saved recipes', async () => {
    const repository = createTestRepository();
    await repository.saveRecipe(SEED_RECIPES[1]); // Lemon Herb Chicken Traybake

    render(<RecipesScreenContent repository={repository} />);
    await screen.findByText('Family Lentil Soup');

    fireEvent.press(screen.getByText('Saved'));

    await waitFor(
      () => {
        expect(screen.queryByText('Family Lentil Soup')).toBeNull();
      },
      { timeout: 3000, interval: 100 },
    );
    expect(screen.getByText('Lemon Herb Chicken Traybake')).toBeTruthy();
  });

  it('shows a pantry-match badge on each card when a pantry repository is provided', async () => {
    // Family Lentil Soup has 9 ingredients; we'll cover 7 to leave 2 missing
    const lentilSoup = SEED_RECIPES[0];
    const pantryItems = lentilSoup.ingredients
      .slice(0, 7)
      .map((i) => pantryItem(i.name));

    render(
      <RecipesScreenContent
        repository={createTestRepository()}
        pantryRepository={createPantryRepo(pantryItems)}
      />,
    );

    await screen.findByText('Family Lentil Soup');

    // The card for the lentil soup should report "Missing 2"
    await screen.findByText('Missing 2');
  });

  it('shows a "Uses pantry" badge when every ingredient is in the pantry', async () => {
    const lentilSoup = SEED_RECIPES[0];
    const pantryItems = lentilSoup.ingredients.map((i) => pantryItem(i.name));

    render(
      <RecipesScreenContent
        repository={createTestRepository()}
        pantryRepository={createPantryRepo(pantryItems)}
      />,
    );

    await screen.findByText('Family Lentil Soup');
    await screen.findByText('Uses pantry');
  });

  it('filters to recipes that fully use pantry items when "Pantry friendly" is active', async () => {
    const lentilSoup = SEED_RECIPES[0];
    const pantryItems = lentilSoup.ingredients.map((i) => pantryItem(i.name));

    render(
      <RecipesScreenContent
        repository={createTestRepository()}
        pantryRepository={createPantryRepo(pantryItems)}
      />,
    );

    await screen.findByText('Family Lentil Soup');
    await screen.findByText('Lemon Herb Chicken Traybake');

    fireEvent.press(screen.getByText('Pantry friendly'));

    await waitFor(
      () => {
        expect(screen.queryByText('Lemon Herb Chicken Traybake')).toBeNull();
      },
      { timeout: 3000, interval: 100 },
    );
    expect(screen.getByText('Family Lentil Soup')).toBeTruthy();
  });
});
