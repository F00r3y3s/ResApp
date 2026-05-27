import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import type { UseGrocerySyncOptions } from './use-grocery-sync';
import { useGrocerySync } from './use-grocery-sync';

// ---------------------------------------------------------------------------
// Mocks
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

function createMockSupabaseClient() {
  const channelObj = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };

  const fromChain = {
    upsert: jest.fn<(args: unknown, opts: unknown) => Promise<{ error: null }>>()
      .mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };

  return {
    channel: jest.fn().mockReturnValue(channelObj),
    from: jest.fn().mockReturnValue(fromChain),
    removeChannel: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    _channel: channelObj,
    _fromChain: fromChain,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGrocerySync', () => {
  let network: ReturnType<typeof createMockNetworkStatus>;
  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    network = createMockNetworkStatus();
    client = createMockSupabaseClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderSyncHook(overrides: Partial<UseGrocerySyncOptions> = {}) {
    const defaultOptions: UseGrocerySyncOptions = {
      supabaseClient: client,
      userId: 'user-1',
      householdId: 'household-1',
      hasSyncConsent: true,
      networkStatus: network,
      ...overrides,
    };

    return renderHook(() => useGrocerySync(defaultOptions));
  }

  it('returns idle status when no household is available', () => {
    const { result } = renderSyncHook({ householdId: null });

    expect(result.current.syncStatus).toBe('idle');
    expect(result.current.isSyncActive).toBe(false);
  });

  it('returns idle status when user has no sync consent', () => {
    const { result } = renderSyncHook({ hasSyncConsent: false });

    expect(result.current.syncStatus).toBe('idle');
    expect(result.current.isSyncActive).toBe(false);
  });

  it('returns idle status when supabase client is null (guest mode)', () => {
    const { result } = renderSyncHook({ supabaseClient: null });

    expect(result.current.syncStatus).toBe('idle');
    expect(result.current.isSyncActive).toBe(false);
  });

  it('activates sync when all conditions are met', () => {
    const { result } = renderSyncHook();

    expect(result.current.isSyncActive).toBe(true);
    expect(result.current.syncStatus).toBe('syncing');
  });

  it('subscribes to the realtime channel for the household', () => {
    renderSyncHook();

    expect(client.channel).toHaveBeenCalledWith('grocery:household-1');
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderSyncHook();

    unmount();

    expect(client.removeChannel).toHaveBeenCalled();
  });

  it('pushChanges is a no-op when sync is not active', async () => {
    const { result } = renderSyncHook({ householdId: null });

    await act(async () => {
      await result.current.pushChanges([]);
    });

    expect(client.from).not.toHaveBeenCalled();
  });
});
