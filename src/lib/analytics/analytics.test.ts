import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { AnalyticsClient } from './analytics';
import {
    Analytics,
    configureAnalytics,
    createAnalyticsDispatcher,
    resetAnalytics,
} from './analytics';

type Captured = { event: string; properties: Record<string, unknown> };

function makeFakeClient() {
  const captures: Captured[] = [];
  const identifies: { distinctId: string; properties?: Record<string, unknown> }[] = [];
  let flushCount = 0;

  const client: AnalyticsClient = {
    track(event, properties) {
      captures.push({ event, properties: { ...properties } });
    },
    identify(distinctId, properties) {
      identifies.push({ distinctId, properties: properties ? { ...properties } : undefined });
    },
    async flush() {
      flushCount += 1;
    },
  };

  return {
    client,
    captures,
    identifies,
    get flushCount() {
      return flushCount;
    },
  };
}

describe('Analytics dispatcher (T12.1)', () => {
  beforeEach(() => {
    resetAnalytics();
  });

  afterEach(() => {
    resetAnalytics();
  });

  it('uses a no-op client when not configured (Expo Go without secrets)', async () => {
    expect(Analytics.isEnabled()).toBe(false);

    // Calling track on the unconfigured singleton must not throw and must
    // return false to signal the call did not reach a backend.
    const result = Analytics.track('onboarding_completed', { step_count: 5 });
    expect(result).toBe(false);

    // flush() is idempotent and safe even without a configured client.
    await expect(Analytics.flush()).resolves.toBeUndefined();
    await expect(Analytics.flush()).resolves.toBeUndefined();
  });

  it('routes track() to the configured client when an event passes the schema', () => {
    const fake = makeFakeClient();
    configureAnalytics(fake.client);

    expect(Analytics.isEnabled()).toBe(true);

    const ok = Analytics.track('onboarding_completed', { step_count: 5, duration_ms: 12_000 });
    expect(ok).toBe(true);

    expect(fake.captures).toHaveLength(1);
    expect(fake.captures[0].event).toBe('onboarding_completed');
    expect(fake.captures[0].properties).toMatchObject({ step_count: 5, duration_ms: 12_000 });
  });

  it('REJECTS events with disallowed properties and never forwards them to the backend', () => {
    const fake = makeFakeClient();
    configureAnalytics(fake.client);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    // The privacy contract forbids recipe titles in events.
    const ok = Analytics.track('recipe_saved', { title: 'Lentil soup' } as never);

    expect(ok).toBe(false);
    expect(fake.captures).toHaveLength(0);
    // The dispatcher logged the rejection through onError so the cause is
    // visible in dev without bubbling up.
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('rejects unknown event names', () => {
    const fake = makeFakeClient();
    configureAnalytics(fake.client);

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    // @ts-expect-error -- runtime guard for unknown event names
    const ok = Analytics.track('not_an_event', {});

    expect(ok).toBe(false);
    expect(fake.captures).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('forwards identify() with anonymous distinct ids only', () => {
    const fake = makeFakeClient();
    configureAnalytics(fake.client);

    Analytics.identify('anon-uuid-1234');
    expect(fake.identifies).toEqual([{ distinctId: 'anon-uuid-1234', properties: undefined }]);
  });

  it('flush() is idempotent and concurrency-safe', async () => {
    const fake = makeFakeClient();
    configureAnalytics(fake.client);

    await Promise.all([Analytics.flush(), Analytics.flush(), Analytics.flush()]);

    // Each call delegates to the underlying client, but calling it many times
    // must not throw and must not duplicate events (we only had identify above).
    expect(fake.flushCount).toBeGreaterThanOrEqual(1);
  });

  it('resetAnalytics() restores the no-op state for tests', () => {
    const fake = makeFakeClient();
    configureAnalytics(fake.client);
    expect(Analytics.isEnabled()).toBe(true);

    resetAnalytics();

    expect(Analytics.isEnabled()).toBe(false);
    expect(Analytics.track('onboarding_completed', {})).toBe(false);
    expect(fake.captures).toHaveLength(0);
  });

  describe('createAnalyticsDispatcher (pure factory)', () => {
    it('returns a dispatcher that delegates to the supplied client', () => {
      const fake = makeFakeClient();
      const dispatcher = createAnalyticsDispatcher(fake.client);

      const ok = dispatcher.track('grocery_item_added', { count: 2 });
      expect(ok).toBe(true);
      expect(fake.captures).toEqual([
        { event: 'grocery_item_added', properties: expect.objectContaining({ count: 2 }) },
      ]);
    });

    it('reports the underlying error and continues when the client throws', () => {
      const onError = jest.fn();
      const throwing: AnalyticsClient = {
        track() {
          throw new Error('network unavailable');
        },
        identify() {},
        async flush() {},
      };

      const dispatcher = createAnalyticsDispatcher(throwing, { onError });

      // Must not bubble the error to the caller — analytics is best-effort.
      expect(() => dispatcher.track('onboarding_completed', {})).not.toThrow();
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
