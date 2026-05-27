import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
    createOfflineQueue,
    type OfflineMutation,
    type OfflineQueue,
} from './offline-queue';

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
// Tests
// ---------------------------------------------------------------------------

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();
    queue = createOfflineQueue({ storageKey: 'test-offline-queue' });
  });

  afterEach(async () => {
    storage.clear();
  });

  describe('enqueue', () => {
    it('adds a mutation to the queue', async () => {
      const mutation: OfflineMutation = {
        id: 'mut-1',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: 'item-1', name: 'Tomatoes', quantity: '4' },
        timestamp: '2026-06-01T10:00:00.000Z',
      };

      await queue.enqueue(mutation);

      expect(await queue.getQueueSize()).toBe(1);
    });

    it('persists the queue to AsyncStorage', async () => {
      const mutation: OfflineMutation = {
        id: 'mut-2',
        table: 'grocery_items',
        type: 'UPDATE',
        data: { id: 'item-2', is_checked: true },
        timestamp: '2026-06-01T11:00:00.000Z',
      };

      await queue.enqueue(mutation);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-offline-queue',
        expect.any(String),
      );

      // Verify the persisted data is valid JSON containing our mutation
      const persisted = storage.get('test-offline-queue');
      expect(persisted).toBeDefined();
      const parsed = JSON.parse(persisted!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('mut-2');
    });

    it('maintains FIFO order', async () => {
      await queue.enqueue({
        id: 'first',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: '1', name: 'First' },
        timestamp: '2026-06-01T10:00:00.000Z',
      });
      await queue.enqueue({
        id: 'second',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: '2', name: 'Second' },
        timestamp: '2026-06-01T10:01:00.000Z',
      });

      const pending = await queue.getPending();
      expect(pending[0].id).toBe('first');
      expect(pending[1].id).toBe('second');
    });
  });

  describe('flush', () => {
    it('processes mutations in FIFO order and calls the processor', async () => {
      const processed: OfflineMutation[] = [];
      const processor = async (mutation: OfflineMutation) => {
        processed.push(mutation);
      };

      await queue.enqueue({
        id: 'a',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: '1', name: 'A' },
        timestamp: '2026-06-01T10:00:00.000Z',
      });
      await queue.enqueue({
        id: 'b',
        table: 'grocery_items',
        type: 'UPDATE',
        data: { id: '2', is_checked: true },
        timestamp: '2026-06-01T10:01:00.000Z',
      });

      await queue.flush(processor);

      expect(processed).toHaveLength(2);
      expect(processed[0].id).toBe('a');
      expect(processed[1].id).toBe('b');
    });

    it('removes successfully flushed mutations from the queue', async () => {
      await queue.enqueue({
        id: 'c',
        table: 'saved_recipes',
        type: 'INSERT',
        data: { id: '3', title: 'Biryani' },
        timestamp: '2026-06-01T10:00:00.000Z',
      });

      await queue.flush(async () => {});

      expect(await queue.getQueueSize()).toBe(0);
    });

    it('retains failed mutations for the next flush attempt', async () => {
      await queue.enqueue({
        id: 'd',
        table: 'meal_plans',
        type: 'INSERT',
        data: { id: '4', date: '2026-06-02' },
        timestamp: '2026-06-01T10:00:00.000Z',
      });
      await queue.enqueue({
        id: 'e',
        table: 'pantry_items',
        type: 'DELETE',
        data: { id: '5' },
        timestamp: '2026-06-01T10:01:00.000Z',
      });

      // First mutation fails, second should not be attempted (FIFO stops on failure)
      let callCount = 0;
      await queue.flush(async () => {
        callCount++;
        if (callCount === 1) throw new Error('Network error');
      });

      // The failed mutation stays in the queue
      expect(await queue.getQueueSize()).toBe(2);
    });

    it('does nothing when the queue is empty', async () => {
      const processor = jest.fn<(m: OfflineMutation) => Promise<void>>();
      await queue.flush(processor);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('getQueueSize', () => {
    it('returns 0 for an empty queue', async () => {
      expect(await queue.getQueueSize()).toBe(0);
    });

    it('returns the correct count after enqueuing', async () => {
      await queue.enqueue({
        id: 'f',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: '6', name: 'Rice' },
        timestamp: '2026-06-01T10:00:00.000Z',
      });
      await queue.enqueue({
        id: 'g',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: '7', name: 'Lentils' },
        timestamp: '2026-06-01T10:01:00.000Z',
      });

      expect(await queue.getQueueSize()).toBe(2);
    });
  });

  describe('clearFlushed', () => {
    it('removes all mutations from the queue and storage', async () => {
      await queue.enqueue({
        id: 'h',
        table: 'pantry_items',
        type: 'INSERT',
        data: { id: '8', name: 'Yogurt' },
        timestamp: '2026-06-01T10:00:00.000Z',
      });

      await queue.clearFlushed();

      expect(await queue.getQueueSize()).toBe(0);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-offline-queue');
    });
  });

  describe('persistence across restarts', () => {
    it('restores the queue from AsyncStorage on hydrate', async () => {
      // Pre-populate storage as if from a previous session
      const previousQueue: OfflineMutation[] = [
        {
          id: 'persisted-1',
          table: 'pantry_items',
          type: 'INSERT',
          data: { id: '9', name: 'Ginger' },
          timestamp: '2026-06-01T09:00:00.000Z',
        },
        {
          id: 'persisted-2',
          table: 'grocery_items',
          type: 'UPDATE',
          data: { id: '10', is_checked: true },
          timestamp: '2026-06-01T09:01:00.000Z',
        },
      ];
      storage.set('test-offline-queue', JSON.stringify(previousQueue));

      // Create a new queue instance (simulating app restart)
      const restoredQueue = createOfflineQueue({ storageKey: 'test-offline-queue' });
      await restoredQueue.hydrate();

      expect(await restoredQueue.getQueueSize()).toBe(2);

      // Verify FIFO order is preserved
      const pending = await restoredQueue.getPending();
      expect(pending[0].id).toBe('persisted-1');
      expect(pending[1].id).toBe('persisted-2');
    });

    it('handles corrupted storage gracefully', async () => {
      storage.set('test-offline-queue', 'not-valid-json{{{');

      const restoredQueue = createOfflineQueue({ storageKey: 'test-offline-queue' });
      await restoredQueue.hydrate();

      // Should start with an empty queue rather than crashing
      expect(await restoredQueue.getQueueSize()).toBe(0);
    });

    it('handles missing storage gracefully', async () => {
      const restoredQueue = createOfflineQueue({ storageKey: 'nonexistent-key' });
      await restoredQueue.hydrate();

      expect(await restoredQueue.getQueueSize()).toBe(0);
    });
  });
});
