/**
 * Generic Offline Write Queue
 *
 * Accepts pending mutations (insert/update/delete) for any syncable table,
 * persists them to AsyncStorage so they survive app restarts, and processes
 * them in FIFO order on flush.
 *
 * Privacy: Only syncable records (per privacy-contract.md) should be enqueued.
 * The queue itself does NOT enforce sync consent — callers must check
 * canSyncLocalRecord() before enqueuing.
 *
 * Conflict resolution is handled separately by conflict-resolver.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type MutationType = 'INSERT' | 'UPDATE' | 'DELETE';

export type OfflineMutation = {
  /** Unique ID for this mutation (use crypto.randomUUID or similar) */
  id: string;
  /** Target table name (e.g. 'pantry_items', 'grocery_items') */
  table: string;
  /** Mutation type */
  type: MutationType;
  /** Row data to sync */
  data: Record<string, unknown>;
  /** ISO timestamp when the mutation was created locally */
  timestamp: string;
};

export type MutationProcessor = (mutation: OfflineMutation) => Promise<void>;

export type OfflineQueue = {
  /** Add a mutation to the end of the queue and persist. */
  enqueue(mutation: OfflineMutation): Promise<void>;
  /** Process all pending mutations in FIFO order. Stops on first failure. */
  flush(processor: MutationProcessor): Promise<void>;
  /** Number of pending mutations in the queue. */
  getQueueSize(): Promise<number>;
  /** Return all pending mutations (read-only snapshot). */
  getPending(): Promise<OfflineMutation[]>;
  /** Clear the entire queue and remove from storage. */
  clearFlushed(): Promise<void>;
  /** Restore queue state from AsyncStorage (call on app start). */
  hydrate(): Promise<void>;
};

export type OfflineQueueOptions = {
  /** AsyncStorage key used to persist the queue. */
  storageKey: string;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOfflineQueue(options: OfflineQueueOptions): OfflineQueue {
  const { storageKey } = options;
  let pending: OfflineMutation[] = [];

  async function persist(): Promise<void> {
    await AsyncStorage.setItem(storageKey, JSON.stringify(pending));
  }

  return {
    async enqueue(mutation: OfflineMutation): Promise<void> {
      pending.push(mutation);
      await persist();
    },

    async flush(processor: MutationProcessor): Promise<void> {
      if (pending.length === 0) return;

      const toProcess = [...pending];

      for (let i = 0; i < toProcess.length; i++) {
        try {
          await processor(toProcess[i]);
        } catch {
          // Stop processing on first failure — remaining mutations stay queued.
          // Remove only the successfully processed ones.
          pending = pending.slice(i);
          await persist();
          return;
        }
      }

      // All succeeded — clear the queue.
      pending = [];
      await persist();
    },

    async getQueueSize(): Promise<number> {
      return pending.length;
    },

    async getPending(): Promise<OfflineMutation[]> {
      return [...pending];
    },

    async clearFlushed(): Promise<void> {
      pending = [];
      await AsyncStorage.removeItem(storageKey);
    },

    async hydrate(): Promise<void> {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            pending = parsed;
          }
        }
      } catch {
        // Corrupted storage — start fresh.
        pending = [];
      }
    },
  };
}
