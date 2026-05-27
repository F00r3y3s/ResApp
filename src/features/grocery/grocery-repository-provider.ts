import { createGroceryRepository, type GroceryRepository } from './grocery-repository';
import { createWebGroceryDatabase } from './grocery-web-database';

let repository: GroceryRepository | null = null;

export function getGroceryRepository(): GroceryRepository {
  if (repository) {
    return repository;
  }

  repository = createGroceryRepository({
    database: createWebGroceryDatabase(),
  });
  return repository;
}
