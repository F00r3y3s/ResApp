import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { resolveConflict, type ConflictRecord } from './conflict-resolver';
import { createOfflineQueue, type OfflineMutation, type OfflineQueue } from './offline-queue';

// ---------------------------------------------------------------------------
// AsyncStorage mock
// ---------------------------------------------------------------------------

const storage = new Map<string, string>();

const mockAsyncStorage = {
  getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    storage.delete(key);
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockAsyncStorage.getItem(args[0]),
    setItem: (...args: any[]) => mockAsyncStorage.setItem(args[0], args[1]),
    removeItem: (...args: any[]) => mockAsyncStorage.removeItem(args[0]),
  },
}));

// ---------------------------------------------------------------------------
// Integration-style tests: sync hardening across all syncable features
// ---------------------------------------------------------------------------

describe('Sync Hardening — Integration', () => {
  let queue: OfflineQueue;
  const flushedMutations: OfflineMutation[] = [];

  beforeEach(() => {
    storage.clear();
    flushedMutations.length = 0;
    jest.clearAllMocks();
    queue = createOfflineQueue({ storageKey: 'sync-hardening-queue' });
  });

  afterEach(() => {
    storage.clear();
  });

  const mockProcessor = async (mutation: OfflineMutation) => {
    flushedMutations.push(mutation);
  };

  describe('Pantry offline → queue → flush on reconnect', () => {
    it('queues a pantry item created offline and flushes on reconnect', async () => {
      const pantryMutation: OfflineMutation = {
        id: 'pantry-mut-1',
        table: 'pantry_items',
        type: 'INSERT',
        data: {
          id: 'pantry-item-1',
          name: 'Tomatoes',
          quantity: '4',
          unit: 'whole',
          category: 'vegetables',
          updated_at: '2026-06-01T10:00:00.000Z',
        },
        timestamp: '2026-06-01T10:00:00.000Z',
      };

      // Offline: enqueue
      await queue.enqueue(pantryMutation);
      expect(await queue.getQueueSize()).toBe(1);

      // Reconnect: flush
      await queue.flush(mockProcessor);

      expect(flushedMutations).toHaveLength(1);
      expect(flushedMutations[0].table).toBe('pantry_items');
      expect(flushedMutations[0].data.name).toBe('Tomatoes');
      expect(await queue.getQueueSize()).toBe(0);
    });
  });

  describe('Grocery offline → queue → flush on reconnect', () => {
    it('queues a grocery item checked offline and flushes on reconnect', async () => {
      const groceryMutation: OfflineMutation = {
        id: 'grocery-mut-1',
        table: 'grocery_items',
        type: 'UPDATE',
        data: {
          id: 'grocery-item-1',
          is_checked: true,
          updated_at: '2026-06-01T11:00:00.000Z',
        },
        timestamp: '2026-06-01T11:00:00.000Z',
      };

      await queue.enqueue(groceryMutation);
      expect(await queue.getQueueSize()).toBe(1);

      await queue.flush(mockProcessor);

      expect(flushedMutations).toHaveLength(1);
      expect(flushedMutations[0].table).toBe('grocery_items');
      expect(flushedMutations[0].data.is_checked).toBe(true);
      expect(await queue.getQueueSize()).toBe(0);
    });
  });

  describe('Meal plan offline → queue → flush on reconnect', () => {
    it('queues a meal plan entry added offline and flushes on reconnect', async () => {
      const mealPlanMutation: OfflineMutation = {
        id: 'mealplan-mut-1',
        table: 'meal_plans',
        type: 'INSERT',
        data: {
          id: 'mealplan-1',
          date: '2026-06-02',
          recipe_id: 'recipe-1',
          meal_type: 'dinner',
          updated_at: '2026-06-01T12:00:00.000Z',
        },
        timestamp: '2026-06-01T12:00:00.000Z',
      };

      await queue.enqueue(mealPlanMutation);
      expect(await queue.getQueueSize()).toBe(1);

      await queue.flush(mockProcessor);

      expect(flushedMutations).toHaveLength(1);
      expect(flushedMutations[0].table).toBe('meal_plans');
      expect(flushedMutations[0].data.meal_type).toBe('dinner');
      expect(await queue.getQueueSize()).toBe(0);
    });
  });

  describe('Saved recipe offline → queue → flush on reconnect', () => {
    it('queues a saved recipe created offline and flushes on reconnect', async () => {
      const recipeMutation: OfflineMutation = {
        id: 'recipe-mut-1',
        table: 'saved_recipes',
        type: 'INSERT',
        data: {
          id: 'recipe-1',
          title: 'Chicken Biryani',
          source_url: 'https://example.com/biryani',
          updated_at: '2026-06-01T13:00:00.000Z',
        },
        timestamp: '2026-06-01T13:00:00.000Z',
      };

      await queue.enqueue(recipeMutation);
      expect(await queue.getQueueSize()).toBe(1);

      await queue.flush(mockProcessor);

      expect(flushedMutations).toHaveLength(1);
      expect(flushedMutations[0].table).toBe('saved_recipes');
      expect(flushedMutations[0].data.title).toBe('Chicken Biryani');
      expect(await queue.getQueueSize()).toBe(0);
    });
  });

  describe('Conflict resolution: local and remote update same item', () => {
    it('last-write-wins: newer local update wins', () => {
      const local: ConflictRecord = {
        id: 'pantry-item-1',
        updatedAt: '2026-06-01T16:00:00.000Z',
        data: { name: 'Tomatoes', quantity: '6' },
      };
      const remote: ConflictRecord = {
        id: 'pantry-item-1',
        updatedAt: '2026-06-01T15:00:00.000Z',
        data: { name: 'Tomatoes', quantity: '4' },
      };

      const result = resolveConflict(local, remote);

      expect(result.winner).toBe('local-wins');
      expect(result.resolvedData.quantity).toBe('6');
    });

    it('last-write-wins: newer remote update wins', () => {
      const local: ConflictRecord = {
        id: 'grocery-item-1',
        updatedAt: '2026-06-01T14:00:00.000Z',
        data: { is_checked: false },
      };
      const remote: ConflictRecord = {
        id: 'grocery-item-1',
        updatedAt: '2026-06-01T15:00:00.000Z',
        data: { is_checked: true },
      };

      const result = resolveConflict(local, remote);

      expect(result.winner).toBe('remote-wins');
      expect(result.resolvedData.is_checked).toBe(true);
    });
  });

  describe('Queue survives simulated app restart (AsyncStorage round-trip)', () => {
    it('persists queue and restores it after creating a new instance', async () => {
      // Session 1: enqueue mutations
      await queue.enqueue({
        id: 'persist-1',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: 'p1', name: 'Ginger' },
        timestamp: '2026-06-01T09:00:00.000Z',
      });
      await queue.enqueue({
        id: 'persist-2',
        table: 'grocery_items',
        type: 'UPDATE',
        data: { id: 'g1', is_checked: true },
        timestamp: '2026-06-01T09:01:00.000Z',
      });
      await queue.enqueue({
        id: 'persist-3',
        table: 'meal_plans',
        type: 'INSERT',
        data: { id: 'm1', date: '2026-06-03' },
        timestamp: '2026-06-01T09:02:00.000Z',
      });

      // Simulate app restart: create a new queue instance with same storage key
      const restoredQueue = createOfflineQueue({ storageKey: 'sync-hardening-queue' });
      await restoredQueue.hydrate();

      expect(await restoredQueue.getQueueSize()).toBe(3);

      // Flush the restored queue
      const restoredFlushed: OfflineMutation[] = [];
      await restoredQueue.flush(async (m) => { restoredFlushed.push(m); });

      expect(restoredFlushed).toHaveLength(3);
      expect(restoredFlushed[0].table).toBe('pantry_items');
      expect(restoredFlushed[1].table).toBe('grocery_items');
      expect(restoredFlushed[2].table).toBe('meal_plans');
      expect(await restoredQueue.getQueueSize()).toBe(0);
    });
  });

  describe('Multi-feature queue ordering', () => {
    it('processes mutations from different features in FIFO order', async () => {
      await queue.enqueue({
        id: 'multi-1',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: 'p1', name: 'Rice' },
        timestamp: '2026-06-01T10:00:00.000Z',
      });
      await queue.enqueue({
        id: 'multi-2',
        table: 'grocery_items',
        type: 'INSERT',
        data: { id: 'g1', name: 'Milk' },
        timestamp: '2026-06-01T10:01:00.000Z',
      });
      await queue.enqueue({
        id: 'multi-3',
        table: 'saved_recipes',
        type: 'INSERT',
        data: { id: 'r1', title: 'Dal' },
        timestamp: '2026-06-01T10:02:00.000Z',
      });
      await queue.enqueue({
        id: 'multi-4',
        table: 'meal_plans',
        type: 'INSERT',
        data: { id: 'm1', date: '2026-06-04' },
        timestamp: '2026-06-01T10:03:00.000Z',
      });

      await queue.flush(mockProcessor);

      expect(flushedMutations.map((m) => m.table)).toEqual([
        'pantry_items',
        'grocery_items',
        'saved_recipes',
        'meal_plans',
      ]);
    });
  });
});
