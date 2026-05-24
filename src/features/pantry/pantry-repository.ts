import { z } from 'zod';

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
    message: 'Use a real calendar date',
  });

export const pantryItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0').max(9999),
  unit: z.string().trim().min(1, 'Unit is required').max(40, 'Unit is too long'),
  location: z.string().trim().min(1, 'Location is required').max(60, 'Location is too long'),
  expiresAt: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    dateOnlySchema.nullable(),
  ),
});

export type PantryItemInput = z.input<typeof pantryItemInputSchema>;
type ParsedPantryItemInput = z.output<typeof pantryItemInputSchema>;

export type PantryItem = {
  localId: string;
  name: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  location: string;
  expiresAt: string | null;
  privacy: 'local-only';
  createdAt: string;
  updatedAt: string;
};

type PantryItemRow = {
  local_id: string;
  name: string;
  normalized_name: string;
  quantity: number;
  unit: string;
  location: string;
  expires_at: string | null;
  privacy: 'local-only';
  created_at: string;
  updated_at: string;
};

export type PantryDatabase = {
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
};

export type PantryRepositoryOptions = {
  database: PantryDatabase;
  createLocalId?: () => string;
  now?: () => Date;
};

export type PantryRepository = {
  addItem(input: PantryItemInput): Promise<PantryItem>;
  listItems(): Promise<PantryItem[]>;
};

export function createPantryRepository(options: PantryRepositoryOptions): PantryRepository {
  const database = options.database;
  const createLocalId = options.createLocalId ?? createDefaultLocalId;
  const now = options.now ?? (() => new Date());

  return {
    async addItem(input) {
      const parsed = pantryItemInputSchema.parse(input);
      const timestamp = now().toISOString();
      const item = buildLocalPantryItem({
        input: parsed,
        localId: createLocalId(),
        timestamp,
      });

      await database.execute(
        `INSERT INTO pantry_items (
          local_id,
          remote_id,
          household_id,
          name,
          normalized_name,
          quantity,
          unit,
          location,
          expires_at,
          privacy,
          created_at,
          updated_at,
          deleted_at
        ) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'local-only', ?, ?, NULL)`,
        [
          item.localId,
          item.name,
          item.normalizedName,
          item.quantity,
          item.unit,
          item.location,
          item.expiresAt,
          item.createdAt,
          item.updatedAt,
        ],
      );

      return item;
    },
    async listItems() {
      const rows = await database.getAll<PantryItemRow>(
        `SELECT
          local_id,
          name,
          normalized_name,
          quantity,
          unit,
          location,
          expires_at,
          privacy,
          created_at,
          updated_at
        FROM pantry_items
        WHERE deleted_at IS NULL
        ORDER BY lower(location), lower(name), created_at DESC`,
      );

      return rows.map(mapPantryItemRow);
    },
  };
}

function buildLocalPantryItem({
  input,
  localId,
  timestamp,
}: {
  input: ParsedPantryItemInput;
  localId: string;
  timestamp: string;
}): PantryItem {
  return {
    localId,
    name: normalizeWhitespace(input.name),
    normalizedName: normalizeName(input.name),
    quantity: input.quantity,
    unit: normalizeWhitespace(input.unit),
    location: normalizeWhitespace(input.location),
    expiresAt: input.expiresAt,
    privacy: 'local-only',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function mapPantryItemRow(row: PantryItemRow): PantryItem {
  return {
    localId: row.local_id,
    name: row.name,
    normalizedName: row.normalized_name,
    quantity: row.quantity,
    unit: row.unit,
    location: row.location,
    expiresAt: row.expires_at,
    privacy: row.privacy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeName(value: string): string {
  return normalizeWhitespace(value).toLocaleLowerCase();
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function createDefaultLocalId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `local-pantry-${Date.now().toString(36)}-${randomPart}`;
}
