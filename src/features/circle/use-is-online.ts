import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

/**
 * Lightweight reachability hook. T10.1 is sync-required, so the create/join
 * screens must visibly say "needs internet" instead of silently queueing —
 * see docs/security/privacy-contract.md ("Server-required" data class).
 *
 * We deliberately *don't* listen via PowerSync's connection state because that
 * machinery is for syncable-after-consent records (pantry, grocery, etc.).
 * Circle membership is a server-required RPC call, so a coarse-grained network
 * check is the right fit.
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (cancelled) return;
        setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      } catch {
        if (!cancelled) setIsOnline(true);
      }
    }
    void refresh();

    const subscription =
      typeof Network.addNetworkStateListener === 'function'
        ? Network.addNetworkStateListener((state) => {
            setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
          })
        : null;

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, []);

  return isOnline;
}
