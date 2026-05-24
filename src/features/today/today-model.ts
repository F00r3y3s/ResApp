export type TodaySummaryInput = {
  pantryExpiringCount: number;
  savedRecipeCount: number;
  groceryOpenCount: number;
  isOnline: boolean;
  hasAccount: boolean;
};

export type TodayCard = {
  title: string;
  value: string;
  detail: string;
};

export type TodaySummary = {
  modeLabel: string;
  networkMessage: string;
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
