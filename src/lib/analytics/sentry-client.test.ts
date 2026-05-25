import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const initCalls: Record<string, unknown>[] = [];
const captureExceptionCalls: unknown[] = [];
const setUserCalls: (Record<string, unknown> | null)[] = [];

jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  init: (options: Record<string, unknown>) => initCalls.push(options),
  captureException: (error: unknown) => {
    captureExceptionCalls.push(error);
  },
  setUser: (user: Record<string, unknown> | null) => setUserCalls.push(user),
}));

describe('Sentry adapter (T12.1)', () => {
  beforeEach(() => {
    initCalls.length = 0;
    captureExceptionCalls.length = 0;
    setUserCalls.length = 0;
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('does not initialise Sentry when no public DSN is configured', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({
        publicEnv: { sentryDsn: undefined, posthogApiKey: undefined },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./sentry-client') as typeof import('./sentry-client');
      expect(mod.initSentry()).toBe(false);
      expect(initCalls).toHaveLength(0);
    });
  });

  it('initialises Sentry with the public DSN from publicEnv', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({
        publicEnv: {
          sentryDsn: 'https://public@o123.ingest.sentry.io/456',
          posthogApiKey: undefined,
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./sentry-client') as typeof import('./sentry-client');
      expect(mod.initSentry()).toBe(true);
      expect(initCalls).toHaveLength(1);
      expect(initCalls[0]).toMatchObject({
        dsn: 'https://public@o123.ingest.sentry.io/456',
      });
      // Default PII scrubbing must be on so we cannot leak personal data.
      expect(initCalls[0]).toMatchObject({ sendDefaultPii: false });
    });
  });

  it('captureException delegates to Sentry when initialised', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({
        publicEnv: {
          sentryDsn: 'https://public@o123.ingest.sentry.io/456',
          posthogApiKey: undefined,
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./sentry-client') as typeof import('./sentry-client');
      mod.initSentry();
      const error = new Error('boom');
      mod.captureException(error);
      expect(captureExceptionCalls).toEqual([error]);
    });
  });

  it('captureException is a no-op when Sentry is not initialised', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({
        publicEnv: { sentryDsn: undefined, posthogApiKey: undefined },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./sentry-client') as typeof import('./sentry-client');
      mod.captureException(new Error('no-op'));
      expect(captureExceptionCalls).toHaveLength(0);
    });
  });

  it('setAnonymousUser only forwards a distinct id (no email, no name)', () => {
    jest.isolateModules(() => {
      jest.doMock('@/lib/env', () => ({
        publicEnv: {
          sentryDsn: 'https://public@o123.ingest.sentry.io/456',
          posthogApiKey: undefined,
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./sentry-client') as typeof import('./sentry-client');
      mod.initSentry();
      mod.setAnonymousUser('anon-uuid-1234');
      expect(setUserCalls).toEqual([{ id: 'anon-uuid-1234' }]);
    });
  });
});
