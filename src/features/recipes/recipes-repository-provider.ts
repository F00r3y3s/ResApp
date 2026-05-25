import { createRecipesRepository, type RecipesRepository } from './recipes-repository';
import { createWebRecipesDatabase } from './recipes-web-database';

let repository: RecipesRepository | null = null;

export function getRecipesRepository(): RecipesRepository {
  if (repository) return repository;
  repository = createRecipesRepository({ database: createWebRecipesDatabase() });
  return repository;
}
