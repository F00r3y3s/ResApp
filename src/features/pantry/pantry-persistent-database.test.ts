import { describe, expect, it } from '@jest/globals';

import { createPantryRepository } from './pantry-repository';
import { createPersistentPantryDatabase } from './pantry-persistent-database';

function createMemoryStorage() {
  let storedValue: string | null = null;

  return {
    getItem: async () => storedValue,
    setItem: async (_key: string, value: string) => {
      storedValue = value;
    },
  };
}

describe('persistent pantry database', () => {
  it('persists guest pantry rows across repository instances', async () => {
    const storage = createMemoryStorage();
    const firstRepository = createPantryRepository({
      database: createPersistentPantryDatabase(storage),
      createLocalId: () => 'local-pantry-expo-go',
      now: () => new Date('2026-05-24T08:00:00.000Z'),
    });

    await firstRepository.addItem({
      name: 'Brown rice',
      quantity: 2,
      unit: 'bags',
      location: 'Pantry',
      expiresAt: null,
    });

    const reloadedRepository = createPantryRepository({
      database: createPersistentPantryDatabase(storage),
    });

    await expect(reloadedRepository.listItems()).resolves.toEqual([
      expect.objectContaining({
        localId: 'local-pantry-expo-go',
        name: 'Brown rice',
        quantity: 2,
        unit: 'bags',
        location: 'Pantry',
      }),
    ]);
  });
});
