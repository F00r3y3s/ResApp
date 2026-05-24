import type { PantryDatabase } from './pantry-repository';

const pantryStorageKey = 'family-ai-kitchen:guest-pantry-items';

type WebPantryItemRow = {
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

export function createWebPantryDatabase(): PantryDatabase {
  return {
    async execute(sql, parameters = []) {
      if (!sql.startsWith('INSERT INTO pantry_items')) {
        throw new Error('Unsupported pantry web storage write.');
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

      const rows = readRows();
      writeRows([
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
      return readRows()
        .filter((row) => row.deleted_at === null)
        .sort((left, right) =>
          `${left.location}:${left.name}`.localeCompare(`${right.location}:${right.name}`),
        ) as T[];
    },
  };
}

function readRows(): WebPantryItemRow[] {
  if (!globalThis.localStorage) {
    return [];
  }

  const storedValue = globalThis.localStorage.getItem(pantryStorageKey);
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

function writeRows(rows: WebPantryItemRow[]) {
  if (!globalThis.localStorage) {
    return;
  }

  globalThis.localStorage.setItem(pantryStorageKey, JSON.stringify(rows));
}
