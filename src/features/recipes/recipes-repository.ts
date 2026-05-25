import { z } from 'zod';

import type { SeedRecipe } from './seed-recipes';
import { SEED_RECIPES } from './seed-recipes';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type RecipeIngredient = {
  name: string;
  quantity: string;
  unit: string;
};

export type RecipeStep = {
  order: number;
  instruction: string;
  timerMinutes?: number;
};

export type RemixedFrom = {
  recipeId: string;
  title: string;
  attribution: string;
};

export type Recipe = {
  localId: string;
  /** 'seed-XXX' for catalog items, generated local id for personal recipes */
  seedId: string | null;
  title: string;
  cuisine: string;
  dietTags: string[];
  allergens: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  imageKey: string | null;
  source: string;
  attribution: string;
  license: string;
  isSaved: boolean;
  privacy: 'local-only';
  createdAt: string;
  updatedAt: string;
  /** Present when this recipe was remixed from another recipe */
  remixedFrom?: RemixedFrom;
};

// ---------------------------------------------------------------------------
// Validation schemas for manual recipe creation
// ---------------------------------------------------------------------------

const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Ingredient name is required').max(120),
  quantity: z.string().trim().min(1, 'Quantity is required').max(40),
  unit: z.string().trim().min(1, 'Unit is required').max(40),
});

const stepSchema = z.object({
  order: z.number().int().positive(),
  instruction: z.string().trim().min(1, 'Step instruction is required').max(500),
  timerMinutes: z.number().int().positive().optional(),
});

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  cuisine: z.string().trim().min(1, 'Cuisine is required').max(60),
  dietTags: z.array(z.string().trim().toLowerCase()).max(12).default([]),
  allergens: z.array(z.string().trim().toLowerCase()).max(12).default([]),
  prepMinutes: z.coerce.number().int().min(0).max(480).default(0),
  cookMinutes: z.coerce.number().int().min(0).max(480).default(0),
  servings: z.coerce.number().int().min(1).max(100).default(4),
  ingredients: z.array(ingredientSchema).min(1, 'At least one ingredient is required').max(50),
  steps: z.array(stepSchema).min(1, 'At least one step is required').max(50),
  imageKey: z.string().nullable().default(null),
  source: z.string().trim().max(200).default(''),
  attribution: z.string().trim().max(400).default('Personal recipe'),
  license: z.string().trim().max(80).default('private'),
});

export type RecipeInput = z.input<typeof recipeInputSchema>;

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

export type RecipeFilters = {
  query?: string;
  cuisine?: string;
  dietTag?: string;
  excludeAllergens?: string[];
  maxPrepCook?: number;
  savedOnly?: boolean;
};

// ---------------------------------------------------------------------------
// Database interface
// ---------------------------------------------------------------------------

export type RecipesDatabase = {
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
};

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export type RecipesRepository = {
  listRecipes(filters?: RecipeFilters): Promise<Recipe[]>;
  getRecipeById(localId: string): Promise<Recipe | null>;
  saveRecipe(seedRecipe: SeedRecipe): Promise<Recipe>;
  unsaveRecipe(localId: string): Promise<void>;
  createRecipe(input: RecipeInput): Promise<Recipe>;
};

// ---------------------------------------------------------------------------
// Row type for SQLite / persistent storage
// ---------------------------------------------------------------------------

