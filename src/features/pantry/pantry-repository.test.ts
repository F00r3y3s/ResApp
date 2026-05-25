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
      if (sql.startsWith('INSERT INTO pantry_items')) {
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
        return;
      }

      if (sql.includes('UPDATE pantry_items')) {
        // Soft-delete: SET deleted_at = ? WHERE local_id = ?
        if (sql.includes('deleted_at =') && !sql.includes('SET name')) {
          const [deletedAt, localId] = parameters;
          rows = rows.map((row) =>
            row.local_id === String(localId)
              ? { ...row, deleted_at: String(deletedAt) }
              : row,
          );
          return;
        }

        // Full update
        const [name, normalizedName, quantity, unit, location, expiresAt, updatedAt, localId] =
          parameters;

        rows = rows.map((row) =>
          row.local_id === String(localId)
            ? {
                ...row,
                name: String(name),
                normalized_name: String(normalizedName),
                quantity: Number(quantity),
                unit: String(unit),
                location: String(location),
                expires_at: expiresAt === null ? null : String(expiresAt),
                updated_at: String(updatedAt),
              }
            : row,
        );
        return;
      }

      throw new Error(`Unexpected execute SQL: ${sql}`);
    },
    async getAll<T>(sql: string) {
      if (!sql.includes('FROM pantry_items')) {
        throw new Error(`Unexpected getAll SQL: ${sql}`);
      }

      const active = rows.filter((row) => row.deleted_at === null);
      return [...active].sort((left, right) =>
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

  it('updates an existing pantry item by localId', async () => {
    const repository = createPantryRepository({
      database: createMemoryPantryDatabase(),
      createLocalId: () => 'local-pantry-1',
      now: () => new Date('2026-05-24T08:00:00.000Z'),
    });

    await repository.addItem({
      name: 'Brown rice',
      quantity: 2,
      unit: 'bags',
      location: 'Pantry',
      expiresAt: '2026-08-01',
    });

    const updated = await repository.updateItem('local-pantry-1', {
      name: 'Basmati rice',
      quantity: 3,
      unit: 'kg',
      location: 'Pantry',
      expiresAt: '2026-09-15',
    });

    expect(updated.name).toBe('Basmati rice');
    expect(updated.quantity).toBe(3);
    expect(updated.unit).toBe('kg');
    expect(updated.expiresAt).toBe('2026-09-15');

    const items = await repository.listItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Basmati rice');
  });

  it('soft-deletes a pantry item so it no longer appears in the list', async () => {
    const repository = createPantryRepository({
      database: createMemoryPantryDatabase(),
      createLocalId: () => 'local-pantry-1',
      now: () => new Date('2026-05-24T08:00:00.000Z'),
    });

    await repository.addItem({
      name: 'Spinach',
      quantity: 1,
      unit: 'bag',
      location: 'Fridge',
      expiresAt: '2026-05-27',
    });

    await repository.deleteItem('local-pantry-1');

    const items = await repository.listItems();
    expect(items).toHaveLength(0);
  });
});
