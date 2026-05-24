import type { GuestPreferences } from '@/features/onboarding/preferences-repository';

export type TodaySummaryInput = {
  pantryExpiringCount: number;
  savedRecipeCount: number;
  groceryOpenCount: number;
  isOnline: boolean;
  hasAccount: boolean;
  preferences?: GuestPreferences | null;
};

export type TodayCard = {
  title: string;
  value: string;
  detail: string;
};

export type TodaySummary = {
  modeLabel: string;
  networkMessage: string;
  dinnerPlanLabel: string;
  preferenceMessage: string;
  cards: TodayCard[];
};

export function buildTodaySummary(input: TodaySummaryInput): TodaySummary {
  const modeLabel = input.hasAccount
    ? input.isOnline
      ? 'Synced household'
      : 'Account offline'
    : input.isOnline
      ? 'Guest local'
      : 'Guest offline';

  return {
    modeLabel,
    dinnerPlanLabel: buildDinnerPlanLabel(input.preferences),
    preferenceMessage: buildPreferenceMessage(input.preferences),
    networkMessage: input.isOnline
      ? 'Sync and online services unlock after account consent.'
      : 'Core cooking tools are available offline.',
    cards: [
      {
        title: 'Use soon',
        value: String(input.pantryExpiringCount),
        detail: 'Pantry items nearing expiry',
      },
      {
        title: 'Saved recipes',
        value: String(input.savedRecipeCount),
        detail: 'Available from local storage',
      },
      {
        title: 'Grocery queue',
        value: String(input.groceryOpenCount),
        detail: 'Offline edits wait for sync',
      },
    ],
  };
}

function buildDinnerPlanLabel(preferences: GuestPreferences | null | undefined): string {
  if (!preferences) {
    return 'Dinner plan for today';
  }

  const cuisineLabel = preferences.cuisines.slice(0, 2).map(formatOptionLabel).join(', ');
  const parts = [`Dinner plan for ${preferences.householdSize}`, formatRegionLabel(preferences.region)];

  if (cuisineLabel) {
    parts.push(cuisineLabel);
  }

  return parts.join(' · ');
}

function buildPreferenceMessage(preferences: GuestPreferences | null | undefined): string {
  if (!preferences) {
    return 'Cook from what your family already has.';
  }

  const parts: string[] = [];

  if (preferences.dietaryRules.length > 0) {
    parts.push(`${preferences.dietaryRules.map(formatOptionLabel).join(', ')} meals`);
  }

  if (preferences.allergies.length > 0) {
    parts.push(`avoiding ${preferences.allergies.map(formatOptionLabel).join(', ').toLocaleLowerCase()}`);
  }

  if (preferences.goals.length > 0) {
    parts.push(preferences.goals.slice(0, 1).map(formatOptionLabel).join(', ').toLocaleLowerCase());
  }

  return parts.length > 0 ? parts.join(' · ') : 'Cook from what your family already has.';
}

function formatRegionLabel(region: GuestPreferences['region']): string {
  const labels: Record<GuestPreferences['region'], string> = {
    'uae-gcc': 'UAE / GCC',
    india: 'India',
    pakistan: 'Pakistan',
    bangladesh: 'Bangladesh',
    turkey: 'Turkey',
    'uk-us': 'UK / US',
  };

  return labels[region];
}

function formatOptionLabel(option: string): string {
  return option
    .split('-')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}
