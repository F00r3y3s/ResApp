import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { PantryItem, PantryRepository } from '@/features/pantry/pantry-repository';
import type { Recipe, RecipeFilters, RecipesRepository } from '@/features/recipes/recipes-repository';

import type { GroceryItem, GroceryRepository } from './grocery-repository';
import { GroceryScreenContent } from './grocery-screen';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

function buildRecipe(title: string, ingredients: string[], localId = `local-${title}`): Recipe {
  return {
    localId,
    seedId: localId.startsWith('seed-') ? localId : null,
    title,
    cuisine: 'test',
    dietTags: [],
    allergens: [],
    prepMinutes: 0,
    cookMinutes: 0,
    servings: 2,
    ingredients: ingredients.map((name) => ({ name, quantity: '1', unit: 'whole' })),
    steps: [],
    imageKey: null,
    source: '',
    attribution: '',
    license: '',
    isSaved: true,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
  };
}

function buildPantryItem(name: string): PantryItem {
  return {
    localId: `local-${name}`,
    name,
    normalizedName: name.toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'pantry',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
  };
}

function createPantryReadRepository(items: PantryItem[]): PantryRepository {
  return {
    async addItem() {
      throw new Error('not used in grocery screen tests');
    },
    async listItems() {
      return items;
    },
  };
}

function createRecipesReadRepository(recipes: Recipe[]): RecipesRepository {
  return {
    async listRecipes(filters?: RecipeFilters) {
      if (filters?.savedOnly) {
        return recipes.filter((r) => r.isSaved);
      }
      return recipes;
    },
    async getRecipeById(localId) {
      return recipes.find((r) => r.localId === localId) ?? null;
    },
    async saveRecipe() {
      throw new Error('not used in grocery screen tests');
    },
    async unsaveRecipe() {
      throw new Error('not used in grocery screen tests');
    },
    async createRecipe() {
      throw new Error('not used in grocery screen tests');
    },
  };
}

function createInMemoryGroceryRepository(initial: GroceryItem[] = []): GroceryRepository {
  let items = [...initial];
  let counter = items.length;
  const stamp = '2026-05-25T08:00:00.000Z';

  return {
    async listItems() {
      return [...items].sort((left, right) => {
        if (left.isChecked !== right.isChecked) {
          return left.isChecked ? 1 : -1;
        }
        return left.createdAt.localeCompare(right.createdAt);
      });
    },
    async addRecipeToList(recipe, pantryItems) {
      const pantryNormalized = new Set(pantryItems.map((p) => p.normalizedName));
      const existingNames = new Set(items.filter((i) => !i.isChecked).map((i) => i.normalizedName));
      const added: GroceryItem[] = [];
      let alreadyHaveCount = 0;
      let alreadyOnList = 0;

      for (const ingredient of recipe.ingredients) {
        const normalized = ingredient.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
        if (pantryNormalized.has(normalized)) {
          alreadyHaveCount += 1;
          continue;
        }
        if (existingNames.has(normalized)) {
          alreadyOnList += 1;
          continue;
        }
        counter += 1;
        const next: GroceryItem = {
          localId: `mem-${counter}`,
          name: ingredient.name.trim().replace(/\s+/g, ' '),
          normalizedName: normalized,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          recipeId: recipe.seedId ?? recipe.localId,
          recipeTitle: recipe.title,
          isChecked: false,
          section: null,
          assignedTo: null,
          privacy: 'local-only',
          createdAt: stamp,
          updatedAt: stamp,
        };
        items.push(next);
        added.push(next);
        existingNames.add(normalized);
      }

      return { added, alreadyHaveCount, alreadyOnList };
    },
    async setChecked(localId, isChecked) {
      items = items.map((i) => (i.localId === localId ? { ...i, isChecked } : i));
    },
    async removeItem(localId) {
      items = items.filter((i) => i.localId !== localId);
    },
    async clearChecked() {
      items = items.filter((i) => !i.isChecked);
    },
    async addMultipleToList(drafts) {
      const added: GroceryItem[] = [];
      for (const draft of drafts) {
        counter += 1;
        const next: GroceryItem = {
          localId: `mem-${counter}`,
          name: draft.name,
          normalizedName: draft.normalizedName,
          quantity: draft.quantity,
          unit: draft.unit,
          recipeId: draft.recipeId,
          recipeTitle: draft.recipeTitle,
          isChecked: false,
          section: null,
          assignedTo: null,
          privacy: 'local-only',
          createdAt: stamp,
          updatedAt: stamp,
        };
        items.push(next);
        added.push(next);
      }
      return added;
    },
    async assignItem(localId, memberId) {
      items = items.map((i) => (i.localId === localId ? { ...i, assignedTo: memberId } : i));
    },
    async setSectionOverride(localId, section) {
      items = items.map((i) => (i.localId === localId ? { ...i, section } : i));
    },
  };
}

