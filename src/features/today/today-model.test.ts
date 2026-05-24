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

  it('reflects saved guest preferences in the offline dinner plan', () => {
    const summary = buildTodaySummary({
      pantryExpiringCount: 2,
      savedRecipeCount: 4,
      groceryOpenCount: 6,
      isOnline: false,
      hasAccount: false,
      preferences: {
        language: 'arabic',
        region: 'uae-gcc',
        householdSize: 5,
        dietaryRules: ['halal'],
        allergies: ['peanuts'],
        cuisines: ['indian', 'levantine'],
        goals: ['reduce-waste'],
        privacy: 'local-only',
        updatedAt: '2026-05-24T10:00:00.000Z',
      },
    });

    expect(summary.dinnerPlanLabel).toBe('Dinner plan for 5 · UAE / GCC · Indian, Levantine');
    expect(summary.preferenceMessage).toBe('Halal meals · avoiding peanuts · reduce waste');
  });
});
