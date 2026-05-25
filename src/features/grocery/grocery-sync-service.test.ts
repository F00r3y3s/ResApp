import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { GroceryChange, GrocerySyncService } from './grocery-sync-service';
import { createGrocerySyncService } from './grocery-sync-service';

// ---------------------------------------------------------------------------
// Mock Supabase Realtime Channel
// ---------------------------------------------------------------------------

type MockChannel = {
  on(event: string, filter: unknown, callback: (payload: unknown) => void): MockChannel;
  subscribe(callback?: (status: string) => void): MockChannel;
  unsubscribe: jest.Mock;
};

type MockSubscription = {
  eventCallbacks: Map<string, (payload: unknown) => void>;
  systemCallbacks: Map<string, (status: string) => void>;
  channel: MockChannel;
};

function createMockChannel(): MockSubscription {
  const eventCallbacks = new Map<string, (payload: unknown) => void>();
  const systemCallbacks = new Map<string, (status: string) => void>();

  const channel: MockChannel = {
    on(event: string, filter: unknown, callback: (payload: unknown) => void) {
      if (event === 'postgres_changes') {
        eventCallbacks.set(JSON.stringify(filter), callback);
      }
      if (event === 'system') {
        systemCallbacks.set('system', callback as unknown as (status: string) => void);
      }
      return channel;
    },
    subscribe(callback?: (status: string) => void) {
      if (callback) {
        systemCallbacks.set('subscribe', callback);
        // Simulate successful subscription
        setTimeout(() => callback('SUBSCRIBED'), 0);
      }
      return channel;
    },
    unsubscribe: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };

  return { channel, eventCallbacks, systemCallbacks };
}

function createMockSupabaseClient() {
  const mockChannel = createMockChannel();
  const upsertMock = jest.fn<(args: { body: unknown }) => Promise<{ error: null | Error }>>()
    .mockResolvedValue({ error: null });
  const selectMock = jest.fn<() => Promise<{ data: unknown[]; error: null | Error }>>()
    .mockResolvedValue({ data: [], error: null });

  const fromChain = {
    upsert: upsertMock,
    select: selectMock,
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };

  return {
    channel: jest.fn().mockReturnValue(mockChannel.channel),
    from: jest.fn().mockReturnValue(fromChain),
    removeChannel: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    _mockChannel: mockChannel,
    _fromChain: fromChain,
    _upsertMock: upsertMock,
  };
}

// ---------------------------------------------------------------------------
// Offline detector mock
// ---------------------------------------------------------------------------

