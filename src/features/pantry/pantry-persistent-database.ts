import type { PantryDatabase } from './pantry-repository';

const pantryStorageKey = 'family-ai-kitchen:guest-pantry-items';

type PantryItemRow = {
  local_id: string;
  remote_id: string | null;
  household_id: string | null;
  name: string;
  normalized_name: string;
  quantity: number;
  unit: string;
  location: string;
  expires_at: string | null;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type PantryKeyValueStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export function createPersistentPantryDatabase(storage: PantryKeyValueStorage): PantryDatabase {
  return {
    async execute(sql, parameters = []) {
      if (!sql.startsWith('INSERT INTO pantry_items')) {
        throw new Error('Unsupported pantry storage write.');
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

      const rows = await readRows(storage);
      await writeRows(storage, [
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
      ]);
    },
    async getAll<T>() {
      return (await readRows(storage))
        .filter((row) => row.deleted_at === null)
        .sort((left, right) =>
          `${left.location}:${left.name}`.localeCompare(`${right.location}:${right.name}`),
        ) as T[];
    },
  };
}

async function readRows(storage: PantryKeyValueStorage): Promise<PantryItemRow[]> {
  const storedValue = await storage.getItem(pantryStorageKey);
  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

async function writeRows(storage: PantryKeyValueStorage, rows: PantryItemRow[]) {
  await storage.setItem(pantryStorageKey, JSON.stringify(rows));
}
