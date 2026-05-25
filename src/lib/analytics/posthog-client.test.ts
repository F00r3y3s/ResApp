import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockConstructorCalls: { apiKey: string; options: unknown }[] = [];
const mockCaptureCalls: { event: string; properties: unknown }[] = [];
const mockIdentifyCalls: { distinctId: string; properties: unknown }[] = [];
const mockFlushCalls: number[] = [];

jest.mock('posthog-react-native', () => {
  class MockPostHog {
    constructor(apiKey: string, options?: unknown) {
      mockConstructorCalls.push({ apiKey, options });
    }

    capture(event: string, properties?: unknown) {
      mockCaptureCalls.push({ event, properties });
    }

    identify(distinctId: string, properties?: unknown) {
      mockIdentifyCalls.push({ distinctId, properties });
    }

    async flush() {
      mockFlushCalls.push(1);
    }
  }

  return {
    __esModule: true,
    default: MockPostHog,
    PostHog: MockPostHog,
  };
});

describe('PostHog adapter (T12.1)', () => {
  beforeEach(() => {
    mockConstructorCalls.length = 0;
    mockCaptureCalls.length = 0;
    mockIdentifyCalls.length = 0;
    mockFlushCalls.length = 0;
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('returns null when no public api key is configured', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({
        publicEnv: { posthogApiKey: undefined, sentryDsn: undefined },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./posthog-client') as typeof import('./posthog-client');
      expect(mod.createPostHogClient()).toBeNull();
      expect(mockConstructorCalls).toHaveLength(0);
    });
  });

  it('initialises PostHog with the public api key from publicEnv', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({
        publicEnv: { posthogApiKey: 'phc_public_key', sentryDsn: undefined },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./posthog-client') as typeof import('./posthog-client');
      const client = mod.createPostHogClient();

      expect(client).not.toBeNull();
      expect(mockConstructorCalls).toHaveLength(1);
      expect(mockConstructorCalls[0].apiKey).toBe('phc_public_key');
    });
  });

  it('forwards track/identify/flush to the underlying PostHog instance', async () => {
    await new Promise<void>((resolveTest) => {
      jest.isolateModules(() => {
        jest.doMock('@/lib/env', () => ({
          publicEnv: { posthogApiKey: 'phc_public_key', sentryDsn: undefined },
        }));

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('./posthog-client') as typeof import('./posthog-client');
        const client = mod.createPostHogClient();
        if (!client) {
          throw new Error('expected PostHog client to be created');
        }

        client.track('grocery_item_added', { count: 2, privacy: 'analytics-safe' });
        client.identify('anon-uuid');

        expect(mockCaptureCalls).toHaveLength(1);
        expect(mockCaptureCalls[0].event).toBe('grocery_item_added');
        expect(mockIdentifyCalls).toEqual([
          { distinctId: 'anon-uuid', properties: undefined },
        ]);

        client.flush().then(() => {
          expect(mockFlushCalls).toHaveLength(1);
          resolveTest();
        });
      });
    });
  });
});