describe('GroceryScreenContent', () => {
  it('renders an empty state with a CTA to add from a saved recipe', async () => {
    render(
      <GroceryScreenContent
        repository={createInMemoryGroceryRepository()}
        recipesRepository={createRecipesReadRepository([])}
        pantryRepository={createPantryReadRepository([])}
      />,
    );

    await screen.findByText('Grocery');
    expect(screen.getByText(/no grocery items yet/i)).toBeTruthy();
    expect(screen.getByLabelText('Add from a recipe')).toBeTruthy();
  });

  it('adds a saved recipe via the picker, subtracts pantry items, and shows the already-have banner', async () => {
    const recipe = buildRecipe('Family Lentil Soup', ['Red lentils', 'Garlic', 'Cumin'], 'seed-001');
    const grocery = createInMemoryGroceryRepository();

    render(
      <GroceryScreenContent
        repository={grocery}
        recipesRepository={createRecipesReadRepository([recipe])}
        pantryRepository={createPantryReadRepository([buildPantryItem('Garlic')])}
      />,
    );

    await screen.findByText('Grocery');
    fireEvent.press(screen.getByLabelText('Add from a recipe'));

    await screen.findByText('Pick a saved recipe');
    fireEvent.press(screen.getByText('Family Lentil Soup'));

    await screen.findByText('Red lentils');
    expect(screen.getByText('Cumin')).toBeTruthy();
    expect(screen.queryByText('Garlic')).toBeNull();

    await screen.findByText(/already have 1/i);
  });

  it('checks an item, keeps unchecked items on top, and lets the user clear checked', async () => {
    const recipe = buildRecipe('Two-Item Recipe', ['Red lentils', 'Garlic'], 'seed-002');
    const grocery = createInMemoryGroceryRepository();

    render(
      <GroceryScreenContent
        repository={grocery}
        recipesRepository={createRecipesReadRepository([recipe])}
        pantryRepository={createPantryReadRepository([])}
      />,
    );

    await screen.findByText('Grocery');
    fireEvent.press(screen.getByLabelText('Add from a recipe'));
    await screen.findByText('Pick a saved recipe');
    fireEvent.press(screen.getByText('Two-Item Recipe'));

    await screen.findByText('Red lentils');

    fireEvent.press(screen.getByLabelText('Mark Red lentils as bought'));

    // After checking, the unchecked item ("Garlic") should be the first row.
    await waitFor(() => {
      expect(screen.getByLabelText('Mark Red lentils as not bought')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Clear checked items'));

    await waitFor(() => {
      expect(screen.queryByText('Red lentils')).toBeNull();
    }, { timeout: 3000 });
    expect(screen.getByText('Garlic')).toBeTruthy();
  });

  it('removes a single item directly from the list', async () => {
    const recipe = buildRecipe('Solo Recipe', ['Red lentils'], 'seed-003');
    const grocery = createInMemoryGroceryRepository();

    render(
      <GroceryScreenContent
        repository={grocery}
        recipesRepository={createRecipesReadRepository([recipe])}
        pantryRepository={createPantryReadRepository([])}
      />,
    );

    await screen.findByText('Grocery');
    fireEvent.press(screen.getByLabelText('Add from a recipe'));
    await screen.findByText('Pick a saved recipe');
    fireEvent.press(screen.getByText('Solo Recipe'));

    await screen.findByText('Red lentils');
    fireEvent.press(screen.getByLabelText('Remove Red lentils'));

    await waitFor(() => {
      expect(screen.queryByText('Red lentils')).toBeNull();
    });
  });

  it('shows a friendly message when there are no saved recipes to pick from', async () => {
    render(
      <GroceryScreenContent
        repository={createInMemoryGroceryRepository()}
        recipesRepository={createRecipesReadRepository([])}
        pantryRepository={createPantryReadRepository([])}
      />,
    );

    await screen.findByText('Grocery');
    fireEvent.press(screen.getByLabelText('Add from a recipe'));
    await screen.findByText(/no saved recipes yet/i);
  });

  it('renders section headers when items are grouped by section', async () => {
    const items: GroceryItem[] = [
      {
        localId: 'item-1',
        name: 'Milk',
        normalizedName: 'milk',
        quantity: '1',
        unit: 'litre',
        recipeId: null,
        recipeTitle: null,
        isChecked: false,
        section: 'Dairy',
        assignedTo: null,
        privacy: 'local-only',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        localId: 'item-2',
        name: 'Chicken',
        normalizedName: 'chicken',
        quantity: '500',
        unit: 'g',
        recipeId: null,
        recipeTitle: null,
        isChecked: false,
        section: 'Meat & Seafood',
        assignedTo: null,
        privacy: 'local-only',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    render(
      <GroceryScreenContent
        repository={createInMemoryGroceryRepository(items)}
        recipesRepository={createRecipesReadRepository([])}
        pantryRepository={createPantryReadRepository([])}
      />,
    );

    await screen.findByText('Milk');
    expect(screen.getByText('Dairy')).toBeTruthy();
    expect(screen.getByText('Meat & Seafood')).toBeTruthy();
  });

  it('shows the assign button and opens the assign modal', async () => {
    const items: GroceryItem[] = [
      {
        localId: 'item-1',
        name: 'Milk',
        normalizedName: 'milk',
        quantity: '1',
        unit: 'litre',
        recipeId: null,
        recipeTitle: null,
        isChecked: false,
        section: 'Dairy',
        assignedTo: null,
        privacy: 'local-only',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    render(
      <GroceryScreenContent
        repository={createInMemoryGroceryRepository(items)}
        recipesRepository={createRecipesReadRepository([])}
        pantryRepository={createPantryReadRepository([])}
      />,
    );

    await screen.findByText('Milk');
    fireEvent.press(screen.getByLabelText('Assign Milk'));

    await screen.findByText('Assign to');
    expect(screen.getByLabelText('Assignee name')).toBeTruthy();
  });

  it('assigns a member to an item and shows the name in the row', async () => {
    const items: GroceryItem[] = [
      {
        localId: 'item-1',
        name: 'Milk',
        normalizedName: 'milk',
        quantity: '1',
        unit: 'litre',
        recipeId: null,
        recipeTitle: null,
        isChecked: false,
        section: 'Dairy',
        assignedTo: null,
        privacy: 'local-only',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    render(
      <GroceryScreenContent
        repository={createInMemoryGroceryRepository(items)}
        recipesRepository={createRecipesReadRepository([])}
        pantryRepository={createPantryReadRepository([])}
      />,
    );

    await screen.findByText('Milk');
    fireEvent.press(screen.getByLabelText('Assign Milk'));

    await screen.findByText('Assign to');
    fireEvent.changeText(screen.getByLabelText('Assignee name'), 'Aisha');
    fireEvent.press(screen.getByLabelText('Confirm assignment'));

    await waitFor(() => {
      expect(screen.getByText(/Aisha/)).toBeTruthy();
    });
  });
});
