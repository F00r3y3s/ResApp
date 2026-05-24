import { z } from 'zod';

const preferencesStorageKey = 'family-ai-kitchen:guest-preferences';

export const languageOptions = [
  'english',
  'arabic',
  'hindi',
  'urdu',
  'bengali',
  'tamil',
  'malayalam',
  'turkish',
] as const;

export const regionOptions = [
  'uae-gcc',
  'india',
  'pakistan',
  'bangladesh',
  'turkey',
  'uk-us',
] as const;

export const preferenceOptionSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+$/, 'Use option ids only')
  .max(64, 'Option id is too long');

const preferenceListSchema = z.array(preferenceOptionSchema).max(12).transform(uniqueOptions);

export const guestPreferencesInputSchema = z.object({
  language: z.enum(languageOptions),
  region: z.enum(regionOptions),
  householdSize: z.coerce.number().int().min(1).max(24),
  dietaryRules: preferenceListSchema,
  allergies: preferenceListSchema,
  cuisines: preferenceListSchema,
  goals: preferenceListSchema,
});

const storedPreferencesSchema = guestPreferencesInputSchema.extend({
  privacy: z.literal('local-only'),
  updatedAt: z.string().datetime(),
});

export type GuestPreferencesInput = z.input<typeof guestPreferencesInputSchema>;
export type GuestPreferences = z.output<typeof storedPreferencesSchema>;

type PreferencesStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export type PreferencesRepository = {
  savePreferences(input: GuestPreferencesInput): Promise<GuestPreferences>;
  getPreferences(): Promise<GuestPreferences | null>;
};

export function createPreferencesRepository({
  storage,
  now = () => new Date(),
}: {
  storage: PreferencesStorage;
  now?: () => Date;
}): PreferencesRepository {
  return {
    async savePreferences(input) {
      const parsedInput = guestPreferencesInputSchema.parse(input);
      const preferences: GuestPreferences = {
        ...parsedInput,
        privacy: 'local-only',
        updatedAt: now().toISOString(),
      };

      await storage.setItem(preferencesStorageKey, JSON.stringify(preferences));

      return preferences;
    },
    async getPreferences() {
      const storedValue = await storage.getItem(preferencesStorageKey);
      if (!storedValue) {
        return null;
      }

      try {
        return storedPreferencesSchema.parse(JSON.parse(storedValue));
      } catch {
        return null;
      }
    },
  };
}

function uniqueOptions(options: string[]): string[] {
  return Array.from(new Set(options));
}
