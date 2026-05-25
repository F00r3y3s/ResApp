import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { GroceryItemDraft } from '@/features/grocery/grocery-model';
import type { GroceryItem, GroceryRepository } from '@/features/grocery/grocery-repository';
import type { PantryItem, PantryRepository } from '@/features/pantry/pantry-repository';
import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';

import type { MealPlanEntry, MealPlanRepository } from './meal-plan-repository';
import { PlanToGroceryScreenContent } from './plan-to-grocery-screen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recipe(overrides: Partial<Recipe> & { localId: string }): Recipe {
  return {
    localId: overrides.localId,
    seedId: overrides.seedId ?? null,
    title: overrides.title ?? 'Test Recipe',
    cuisine: overrides.cuisine ?? 'test',
    dietTags: overrides.dietTags ?? [],
    allergens: overrides.allergens ?? [],
    prepMinutes: overrides.prepMinutes ?? 10,
    cookMinutes: overrides.cookMinutes ?? 20,
    servings: overrides.servings ?? 4,
    ingredients: overrides.ingredients ?? [],
    steps: overrides.steps ?? [],
    imageKey: overrides.imageKey ?? null,
    source: overrides.source ?? '',
    attribution: overrides.attribution ?? '',
    license: overrides.license ?? 'private',
    isSaved: overrides.isSaved ?? true,
    privacy: 'local-only',
    createdAt: overrides.createdAt ?? '2026-05-25T08:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-25T08:00:00.000Z',
  };
}

function pantryItem(name: string): PantryItem {
  return {
    localId: `local-pantry-${name}`,
    name,
    normalizedName: name.trim().replace(/\s+/g, ' ').toLocaleLowerCase(),
    quantity: 1,
    unit: 'whole',
    location: 'pantry',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-25T08:00:00.000Z',
    updatedAt: '2026-05-25T08:00:00.000Z',
  };
}

function createTestMealPlanRepository(entries: MealPlanEntry[]): MealPlanRepository {
  return {
    async getWeek() {
      return entries;
    },
    async setEntry() {
      throw new Error('not used');
    },
    async removeEntry() {
      throw new Error('not used');
    },
  };
}

function createRecipesReadRepository(recipes: Recipe[]): RecipesRepository {
  return {
    async listRecipes(filters) {
      if (filters?.savedOnly) return recipes.filter((r) => r.isSaved);
      return recipes;
    },
    async getRecipeById(localId) {
      return recipes.find((r) => r.localId === localId) ?? null;
    },
    async saveRecipe() {
      throw new Error('not used');
    },
    async unsaveRecipe() {
      throw new Error('not used');
    },
    async createRecipe() {
      throw new Error('not used');
    },
  };
}

function createPantryReadRepository(items: PantryItem[]): PantryRepository {
  return {
    async addItem() {
      throw new Error('not used');
    },
    async listItems() {
      return items;
    },
  };
}

function createInMemoryGroceryRepository(): GroceryRepository & { items: GroceryItem[] } {
  const items: GroceryItem[] = [];
  let counter = 0;

  const repo: GroceryRepository & { items: GroceryItem[] } = {
    items,
    async listItems() {
      return [...items];
    },
    async addRecipeToList() {
      throw new Error('not used in plan-to-grocery tests');
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
          privacy: 'local-only',
          createdAt: '2026-05-25T08:00:00.000Z',
          updatedAt: '2026-05-25T08:00:00.000Z',
        };
        items.push(next);
        added.push(next);
      }
      return added;
    },
    async setChecked() {
      throw new Error('not used');
    },
    async removeItem() {
      throw new Error('not used');
    },
    async clearChecked() {
      throw new Error('not used');
    },
  };

  // We'll add a batch method via the addMultipleToList prop
  return repo;
}

