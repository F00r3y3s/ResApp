import { createPreferencesRepository, type PreferencesRepository } from './preferences-repository';

const memoryStorage = new Map<string, string>();
let repository: PreferencesRepository | null = null;

export function getPreferencesRepository(): PreferencesRepository {
  if (repository) {
    return repository;
  }

  repository = createPreferencesRepository({
    storage: {
      getItem: (key) => memoryStorage.get(key) ?? null,
      setItem: (key, value) => {
        memoryStorage.set(key, value);
      },
    },
  });

  return repository;
}
