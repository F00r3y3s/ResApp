import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

const captureExceptionCalls: unknown[] = [];

jest.mock('./sentry-client', () => ({
  __esModule: true,
  captureException: (error: unknown) => {
    captureExceptionCalls.push(error);
  },
  initSentry: () => false,
  setAnonymousUser: () => undefined,
}));

import { AppErrorBoundary } from './error-boundary';

class Boom extends Error {
  constructor() {
    super('boom in render');
  }
}

function ExplodingChild(): never {
  throw new Boom();
}

let originalConsoleError: typeof console.error;

beforeAll(() => {
  // React logs caught render errors to console.error; silence for assertion noise.
  originalConsoleError = console.error;
  console.error = () => undefined;
});

afterAll(() => {
  console.error = originalConsoleError;
});

beforeEach(() => {
  captureExceptionCalls.length = 0;
});

describe('AppErrorBoundary (T12.1)', () => {
  it('renders the kitchen-styled fallback when a child throws', () => {
    render(
      <AppErrorBoundary>
        <ExplodingChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something burned in the kitchen')).toBeTruthy();
    expect(screen.getByLabelText('Reset error and try again')).toBeTruthy();
  });

  it('reports the caught error to Sentry exactly once', () => {
    render(
      <AppErrorBoundary>
        <ExplodingChild />
      </AppErrorBoundary>,
    );

    expect(captureExceptionCalls).toHaveLength(1);
    expect((captureExceptionCalls[0] as Error).message).toBe('boom in render');
  });

  it('does not include user-facing copy that leaks the raw error message', () => {
    render(
      <AppErrorBoundary>
        <ExplodingChild />
      </AppErrorBoundary>,
    );

    // The privacy contract forbids telemetry from leaking content. The same
    // applies in reverse on screen — the raw error must not be displayed verbatim.
    expect(screen.queryByText('boom in render')).toBeNull();
  });

  it('renders children unchanged when no error occurs', () => {
    render(
      <AppErrorBoundary>
        <Text>healthy child</Text>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('healthy child')).toBeTruthy();
    expect(captureExceptionCalls).toHaveLength(0);
  });

  it('allows the user to reset and retry', () => {
    let shouldThrow = true;

    function MaybeBoom() {
      if (shouldThrow) {
        throw new Boom();
      }
      return <Text>recovered</Text>;
    }

    render(
      <AppErrorBoundary>
        <MaybeBoom />
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Something burned in the kitchen')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(screen.getByLabelText('Reset error and try again'));

    expect(screen.getByText('recovered')).toBeTruthy();
  });
});
