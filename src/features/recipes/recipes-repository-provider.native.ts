import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPersistentRecipesDatabase } from './recipes-persistent-database';
import { createRecipesRepository, type RecipesRepository } from './recipes-repository';

let repository: RecipesRepository | null = null;

export function getRecipesRepository(): RecipesRepository {
  if (repository) {
    return repository;
  }

  repository = createRecipesRepository({
    database: createPersistentRecipesDatabase(AsyncStorage),
  });

  return repository;
}
