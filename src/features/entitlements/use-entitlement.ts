/**
 * React hook for entitlement state management.
 *
 * Provides:
 * - Current entitlement state (premium or free)
 * - Usage tracking for free-tier limits
 * - Gate checking for premium actions
 * - Purchase and restore flows
 *
 * Fail-closed: if entitlement cannot be verified, premium actions are blocked.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { EntitlementService } from './entitlement-service';
import type { EntitlementState, UsageCounter } from './entitlement-types';
import { DEFAULT_ENTITLEMENT_STATE, EMPTY_USAGE } from './entitlement-types';
import type { GatedAction, GateResult } from './usage-gate';
import { checkGate, incrementUsage, remainingUses } from './usage-gate';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export type UseEntitlementResult = {
  /** Current entitlement state */
  entitlementState: EntitlementState;
  /** Whether the user has premium access */
  isPremium: boolean;
  /** Current usage counters */
  usage: UsageCounter;
  /** Check if a gated action is allowed */
  checkAction: (action: GatedAction) => GateResult;
  /** Get remaining free uses for an action */
  getRemainingUses: (action: GatedAction) => number;
  /** Record that a gated action was performed (increments counter) */
  recordUsage: (action: GatedAction) => void;
  /** Refresh entitlement state from RevenueCat */
  refresh: () => Promise<void>;
  /** Whether entitlement state is currently being loaded */
  isLoading: boolean;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseEntitlementOptions = {
  service: EntitlementService;
  now?: () => Date;
};

export function useEntitlement(options: UseEntitlementOptions): UseEntitlementResult {
  const { service } = options;
  const now = options.now ?? (() => new Date());

  const [entitlementState, setEntitlementState] = useState<EntitlementState>(DEFAULT_ENTITLEMENT_STATE);
  const [usage, setUsage] = useState<UsageCounter>(EMPTY_USAGE);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await service.getEntitlementState();
      if (mountedRef.current) {
        setEntitlementState(state);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [service]);

  const checkAction = useCallback(
    (action: GatedAction): GateResult => {
      return checkGate(action, entitlementState, usage, now());
    },
    [entitlementState, usage, now],
  );

  const getRemainingUses = useCallback(
    (action: GatedAction): number => {
      if (entitlementState.isPremium) return Infinity;
      return remainingUses(action, usage, now());
    },
    [entitlementState, usage, now],
  );

  const recordUsage = useCallback(
    (action: GatedAction) => {
      setUsage((prev) => incrementUsage(prev, action, now()));
    },
    [now],
  );

  return {
    entitlementState,
    isPremium: entitlementState.isPremium,
    usage,
    checkAction,
    getRemainingUses,
    recordUsage,
    refresh,
    isLoading,
  };
}
