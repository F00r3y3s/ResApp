import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

import type { PreferencesRepository } from './preferences-repository';
import { useOnboardingGate } from './use-onboarding-gate';

const mockReplaceCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    replace: (href: string) => mockReplaceCalls.push(href),
  },
}));

function createMockRepository(hasPreferences: boolean): PreferencesRepository {
  return {
    getPreferences: async () =>
      hasPreferences
        ? {
            language: 'english' as const,
            region: 'uae-gcc' as const,
            householdSize: 4,
            dietaryRules: ['halal'],
            allergies: [],
            cuisines: ['levantine'],
            goals: ['quick-dinners'],
            privacy: 'local-only' as const,
            updatedAt: '2026-05-24T09:00:00.000Z',
          }
        : null,
    savePreferences: jest.fn() as PreferencesRepository['savePreferences'],
  };
}

describe('useOnboardingGate', () => {
  beforeEach(() => {
    mockReplaceCalls.length = 0;
  });

  it('redirects to /onboarding when no preferences exist', async () => {
    const repository = createMockRepository(false);

    const { result } = renderHook(() => useOnboardingGate(repository));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(mockReplaceCalls).toContain('/onboarding');
  });

  it('does not redirect when preferences already exist', async () => {
    const repository = createMockRepository(true);

    const { result } = renderHook(() => useOnboardingGate(repository));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(mockReplaceCalls).toHaveLength(0);
  });

  it('reports loading state while checking preferences', () => {
    const repository = createMockRepository(true);

    const { result } = renderHook(() => useOnboardingGate(repository));

    // Initially not ready (async check in progress)
    expect(result.current.isReady).toBe(false);
  });
});
