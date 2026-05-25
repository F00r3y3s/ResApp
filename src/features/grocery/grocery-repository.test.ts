import { describe, expect, it } from '@jest/globals';

import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import {
    createGroceryRepository,
    type GroceryDatabase,
    type GroceryItem,
} from './grocery-repository';

type Row = {
  local_id: string;
  name: string;
  normalized_name: string;
  quantity: string;
  unit: string;
  recipe_id: string | null;
  recipe_title: string | null;
  is_checked: number;
  section: string | null;
  assigned_to: string | null;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function createMemoryGroceryDatabase(): GroceryDatabase {
  let rows: Row[] = [];

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
          section,
          assignedTo,
          createdAt,
          updatedAt,
        ] = parameters;
        const filtered = rows.filter((r) => r.local_id !== String(localId));
        rows = [
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
            section: section === null || section === undefined ? null : String(section),
            assigned_to: assignedTo === null || assignedTo === undefined ? null : String(assignedTo),
            privacy: 'local-only',
            created_at: String(createdAt),
            updated_at: String(updatedAt),
            deleted_at: null,
          },
        ];
        return;
      }

      if (sql.startsWith('UPDATE grocery_items SET is_checked')) {
        const [isChecked, updatedAt, localId] = parameters;
        rows = rows.map((r) =>
          r.local_id === String(localId)
            ? { ...r, is_checked: Number(isChecked), updated_at: String(updatedAt) }
            : r,
        );
        return;
      }

      if (sql.startsWith('UPDATE grocery_items SET assigned_to')) {
        const [assignedTo, updatedAt, localId] = parameters;
        rows = rows.map((r) =>
          r.local_id === String(localId)
            ? { ...r, assigned_to: assignedTo === null ? null : String(assignedTo), updated_at: String(updatedAt) }
            : r,
        );
        return;
      }

      if (sql.startsWith('UPDATE grocery_items SET section')) {
        const [section, updatedAt, localId] = parameters;
        rows = rows.map((r) =>
          r.local_id === String(localId)
            ? { ...r, section: String(section), updated_at: String(updatedAt) }
            : r,
        );
        return;
      }

      if (sql.startsWith('UPDATE grocery_items SET deleted_at') && sql.includes('WHERE local_id')) {
        const [deletedAt, updatedAt, localId] = parameters;
        rows = rows.map((r) =>
          r.local_id === String(localId)
            ? { ...r, deleted_at: String(deletedAt), updated_at: String(updatedAt) }
            : r,
        );
        return;
      }

      if (sql.startsWith('UPDATE grocery_items SET deleted_at') && sql.includes('is_checked = 1')) {
        const [deletedAt, updatedAt] = parameters;
        rows = rows.map((r) =>
          r.is_checked === 1 && r.deleted_at === null
            ? { ...r, deleted_at: String(deletedAt), updated_at: String(updatedAt) }
            : r,
        );
        return;
      }

      throw new Error(`Unexpected execute SQL: ${sql}`);
    },
    async getAll<T>(sql: string) {
      if (!sql.includes('FROM grocery_items')) {
        throw new Error(`Unexpected getAll SQL: ${sql}`);
      }
      // Match repository order: unchecked first, then checked, then by created_at asc.
      return rows
        .filter((r) => r.deleted_at === null)
        .sort((left, right) => {
          if (left.is_checked !== right.is_checked) {
            return left.is_checked - right.is_checked;
          }
          return left.created_at.localeCompare(right.created_at);
        }) as T[];
    },
  };
}

