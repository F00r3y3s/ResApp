/**
 * Route-level tests for the scan modal (T8.3 task 11).
 *
 * These tests are intentionally failing until task 12 wires `?type=receipt`
 * support into `(modals)/scan.tsx`. The route currently:
 *   - never reads `useLocalSearchParams`;
 *   - hard-codes `scanType: 'pantry-photo'` in the gateway request;
 *   - does not provide a grocery repository;
 *   - does not pass a `scanMode` to `ScanReviewScreenContent`.
 *
 * Once task 12 lands, all three cases below should pass.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Mocks — declared before the route import so jest.mock hoisting picks them
// up. Variable names must start with `mock` (case-insensitive) to satisfy
// jest's out-of-scope-variable safeguard for module factories.
// ---------------------------------------------------------------------------

const mockUseLocalSearchParams = jest.fn<() => Record<string, string | undefined>>();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

const mockRequest = jest.fn<(action: string, payload: unknown) => Promise<unknown>>();

jest.mock('@/features/ai-gateway/ai-gateway-provider', () => ({
  getAIGatewayClient: () => ({ request: mockRequest }),
}));

const mockPantryRepositoryStub = { tag: 'pantry-repo-stub' } as const;

jest.mock('@/features/pantry/pantry-repository-provider', () => ({
  getPantryRepository: () => mockPantryRepositoryStub,
}));

const mockGroceryRepositoryStub = { tag: 'grocery-repo-stub' } as const;

jest.mock('@/features/grocery/grocery-repository-provider', () => ({
  getGroceryRepository: () => mockGroceryRepositoryStub,
}));

type ScanReviewScreenSpyProps = {
  scanMode?: 'receipt' | 'pantry-photo';
  pantryRepository?: unknown;
  groceryRepository?: unknown;
  scanParseSender?: ((imageUri: string) => Promise<unknown>) | null;
};

const mockScreenSpy = jest.fn<(props: ScanReviewScreenSpyProps) => null>(() => null);

jest.mock('@/features/scan/scan-review-screen', () => ({
  ScanReviewScreenContent: (props: ScanReviewScreenSpyProps) => mockScreenSpy(props),
}));

// Import the route AFTER mocks so the mocked modules are picked up.
// eslint-disable-next-line import/first
import ScanModalRoute from '@/app/(modals)/scan';

function lastSpyProps(): ScanReviewScreenSpyProps {
  const calls = mockScreenSpy.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const last = calls[calls.length - 1];
  return last[0];
}

describe('ScanModalRoute (T8.3)', () => {
  beforeEach(() => {
    mockUseLocalSearchParams.mockReset();
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ items: [] });
    mockScreenSpy.mockClear();
  });

  it('routes ?type=receipt into receipt mode and supplies a grocery repository', async () => {
    mockUseLocalSearchParams.mockReturnValue({ type: 'receipt' });

    render(<ScanModalRoute />);

    const props = lastSpyProps();
    expect(props.scanMode).toBe('receipt');
    expect(props.groceryRepository).toBeDefined();
    expect(props.groceryRepository).toBe(mockGroceryRepositoryStub);
    expect(props.pantryRepository).toBe(mockPantryRepositoryStub);

    // Sender must forward `scanType: 'receipt'` to the AI gateway.
    expect(props.scanParseSender).not.toBeNull();
    expect(typeof props.scanParseSender).toBe('function');
    const sender = props.scanParseSender;
    if (typeof sender !== 'function') {
      throw new Error('scanParseSender should be a function in receipt mode');
    }

    await sender('test://image.jpg');

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith('scan-parse', {
      type: 'scan-parse',
      imageUrl: 'test://image.jpg',
      scanType: 'receipt',
    });
  });

  it('defaults to pantry-photo mode when no ?type query param is present', async () => {
    mockUseLocalSearchParams.mockReturnValue({});

    render(<ScanModalRoute />);

    const props = lastSpyProps();
    // Either explicit 'pantry-photo' or undefined is acceptable for the default —
    // both are equivalent in the screen's behavior. The critical guarantee is
    // that it is NOT 'receipt'.
    expect(props.scanMode === undefined || props.scanMode === 'pantry-photo').toBe(true);
    expect(props.groceryRepository).toBeUndefined();
    expect(props.pantryRepository).toBe(mockPantryRepositoryStub);

    const sender = props.scanParseSender;
    if (typeof sender !== 'function') {
      throw new Error('scanParseSender should be a function when the gateway is configured');
    }

    await sender('test://image.jpg');

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith('scan-parse', {
      type: 'scan-parse',
      imageUrl: 'test://image.jpg',
      scanType: 'pantry-photo',
    });
  });

  it('routes ?type=pantry-photo explicitly into pantry-photo mode', async () => {
    mockUseLocalSearchParams.mockReturnValue({ type: 'pantry-photo' });

    render(<ScanModalRoute />);

    const props = lastSpyProps();
    expect(props.scanMode === undefined || props.scanMode === 'pantry-photo').toBe(true);
    expect(props.groceryRepository).toBeUndefined();

    const sender = props.scanParseSender;
    if (typeof sender !== 'function') {
      throw new Error('scanParseSender should be a function when the gateway is configured');
    }

    await sender('test://image.jpg');

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith('scan-parse', {
      type: 'scan-parse',
      imageUrl: 'test://image.jpg',
      scanType: 'pantry-photo',
    });
  });
});
