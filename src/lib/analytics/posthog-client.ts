import { publicEnv } from '@/lib/env';

import type { AnalyticsClient } from './analytics';

/**
 * Adapter that implements the local AnalyticsClient interface against
 * posthog-react-native. Returns null when no public api key is configured —
 * the singleton dispatcher then stays in no-op mode, which is what we want
 * for Expo Go without secrets and for unit tests.
 *
 * Only the PUBLIC PostHog write key is read. PostHog's project api keys are
 * designed for client SDKs (see https://posthog.com/docs/api/post-only-public-endpoints)
 * and are intentionally embedded.
 */
export function createPostHogClient(): AnalyticsClient | null {
  if (!publicEnv.posthogApiKey) {
    return null;
  }

  let posthogModule: typeof import('posthog-react-native');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    posthogModule = require('posthog-react-native');
  } catch {
    return null;
  }

  const PostHogCtor =
    (posthogModule as { default?: unknown; PostHog?: unknown }).default ??
    (posthogModule as { PostHog?: unknown }).PostHog;

  if (typeof PostHogCtor !== 'function') {
    return null;
  }

  type PostHogInstance = {
    capture: (event: string, properties?: Record<string, unknown>) => void;
    identify: (distinctId: string, properties?: Record<string, unknown>) => void;
    flush: () => Promise<void>;
  };

  const Ctor = PostHogCtor as new (apiKey: string, options?: Record<string, unknown>) => PostHogInstance;

  const instance = new Ctor(publicEnv.posthogApiKey, {
    // Privacy-safe defaults: no autocapture of UI text, no session replay,
    // no auto person profiles unless we explicitly call identify().
    captureNativeAppLifecycleEvents: false,
    enableSessionReplay: false,
  });

  return {
    track(event, properties) {
      instance.capture(event, properties);
    },
    identify(distinctId, properties) {
      instance.identify(distinctId, properties);
    },
    async flush() {
      await instance.flush();
    },
  };
}
