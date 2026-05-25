import type { EntitlementState, UsageCounter } from './entitlement-types';
import { DEFAULT_ENTITLEMENT_STATE, EMPTY_USAGE, FREE_TIER_LIMITS, PRODUCT_IDS } from './entitlement-types';
import { checkGate, incrementUsage, remainingUses } from './usage-gate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date('2025-06-15T10:00:00.000Z');
const TODAY_STR = '2025-06-15';
const WEEK_STR = '2025-W24';

function makePremiumState(): EntitlementState {
  return {
    isPremium: true,
    status: 'active',
    expiresAt: '2025-07-15T12:00:00.000Z',
    willRenew: true,
    activeProductId: PRODUCT_IDS.PREMIUM_MONTHLY,
    lastVerifiedAt: FIXED_NOW.toISOString(),
  };
}

function makeFreeState(): EntitlementState {
  return {
    ...DEFAULT_ENTITLEMENT_STATE,
    lastVerifiedAt: FIXED_NOW.toISOString(),
  };
}

function makeUsage(overrides: Partial<UsageCounter> = {}): UsageCounter {
  return {
    ...EMPTY_USAGE,
    counterDate: TODAY_STR,
    counterWeek: WEEK_STR,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usage-gate', () => {
  describe('checkGate', () => {
    describe('premium users', () => {
      it('allows all actions for premium users regardless of usage', () => {
        const state = makePremiumState();
        const usage = makeUsage({
          aiSuggestionsToday: 100,
          scansToday: 100,
          aiMealPlansThisWeek: 100,
        });

        expect(checkGate('ai-suggestion', state, usage, FIXED_NOW)).toEqual({ allowed: true });
        expect(checkGate('scan', state, usage, FIXED_NOW)).toEqual({ allowed: true });
        expect(checkGate('ai-meal-plan', state, usage, FIXED_NOW)).toEqual({ allowed: true });
        expect(checkGate('premium-feature', state, usage, FIXED_NOW)).toEqual({ allowed: true });
      });
    });

    describe('free users — ai-suggestion', () => {
      it('allows when under daily limit', () => {
        const result = checkGate(
          'ai-suggestion',
          makeFreeState(),
          makeUsage({ aiSuggestionsToday: FREE_TIER_LIMITS.aiSuggestionsPerDay - 1 }),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('blocks when at daily limit', () => {
        const result = checkGate(
          'ai-suggestion',
          makeFreeState(),
          makeUsage({ aiSuggestionsToday: FREE_TIER_LIMITS.aiSuggestionsPerDay }),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: false, reason: 'daily-ai-limit' });
      });

      it('blocks when over daily limit', () => {
        const result = checkGate(
          'ai-suggestion',
          makeFreeState(),
          makeUsage({ aiSuggestionsToday: FREE_TIER_LIMITS.aiSuggestionsPerDay + 5 }),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: false, reason: 'daily-ai-limit' });
      });
    });

    describe('free users — scan', () => {
      it('allows when under daily limit', () => {
        const result = checkGate(
          'scan',
          makeFreeState(),
          makeUsage({ scansToday: 0 }),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('blocks when at daily limit', () => {
        const result = checkGate(
          'scan',
          makeFreeState(),
          makeUsage({ scansToday: FREE_TIER_LIMITS.scansPerDay }),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: false, reason: 'daily-scan-limit' });
      });
    });

    describe('free users — ai-meal-plan', () => {
      it('allows when under weekly limit', () => {
        const result = checkGate(
          'ai-meal-plan',
          makeFreeState(),
          makeUsage({ aiMealPlansThisWeek: 0 }),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: true });
      });

      it('blocks when at weekly limit', () => {
        const result = checkGate(
          'ai-meal-plan',
          makeFreeState(),
          makeUsage({ aiMealPlansThisWeek: FREE_TIER_LIMITS.aiMealPlansPerWeek }),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: false, reason: 'weekly-meal-plan-limit' });
      });
    });

    describe('free users — premium-feature', () => {
      it('always blocks for free users', () => {
        const result = checkGate(
          'premium-feature',
          makeFreeState(),
          makeUsage(),
          FIXED_NOW,
        );
        expect(result).toEqual({ allowed: false, reason: 'not-premium' });
      });
    });

    describe('counter date rollover', () => {
      it('resets daily counters when date has changed', () => {
        const yesterdayUsage = makeUsage({
          aiSuggestionsToday: FREE_TIER_LIMITS.aiSuggestionsPerDay,
          scansToday: FREE_TIER_LIMITS.scansPerDay,
          counterDate: '2025-06-14', // yesterday
        });

        const result = checkGate('ai-suggestion', makeFreeState(), yesterdayUsage, FIXED_NOW);
        expect(result).toEqual({ allowed: true });
      });

      it('resets weekly counters when week has changed', () => {
        const lastWeekUsage = makeUsage({
          aiMealPlansThisWeek: FREE_TIER_LIMITS.aiMealPlansPerWeek,
          counterWeek: '2025-W23', // last week
        });

        const result = checkGate('ai-meal-plan', makeFreeState(), lastWeekUsage, FIXED_NOW);
        expect(result).toEqual({ allowed: true });
      });
    });
  });

  describe('incrementUsage', () => {
    it('increments ai-suggestion counter', () => {
      const usage = makeUsage({ aiSuggestionsToday: 1 });
      const result = incrementUsage(usage, 'ai-suggestion', FIXED_NOW);
      expect(result.aiSuggestionsToday).toBe(2);
    });

    it('increments scan counter', () => {
      const usage = makeUsage({ scansToday: 0 });
      const result = incrementUsage(usage, 'scan', FIXED_NOW);
      expect(result.scansToday).toBe(1);
    });

    it('increments ai-meal-plan counter', () => {
      const usage = makeUsage({ aiMealPlansThisWeek: 0 });
      const result = incrementUsage(usage, 'ai-meal-plan', FIXED_NOW);
      expect(result.aiMealPlansThisWeek).toBe(1);
    });

    it('resets stale daily counters before incrementing', () => {
      const staleUsage = makeUsage({
        aiSuggestionsToday: 3,
        counterDate: '2025-06-14', // yesterday
      });
      const result = incrementUsage(staleUsage, 'ai-suggestion', FIXED_NOW);
      expect(result.aiSuggestionsToday).toBe(1); // reset to 0, then +1
      expect(result.counterDate).toBe(TODAY_STR);
    });
  });

  describe('remainingUses', () => {
    it('returns correct remaining for ai-suggestion', () => {
      const usage = makeUsage({ aiSuggestionsToday: 1 });
      expect(remainingUses('ai-suggestion', usage, FIXED_NOW)).toBe(
        FREE_TIER_LIMITS.aiSuggestionsPerDay - 1,
      );
    });

    it('returns 0 when at limit', () => {
      const usage = makeUsage({ scansToday: FREE_TIER_LIMITS.scansPerDay });
      expect(remainingUses('scan', usage, FIXED_NOW)).toBe(0);
    });

    it('never returns negative', () => {
      const usage = makeUsage({ scansToday: FREE_TIER_LIMITS.scansPerDay + 10 });
      expect(remainingUses('scan', usage, FIXED_NOW)).toBe(0);
    });

    it('returns 0 for premium-feature (no free allowance)', () => {
      expect(remainingUses('premium-feature', makeUsage(), FIXED_NOW)).toBe(0);
    });
  });
});