type RecipeRow = {
  local_id: string;
  seed_id: string | null;
  title: string;
  cuisine: string;
  diet_tags_json: string;
  allergens_json: string;
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  ingredients_json: string;
  steps_json: string;
  image_key: string | null;
  source: string;
  attribution: string;
  license: string;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// ---------------------------------------------------------------------------
// Repository factory
// ---------------------------------------------------------------------------

export type RecipesRepositoryOptions = {
  database: RecipesDatabase;
  createLocalId?: () => string;
  now?: () => Date;
};

export function createRecipesRepository(options: RecipesRepositoryOptions): RecipesRepository {
  const database = options.database;
  const createLocalId = options.createLocalId ?? defaultLocalId;
  const now = options.now ?? (() => new Date());

  return {
    async listRecipes(filters = {}) {
      const rows = await database.getAll<RecipeRow>(
        `SELECT * FROM saved_recipes
         WHERE deleted_at IS NULL
         ORDER BY lower(title), created_at DESC`,
      );

      const savedSet = new Set(rows.map((r) => r.seed_id).filter(Boolean));
      const savedMap = new Map(rows.map((r) => [r.local_id, mapRecipeRow(r, true)]));

      // Merge seed recipes with saved state
      const seedRecipes: Recipe[] = SEED_RECIPES.map((seed) =>
        seedToRecipe(seed, savedSet.has(seed.id), findSavedLocalId(rows, seed.id)),
      );

      const personalRecipes: Recipe[] = rows
        .filter((r) => r.seed_id === null)
        .map((r) => mapRecipeRow(r, true));

      const all = [...seedRecipes, ...personalRecipes];

      // Apply filters
      return applyFilters(all, filters);
    },

    async getRecipeById(localId) {
      const seedMatch = SEED_RECIPES.find((s) => s.id === localId);
      if (seedMatch) {
        const rows = await database.getAll<RecipeRow>(
          `SELECT * FROM saved_recipes WHERE seed_id = ? AND deleted_at IS NULL LIMIT 1`,
          [localId],
        );
        return seedToRecipe(seedMatch, rows.length > 0, rows[0]?.local_id ?? null);
      }

      const rows = await database.getAll<RecipeRow>(
        `SELECT * FROM saved_recipes WHERE local_id = ? AND deleted_at IS NULL LIMIT 1`,
        [localId],
      );
      return rows.length > 0 ? mapRecipeRow(rows[0], true) : null;
    },

    async saveRecipe(seed) {
      const timestamp = now().toISOString();
      const localId = createLocalId();

      await database.execute(
        `INSERT INTO saved_recipes (
          local_id, remote_id, owner_id, seed_id, title, cuisine,
          diet_tags_json, allergens_json, prep_minutes, cook_minutes, servings,
          ingredients_json, steps_json, image_key, source, attribution, license,
          privacy, created_at, updated_at, deleted_at
        ) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local-only', ?, ?, NULL)`,
        [
          localId,
          seed.id,
          seed.title,
          seed.cuisine,
          JSON.stringify(seed.dietTags),
          JSON.stringify(seed.allergens),
          seed.prepMinutes,
          seed.cookMinutes,
          seed.servings,
          JSON.stringify(seed.ingredients),
          JSON.stringify(seed.steps),
          seed.imageKey,
          seed.source,
          seed.attribution,
          seed.license,
          timestamp,
          timestamp,
        ],
      );

      return seedToRecipe(seed, true, localId);
    },

    async unsaveRecipe(localId) {
      const timestamp = now().toISOString();
      await database.execute(
        `UPDATE saved_recipes SET deleted_at = ?, updated_at = ? WHERE local_id = ?`,
        [timestamp, timestamp, localId],
      );
    },

    async createRecipe(input) {
      const parsed = recipeInputSchema.parse(input);
      const timestamp = now().toISOString();
      const localId = createLocalId();

      await database.execute(
        `INSERT INTO saved_recipes (
          local_id, remote_id, owner_id, seed_id, title, cuisine,
          diet_tags_json, allergens_json, prep_minutes, cook_minutes, servings,
          ingredients_json, steps_json, image_key, source, attribution, license,
          privacy, created_at, updated_at, deleted_at
        ) VALUES (?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local-only', ?, ?, NULL)`,
        [
          localId,
          parsed.title,
          parsed.cuisine,
          JSON.stringify(parsed.dietTags),
          JSON.stringify(parsed.allergens),
          parsed.prepMinutes,
          parsed.cookMinutes,
          parsed.servings,
          JSON.stringify(parsed.ingredients),
          JSON.stringify(parsed.steps),
          parsed.imageKey,
          parsed.source,
          parsed.attribution,
          parsed.license,
          timestamp,
          timestamp,
        ],
      );

      return {
        localId,
        seedId: null,
        title: parsed.title,
        cuisine: parsed.cuisine,
        dietTags: parsed.dietTags,
        allergens: parsed.allergens,
        prepMinutes: parsed.prepMinutes,
        cookMinutes: parsed.cookMinutes,
        servings: parsed.servings,
        ingredients: parsed.ingredients,
        steps: parsed.steps,
        imageKey: parsed.imageKey,
        source: parsed.source,
        attribution: parsed.attribution,
        license: parsed.license,
        isSaved: true,
        privacy: 'local-only',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedToRecipe(seed: SeedRecipe, isSaved: boolean, savedLocalId: string | null): Recipe {
  return {
    localId: savedLocalId ?? seed.id,
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

function mapRecipeRow(row: RecipeRow, isSaved: boolean): Recipe {
  return {
    localId: row.local_id,
    seedId: row.seed_id,
    title: row.title,
    cuisine: row.cuisine,
    dietTags: safeParseJsonArray(row.diet_tags_json),
    allergens: safeParseJsonArray(row.allergens_json),
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    servings: row.servings,
    ingredients: safeParseJsonArray(row.ingredients_json),
    steps: safeParseJsonArray(row.steps_json),
    imageKey: row.image_key,
    source: row.source,
    attribution: row.attribution,
    license: row.license,
    isSaved,
    privacy: row.privacy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findSavedLocalId(rows: RecipeRow[], seedId: string): string | null {
  return rows.find((r) => r.seed_id === seedId)?.local_id ?? null;
}

function safeParseJsonArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function applyFilters(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  let result = recipes;

  if (filters.savedOnly) {
    result = result.filter((r) => r.isSaved);
  }

  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
    );
  }

  if (filters.cuisine) {
    const c = filters.cuisine.toLowerCase();
    result = result.filter((r) => r.cuisine.toLowerCase() === c);
  }

  if (filters.dietTag) {
    const d = filters.dietTag.toLowerCase();
    result = result.filter((r) => r.dietTags.includes(d));
  }

  if (filters.excludeAllergens && filters.excludeAllergens.length > 0) {
    const excluded = new Set(filters.excludeAllergens.map((a) => a.toLowerCase()));
    result = result.filter((r) => !r.allergens.some((a) => excluded.has(a)));
  }

  if (filters.maxPrepCook != null) {
    result = result.filter(
      (r) => r.prepMinutes + r.cookMinutes <= filters.maxPrepCook!,
    );
  }

  return result;
}

function defaultLocalId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `local-recipe-${Date.now().toString(36)}-${rand}`;
}
