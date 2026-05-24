import { describe, expect, it } from '@jest/globals';

import {
  createPantryRepository,
  pantryItemInputSchema,
  type PantryDatabase,
} from './pantry-repository';

function createMemoryPantryDatabase(): PantryDatabase {
  type Row = {
    local_id: string;
    remote_id: string | null;
    household_id: string | null;
    name: string;
    normalized_name: string;
    quantity: number;
    unit: string;
    location: string;
    expires_at: string | null;
    privacy: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };

  let rows: Row[] = [];

  return {
    async execute(sql, parameters = []) {
      if (!sql.startsWith('INSERT INTO pantry_items')) {
        throw new Error(`Unexpected execute SQL: ${sql}`);
      }

      const [
        localId,
        name,
        normalizedName,
        quantity,
        unit,
        location,
        expiresAt,
        createdAt,
        updatedAt,
      ] = parameters;

      rows = [
        ...rows,
        {
          local_id: String(localId),
          remote_id: null,
          household_id: null,
          name: String(name),
          normalized_name: String(normalizedName),
          quantity: Number(quantity),
          unit: String(unit),
          location: String(location),
          expires_at: expiresAt === null ? null : String(expiresAt),
          privacy: 'local-only',
          created_at: String(createdAt),
          updated_at: String(updatedAt),
          deleted_at: null,
        },
      ];
    },
    async getAll<T>(sql: string) {
      if (!sql.includes('FROM pantry_items')) {
        throw new Error(`Unexpected getAll SQL: ${sql}`);
      }

      return [...rows].sort((left, right) =>
        `${left.location}:${left.name}`.localeCompare(`${right.location}:${right.name}`),
      ) as T[];
    },
  };
}

describe('pantry repository', () => {
  it('inserts a local-only guest pantry item and lists it back from local storage', async () => {
    const repository = createPantryRepository({
      database: createMemoryPantryDatabase(),
      createLocalId: () => 'local-pantry-1',
      now: () => new Date('2026-05-24T08:00:00.000Z'),
    });

    await repository.addItem({
      name: '  Brown rice  ',
      quantity: 2,
      unit: 'bags',
      location: 'Pantry',
      expiresAt: '2026-08-01',
    });

    await expect(repository.listItems()).resolves.toEqual([
      {
        localId: 'local-pantry-1',
        name: 'Brown rice',
        normalizedName: 'brown rice',
        quantity: 2,
        unit: 'bags',
        location: 'Pantry',
        expiresAt: '2026-08-01',
        privacy: 'local-only',
        createdAt: '2026-05-24T08:00:00.000Z',
        updatedAt: '2026-05-24T08:00:00.000Z',
      },
    ]);
  });

  it('validates pantry input before it reaches local storage', () => {
    const result = pantryItemInputSchema.safeParse({
      name: '',
      quantity: 0,
      unit: '',
      location: '',
      expiresAt: 'not-a-date',
    });

    expect(result.success).toBe(false);
  });
});
