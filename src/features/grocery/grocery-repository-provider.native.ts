import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPersistentGroceryDatabase } from './grocery-persistent-database';
import { createGroceryRepository, type GroceryRepository } from './grocery-repository';

let repository: GroceryRepository | null = null;

export function getGroceryRepository(): GroceryRepository {
  if (repository) {
    return repository;
  }

  repository = createGroceryRepository({
    database: createPersistentGroceryDatabase(AsyncStorage),
  });
  return repository;
}
