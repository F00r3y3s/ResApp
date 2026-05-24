import { describe, expect, it } from '@jest/globals';

import { buildTodaySummary } from './today-model';

describe('today model', () => {
  it('summarizes guest-first offline state without requiring cloud services', () => {
    const summary = buildTodaySummary({
      pantryExpiringCount: 2,
      savedRecipeCount: 4,
      groceryOpenCount: 6,
      isOnline: false,
      hasAccount: false,
    });

    expect(summary.modeLabel).toBe('Guest offline');
    expect(summary.cards.map((card) => card.title)).toEqual([
      'Use soon',
      'Saved recipes',
      'Grocery queue',
    ]);
    expect(summary.networkMessage).toBe('Core cooking tools are available offline.');
  });
});
