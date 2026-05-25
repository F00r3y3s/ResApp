import { createPersistentMealPlanDatabase } from './meal-plan-persistent-database';

export function createWebMealPlanDatabase() {
  return createPersistentMealPlanDatabase({
    getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    setItem(key, value) {
      globalThis.localStorage?.setItem(key, value);
    },
  });
}
