import type { GroceryDatabase } from './grocery-repository';

const STORAGE_KEY = 'family-ai-kitchen:guest-grocery-items';

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
  deleted_at: string | null;
};

type KeyValueStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export function createPersistentGroceryDatabase(storage: KeyValueStorage): GroceryDatabase {
  return {
    async execute(sql, parameters = []) {
      if (sql.startsWith('INSERT OR REPLACE INTO grocery_items')) {
        const [
          localId,
          name,
          normalizedName,
          quantity,
          unit,
          recipeId,
          recipeTitle,
          isChecked,
          createdAt,
          updatedAt,
        ] = parameters;
        const rows = await readRows(storage);
        const filtered = rows.filter((row) => row.local_id !== String(localId));
        await writeRows(storage, [
          ...filtered,
          {
            local_id: String(localId),
            name: String(name),
            normalized_name: String(normalizedName),
            quantity: String(quantity),
            unit: String(unit),
            recipe_id: recipeId === null ? null : String(recipeId),
            recipe_title: recipeTitle === null ? null : String(recipeTitle),
            is_checked: Number(isChecked),
            privacy: 'local-only',
            created_at: String(createdAt),
            updated_at: String(updatedAt),
            deleted_at: null,
          },
        ]);
        return;
      }

      if (
        sql.startsWith('UPDATE grocery_items SET is_checked')
      ) {
        const [isChecked, updatedAt, localId] = parameters;
        const rows = await readRows(storage);
        await writeRows(
          storage,
          rows.map((row) =>
            row.local_id === String(localId)
              ? { ...row, is_checked: Number(isChecked), updated_at: String(updatedAt) }
              : row,
          ),
        );
        return;
      }

      if (
        sql.startsWith('UPDATE grocery_items SET deleted_at') &&
        sql.includes('WHERE local_id')
      ) {
        const [deletedAt, updatedAt, localId] = parameters;
        const rows = await readRows(storage);
        await writeRows(
          storage,
          rows.map((row) =>
            row.local_id === String(localId)
              ? {
                  ...row,
                  deleted_at: String(deletedAt),
                  updated_at: String(updatedAt),
                }
              : row,
          ),
        );
        return;
      }

      if (
        sql.startsWith('UPDATE grocery_items SET deleted_at') &&
        sql.includes('is_checked = 1')
      ) {
        const [deletedAt, updatedAt] = parameters;
        const rows = await readRows(storage);
        await writeRows(
          storage,
          rows.map((row) =>
            row.is_checked === 1 && row.deleted_at === null
              ? {
                  ...row,
                  deleted_at: String(deletedAt),
                  updated_at: String(updatedAt),
                }
              : row,
          ),
        );
        return;
      }

      throw new Error(`Unsupported grocery SQL: ${sql.slice(0, 60)}`);
    },

    async getAll<T>(sql: string) {
      if (!sql.includes('FROM grocery_items')) {
        throw new Error(`Unsupported grocery getAll SQL: ${sql.slice(0, 60)}`);
      }
      const rows = await readRows(storage);
      return rows
        .filter((row) => row.deleted_at === null)
        .sort((left, right) => {
          if (left.is_checked !== right.is_checked) {
            return left.is_checked - right.is_checked;
          }
          return left.created_at.localeCompare(right.created_at);
        }) as unknown as T[];
    },
  };
}

async function readRows(storage: KeyValueStorage): Promise<GroceryItemRow[]> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRows(storage: KeyValueStorage, rows: GroceryItemRow[]) {
  await storage.setItem(STORAGE_KEY, JSON.stringify(rows));
}
