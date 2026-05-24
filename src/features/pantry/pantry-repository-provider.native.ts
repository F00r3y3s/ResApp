import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { createPantryRepository, type PantryDatabase, type PantryRepository } from './pantry-repository';
import { createPersistentPantryDatabase } from './pantry-persistent-database';

let repository: PantryRepository | null = null;

export function getPantryRepository(): PantryRepository {
  if (repository) {
    return repository;
  }

  repository = createPantryRepository({
    database: getNativePantryDatabase(),
  });
  return repository;
}

function getNativePantryDatabase(): PantryDatabase {
  if (Constants.appOwnership === 'expo') {
    return createPersistentPantryDatabase(AsyncStorage);
  }

  // Keep PowerSync out of Expo Go, where its native SQLite module is unavailable.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { localDatabase } = require('@/features/local-first/database') as typeof import('@/features/local-first/database');
  return localDatabase;
}
