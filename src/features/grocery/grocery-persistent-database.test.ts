import { describe, expect, it } from '@jest/globals';

import type { Recipe } from '@/features/recipes/recipes-repository';

import { createPersistentGroceryDatabase } from './grocery-persistent-database';
import { createGroceryRepository } from './grocery-repository';

function createMemoryStorage() {
  let value: string | null = null;
  return {
    getItem: async () => value,
    setItem: async (_key: string, next: string) => {
      value = next;
    },
  };
}

function recipe(): Recipe {
  return {
    localId: 'seed-001',
    seedId: 'seed-001',
    title: 'Family Lentil Soup',
    cuisine: 'levantine',
    dietTags: [],
    allergens: [],
    prepMinutes: 0,
    cookMinutes: 0,
    servings: 2,
    ingredients: [
      { name: 'Red lentils', quantity: '1.5', unit: 'cups' },
      { name: 'Garlic', quantity: '3', unit: 'cloves' },
    ],
    steps: [],
    imageKey: null,
    source: '',
    attribution: '',
    license: '',
    isSaved: false,
    privacy: 'local-only',
    createdAt: '',
    updatedAt: '',
  };
}

const referenceNow = () => new Date('2026-05-25T08:00:00.000Z');

describe('persistent grocery database', () => {
  it('persists grocery items across repository instances (survives app restart)', async () => {
    const storage = createMemoryStorage();
    let counter = 0;
    const localId = () => {
      counter += 1;
      return `local-grocery-${counter}`;
    };

    const first = createGroceryRepository({
      database: createPersistentGroceryDatabase(storage),
      now: referenceNow,
      createLocalId: localId,
    });
    await first.addRecipeToList(recipe(), []);

    const reloaded = createGroceryRepository({
      database: createPersistentGroceryDatabase(storage),
      now: referenceNow,
      createLocalId: localId,
    });

    const list = await reloaded.listItems();
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.name).sort()).toEqual(['Garlic', 'Red lentils']);
  });

  it('preserves checked state after restart', async () => {
    const storage = createMemoryStorage();
    let counter = 0;
    const localId = () => {
      counter += 1;
      return `local-grocery-${counter}`;
    };

    const first = createGroceryRepository({
      database: createPersistentGroceryDatabase(storage),
      now: referenceNow,
      createLocalId: localId,
    });
    await first.addRecipeToList(recipe(), []);
    const items = await first.listItems();
    await first.setChecked(items[0].localId, true);

    const reloaded = createGroceryRepository({
      database: createPersistentGroceryDatabase(storage),
    });
    const list = await reloaded.listItems();
    expect(list.filter((i) => i.isChecked)).toHaveLength(1);
    expect(list.filter((i) => !i.isChecked)).toHaveLength(1);
  });

  it('does not surface soft-deleted items after restart', async () => {
    const storage = createMemoryStorage();
    let counter = 0;
    const localId = () => {
      counter += 1;
      return `local-grocery-${counter}`;
    };

    const first = createGroceryRepository({
      database: createPersistentGroceryDatabase(storage),
      now: referenceNow,
      createLocalId: localId,
    });
    await first.addRecipeToList(recipe(), []);
    const items = await first.listItems();
    await first.removeItem(items[0].localId);

    const reloaded = createGroceryRepository({
      database: createPersistentGroceryDatabase(storage),
    });

    const list = await reloaded.listItems();
    expect(list).toHaveLength(1);
    expect(list.some((i) => i.localId === items[0].localId)).toBe(false);
  });
});
