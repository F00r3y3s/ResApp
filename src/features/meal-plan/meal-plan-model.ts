import type { MealPlanDay, MealPlanEntry, MealSlot } from './meal-plan-repository';

export const MEAL_PLAN_DAYS: readonly MealPlanDay[] = [0, 1, 2, 3, 4, 5, 6];
export const MEAL_PLAN_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export const MEAL_PLAN_DAY_LABELS: Record<MealPlanDay, string> = {
  0: 'Mon',
  1: 'Tue',
  2: 'Wed',
  3: 'Thu',
  4: 'Fri',
  5: 'Sat',
  6: 'Sun',
};

export const MEAL_PLAN_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export type WeekDayLabel = {
  weekday: string;
  dayOfMonth: string;
};

export type WeekGridSlot = {
  slot: MealSlot;
  recipeId: string | null;
};

export type WeekGridDay = {
  day: MealPlanDay;
  weekday: string;
  dayOfMonth: string;
  iso: string;
  slots: WeekGridSlot[];
};

/**
 * Returns the Monday-aligned ISO date (YYYY-MM-DD, UTC) for the week
 * containing `reference`. Mirrors ISO 8601 weekly conventions, so Sunday
 * resolves to the previous Monday.
 */
export function getWeekStartIso(reference: Date): string {
  const utc = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
    ),
  );
  // getUTCDay: 0=Sun..6=Sat. Convert to Mon-aligned 0..6 then subtract.
  const dayIndexMonAligned = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - dayIndexMonAligned);
  return utc.toISOString().slice(0, 10);
}

export function addDaysIso(weekStartIso: string, dayOffset: number): string {
  const base = new Date(`${weekStartIso}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  return base.toISOString().slice(0, 10);
}

export function formatWeekDayLabel(weekStartIso: string, day: MealPlanDay): WeekDayLabel {
  const iso = addDaysIso(weekStartIso, day);
  const date = new Date(`${iso}T00:00:00.000Z`);
  const weekday = MEAL_PLAN_DAY_LABELS[day];
  const dayOfMonth = String(date.getUTCDate());
  return { weekday, dayOfMonth };
}

export type BuildWeekGridInput = {
  weekStartIso: string;
  entries: MealPlanEntry[];
};

export function buildWeekGrid({ weekStartIso, entries }: BuildWeekGridInput): WeekGridDay[] {
  const filtered = entries.filter((entry) => entry.weekStartIso === weekStartIso);
  const lookup = new Map<string, string>();
  for (const entry of filtered) {
    lookup.set(buildSlotKey(entry.day, entry.slot), entry.recipeId);
  }

  return MEAL_PLAN_DAYS.map((day) => {
    const { weekday, dayOfMonth } = formatWeekDayLabel(weekStartIso, day);
    return {
      day,
      weekday,
      dayOfMonth,
      iso: addDaysIso(weekStartIso, day),
      slots: MEAL_PLAN_SLOTS.map<WeekGridSlot>((slot) => ({
        slot,
        recipeId: lookup.get(buildSlotKey(day, slot)) ?? null,
      })),
    };
  });
}

function buildSlotKey(day: MealPlanDay, slot: MealSlot): string {
  return `${day}:${slot}`;
}
