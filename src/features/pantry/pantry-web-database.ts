import { createPersistentPantryDatabase } from './pantry-persistent-database';

export function createWebPantryDatabase() {
  return createPersistentPantryDatabase({
    getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    setItem(key, value) {
      globalThis.localStorage?.setItem(key, value);
    },
  });
}
