import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';
import { SEED_RECIPES } from '@/features/recipes/seed-recipes';

const mockBackCalls: number[] = [];
const keepAwakeActivations: string[] = [];
const keepAwakeDeactivations: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
    push: () => undefined,
  },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: (tag: string) => {
    keepAwakeActivations.push(tag);
    return Promise.resolve();
  },
  deactivateKeepAwake: (tag: string) => {
    keepAwakeDeactivations.push(tag);
  },
}));

import { CookModeScreenContent } from './cook-mode-screen';

function seedToRecipe(seedId: string): Recipe {
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
    isSaved: false,
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
      return seedToRecipe(seed.id);
    },
    async unsaveRecipe() {},
    async createRecipe() {
      throw new Error('not used');
    },
    ...overrides,
  };
}

describe('CookModeScreenContent', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
    keepAwakeActivations.length = 0;
    keepAwakeDeactivations.length = 0;
  });

  it('renders the recipe title, the first step instruction, and a "Step 1 of N" indicator', async () => {
    render(<CookModeScreenContent recipeId="seed-001" repository={makeRepo()} />);

    await screen.findByText('Family Lentil Soup');

    // Lentil soup step 1: "Dice onion and mince garlic."
    expect(screen.getByText('Dice onion and mince garlic.')).toBeTruthy();
    // Lentil soup has 7 steps
    expect(screen.getByText('Step 1 of 7')).toBeTruthy();
  });

  it('moves to the next step when Next is pressed and updates the progress label', async () => {
    render(<CookModeScreenContent recipeId="seed-001" repository={makeRepo()} />);
    await screen.findByText('Family Lentil Soup');

    fireEvent.press(screen.getByLabelText('Next step'));

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 7')).toBeTruthy();
    });
    expect(
      screen.getByText(
        'Heat olive oil in a large pot over medium heat. Sauté onion until golden, about 5 minutes.',
      ),
    ).toBeTruthy();
  });

  it('moves back to the previous step when Previous is pressed', async () => {
    render(<CookModeScreenContent recipeId="seed-001" repository={makeRepo()} />);
    await screen.findByText('Family Lentil Soup');

    fireEvent.press(screen.getByLabelText('Next step'));
    await screen.findByText('Step 2 of 7');

    fireEvent.press(screen.getByLabelText('Previous step'));
    await screen.findByText('Step 1 of 7');
    expect(screen.getByText('Dice onion and mince garlic.')).toBeTruthy();
  });

  it('disables the Previous button on step 1', async () => {
    render(<CookModeScreenContent recipeId="seed-001" repository={makeRepo()} />);
    await screen.findByText('Step 1 of 7');

    const previous = screen.getByLabelText('Previous step');
    expect(previous.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables the Next button when on the last step', async () => {
    render(<CookModeScreenContent recipeId="seed-001" repository={makeRepo()} />);
    await screen.findByText('Step 1 of 7');

    // Advance through all 7 steps (6 presses → step 7)
    for (let index = 0; index < 6; index++) {
      fireEvent.press(screen.getByLabelText('Next step'));
    }
    await screen.findByText('Step 7 of 7');

    const next = screen.getByLabelText('Next step');
    expect(next.props.accessibilityState?.disabled).toBe(true);
  });

  it('activates keep-awake on mount and deactivates on unmount', async () => {
    const { unmount } = render(
      <CookModeScreenContent recipeId="seed-001" repository={makeRepo()} />,
    );
    await screen.findByText('Step 1 of 7');

    expect(keepAwakeActivations.length).toBeGreaterThan(0);
    expect(keepAwakeDeactivations.length).toBe(0);

    unmount();
    expect(keepAwakeDeactivations.length).toBeGreaterThan(0);
  });

  it('shows a missing-recipe state when the id is unknown', async () => {
    const repo = makeRepo({
      async getRecipeById() {
        return null;
      },
    });

    render(<CookModeScreenContent recipeId="seed-zzz" repository={repo} />);

    await screen.findByText("We couldn't find that recipe");
  });
});
