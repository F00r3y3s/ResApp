import { createPersistentRecipesDatabase } from './recipes-persistent-database';

export function createWebRecipesDatabase() {
  return createPersistentRecipesDatabase({
    getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    setItem(key, value) {
      globalThis.localStorage?.setItem(key, value);
    },
  });
}
