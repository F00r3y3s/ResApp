import type { SupabaseClient } from '@supabase/supabase-js';

import type { GroceryItem } from './grocery-repository';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SyncStatus = 'idle' | 'syncing' | 'offline';

export type RemoteGroceryItem = {
  id: string;
  householdId: string;
  name: string;
  normalizedName: string;
  quantity: string;
  unit: string;
  recipeId: string | null;
  recipeTitle: string | null;
  isChecked: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type GroceryChange = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  item: RemoteGroceryItem;
};

export type GrocerySyncService = {
  startSync(householdId: string): void;
  stopSync(): void;
  pushLocalChanges(items: GroceryItem[]): Promise<void>;
  onRemoteChange(callback: (change: GroceryChange) => void): () => void;
  getSyncStatus(): SyncStatus;
  getQueueSize(): number;
};

export type NetworkStatus = {
  isOnline(): boolean;
  onStatusChange(callback: (online: boolean) => void): () => void;
};

export type GrocerySyncServiceOptions = {
  supabaseClient: SupabaseClient;
  networkStatus: NetworkStatus;
  userId: string;
};

// ---------------------------------------------------------------------------
// Remote row shape (snake_case from Postgres)
// ---------------------------------------------------------------------------

type GroceryItemRow = {
  id: string;
  household_id: string;
  name: string;
  normalized_name: string;
  quantity: string;
  unit: string;
  recipe_id: string | null;
  recipe_title: string | null;
  is_checked: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGrocerySyncService(
  options: GrocerySyncServiceOptions,
): GrocerySyncService {
  const { supabaseClient, networkStatus, userId } = options;

  let currentHouseholdId: string | null = null;
  let channel: ReturnType<SupabaseClient['channel']> | null = null;
  let status: SyncStatus = 'idle';
  const changeListeners: ((change: GroceryChange) => void)[] = [];
  const offlineQueue: { householdId: string; items: GroceryItem[] }[] = [];
  let unsubscribeNetwork: (() => void) | null = null;

  function mapRowToRemoteItem(row: GroceryItemRow): RemoteGroceryItem {
    return {
      id: row.id,
      householdId: row.household_id,
      name: row.name,
      normalizedName: row.normalized_name,
      quantity: row.quantity ?? '',
      unit: row.unit ?? '',
      recipeId: row.recipe_id,
      recipeTitle: row.recipe_title,
      isChecked: row.is_checked,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  function determineChangeType(eventType: string, row: GroceryItemRow): GroceryChange['type'] {
    if (eventType === 'INSERT') return 'INSERT';
    if (eventType === 'DELETE') return 'DELETE';
    // An UPDATE that sets deleted_at is treated as a DELETE
    if (eventType === 'UPDATE' && row.deleted_at) return 'DELETE';
    return 'UPDATE';
  }

  function notifyListeners(change: GroceryChange) {
    for (const listener of changeListeners) {
      listener(change);
    }
  }

  function handleRealtimePayload(payload: unknown) {
    const p = payload as { eventType: string; new: GroceryItemRow; old: Partial<GroceryItemRow> };
    const row = p.new;
    const changeType = determineChangeType(p.eventType, row);
    const item = mapRowToRemoteItem(row);
    notifyListeners({ type: changeType, item });
  }

  async function flushQueue(): Promise<void> {
    if (offlineQueue.length === 0) return;
    if (!networkStatus.isOnline()) return;

    // Process all queued batches
    const toProcess = [...offlineQueue];

    for (const entry of toProcess) {
      const records = entry.items.map((item) => localItemToRow(item, entry.householdId));
      const { error } = await supabaseClient
        .from('grocery_items')
        .upsert(records, { onConflict: 'id' });

      if (error) {
        // Keep items in queue for next retry — don't remove them
        return;
      }

      // Remove successfully flushed entry
      const idx = offlineQueue.indexOf(entry);
      if (idx >= 0) offlineQueue.splice(idx, 1);
    }
  }

  function localItemToRow(item: GroceryItem, householdId: string): Record<string, unknown> {
    return {
      id: item.localId,
      household_id: householdId,
      name: item.name,
      normalized_name: item.normalizedName,
      quantity: item.quantity,
      unit: item.unit,
      recipe_id: item.recipeId,
      recipe_title: item.recipeTitle,
      is_checked: item.isChecked,
      created_by: userId,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
  }

  function handleNetworkChange(online: boolean) {
    if (!currentHouseholdId) return;

    if (online) {
      status = 'syncing';
      flushQueue();
    } else {
      status = 'offline';
    }
  }

  return {
    startSync(householdId: string) {
      // Prevent duplicate subscriptions
      if (currentHouseholdId === householdId && channel) {
        return;
      }

      currentHouseholdId = householdId;
      status = networkStatus.isOnline() ? 'syncing' : 'offline';

      // Subscribe to realtime changes for this household
      channel = supabaseClient.channel(`grocery:${householdId}`);
      channel
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'grocery_items',
            filter: `household_id=eq.${householdId}`,
          },
          handleRealtimePayload,
        )
        .subscribe();

      // Listen for network status changes to flush queue
      unsubscribeNetwork = networkStatus.onStatusChange(handleNetworkChange);
    },

    stopSync() {
      if (channel) {
        supabaseClient.removeChannel(channel);
        channel = null;
      }
      if (unsubscribeNetwork) {
        unsubscribeNetwork();
        unsubscribeNetwork = null;
      }
      currentHouseholdId = null;
      status = 'idle';
    },

    async pushLocalChanges(items: GroceryItem[]) {
      if (!currentHouseholdId) return;

      if (!networkStatus.isOnline()) {
        // Queue for later
        offlineQueue.push({ householdId: currentHouseholdId, items });
        return;
      }

      const records = items.map((item) => localItemToRow(item, currentHouseholdId!));
      await supabaseClient
        .from('grocery_items')
        .upsert(records, { onConflict: 'id' });
    },

    onRemoteChange(callback: (change: GroceryChange) => void) {
      changeListeners.push(callback);
      return () => {
        const idx = changeListeners.indexOf(callback);
        if (idx >= 0) changeListeners.splice(idx, 1);
      };
    },

    getSyncStatus() {
      return status;
    },

    getQueueSize() {
      return offlineQueue.reduce((sum, entry) => sum + entry.items.length, 0);
    },
  };
}
