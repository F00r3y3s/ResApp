import { useCallback, useEffect, useRef, useState } from 'react';

import type { GroceryItem } from './grocery-repository';
import type {
    GroceryChange,
    GrocerySyncService,
    NetworkStatus,
    SyncStatus,
} from './grocery-sync-service';
import { createGrocerySyncService } from './grocery-sync-service';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type UseGrocerySyncOptions = {
  /** The Supabase client instance. Null if not configured or guest mode. */
  supabaseClient: unknown | null;
  /** Current user ID. Null if not authenticated. */
  userId: string | null;
  /** The household (circle) ID to sync with. Null if user has no circle. */
  householdId: string | null;
  /** Whether the user has granted sync consent. */
  hasSyncConsent: boolean;
  /** Network status provider. */
  networkStatus: NetworkStatus;
  /** Callback when remote changes arrive — the screen merges them into local state. */
  onRemoteChange?: (change: GroceryChange) => void;
};

export type UseGrocerySyncResult = {
  /** Current sync status for UI display. */
  syncStatus: SyncStatus;
  /** Number of offline-queued changes. */
  queueSize: number;
  /** Push local changes to remote. Safe to call when offline (queues automatically). */
  pushChanges: (items: GroceryItem[]) => Promise<void>;
  /** Whether sync is active (has household + consent + client). */
  isSyncActive: boolean;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGrocerySync(options: UseGrocerySyncOptions): UseGrocerySyncResult {
  const {
    supabaseClient,
    userId,
    householdId,
    hasSyncConsent,
    networkStatus,
    onRemoteChange,
  } = options;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [queueSize, setQueueSize] = useState(0);
  const serviceRef = useRef<GrocerySyncService | null>(null);

  const canSync = Boolean(supabaseClient && userId && householdId && hasSyncConsent);

  // Create or tear down the sync service based on eligibility
  useEffect(() => {
    if (!canSync || !supabaseClient || !userId || !householdId) {
      // Tear down if conditions are no longer met
      if (serviceRef.current) {
        serviceRef.current.stopSync();
        serviceRef.current = null;
      }
      setSyncStatus('idle');
      setQueueSize(0);
      return;
    }

    const service = createGrocerySyncService({
      supabaseClient: supabaseClient as any,
      networkStatus,
      userId,
    });

    serviceRef.current = service;
    service.startSync(householdId);
    setSyncStatus(service.getSyncStatus());

    // Listen for remote changes
    const unsubRemote = service.onRemoteChange((change) => {
      onRemoteChange?.(change);
    });

    // Track network status for UI
    const unsubNetwork = networkStatus.onStatusChange(() => {
      if (serviceRef.current) {
        setSyncStatus(serviceRef.current.getSyncStatus());
        setQueueSize(serviceRef.current.getQueueSize());
      }
    });

    return () => {
      unsubRemote();
      unsubNetwork();
      service.stopSync();
      serviceRef.current = null;
    };
  }, [canSync, supabaseClient, userId, householdId, networkStatus, onRemoteChange]);

  const pushChanges = useCallback(async (items: GroceryItem[]) => {
    if (!serviceRef.current) return;
    await serviceRef.current.pushLocalChanges(items);
    setQueueSize(serviceRef.current.getQueueSize());
  }, []);

  return {
    syncStatus,
    queueSize,
    pushChanges,
    isSyncActive: canSync,
  };
}
