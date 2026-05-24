import { createPantryRepository, type PantryRepository } from './pantry-repository';
import { createWebPantryDatabase } from './pantry-web-database';

let repository: PantryRepository | null = null;

export function getPantryRepository(): PantryRepository {
  if (repository) {
    return repository;
  }

  repository = createPantryRepository({
    database: createWebPantryDatabase(),
  });
  return repository;
}