function pantryItem(name: string, normalizedName?: string): PantryItem {
  const norm = normalizedName ?? name.toLocaleLowerCase();
  return {
    localId: `local-${norm}`,
    name,
    normalizedName: norm,
    quantity: 1,
    unit: 'whole',
    location: 'pantry',
    expiresAt: null,
    privacy: 'local-only',
    createdAt: '2026-05-25T00:00:00.000Z',
    updatedAt: '2026-05-25T00:00:00.000Z',
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
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
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

let counter = 0;
const sequentialLocalId = () => {
  counter += 1;
  return `local-grocery-${counter}`;
};

describe('grocery repository', () => {
  it('lists nothing for a fresh database', async () => {
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await expect(repository.listItems()).resolves.toEqual([]);
  });

  it('adds a recipe to the grocery list with pantry-aware subtraction', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    const result = await repository.addRecipeToList(recipe(), [pantryItem('Garlic')]);

    expect(result.alreadyHaveCount).toBe(1);
    expect(result.added.map((i) => i.name)).toEqual(['Red lentils', 'Cumin']);

    const list = await repository.listItems();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual(
      expect.objectContaining({
        name: 'Red lentils',
        normalizedName: 'red lentils',
        quantity: '1.5',
        unit: 'cups',
        recipeId: 'seed-001',
        recipeTitle: 'Family Lentil Soup',
        isChecked: false,
        privacy: 'local-only',
      }),
    );
  });

  it('does not duplicate an item that is already on the unchecked list', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const second = await repository.addRecipeToList(recipe(), []);

    expect(second.alreadyOnList).toBe(3);
    expect(second.added).toEqual([]);

    const list = await repository.listItems();
    expect(list).toHaveLength(3);
  });

  it('toggles checked state and keeps unchecked items on top', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const beforeCheck = await repository.listItems();
    expect(beforeCheck.every((i) => !i.isChecked)).toBe(true);

    const target = beforeCheck[0];
    await repository.setChecked(target.localId, true);

    const afterCheck = await repository.listItems();
    expect(afterCheck[0].isChecked).toBe(false);
    expect(afterCheck[afterCheck.length - 1].localId).toBe(target.localId);
    expect(afterCheck[afterCheck.length - 1].isChecked).toBe(true);
  });

  it('removes an item from the list (soft-delete) so it does not come back', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const before = await repository.listItems();
    await repository.removeItem(before[0].localId);

    const after = await repository.listItems();
    expect(after.find((i) => i.localId === before[0].localId)).toBeUndefined();
    expect(after).toHaveLength(2);
  });

  it('clears all checked items at once', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const items = await repository.listItems();
    await repository.setChecked(items[0].localId, true);
    await repository.setChecked(items[1].localId, true);

    await repository.clearChecked();

    const remaining = await repository.listItems();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].isChecked).toBe(false);
  });

  it('reports zero added items but counts pantry coverage when pantry already has everything', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    const fullPantry = [pantryItem('Red lentils'), pantryItem('Garlic'), pantryItem('Cumin')];
    const result: { added: GroceryItem[]; alreadyHaveCount: number } =
      await repository.addRecipeToList(recipe(), fullPantry);

    expect(result.added).toEqual([]);
    expect(result.alreadyHaveCount).toBe(3);
    await expect(repository.listItems()).resolves.toEqual([]);
  });

  it('auto-infers section when adding a recipe to the list', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const items = await repository.listItems();

    const lentils = items.find((i) => i.name === 'Red lentils');
    const cumin = items.find((i) => i.name === 'Cumin');
    const garlic = items.find((i) => i.name === 'Garlic');

    expect(lentils?.section).toBe('Pantry');
    expect(cumin?.section).toBe('Spices');
    expect(garlic?.section).toBe('Produce');
  });

  it('assigns an item to a household member and persists it', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const items = await repository.listItems();
    const target = items[0];

    expect(target.assignedTo).toBeNull();

    await repository.assignItem!(target.localId, 'member-aisha');
    const afterAssign = await repository.listItems();
    const assigned = afterAssign.find((i) => i.localId === target.localId);
    expect(assigned?.assignedTo).toBe('member-aisha');
  });

  it('unassigns an item by passing null', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const items = await repository.listItems();
    const target = items[0];

    await repository.assignItem!(target.localId, 'member-aisha');
    await repository.assignItem!(target.localId, null);

    const afterUnassign = await repository.listItems();
    const item = afterUnassign.find((i) => i.localId === target.localId);
    expect(item?.assignedTo).toBeNull();
  });

  it('overrides the section for an item', async () => {
    counter = 0;
    const repository = createGroceryRepository({
      database: createMemoryGroceryDatabase(),
      now: referenceNow,
      createLocalId: sequentialLocalId,
    });

    await repository.addRecipeToList(recipe(), []);
    const items = await repository.listItems();
    const target = items.find((i) => i.name === 'Red lentils')!;

    // Initially auto-inferred
    expect(target.section).toBe('Pantry');

    await repository.setSectionOverride!(target.localId, 'Other');
    const afterOverride = await repository.listItems();
    const overridden = afterOverride.find((i) => i.localId === target.localId);
    expect(overridden?.section).toBe('Other');
  });
});
