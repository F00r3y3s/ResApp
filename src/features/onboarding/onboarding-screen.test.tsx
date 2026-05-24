import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { OnboardingScreenContent } from './onboarding-screen';
import type { GuestPreferences, GuestPreferencesInput, PreferencesRepository } from './preferences-repository';

const mockReplaceCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    replace: (href: string) => mockReplaceCalls.push(href),
  },
}));

function createTestRepository(): PreferencesRepository & { saved: GuestPreferences[] } {
  const saved: GuestPreferences[] = [];

  return {
    saved,
    async savePreferences(input: GuestPreferencesInput) {
      const preferences: GuestPreferences = {
        language: input.language,
        region: input.region,
        householdSize: Number(input.householdSize),
        dietaryRules: [...input.dietaryRules],
        allergies: [...input.allergies],
        cuisines: [...input.cuisines],
        goals: [...input.goals],
        privacy: 'local-only',
        updatedAt: '2026-05-24T10:00:00.000Z',
      };
      saved.push(preferences);
      return preferences;
    },
    async getPreferences() {
      return saved.at(-1) ?? null;
    },
  };
}

describe('OnboardingScreenContent', () => {
  it('persists guest preferences locally and moves to sync consent', async () => {
    mockReplaceCalls.length = 0;
    const repository = createTestRepository();

    render(<OnboardingScreenContent repository={repository} />);

    expect(screen.getByText('Language + region')).toBeTruthy();
    fireEvent.press(screen.getByText('Arabic'));
    fireEvent.press(screen.getByText('UAE / GCC'));
    fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Diet + household')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Increase household size'));
    fireEvent.press(screen.getByText('Halal'));
    fireEvent.press(screen.getByText('Peanuts'));
    fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Cuisine + goals')).toBeTruthy();
    fireEvent.press(screen.getByText('Indian'));
    fireEvent.press(screen.getByText('Reduce Waste'));
    fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('First pantry scan')).toBeTruthy();
    fireEvent.press(screen.getByText('Add manually'));

    expect(screen.getByText('First recipe import')).toBeTruthy();
    fireEvent.press(screen.getByText('Save preferences'));

    await waitFor(() => {
      expect(repository.saved).toEqual([
        expect.objectContaining({
          language: 'arabic',
          region: 'uae-gcc',
          householdSize: 5,
          dietaryRules: ['halal'],
          allergies: ['peanuts'],
          cuisines: ['indian'],
          goals: ['reduce-waste'],
        }),
      ]);
      expect(mockReplaceCalls).toContain('/sync-consent');
    });
  });
});
