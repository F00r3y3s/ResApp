import { localDatabase } from '@/features/local-first/database';

import { createPantryRepository, type PantryRepository } from './pantry-repository';

let repository: PantryRepository | null = null;

export function getPantryRepository(): PantryRepository {
  if (repository) {
    return repository;
  }

  repository = createPantryRepository({
    database: localDatabase,
  });
  return repository;
}
