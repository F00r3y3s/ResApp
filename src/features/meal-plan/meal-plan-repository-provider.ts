import { createMealPlanRepository, type MealPlanRepository } from './meal-plan-repository';
import { createWebMealPlanDatabase } from './meal-plan-web-database';

let repository: MealPlanRepository | null = null;

export function getMealPlanRepository(): MealPlanRepository {
  if (repository) {
    return repository;
  }

  repository = createMealPlanRepository({
    database: createWebMealPlanDatabase(),
  });
  return repository;
}
