import {
    parseAnalyticsEvent,
    type AnalyticsEventInput,
    type AnalyticsEventName,
} from './events';

export type AnalyticsClient = {
  track: (event: string, properties: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  flush: () => Promise<void>;
};

export type AnalyticsDispatcher = {
  isEnabled: () => boolean;
  track: <TName extends AnalyticsEventName>(
    event: TName,
    properties?: AnalyticsEventInput<TName>,
  ) => boolean;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  flush: () => Promise<void>;
};

type DispatcherOptions = {
  /**
   * Called when the underlying client throws. Analytics is best-effort and
   * must never crash a feature, so by default errors are swallowed.
   */
  onError?: (error: unknown) => void;
};

const NOOP_CLIENT: AnalyticsClient = {
  track: () => undefined,
  identify: () => undefined,
  flush: async () => undefined,
};

function defaultOnError(error: unknown): void {
  // Best-effort logging that never bubbles up. Sentry captures crashes, not
  // analytics misconfigurations, so we just log to console at debug level.
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn('[analytics] dropped event due to client error:', error);
  }
}

/**
 * Build a dispatcher around any AnalyticsClient implementation. Pure factory
 * — no module-level state. Used directly in tests and by the singleton below.
 */
export function createAnalyticsDispatcher(
  client: AnalyticsClient,
  options: DispatcherOptions = {},
): AnalyticsDispatcher {
  const onError = options.onError ?? defaultOnError;
  const isNoop = client === NOOP_CLIENT;

  return {
    isEnabled() {
      return !isNoop;
    },
    track(event, properties) {
      const parsed = parseAnalyticsEvent(
        event,
        (properties ?? {}) as Record<string, unknown>,
      );

      if (!parsed.success) {
        onError(new Error(`[analytics] rejected event "${event}": ${parsed.error}`));
        return false;
      }

      try {
        client.track(event, parsed.data as Record<string, unknown>);
      } catch (error) {
        onError(error);
        return false;
      }

      // No-op clients accept the call but never reach a backend. Returning
      // false signals "the event was valid, but it didn't ship anywhere" so
      // tests and callers can detect missing configuration.
      return !isNoop;
    },
    identify(distinctId, properties) {
      try {
        client.identify(distinctId, properties);
      } catch (error) {
        onError(error);
      }
    },
    async flush() {
      try {
        await client.flush();
      } catch (error) {
        onError(error);
      }
    },
  };
}

let activeClient: AnalyticsClient = NOOP_CLIENT;
let dispatcher: AnalyticsDispatcher = createAnalyticsDispatcher(NOOP_CLIENT);

/**
 * Configure the singleton dispatcher with a real client (PostHog in
 * production). Safe to call multiple times — replaces the previous client.
 * Pass `null` to revert to no-op.
 */
export function configureAnalytics(
  client: AnalyticsClient | null,
  options?: DispatcherOptions,
): void {
  activeClient = client ?? NOOP_CLIENT;
  dispatcher = createAnalyticsDispatcher(activeClient, options);
}

/** Reset the singleton dispatcher — used by tests and by sign-out. */
export function resetAnalytics(): void {
  activeClient = NOOP_CLIENT;
  dispatcher = createAnalyticsDispatcher(NOOP_CLIENT);
}

export const Analytics: AnalyticsDispatcher = {
  isEnabled: () => dispatcher.isEnabled(),
  track: (event, properties) => dispatcher.track(event, properties),
  identify: (distinctId, properties) => dispatcher.identify(distinctId, properties),
  flush: () => dispatcher.flush(),
};
