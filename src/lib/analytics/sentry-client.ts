import { publicEnv } from '@/lib/env';

let isInitialized = false;

type SentryModule = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown) => void;
  setUser: (user: Record<string, unknown> | null) => void;
};

function loadSentry(): SentryModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryModule;
  } catch {
    return null;
  }
}

/**
 * Initialise Sentry with the PUBLIC DSN only. Sentry DSNs are designed for
 * client SDKs (see https://docs.sentry.io/concepts/key-terms/dsn-explainer/).
 * The Sentry auth token, which would let an attacker upload sourcemaps or
 * read project data, is never bundled.
 *
 * Returns true if Sentry was initialised, false if no DSN is configured or
 * the SDK is unavailable.
 */
export function initSentry(): boolean {
  if (isInitialized) {
    return true;
  }

  if (!publicEnv.sentryDsn) {
    return false;
  }

  const sentry = loadSentry();
  if (!sentry) {
    return false;
  }

  sentry.init({
    dsn: publicEnv.sentryDsn,
    // Privacy-first defaults — we never want PII attached automatically.
    sendDefaultPii: false,
    // Keep performance data lightweight; explicit transactions opt-in.
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,
    enableNativeFramesTracking: false,
    attachStacktrace: true,
  });

  isInitialized = true;
  return true;
}

export function captureException(error: unknown): void {
  if (!isInitialized) {
    return;
  }

  const sentry = loadSentry();
  sentry?.captureException(error);
}

/**
 * Identify the current user with an opaque distinct id. Never pass an email,
 * username, or device id derived from PII. This satisfies the privacy-safe
 * "anonymous id only" requirement of the analytics class in the privacy
 * contract.
 */
export function setAnonymousUser(distinctId: string): void {
  if (!isInitialized) {
    return;
  }

  const sentry = loadSentry();
  sentry?.setUser({ id: distinctId });
}

/** For tests only — clears initialisation state between isolated module loads. */
export function _resetSentryForTests(): void {
  isInitialized = false;
}