const fixedNow = () => new Date('2026-05-25T08:00:00.000Z');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlanToGroceryScreenContent', () => {
  it('shows a preview of items to buy and items already in pantry', async () => {
    const r1 = recipe({
      localId: 'r1',
      title: 'Lentil Soup',
      ingredients: [
        { name: 'Red lentils', quantity: '1', unit: 'cup' },
        { name: 'Garlic', quantity: '3', unit: 'cloves' },
        { name: 'Cumin', quantity: '1', unit: 'tsp' },
      ],
    });

    const entries: MealPlanEntry[] = [
      {
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'dinner',
        recipeId: 'r1',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ];

    render(
      <PlanToGroceryScreenContent
        mealPlanRepository={createTestMealPlanRepository(entries)}
        recipesRepository={createRecipesReadRepository([r1])}
        pantryRepository={createPantryReadRepository([pantryItem('Garlic')])}
        groceryRepository={createInMemoryGroceryRepository()}
        now={fixedNow}
      />,
    );

    // Wait for the preview to load
    await screen.findByText(/2 to buy/i);
    expect(screen.getByText(/1 already in pantry/i)).toBeTruthy();

    // Items to buy should be listed
    expect(screen.getByText('Red lentils')).toBeTruthy();
    expect(screen.getByText('Cumin')).toBeTruthy();

    // Garlic should NOT be in the "to buy" section
    // (it's in pantry)
  });

  it('shows aggregated quantities across multiple recipes', async () => {
    const r1 = recipe({
      localId: 'r1',
      title: 'Soup',
      ingredients: [{ name: 'Garlic', quantity: '3', unit: 'cloves' }],
    });
    const r2 = recipe({
      localId: 'r2',
      title: 'Stir Fry',
      ingredients: [{ name: 'Garlic', quantity: '2', unit: 'cloves' }],
    });

    const entries: MealPlanEntry[] = [
      {
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'dinner',
        recipeId: 'r1',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
      {
        weekStartIso: '2026-05-25',
        day: 1,
        slot: 'dinner',
        recipeId: 'r2',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ];

    render(
      <PlanToGroceryScreenContent
        mealPlanRepository={createTestMealPlanRepository(entries)}
        recipesRepository={createRecipesReadRepository([r1, r2])}
        pantryRepository={createPantryReadRepository([])}
        groceryRepository={createInMemoryGroceryRepository()}
        now={fixedNow}
      />,
    );

    // Should show aggregated: 5 cloves of garlic
    await screen.findByText('Garlic');
    expect(screen.getByText(/5 cloves/i)).toBeTruthy();
  });

  it('adds items to grocery list on confirm', async () => {
    const r1 = recipe({
      localId: 'r1',
      title: 'Soup',
      ingredients: [
        { name: 'Red lentils', quantity: '1', unit: 'cup' },
        { name: 'Garlic', quantity: '3', unit: 'cloves' },
      ],
    });

    const entries: MealPlanEntry[] = [
      {
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'dinner',
        recipeId: 'r1',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ];

    const groceryRepo = createInMemoryGroceryRepository();
    const addMultipleSpy = jest.fn<(drafts: GroceryItemDraft[]) => Promise<GroceryItem[]>>().mockResolvedValue([]);

    render(
      <PlanToGroceryScreenContent
        mealPlanRepository={createTestMealPlanRepository(entries)}
        recipesRepository={createRecipesReadRepository([r1])}
        pantryRepository={createPantryReadRepository([])}
        groceryRepository={groceryRepo}
        onAddToGrocery={addMultipleSpy}
        now={fixedNow}
      />,
    );

    await screen.findByText(/2 to buy/i);

    fireEvent.press(screen.getByLabelText('Confirm add to grocery list'));

    await waitFor(() => {
      expect(addMultipleSpy).toHaveBeenCalledTimes(1);
    });

    const drafts = addMultipleSpy.mock.calls[0][0];
    expect(drafts).toHaveLength(2);
    expect(drafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ normalizedName: 'red lentils' }),
        expect.objectContaining({ normalizedName: 'garlic' }),
      ]),
    );
  });

  it('shows a success message after confirming', async () => {
    const r1 = recipe({
      localId: 'r1',
      title: 'Soup',
      ingredients: [{ name: 'Red lentils', quantity: '1', unit: 'cup' }],
    });

    const entries: MealPlanEntry[] = [
      {
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'dinner',
        recipeId: 'r1',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ];

    const addMultipleSpy = jest.fn<(drafts: GroceryItemDraft[]) => Promise<GroceryItem[]>>().mockResolvedValue([]);

    render(
      <PlanToGroceryScreenContent
        mealPlanRepository={createTestMealPlanRepository(entries)}
        recipesRepository={createRecipesReadRepository([r1])}
        pantryRepository={createPantryReadRepository([])}
        groceryRepository={createInMemoryGroceryRepository()}
        onAddToGrocery={addMultipleSpy}
        now={fixedNow}
      />,
    );

    await screen.findByText(/1 to buy/i);
    fireEvent.press(screen.getByLabelText('Confirm add to grocery list'));

    await screen.findByText(/added to grocery/i);
  });

  it('shows empty state when meal plan has no entries', async () => {
    render(
      <PlanToGroceryScreenContent
        mealPlanRepository={createTestMealPlanRepository([])}
        recipesRepository={createRecipesReadRepository([])}
        pantryRepository={createPantryReadRepository([])}
        groceryRepository={createInMemoryGroceryRepository()}
        now={fixedNow}
      />,
    );

    await screen.findByText(/no meals planned/i);
  });
});
