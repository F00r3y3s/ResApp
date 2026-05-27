import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPreferencesRepository, type PreferencesRepository } from './preferences-repository';

let repository: PreferencesRepository | null = null;

export function getPreferencesRepository(): PreferencesRepository {
  if (repository) {
    return repository;
  }

  repository = createPreferencesRepository({
    storage: AsyncStorage,
  });

  return repository;
}