function createMockNetworkStatus() {
  let isOnline = true;
  const listeners: ((online: boolean) => void)[] = [];

  return {
    isOnline: () => isOnline,
    setOnline(value: boolean) {
      isOnline = value;
      listeners.forEach((fn) => fn(value));
    },
    onStatusChange(callback: (online: boolean) => void) {
      listeners.push(callback);
      return () => {
        const idx = listeners.indexOf(callback);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GrocerySyncService', () => {
  let client: ReturnType<typeof createMockSupabaseClient>;
  let network: ReturnType<typeof createMockNetworkStatus>;
  let service: GrocerySyncService;

  beforeEach(() => {
    client = createMockSupabaseClient();
    network = createMockNetworkStatus();
    service = createGrocerySyncService({
      supabaseClient: client as any,
      networkStatus: network,
      userId: 'user-1',
    });
  });

  afterEach(() => {
    service.stopSync();
  });

  describe('startSync', () => {
    it('subscribes to a realtime channel for the given household', () => {
      service.startSync('household-1');

      expect(client.channel).toHaveBeenCalledWith('grocery:household-1');
    });

    it('does not create duplicate subscriptions for the same household', () => {
      service.startSync('household-1');
      service.startSync('household-1');

      expect(client.channel).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopSync', () => {
    it('unsubscribes from the realtime channel', () => {
      service.startSync('household-1');
      service.stopSync();

      expect(client.removeChannel).toHaveBeenCalled();
    });

    it('is safe to call when not syncing', () => {
      expect(() => service.stopSync()).not.toThrow();
    });
  });

  describe('pushLocalChanges', () => {
    it('upserts items to the remote grocery_items table', async () => {
      service.startSync('household-1');

      await service.pushLocalChanges([
        {
          localId: 'local-1',
          name: 'Tomatoes',
          normalizedName: 'tomatoes',
          quantity: '4',
          unit: 'whole',
          recipeId: null,
          recipeTitle: null,
          isChecked: false,
          privacy: 'local-only',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
        },
      ]);

      expect(client.from).toHaveBeenCalledWith('grocery_items');
      expect(client._upsertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Tomatoes',
            normalized_name: 'tomatoes',
            household_id: 'household-1',
            is_checked: false,
            created_by: 'user-1',
          }),
        ]),
        expect.objectContaining({ onConflict: 'id' }),
      );
    });

    it('queues changes when offline and flushes on reconnect', async () => {
      service.startSync('household-1');
      network.setOnline(false);

      await service.pushLocalChanges([
        {
          localId: 'local-2',
          name: 'Garlic',
          normalizedName: 'garlic',
          quantity: '3',
          unit: 'cloves',
          recipeId: null,
          recipeTitle: null,
          isChecked: false,
          privacy: 'local-only',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
        },
      ]);

      // Should NOT have called upsert while offline
      expect(client._upsertMock).not.toHaveBeenCalled();

      // Come back online
      network.setOnline(true);

      // Wait for the flush to happen
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(client._upsertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Garlic' }),
        ]),
        expect.objectContaining({ onConflict: 'id' }),
      );
    });

    it('does not lose queued changes if flush fails and retries on next reconnect', async () => {
      service.startSync('household-1');
      network.setOnline(false);

      await service.pushLocalChanges([
        {
          localId: 'local-3',
          name: 'Cumin',
          normalizedName: 'cumin',
          quantity: '1',
          unit: 'tsp',
          recipeId: null,
          recipeTitle: null,
          isChecked: false,
          privacy: 'local-only',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
        },
      ]);

      // First reconnect fails
      client._upsertMock.mockResolvedValueOnce({ error: new Error('Network error') });
      network.setOnline(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Queue should still have the item — simulate another reconnect
      network.setOnline(false);
      client._upsertMock.mockResolvedValueOnce({ error: null });
      network.setOnline(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have attempted upsert at least twice
      expect(client._upsertMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('onRemoteChange', () => {
    it('invokes callback when a remote INSERT arrives', async () => {
      const changes: GroceryChange[] = [];
      service.onRemoteChange((change) => changes.push(change));
      service.startSync('household-1');

      // Simulate a postgres_changes INSERT event
      const insertCallback = client._mockChannel.eventCallbacks.values().next().value;
      if (insertCallback) {
        insertCallback({
          eventType: 'INSERT',
          new: {
            id: 'remote-1',
            household_id: 'household-1',
            name: 'Onions',
            normalized_name: 'onions',
            quantity: '2',
            unit: 'whole',
            recipe_id: null,
            recipe_title: null,
            is_checked: false,
            created_by: 'user-2',
            created_at: '2026-06-01T10:00:00.000Z',
            updated_at: '2026-06-01T10:00:00.000Z',
            deleted_at: null,
          },
          old: {},
        });
      }

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual(
        expect.objectContaining({
          type: 'INSERT',
          item: expect.objectContaining({
            id: 'remote-1',
            name: 'Onions',
            isChecked: false,
          }),
        }),
      );
    });

    it('invokes callback when a remote UPDATE (check toggle) arrives', async () => {
      const changes: GroceryChange[] = [];
      service.onRemoteChange((change) => changes.push(change));
      service.startSync('household-1');

      const insertCallback = client._mockChannel.eventCallbacks.values().next().value;
      if (insertCallback) {
        insertCallback({
          eventType: 'UPDATE',
          new: {
            id: 'remote-1',
            household_id: 'household-1',
            name: 'Onions',
            normalized_name: 'onions',
            quantity: '2',
            unit: 'whole',
            recipe_id: null,
            recipe_title: null,
            is_checked: true,
            created_by: 'user-2',
            created_at: '2026-06-01T10:00:00.000Z',
            updated_at: '2026-06-01T11:00:00.000Z',
            deleted_at: null,
          },
          old: { id: 'remote-1', is_checked: false },
        });
      }

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual(
        expect.objectContaining({
          type: 'UPDATE',
          item: expect.objectContaining({
            id: 'remote-1',
            isChecked: true,
          }),
        }),
      );
    });

    it('invokes callback when a remote soft-DELETE arrives', async () => {
      const changes: GroceryChange[] = [];
      service.onRemoteChange((change) => changes.push(change));
      service.startSync('household-1');

      const insertCallback = client._mockChannel.eventCallbacks.values().next().value;
      if (insertCallback) {
        insertCallback({
          eventType: 'UPDATE',
          new: {
            id: 'remote-1',
            household_id: 'household-1',
            name: 'Onions',
            normalized_name: 'onions',
            quantity: '2',
            unit: 'whole',
            recipe_id: null,
            recipe_title: null,
            is_checked: false,
            created_by: 'user-2',
            created_at: '2026-06-01T10:00:00.000Z',
            updated_at: '2026-06-01T12:00:00.000Z',
            deleted_at: '2026-06-01T12:00:00.000Z',
          },
          old: { id: 'remote-1', deleted_at: null },
        });
      }

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual(
        expect.objectContaining({
          type: 'DELETE',
          item: expect.objectContaining({ id: 'remote-1' }),
        }),
      );
    });
  });

  describe('conflict resolution (last-write-wins)', () => {
    it('remote update with newer timestamp wins over local state', async () => {
      const changes: GroceryChange[] = [];
      service.onRemoteChange((change) => changes.push(change));
      service.startSync('household-1');

      // Simulate: local has item checked at T1, remote unchecks at T2 (newer)
      const insertCallback = client._mockChannel.eventCallbacks.values().next().value;
      if (insertCallback) {
        insertCallback({
          eventType: 'UPDATE',
          new: {
            id: 'remote-1',
            household_id: 'household-1',
            name: 'Onions',
            normalized_name: 'onions',
            quantity: '2',
            unit: 'whole',
            recipe_id: null,
            recipe_title: null,
            is_checked: false,
            created_by: 'user-2',
            created_at: '2026-06-01T10:00:00.000Z',
            updated_at: '2026-06-01T15:00:00.000Z', // newer timestamp
            deleted_at: null,
          },
          old: { id: 'remote-1', is_checked: true, updated_at: '2026-06-01T14:00:00.000Z' },
        });
      }

      // The change should be emitted — the consumer applies it because remote is newer
      expect(changes).toHaveLength(1);
      expect(changes[0]!.item.isChecked).toBe(false);
      expect(changes[0]!.item.updatedAt).toBe('2026-06-01T15:00:00.000Z');
    });

    it('pushLocalChanges sets updated_at so local wins if it is newer', async () => {
      service.startSync('household-1');

      const now = '2026-06-01T16:00:00.000Z';
      await service.pushLocalChanges([
        {
          localId: 'local-conflict',
          name: 'Rice',
          normalizedName: 'rice',
          quantity: '1',
          unit: 'kg',
          recipeId: null,
          recipeTitle: null,
          isChecked: true,
          privacy: 'local-only',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: now,
        },
      ]);

      expect(client._upsertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updated_at: now,
            is_checked: true,
          }),
        ]),
        expect.objectContaining({ onConflict: 'id' }),
      );
    });
  });

  describe('getSyncStatus', () => {
    it('returns "idle" before startSync is called', () => {
      expect(service.getSyncStatus()).toBe('idle');
    });

    it('returns "syncing" after startSync', () => {
      service.startSync('household-1');
      expect(service.getSyncStatus()).toBe('syncing');
    });

    it('returns "offline" when network is down', () => {
      service.startSync('household-1');
      network.setOnline(false);
      expect(service.getSyncStatus()).toBe('offline');
    });

    it('returns "idle" after stopSync', () => {
      service.startSync('household-1');
      service.stopSync();
      expect(service.getSyncStatus()).toBe('idle');
    });
  });

  describe('getQueueSize', () => {
    it('returns 0 when no items are queued', () => {
      expect(service.getQueueSize()).toBe(0);
    });

    it('returns the number of queued items when offline', async () => {
      service.startSync('household-1');
      network.setOnline(false);

      await service.pushLocalChanges([
        {
          localId: 'q-1',
          name: 'Lentils',
          normalizedName: 'lentils',
          quantity: '500',
          unit: 'g',
          recipeId: null,
          recipeTitle: null,
          isChecked: false,
          privacy: 'local-only',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-01T10:00:00.000Z',
        },
      ]);

      expect(service.getQueueSize()).toBe(1);
    });
  });
});
