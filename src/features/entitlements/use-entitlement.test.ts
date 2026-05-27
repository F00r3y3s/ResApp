import { act, renderHook } from '@testing-library/react-native';

import type { EntitlementService } from './entitlement-service';
import { DEFAULT_ENTITLEMENT_STATE, FREE_TIER_LIMITS, PRODUCT_IDS } from './entitlement-types';
import { useEntitlement } from './use-entitlement';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date('2025-06-15T10:00:00.000Z');

function makePremiumState() {
  return {
    isPremium: true,
    status: 'active' as const,
    expiresAt: '2025-07-15T12:00:00.000Z',
    willRenew: true,
    activeProductId: PRODUCT_IDS.PREMIUM_MONTHLY,
    lastVerifiedAt: FIXED_NOW.toISOString(),
  };
}

function makeMockService(overrides: Partial<EntitlementService> = {}): EntitlementService {
  return {
    initialize: jest.fn(),
    getEntitlementState: jest.fn().mockResolvedValue(DEFAULT_ENTITLEMENT_STATE),
    getOfferings: jest.fn().mockResolvedValue(null),
    purchase: jest.fn().mockResolvedValue(DEFAULT_ENTITLEMENT_STATE),
    restorePurchases: jest.fn().mockResolvedValue(DEFAULT_ENTITLEMENT_STATE),
    logIn: jest.fn().mockResolvedValue(DEFAULT_ENTITLEMENT_STATE),
    logOut: jest.fn().mockResolvedValue(DEFAULT_ENTITLEMENT_STATE),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useEntitlement', () => {
  it('starts in loading state and fetches entitlement on mount', async () => {
    const service = makeMockService();
    const { result } = renderHook(() =>
      useEntitlement({ service, now: () => FIXED_NOW }),
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for async fetch
    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(service.getEntitlementState).toHaveBeenCalledTimes(1);
  });

  it('reflects premium state after fetch', async () => {
    const service = makeMockService({
      getEntitlementState: jest.fn().mockResolvedValue(makePremiumState()),
    });

    const { result } = renderHook(() =>
      useEntitlement({ service, now: () => FIXED_NOW }),
    );

    await act(async () => {});

    expect(result.current.isPremium).toBe(true);
    expect(result.current.entitlementState.status).toBe('active');
  });

  it('reflects free state after fetch', async () => {
    const service = makeMockService();

    const { result } = renderHook(() =>
      useEntitlement({ service, now: () => FIXED_NOW }),
    );

    await act(async () => {});

    expect(result.current.isPremium).toBe(false);
  });

  describe('checkAction', () => {
    it('allows actions for premium users', async () => {
      const service = makeMockService({
        getEntitlementState: jest.fn().mockResolvedValue(makePremiumState()),
      });

      const { result } = renderHook(() =>
        useEntitlement({ service, now: () => FIXED_NOW }),
      );

      await act(async () => {});

      expect(result.current.checkAction('ai-suggestion')).toEqual({ allowed: true });
      expect(result.current.checkAction('scan')).toEqual({ allowed: true });
      expect(result.current.checkAction('premium-feature')).toEqual({ allowed: true });
    });

    it('blocks free users when at limit', async () => {
      const service = makeMockService();

      const { result } = renderHook(() =>
        useEntitlement({ service, now: () => FIXED_NOW }),
      );

      await act(async () => {});

      // Use up all AI suggestions
      for (let i = 0; i < FREE_TIER_LIMITS.aiSuggestionsPerDay; i++) {
        act(() => {
          result.current.recordUsage('ai-suggestion');
        });
      }

      expect(result.current.checkAction('ai-suggestion')).toEqual({
        allowed: false,
        reason: 'daily-ai-limit',
      });
    });
  });

  describe('getRemainingUses', () => {
    it('returns Infinity for premium users', async () => {
      const service = makeMockService({
        getEntitlementState: jest.fn().mockResolvedValue(makePremiumState()),
      });

      const { result } = renderHook(() =>
        useEntitlement({ service, now: () => FIXED_NOW }),
      );

      await act(async () => {});

      expect(result.current.getRemainingUses('ai-suggestion')).toBe(Infinity);
    });

    it('returns correct remaining for free users', async () => {
      const service = makeMockService();

      const { result } = renderHook(() =>
        useEntitlement({ service, now: () => FIXED_NOW }),
      );

      await act(async () => {});

      expect(result.current.getRemainingUses('ai-suggestion')).toBe(
        FREE_TIER_LIMITS.aiSuggestionsPerDay,
      );

      act(() => {
        result.current.recordUsage('ai-suggestion');
      });

      expect(result.current.getRemainingUses('ai-suggestion')).toBe(
        FREE_TIER_LIMITS.aiSuggestionsPerDay - 1,
      );
    });
  });

  describe('recordUsage', () => {
    it('increments the usage counter', async () => {
      const service = makeMockService();

      const { result } = renderHook(() =>
        useEntitlement({ service, now: () => FIXED_NOW }),
      );

      await act(async () => {});

      expect(result.current.usage.aiSuggestionsToday).toBe(0);

      act(() => {
        result.current.recordUsage('ai-suggestion');
      });

      expect(result.current.usage.aiSuggestionsToday).toBe(1);
    });
  });

  describe('refresh', () => {
    it('re-fetches entitlement state', async () => {
      const service = makeMockService();

      const { result } = renderHook(() =>
        useEntitlement({ service, now: () => FIXED_NOW }),
      );

      await act(async () => {});

      expect(service.getEntitlementState).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refresh();
      });

      expect(service.getEntitlementState).toHaveBeenCalledTimes(2);
    });
  });
});
