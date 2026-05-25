import { describe, expect, it } from '@jest/globals';

import {
    createMealPlanRepository,
    type MealPlanDatabase,
    type MealPlanEntry,
} from './meal-plan-repository';

type Row = {
  week_start_iso: string;
  day: number;
  slot: string;
  recipe_id: string;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function createMemoryMealPlanDatabase(): MealPlanDatabase {
  let rows: Row[] = [];

  return {
    async execute(sql, parameters = []) {
      if (sql.startsWith('INSERT OR REPLACE INTO meal_plan_entries')) {
        const [weekStartIso, day, slot, recipeId, createdAt, updatedAt] = parameters;
        const filtered = rows.filter(
          (row) =>
            !(
              row.week_start_iso === String(weekStartIso) &&
              row.day === Number(day) &&
              row.slot === String(slot)
            ),
        );
        rows = [
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
        ];
        return;
      }

      if (sql.startsWith('UPDATE meal_plan_entries SET deleted_at')) {
        const [deletedAt, updatedAt, weekStartIso, day, slot] = parameters;
        rows = rows.map((row) =>
          row.week_start_iso === String(weekStartIso) &&
          row.day === Number(day) &&
          row.slot === String(slot)
            ? { ...row, deleted_at: String(deletedAt), updated_at: String(updatedAt) }
            : row,
        );
        return;
      }

      throw new Error(`Unexpected execute SQL: ${sql}`);
    },
    async getAll<T>(sql: string, parameters: unknown[] = []) {
      if (!sql.includes('FROM meal_plan_entries')) {
        throw new Error(`Unexpected getAll SQL: ${sql}`);
      }
      const weekStartIso = String(parameters[0]);
      return rows
        .filter((row) => row.deleted_at === null && row.week_start_iso === weekStartIso)
        .sort((left, right) => left.day - right.day || left.slot.localeCompare(right.slot)) as T[];
    },
  };
}

const referenceNow = () => new Date('2026-05-25T08:00:00.000Z');

describe('meal plan repository', () => {
  it('adds a saved recipe to a weekly slot and lists it back', async () => {
    const repository = createMealPlanRepository({
      database: createMemoryMealPlanDatabase(),
      now: referenceNow,
    });

    await repository.setEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'breakfast',
      recipeId: 'seed-001',
    });

    const week: MealPlanEntry[] = await repository.getWeek('2026-05-25');
    expect(week).toEqual([
      {
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'breakfast',
        recipeId: 'seed-001',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ]);
  });

  it('replaces an existing slot when the same week/day/slot is set again', async () => {
    const repository = createMealPlanRepository({
      database: createMemoryMealPlanDatabase(),
      now: referenceNow,
    });

    await repository.setEntry({
      weekStartIso: '2026-05-25',
      day: 2,
      slot: 'dinner',
      recipeId: 'seed-001',
    });
    await repository.setEntry({
      weekStartIso: '2026-05-25',
      day: 2,
      slot: 'dinner',
      recipeId: 'seed-002',
    });

    const week = await repository.getWeek('2026-05-25');
    expect(week).toHaveLength(1);
    expect(week[0]).toEqual(
      expect.objectContaining({
        day: 2,
        slot: 'dinner',
        recipeId: 'seed-002',
      }),
    );
  });

  it('removes an entry from a slot without affecting other slots', async () => {
    const repository = createMealPlanRepository({
      database: createMemoryMealPlanDatabase(),
      now: referenceNow,
    });

    await repository.setEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'breakfast',
      recipeId: 'seed-001',
    });
    await repository.setEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'lunch',
      recipeId: 'seed-002',
    });

    await repository.removeEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'breakfast',
    });

    const week = await repository.getWeek('2026-05-25');
    expect(week).toEqual([
      expect.objectContaining({ day: 0, slot: 'lunch', recipeId: 'seed-002' }),
    ]);
  });

  it('does not return entries from other weeks', async () => {
    const repository = createMealPlanRepository({
      database: createMemoryMealPlanDatabase(),
      now: referenceNow,
    });

    await repository.setEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'breakfast',
      recipeId: 'seed-001',
    });
    await repository.setEntry({
      weekStartIso: '2026-06-01',
      day: 0,
      slot: 'breakfast',
      recipeId: 'seed-002',
    });

    await expect(repository.getWeek('2026-05-25')).resolves.toEqual([
      expect.objectContaining({ recipeId: 'seed-001' }),
    ]);
    await expect(repository.getWeek('2026-06-01')).resolves.toEqual([
      expect.objectContaining({ recipeId: 'seed-002' }),
    ]);
  });

  it('rejects invalid input before it touches local storage', async () => {
    const repository = createMealPlanRepository({
      database: createMemoryMealPlanDatabase(),
      now: referenceNow,
    });

    await expect(
      repository.setEntry({
        weekStartIso: 'not-a-date',
        day: 0,
        slot: 'breakfast',
        recipeId: 'seed-001',
      }),
    ).rejects.toThrow();

    await expect(
      repository.setEntry({
        weekStartIso: '2026-05-25',
        day: 9 as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        slot: 'breakfast',
        recipeId: 'seed-001',
      }),
    ).rejects.toThrow();

    await expect(
      repository.setEntry({
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'brunch' as 'breakfast',
        recipeId: 'seed-001',
      }),
    ).rejects.toThrow();
  });
});
