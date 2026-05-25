import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import { type GroceryItemDraft, normalizeIngredientName, subtractPantryFromRecipe } from './grocery-model';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GroceryItem = {
  localId: string;
  name: string;
  normalizedName: string;
  quantity: string;
  unit: string;
  recipeId: string | null;
  recipeTitle: string | null;
  isChecked: boolean;
  privacy: 'local-only';
  createdAt: string;
  updatedAt: string;
};

export type AddRecipeToListResult = {
  /** Items that were newly inserted into the grocery list. */
  added: GroceryItem[];
  /** Number of recipe ingredients the pantry already covered. */
  alreadyHaveCount: number;
  /** Number of recipe ingredients that were already on the unchecked list. */
  alreadyOnList: number;
};

export type GroceryDatabase = {
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
};

export type GroceryRepository = {
  listItems(): Promise<GroceryItem[]>;
  addRecipeToList(recipe: Recipe, pantryItems: PantryItem[]): Promise<AddRecipeToListResult>;
  addMultipleToList(drafts: GroceryItemDraft[]): Promise<GroceryItem[]>;
  setChecked(localId: string, isChecked: boolean): Promise<void>;
  removeItem(localId: string): Promise<void>;
  clearChecked(): Promise<void>;
};

export type GroceryRepositoryOptions = {
  database: GroceryDatabase;
  createLocalId?: () => string;
  now?: () => Date;
};

// ---------------------------------------------------------------------------
// Internal row shape
// ---------------------------------------------------------------------------

type GroceryItemRow = {
  local_id: string;
  name: string;
  normalized_name: string;
  quantity: string;
  unit: string;
  recipe_id: string | null;
  recipe_title: string | null;
  is_checked: number;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export function createGroceryRepository(
  options: GroceryRepositoryOptions,
): GroceryRepository {
  const database = options.database;
  const createLocalId = options.createLocalId ?? defaultLocalId;
  const now = options.now ?? (() => new Date());

  return {
    async listItems() {
      const rows = await database.getAll<GroceryItemRow>(
        `SELECT
          local_id,
          name,
          normalized_name,
          quantity,
          unit,
          recipe_id,
          recipe_title,
          is_checked,
          privacy,
          created_at,
          updated_at
        FROM grocery_items
        WHERE deleted_at IS NULL
        ORDER BY is_checked ASC, created_at ASC`,
      );
      return rows.map(mapRow);
    },

    async addRecipeToList(recipe, pantryItems) {
      const subtraction = subtractPantryFromRecipe({ recipe, pantryItems });
      const alreadyHaveCount = subtraction.alreadyHave.length;

      const existingRows = await database.getAll<GroceryItemRow>(
        `SELECT
          local_id,
          name,
          normalized_name,
          quantity,
          unit,
          recipe_id,
          recipe_title,
          is_checked,
          privacy,
          created_at,
          updated_at
        FROM grocery_items
        WHERE deleted_at IS NULL`,
      );
      const existingUncheckedNames = new Set(
        existingRows
          .filter((row) => row.is_checked === 0)
          .map((row) => row.normalized_name),
      );

      const added: GroceryItem[] = [];
      let alreadyOnList = 0;

      for (const draft of subtraction.missing) {
        const normalizedName = draft.normalizedName || normalizeIngredientName(draft.name);
        if (existingUncheckedNames.has(normalizedName)) {
          alreadyOnList += 1;
          continue;
        }

        const timestamp = now().toISOString();
        const item: GroceryItem = {
          localId: createLocalId(),
          name: draft.name,
          normalizedName,
          quantity: draft.quantity,
          unit: draft.unit,
          recipeId: draft.recipeId,
          recipeTitle: draft.recipeTitle,
          isChecked: false,
          privacy: 'local-only',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await database.execute(
          `INSERT OR REPLACE INTO grocery_items (
            local_id,
            name,
            normalized_name,
            quantity,
            unit,
            recipe_id,
            recipe_title,
            is_checked,
            privacy,
            created_at,
            updated_at,
            deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local-only', ?, ?, NULL)`,
          [
            item.localId,
            item.name,
            item.normalizedName,
            item.quantity,
            item.unit,
            item.recipeId,
            item.recipeTitle,
            item.isChecked ? 1 : 0,
            item.createdAt,
            item.updatedAt,
          ],
        );

        existingUncheckedNames.add(normalizedName);
        added.push(item);
      }

      return { added, alreadyHaveCount, alreadyOnList };
    },

    async addMultipleToList(drafts) {
      const existingRows = await database.getAll<GroceryItemRow>(
        `SELECT
          local_id,
          name,
          normalized_name,
          quantity,
          unit,
          recipe_id,
          recipe_title,
          is_checked,
          privacy,
          created_at,
          updated_at
        FROM grocery_items
        WHERE deleted_at IS NULL`,
      );
      const existingUncheckedNames = new Set(
        existingRows
          .filter((row) => row.is_checked === 0)
          .map((row) => row.normalized_name),
      );

      const added: GroceryItem[] = [];

      for (const draft of drafts) {
        const normalizedName = draft.normalizedName || normalizeIngredientName(draft.name);
        if (existingUncheckedNames.has(normalizedName)) {
          continue;
        }

        const timestamp = now().toISOString();
        const item: GroceryItem = {
          localId: createLocalId(),
          name: draft.name,
          normalizedName,
          quantity: draft.quantity,
          unit: draft.unit,
          recipeId: draft.recipeId,
          recipeTitle: draft.recipeTitle,
          isChecked: false,
          privacy: 'local-only',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        await database.execute(
          `INSERT OR REPLACE INTO grocery_items (
            local_id,
            name,
            normalized_name,
            quantity,
            unit,
            recipe_id,
            recipe_title,
            is_checked,
            privacy,
            created_at,
            updated_at,
            deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local-only', ?, ?, NULL)`,
          [
            item.localId,
            item.name,
            item.normalizedName,
            item.quantity,
            item.unit,
            item.recipeId,
            item.recipeTitle,
            item.isChecked ? 1 : 0,
            item.createdAt,
            item.updatedAt,
          ],
        );

        existingUncheckedNames.add(normalizedName);
        added.push(item);
      }

      return added;
    },

    async setChecked(localId, isChecked) {
      const timestamp = now().toISOString();
      await database.execute(
        `UPDATE grocery_items SET is_checked = ?, updated_at = ? WHERE local_id = ?`,
        [isChecked ? 1 : 0, timestamp, localId],
      );
    },

    async removeItem(localId) {
      const timestamp = now().toISOString();
      await database.execute(
        `UPDATE grocery_items SET deleted_at = ?, updated_at = ? WHERE local_id = ?`,
        [timestamp, timestamp, localId],
      );
    },

    async clearChecked() {
      const timestamp = now().toISOString();
      await database.execute(
        `UPDATE grocery_items SET deleted_at = ?, updated_at = ? WHERE is_checked = 1 AND deleted_at IS NULL`,
        [timestamp, timestamp],
      );
    },
  };
}

function mapRow(row: GroceryItemRow): GroceryItem {
  return {
    localId: row.local_id,
    name: row.name,
    normalizedName: row.normalized_name,
    quantity: row.quantity,
    unit: row.unit,
    recipeId: row.recipe_id,
    recipeTitle: row.recipe_title,
    isChecked: row.is_checked === 1,
    privacy: row.privacy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function defaultLocalId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `local-grocery-${Date.now().toString(36)}-${randomPart}`;
}
