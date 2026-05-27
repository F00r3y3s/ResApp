import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPersistentMealPlanDatabase } from './meal-plan-persistent-database';
import { createMealPlanRepository, type MealPlanRepository } from './meal-plan-repository';

let repository: MealPlanRepository | null = null;

export function getMealPlanRepository(): MealPlanRepository {
  if (repository) {
    return repository;
  }

  repository = createMealPlanRepository({
    database: createPersistentMealPlanDatabase(AsyncStorage),
  });
  return repository;
}
