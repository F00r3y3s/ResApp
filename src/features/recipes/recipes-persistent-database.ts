import type { RecipesDatabase } from './recipes-repository';

const STORAGE_KEY = 'family-ai-kitchen:guest-saved-recipes';

type RecipeRow = {
  local_id: string;
  remote_id: null;
  owner_id: null;
  seed_id: string | null;
  title: string;
  cuisine: string;
  diet_tags_json: string;
  allergens_json: string;
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  ingredients_json: string;
  steps_json: string;
  image_key: string | null;
  source: string;
  attribution: string;
  license: string;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type KeyValueStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export function createPersistentRecipesDatabase(storage: KeyValueStorage): RecipesDatabase {
  return {
    async execute(sql: string, parameters: unknown[] = []) {
      if (sql.startsWith('INSERT INTO saved_recipes')) {
        const rows = await readRows(storage);
        const [
          localId, , , seedId, title, cuisine,
          dietTagsJson, allergensJson, prepMinutes, cookMinutes, servings,
          ingredientsJson, stepsJson, imageKey, source, attribution, license,
          , createdAt, updatedAt,
        ] = parameters;

        await writeRows(storage, [
          ...rows,
          {
            local_id: String(localId),
            remote_id: null,
            owner_id: null,
            seed_id: seedId !== undefined && seedId !== null ? String(seedId) : null,
            title: String(title),
            cuisine: String(cuisine),
            diet_tags_json: String(dietTagsJson),
            allergens_json: String(allergensJson),
            prep_minutes: Number(prepMinutes),
            cook_minutes: Number(cookMinutes),
            servings: Number(servings),
            ingredients_json: String(ingredientsJson),
            steps_json: String(stepsJson),
            image_key: imageKey !== null && imageKey !== undefined ? String(imageKey) : null,
            source: String(source),
            attribution: String(attribution),
            license: String(license),
            privacy: 'local-only',
            created_at: String(createdAt),
            updated_at: String(updatedAt),
            deleted_at: null,
          },
        ]);
        return;
      }

      if (sql.startsWith('UPDATE saved_recipes SET deleted_at')) {
        // parameters: [deletedAt, updatedAt, localId]
        const [deletedAt, updatedAt, localId] = parameters;
        const rows = await readRows(storage);
        await writeRows(
          storage,
          rows.map((r) =>
            r.local_id === String(localId)
              ? { ...r, deleted_at: String(deletedAt), updated_at: String(updatedAt) }
              : r,
          ),
        );
        return;
      }

      throw new Error(`Unsupported recipe SQL: ${sql.slice(0, 60)}`);
    },

    async getAll<T>(sql: string, parameters: unknown[] = []) {
      const rows = await readRows(storage);
      const alive = rows.filter((r) => r.deleted_at === null);

      if (sql.includes('seed_id = ?')) {
        const seedId = String(parameters[0]);
        return alive.filter((r) => r.seed_id === seedId).slice(0, 1) as unknown as T[];
      }

      if (sql.includes('local_id = ?')) {
        const localId = String(parameters[0]);
        return alive.filter((r) => r.local_id === localId).slice(0, 1) as unknown as T[];
      }

      // General list — sorted by title
      return alive.sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
      ) as unknown as T[];
    },
  };
}

async function readRows(storage: KeyValueStorage): Promise<RecipeRow[]> {
  const raw = await storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRows(storage: KeyValueStorage, rows: RecipeRow[]): Promise<void> {
  await storage.setItem(STORAGE_KEY, JSON.stringify(rows));
}
