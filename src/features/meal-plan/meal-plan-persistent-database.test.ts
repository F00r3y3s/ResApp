import { describe, expect, it } from '@jest/globals';

import { createPersistentMealPlanDatabase } from './meal-plan-persistent-database';
import { createMealPlanRepository } from './meal-plan-repository';

function createMemoryStorage() {
  let value: string | null = null;
  return {
    getItem: async () => value,
    setItem: async (_key: string, next: string) => {
      value = next;
    },
  };
}

const referenceNow = () => new Date('2026-05-25T08:00:00.000Z');

describe('persistent meal plan database', () => {
  it('persists meal plan entries across repository instances (survives app restart)', async () => {
    const storage = createMemoryStorage();
    const first = createMealPlanRepository({
      database: createPersistentMealPlanDatabase(storage),
      now: referenceNow,
    });

    await first.setEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'dinner',
      recipeId: 'seed-001',
    });
    await first.setEntry({
      weekStartIso: '2026-05-25',
      day: 3,
      slot: 'lunch',
      recipeId: 'seed-002',
    });

    const reloaded = createMealPlanRepository({
      database: createPersistentMealPlanDatabase(storage),
    });

    const week = await reloaded.getWeek('2026-05-25');
    expect(week).toHaveLength(2);
    expect(week).toEqual([
      expect.objectContaining({ day: 0, slot: 'dinner', recipeId: 'seed-001' }),
      expect.objectContaining({ day: 3, slot: 'lunch', recipeId: 'seed-002' }),
    ]);
  });

  it('soft-deletes removed entries so they do not reappear after restart', async () => {
    const storage = createMemoryStorage();
    const first = createMealPlanRepository({
      database: createPersistentMealPlanDatabase(storage),
      now: referenceNow,
    });

    await first.setEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'dinner',
      recipeId: 'seed-001',
    });
    await first.removeEntry({
      weekStartIso: '2026-05-25',
      day: 0,
      slot: 'dinner',
    });

    const reloaded = createMealPlanRepository({
      database: createPersistentMealPlanDatabase(storage),
    });

    await expect(reloaded.getWeek('2026-05-25')).resolves.toEqual([]);
  });
});
