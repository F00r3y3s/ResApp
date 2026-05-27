import type { MealPlanDatabase } from './meal-plan-repository';

const STORAGE_KEY = 'family-ai-kitchen:guest-meal-plan-entries';

type MealPlanEntryRow = {
  week_start_iso: string;
  day: number;
  slot: string;
  recipe_id: string;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type KeyValueStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export function createPersistentMealPlanDatabase(storage: KeyValueStorage): MealPlanDatabase {
  return {
    async execute(sql, parameters = []) {
      if (sql.startsWith('INSERT OR REPLACE INTO meal_plan_entries')) {
        const [weekStartIso, day, slot, recipeId, createdAt, updatedAt] = parameters;
        const rows = await readRows(storage);
        const filtered = rows.filter(
          (row) =>
            !(
              row.week_start_iso === String(weekStartIso) &&
              row.day === Number(day) &&
              row.slot === String(slot)
            ),
        );
        await writeRows(storage, [
          ...filtered,
          {
            week_start_iso: String(weekStartIso),
            day: Number(day),
            slot: String(slot),
            recipe_id: String(recipeId),
            privacy: 'local-only',
            created_at: String(createdAt),
            updated_at: String(updatedAt),
            deleted_at: null,
          },
        ]);
        return;
      }

      if (sql.startsWith('UPDATE meal_plan_entries SET deleted_at')) {
        const [deletedAt, updatedAt, weekStartIso, day, slot] = parameters;
        const rows = await readRows(storage);
        await writeRows(
          storage,
          rows.map((row) =>
            row.week_start_iso === String(weekStartIso) &&
            row.day === Number(day) &&
            row.slot === String(slot)
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

      throw new Error(`Unsupported meal plan SQL: ${sql.slice(0, 60)}`);
    },

    async getAll<T>(sql: string, parameters: unknown[] = []) {
      if (!sql.includes('FROM meal_plan_entries')) {
        throw new Error(`Unsupported meal plan getAll SQL: ${sql.slice(0, 60)}`);
      }

      const weekStartIso = String(parameters[0] ?? '');
      const rows = await readRows(storage);
      return rows
        .filter(
          (row) => row.deleted_at === null && row.week_start_iso === weekStartIso,
        )
        .sort(
          (left, right) => left.day - right.day || left.slot.localeCompare(right.slot),
        ) as unknown as T[];
    },
  };
}

async function readRows(storage: KeyValueStorage): Promise<MealPlanEntryRow[]> {
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

async function writeRows(storage: KeyValueStorage, rows: MealPlanEntryRow[]) {
  await storage.setItem(STORAGE_KEY, JSON.stringify(rows));
}
