import { createPersistentGroceryDatabase } from './grocery-persistent-database';

export function createWebGroceryDatabase() {
  return createPersistentGroceryDatabase({
    getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    setItem(key, value) {
      globalThis.localStorage?.setItem(key, value);
    },
  });
}
