import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Recipe, RecipeInput, RecipesRepository } from './recipes-repository';

const mockBackCalls: number[] = [];
const mockReplaceCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
    replace: (href: string) => mockReplaceCalls.push(href),
  },
}));

import { RecipeFormScreenContent } from './recipe-form-screen';

function makeRepo(
  overrides: Partial<RecipesRepository> = {},
): RecipesRepository & { lastInput: RecipeInput | null } {
  const captured: { value: RecipeInput | null } = { value: null };
  const repo: RecipesRepository = {
    async listRecipes() {
      return [];
    },
    async getRecipeById() {
      return null;
    },
    async saveRecipe() {
      throw new Error('not used');
    },
    async unsaveRecipe() {},
    async createRecipe(input: RecipeInput) {
      captured.value = input;
      const created: Recipe = {
        localId: 'local-recipe-fake',
        seedId: null,
        title: input.title,
        cuisine: input.cuisine,
        dietTags: input.dietTags ?? [],
        allergens: input.allergens ?? [],
        prepMinutes: Number(input.prepMinutes ?? 0),
        cookMinutes: Number(input.cookMinutes ?? 0),
        servings: Number(input.servings ?? 4),
        ingredients: input.ingredients,
        steps: input.steps,
        imageKey: input.imageKey ?? null,
        source: input.source ?? '',
        attribution: input.attribution ?? 'Personal recipe',
        license: input.license ?? 'private',
        isSaved: true,
        privacy: 'local-only',
        createdAt: '2026-05-25T00:00:00.000Z',
        updatedAt: '2026-05-25T00:00:00.000Z',
      };
      return created;
    },
    ...overrides,
  };
  return Object.defineProperty(repo, 'lastInput', {
    get: () => captured.value,
  }) as RecipesRepository & { lastInput: RecipeInput | null };
}

describe('RecipeFormScreenContent — screen 15 manual entry', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
    mockReplaceCalls.length = 0;
  });

  it('renders title, cuisine, servings, and starter ingredient + step rows', () => {
    render(<RecipeFormScreenContent repository={makeRepo()} />);

    expect(screen.getByPlaceholderText('Recipe title')).toBeTruthy();
    expect(screen.getByPlaceholderText('Cuisine')).toBeTruthy();
    expect(screen.getByPlaceholderText('Servings')).toBeTruthy();

    // First ingredient row
    expect(screen.getByPlaceholderText('Ingredient 1 name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Ingredient 1 quantity')).toBeTruthy();
    expect(screen.getByPlaceholderText('Ingredient 1 unit')).toBeTruthy();

    // First step row
    expect(screen.getByPlaceholderText('Step 1 instructions')).toBeTruthy();
  });

  it('saves a complete recipe and navigates back', async () => {
    const repo = makeRepo();
    render(<RecipeFormScreenContent repository={repo} />);

    fireEvent.changeText(screen.getByPlaceholderText('Recipe title'), 'Mum’s Daal');
    fireEvent.changeText(screen.getByPlaceholderText('Cuisine'), 'pakistani');
    fireEvent.changeText(screen.getByPlaceholderText('Servings'), '6');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 name'), 'Red lentils');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 quantity'), '1.5');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 unit'), 'cups');
    fireEvent.changeText(
      screen.getByPlaceholderText('Step 1 instructions'),
      'Rinse lentils and bring to a boil with stock.',
    );

    fireEvent.press(screen.getByText('Save recipe'));

    await waitFor(() => {
      expect(repo.lastInput).not.toBeNull();
    });
    expect(repo.lastInput?.title).toBe('Mum’s Daal');
    expect(repo.lastInput?.cuisine).toBe('pakistani');
    expect(repo.lastInput?.servings).toBe(6);
    expect(repo.lastInput?.ingredients).toEqual([
      { name: 'Red lentils', quantity: '1.5', unit: 'cups' },
    ]);
    expect(repo.lastInput?.steps).toEqual([
      { order: 1, instruction: 'Rinse lentils and bring to a boil with stock.' },
    ]);
    expect(mockBackCalls.length).toBe(1);
  });

  it('surfaces a validation error when the title is empty', async () => {
    const repo = makeRepo();
    render(<RecipeFormScreenContent repository={repo} />);

    // Leave title blank, fill the rest
    fireEvent.changeText(screen.getByPlaceholderText('Cuisine'), 'pakistani');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 name'), 'Red lentils');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 quantity'), '1');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 unit'), 'cup');
    fireEvent.changeText(screen.getByPlaceholderText('Step 1 instructions'), 'Cook it.');

    fireEvent.press(screen.getByText('Save recipe'));

    await waitFor(() => {
      expect(screen.queryByText(/Title is required/i)).toBeTruthy();
    });

    expect(repo.lastInput).toBeNull();
    expect(mockBackCalls.length).toBe(0);
  });

  it('lets the user add a second ingredient row before saving', async () => {
    const repo = makeRepo();
    render(<RecipeFormScreenContent repository={repo} />);

    fireEvent.changeText(screen.getByPlaceholderText('Recipe title'), 'Khichdi');
    fireEvent.changeText(screen.getByPlaceholderText('Cuisine'), 'pakistani');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 name'), 'Red lentils');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 quantity'), '1');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 1 unit'), 'cup');

    fireEvent.press(screen.getByLabelText('Add ingredient'));

    fireEvent.changeText(await screen.findByPlaceholderText('Ingredient 2 name'), 'Basmati rice');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 2 quantity'), '0.5');
    fireEvent.changeText(screen.getByPlaceholderText('Ingredient 2 unit'), 'cup');

    fireEvent.changeText(screen.getByPlaceholderText('Step 1 instructions'), 'Boil together.');

    fireEvent.press(screen.getByText('Save recipe'));

    await waitFor(() => {
      expect(repo.lastInput).not.toBeNull();
    });
    expect(repo.lastInput?.ingredients).toEqual([
      { name: 'Red lentils', quantity: '1', unit: 'cup' },
      { name: 'Basmati rice', quantity: '0.5', unit: 'cup' },
    ]);
  });
});
