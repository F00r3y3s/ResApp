import { describe, expect, it } from '@jest/globals';
import { ZodError } from 'zod';

import { createPreferencesRepository } from './preferences-repository';

function createMemoryStorage() {
  let storedValue: string | null = null;

  return {
    getItem: async () => storedValue,
    setItem: async (_key: string, value: string) => {
      storedValue = value;
    },
  };
}

describe('preferences repository', () => {
  it('persists validated guest onboarding preferences locally', async () => {
    const storage = createMemoryStorage();
    const firstRepository = createPreferencesRepository({
      storage,
      now: () => new Date('2026-05-24T09:00:00.000Z'),
    });

    await firstRepository.savePreferences({
      language: 'english',
      region: 'uae-gcc',
      householdSize: 4,
      dietaryRules: ['halal'],
      allergies: ['peanuts'],
      cuisines: ['levantine', 'indian'],
      goals: ['quick-dinners', 'reduce-waste'],
    });

    const reloadedRepository = createPreferencesRepository({ storage });

    await expect(reloadedRepository.getPreferences()).resolves.toEqual({
      language: 'english',
      region: 'uae-gcc',
      householdSize: 4,
      dietaryRules: ['halal'],
      allergies: ['peanuts'],
      cuisines: ['levantine', 'indian'],
      goals: ['quick-dinners', 'reduce-waste'],
      privacy: 'local-only',
      updatedAt: '2026-05-24T09:00:00.000Z',
    });
  });

  it('rejects unsupported onboarding options before local persistence', async () => {
    const repository = createPreferencesRepository({ storage: createMemoryStorage() });
    const invalidPreferences = {
      language: 'esperanto',
      region: 'uae-gcc',
      householdSize: 2,
      dietaryRules: [],
      allergies: [],
      cuisines: [],
      goals: [],
    } as unknown as Parameters<typeof repository.savePreferences>[0];

    await expect(repository.savePreferences(invalidPreferences)).rejects.toBeInstanceOf(ZodError);

    await expect(repository.getPreferences()).resolves.toBeNull();
  });
});
