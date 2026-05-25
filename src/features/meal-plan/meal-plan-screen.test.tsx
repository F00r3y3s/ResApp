import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';

import type {
    MealPlanEntry,
    MealPlanRepository,
    MealSlot,
} from './meal-plan-repository';
import { MealPlanScreenContent } from './meal-plan-screen';

function recipe(overrides: Partial<Recipe>): Recipe {
  return {
    localId: overrides.localId ?? 'local-recipe-1',
    seedId: overrides.seedId ?? null,
    title: overrides.title ?? 'Family Lentil Soup',
    cuisine: overrides.cuisine ?? 'levantine',
    dietTags: overrides.dietTags ?? ['vegan'],
    allergens: overrides.allergens ?? [],
    prepMinutes: overrides.prepMinutes ?? 10,
    cookMinutes: overrides.cookMinutes ?? 30,
    servings: overrides.servings ?? 4,
    ingredients: overrides.ingredients ?? [],
    steps: overrides.steps ?? [],
    imageKey: overrides.imageKey ?? null,
    source: overrides.source ?? '',
    attribution: overrides.attribution ?? 'Personal recipe',
    license: overrides.license ?? 'private',
    isSaved: overrides.isSaved ?? true,
    privacy: 'local-only',
    createdAt: overrides.createdAt ?? '2026-05-24T08:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-24T08:00:00.000Z',
  };
}

function createTestMealPlanRepository(initialEntries: MealPlanEntry[] = []): MealPlanRepository {
  let entries = [...initialEntries];

  return {
    async getWeek(weekStartIso) {
      return entries.filter((entry) => entry.weekStartIso === weekStartIso);
    },
    async setEntry(input) {
      const filtered = entries.filter(
        (entry) =>
          !(
            entry.weekStartIso === input.weekStartIso &&
            entry.day === input.day &&
            entry.slot === input.slot
          ),
      );
      const next: MealPlanEntry = {
        weekStartIso: input.weekStartIso,
        day: input.day as MealPlanEntry['day'],
        slot: input.slot,
        recipeId: input.recipeId,
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      };
      entries = [...filtered, next];
      return next;
    },
    async removeEntry(input) {
      entries = entries.filter(
        (entry) =>
          !(
            entry.weekStartIso === input.weekStartIso &&
            entry.day === input.day &&
            entry.slot === input.slot
          ),
      );
    },
  };
}

function createRecipesReadRepository(savedRecipes: Recipe[]): RecipesRepository {
  return {
    async listRecipes(filters) {
      if (filters?.savedOnly) {
        return savedRecipes.filter((r) => r.isSaved);
      }
      return savedRecipes;
    },
    async getRecipeById(localId) {
      return savedRecipes.find((r) => r.localId === localId) ?? null;
    },
    async saveRecipe() {
      throw new Error('Not used in meal plan screen tests');
    },
    async unsaveRecipe() {
      throw new Error('Not used in meal plan screen tests');
    },
    async createRecipe() {
      throw new Error('Not used in meal plan screen tests');
    },
  };
}

const fixedNow = () => new Date('2026-05-25T08:00:00.000Z');

describe('MealPlanScreenContent', () => {
  it('renders 7 days and 3 slots per day', async () => {
    render(
      <MealPlanScreenContent
        repository={createTestMealPlanRepository()}
        recipesRepository={createRecipesReadRepository([])}
        now={fixedNow}
      />,
    );

    await screen.findByText('Mon');
    expect(screen.getByText('Tue')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
    expect(screen.getByText('Thu')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
    expect(screen.getByText('Sun')).toBeTruthy();

    expect(screen.getAllByText('Breakfast').length).toBe(7);
    expect(screen.getAllByText('Lunch').length).toBe(7);
    expect(screen.getAllByText('Dinner').length).toBe(7);
  });

  it('adds a saved recipe to a slot via the picker', async () => {
    const savedRecipe = recipe({ localId: 'local-r-1', title: 'Family Lentil Soup' });
    const mealRepo = createTestMealPlanRepository();
    const recipesRepo = createRecipesReadRepository([savedRecipe]);

    render(
      <MealPlanScreenContent
        repository={mealRepo}
        recipesRepository={recipesRepo}
        now={fixedNow}
      />,
    );

    await screen.findByText('Mon');

    fireEvent.press(screen.getAllByLabelText('Add recipe to Mon Breakfast')[0]);
    await screen.findByText('Choose a saved recipe');
    fireEvent.press(screen.getByText('Family Lentil Soup'));

    await waitFor(() => {
      expect(screen.getByLabelText('Mon Breakfast: Family Lentil Soup')).toBeTruthy();
    });

    const week = await mealRepo.getWeek('2026-05-25');
    expect(week).toHaveLength(1);
    expect(week[0]).toEqual(
      expect.objectContaining({
        day: 0,
        slot: 'breakfast' as MealSlot,
        recipeId: 'local-r-1',
      }),
    );
  });

  it('replaces a recipe already in a slot', async () => {
    const a = recipe({ localId: 'local-a', title: 'Lentil Soup A' });
    const b = recipe({ localId: 'local-b', title: 'Chicken Bake B' });
    const mealRepo = createTestMealPlanRepository([
      {
        weekStartIso: '2026-05-25',
        day: 1,
        slot: 'dinner',
        recipeId: 'local-a',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ]);
    const recipesRepo = createRecipesReadRepository([a, b]);

    render(
      <MealPlanScreenContent
        repository={mealRepo}
        recipesRepository={recipesRepo}
        now={fixedNow}
      />,
    );

    await screen.findByLabelText('Tue Dinner: Lentil Soup A');

    fireEvent.press(screen.getByLabelText('Tue Dinner: Lentil Soup A'));
    await screen.findByText('Choose a saved recipe');
    fireEvent.press(screen.getByText('Chicken Bake B'));

    await waitFor(() => {
      expect(screen.getByLabelText('Tue Dinner: Chicken Bake B')).toBeTruthy();
    });

    const week = await mealRepo.getWeek('2026-05-25');
    expect(week).toHaveLength(1);
    expect(week[0].recipeId).toBe('local-b');
  });

  it('removes a recipe from a slot', async () => {
    const a = recipe({ localId: 'local-a', title: 'Lentil Soup A' });
    const mealRepo = createTestMealPlanRepository([
      {
        weekStartIso: '2026-05-25',
        day: 4,
        slot: 'lunch',
        recipeId: 'local-a',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ]);
    const recipesRepo = createRecipesReadRepository([a]);

    render(
      <MealPlanScreenContent
        repository={mealRepo}
        recipesRepository={recipesRepo}
        now={fixedNow}
      />,
    );

    await screen.findByLabelText('Fri Lunch: Lentil Soup A');

    fireEvent.press(screen.getByLabelText('Remove Lentil Soup A from Fri Lunch'));

    await waitFor(() => {
      expect(screen.queryByLabelText('Fri Lunch: Lentil Soup A')).toBeNull();
    });
    await expect(mealRepo.getWeek('2026-05-25')).resolves.toEqual([]);
  });

  it('shows an empty state when there are no saved recipes to pick from', async () => {
    render(
      <MealPlanScreenContent
        repository={createTestMealPlanRepository()}
        recipesRepository={createRecipesReadRepository([])}
        now={fixedNow}
      />,
    );

    await screen.findByText('Mon');
    fireEvent.press(screen.getAllByLabelText('Add recipe to Mon Breakfast')[0]);
    await screen.findByText('No saved recipes yet');
  });
});
