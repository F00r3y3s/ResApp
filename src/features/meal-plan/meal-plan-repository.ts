import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine(
    (value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()),
    { message: 'Use a real calendar date' },
  );

const daySchema = z
  .number()
  .int()
  .min(0, 'Day must be 0..6 (Mon..Sun)')
  .max(6, 'Day must be 0..6 (Mon..Sun)');

const slotSchema = z.enum(['breakfast', 'lunch', 'dinner']);

const recipeIdSchema = z
  .string()
  .trim()
  .min(1, 'recipeId is required')
  .max(120, 'recipeId is too long');

export const mealPlanEntryInputSchema = z.object({
  weekStartIso: isoDateSchema,
  day: daySchema,
  slot: slotSchema,
  recipeId: recipeIdSchema,
});

export const mealPlanSlotKeySchema = z.object({
  weekStartIso: isoDateSchema,
  day: daySchema,
  slot: slotSchema,
});

export type MealSlot = z.infer<typeof slotSchema>;
export type MealPlanDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MealPlanEntryInput = z.input<typeof mealPlanEntryInputSchema>;
export type MealPlanSlotKey = z.input<typeof mealPlanSlotKeySchema>;

export type MealPlanEntry = {
  weekStartIso: string;
  day: MealPlanDay;
  slot: MealSlot;
  recipeId: string;
  privacy: 'local-only';
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Storage abstraction
// ---------------------------------------------------------------------------

export type MealPlanDatabase = {
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
};

type MealPlanEntryRow = {
  week_start_iso: string;
  day: number;
  slot: string;
  recipe_id: string;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export type MealPlanRepository = {
  getWeek(weekStartIso: string): Promise<MealPlanEntry[]>;
  setEntry(input: MealPlanEntryInput): Promise<MealPlanEntry>;
  removeEntry(key: MealPlanSlotKey): Promise<void>;
};

export type MealPlanRepositoryOptions = {
  database: MealPlanDatabase;
  now?: () => Date;
};

export function createMealPlanRepository(
  options: MealPlanRepositoryOptions,
): MealPlanRepository {
  const database = options.database;
  const now = options.now ?? (() => new Date());

  return {
    async getWeek(weekStartIso) {
      const parsedWeek = isoDateSchema.parse(weekStartIso);
      const rows = await database.getAll<MealPlanEntryRow>(
        `SELECT week_start_iso, day, slot, recipe_id, privacy, created_at, updated_at FROM meal_plan_entries WHERE deleted_at IS NULL AND week_start_iso = ? ORDER BY day, slot`,
        [parsedWeek],
      );

      return rows.map(mapRow);
    },

    async setEntry(input) {
      const parsed = mealPlanEntryInputSchema.parse(input);
      const timestamp = now().toISOString();

      await database.execute(
        `INSERT OR REPLACE INTO meal_plan_entries (week_start_iso, day, slot, recipe_id, privacy, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, 'local-only', ?, ?, NULL)`,
        [parsed.weekStartIso, parsed.day, parsed.slot, parsed.recipeId, timestamp, timestamp],
      );

      return {
        weekStartIso: parsed.weekStartIso,
        day: parsed.day as MealPlanDay,
        slot: parsed.slot,
        recipeId: parsed.recipeId,
        privacy: 'local-only',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    },

    async removeEntry(key) {
      const parsed = mealPlanSlotKeySchema.parse(key);
      const timestamp = now().toISOString();

      await database.execute(
        `UPDATE meal_plan_entries SET deleted_at = ?, updated_at = ? WHERE week_start_iso = ? AND day = ? AND slot = ?`,
        [timestamp, timestamp, parsed.weekStartIso, parsed.day, parsed.slot],
      );
    },
  };
}

function mapRow(row: MealPlanEntryRow): MealPlanEntry {
  return {
    weekStartIso: row.week_start_iso,
    day: row.day as MealPlanDay,
    slot: row.slot as MealSlot,
    recipeId: row.recipe_id,
    privacy: row.privacy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
