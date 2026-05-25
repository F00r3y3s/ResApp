import { describe, expect, it } from '@jest/globals';

import {
    ANALYTICS_EVENTS,
    parseAnalyticsEvent,
    type AnalyticsEventName,
} from './events';

describe('analytics event catalog (T12.1)', () => {
  it('covers every critical flow named in the ticket', () => {
    const required: AnalyticsEventName[] = [
      'onboarding_completed',
      'recipe_saved',
      'scan_started',
      'meal_plan_recipe_added',
      'grocery_item_added',
      'subscription_started',
    ];

    for (const name of required) {
      expect(ANALYTICS_EVENTS).toHaveProperty(name);
    }
  });

  it('tags every event payload as analytics-safe per the privacy contract', () => {
    const result = parseAnalyticsEvent('onboarding_completed', {
      step_count: 5,
      duration_ms: 12_000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.privacy).toBe('analytics-safe');
    }
  });

  describe('privacy contract enforcement: shape, never content', () => {
    it('rejects recipe content fields on recipe_saved (no titles, no body text)', () => {
      const titled = parseAnalyticsEvent('recipe_saved', { title: 'Lentil soup' });
      expect(titled.success).toBe(false);

      const named = parseAnalyticsEvent('recipe_saved', { name: 'Lentil soup' });
      expect(named.success).toBe(false);

      const body = parseAnalyticsEvent('recipe_saved', { text: 'Step 1...' });
      expect(body.success).toBe(false);
    });

    it('rejects PII fields on any event (email, phone, full_name, address)', () => {
      expect(parseAnalyticsEvent('subscription_started', { email: 'a@b.com' }).success).toBe(false);
      expect(parseAnalyticsEvent('subscription_started', { phone: '+15551234567' }).success).toBe(
        false,
      );
      expect(parseAnalyticsEvent('subscription_started', { full_name: 'Khan' }).success).toBe(
        false,
      );
      expect(parseAnalyticsEvent('subscription_started', { address: '1 St' }).success).toBe(false);
    });

    it('rejects free-form long strings on any allowed property (>64 chars)', () => {
      const long = 'x'.repeat(65);
      const result = parseAnalyticsEvent('scan_started', { surface: long });
      expect(result.success).toBe(false);
    });

    it('rejects image uris and file paths', () => {
      expect(
        parseAnalyticsEvent('scan_started', { image_uri: 'file:///tmp/x.jpg' }).success,
      ).toBe(false);
      expect(parseAnalyticsEvent('scan_started', { uri: 'file:///tmp/x.jpg' }).success).toBe(
        false,
      );
    });

    it('rejects unknown properties (strict allow-list per event)', () => {
      const result = parseAnalyticsEvent('grocery_item_added', { whatever: 1 });
      expect(result.success).toBe(false);
    });

    it('rejects unknown event names', () => {
      const result = parseAnalyticsEvent('not_an_event' as unknown as 'onboarding_completed', {});
      expect(result.success).toBe(false);
    });
  });

  describe('allowed shapes per event', () => {
    it('onboarding_completed accepts step_count + duration_ms scalars only', () => {
      expect(parseAnalyticsEvent('onboarding_completed', {}).success).toBe(true);
      expect(
        parseAnalyticsEvent('onboarding_completed', { step_count: 5, duration_ms: 1000 }).success,
      ).toBe(true);
    });

    it('recipe_saved accepts a small enum source + boolean has_image, no title', () => {
      expect(parseAnalyticsEvent('recipe_saved', { source: 'seed' }).success).toBe(true);
      expect(parseAnalyticsEvent('recipe_saved', { source: 'manual' }).success).toBe(true);
      expect(parseAnalyticsEvent('recipe_saved', { source: 'import' }).success).toBe(true);
      expect(parseAnalyticsEvent('recipe_saved', { source: 'remix' }).success).toBe(true);
      expect(parseAnalyticsEvent('recipe_saved', { has_image: true }).success).toBe(true);
      // Unknown enum value rejected
      expect(parseAnalyticsEvent('recipe_saved', { source: 'leaked' as unknown as 'seed' }).success).toBe(
        false,
      );
    });

    it('scan_started accepts surface enum (camera/gallery) + scan_kind enum', () => {
      expect(
        parseAnalyticsEvent('scan_started', { surface: 'camera', scan_kind: 'pantry' }).success,
      ).toBe(true);
      expect(
        parseAnalyticsEvent('scan_started', { surface: 'gallery', scan_kind: 'receipt' }).success,
      ).toBe(true);
      expect(
        parseAnalyticsEvent('scan_started', { surface: 'gallery', scan_kind: 'label' }).success,
      ).toBe(true);
    });

    it('meal_plan_recipe_added accepts day_of_week (0-6) + meal_slot enum', () => {
      expect(
        parseAnalyticsEvent('meal_plan_recipe_added', { day_of_week: 3, meal_slot: 'dinner' })
          .success,
      ).toBe(true);
      expect(parseAnalyticsEvent('meal_plan_recipe_added', { day_of_week: 7 }).success).toBe(false);
      expect(
        parseAnalyticsEvent('meal_plan_recipe_added', { meal_slot: 'midnight-snack' }).success,
      ).toBe(false);
    });

    it('grocery_item_added accepts integer count + source enum', () => {
      expect(parseAnalyticsEvent('grocery_item_added', { count: 1 }).success).toBe(true);
      expect(parseAnalyticsEvent('grocery_item_added', { count: 12, source: 'manual' }).success).toBe(
        true,
      );
      expect(parseAnalyticsEvent('grocery_item_added', { count: 0 }).success).toBe(false);
      expect(parseAnalyticsEvent('grocery_item_added', { count: -1 }).success).toBe(false);
    });

    it('subscription_started accepts plan + period enums only', () => {
      expect(
        parseAnalyticsEvent('subscription_started', { plan: 'premium', period: 'monthly' }).success,
      ).toBe(true);
      expect(
        parseAnalyticsEvent('subscription_started', { plan: 'premium', period: 'annual' }).success,
      ).toBe(true);
      expect(
        parseAnalyticsEvent('subscription_started', { plan: 'team' as unknown as 'premium' })
          .success,
      ).toBe(false);
    });
  });
});
