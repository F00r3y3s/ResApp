import { describe, expect, it } from '@jest/globals';

import {
    buildWeekGrid,
    formatWeekDayLabel,
    getWeekStartIso,
    MEAL_PLAN_DAYS,
    MEAL_PLAN_SLOTS,
} from './meal-plan-model';
import type { MealPlanEntry } from './meal-plan-repository';

describe('meal plan model', () => {
  it('exposes 7 days and 3 slots in stable order', () => {
    expect(MEAL_PLAN_DAYS).toHaveLength(7);
    expect(MEAL_PLAN_SLOTS).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('returns the Monday-aligned ISO week start for any weekday', () => {
    expect(getWeekStartIso(new Date('2026-05-25T08:00:00.000Z'))).toBe('2026-05-25');
    expect(getWeekStartIso(new Date('2026-05-27T23:30:00.000Z'))).toBe('2026-05-25');
    expect(getWeekStartIso(new Date('2026-05-31T12:00:00.000Z'))).toBe('2026-05-25');
    expect(getWeekStartIso(new Date('2026-06-01T00:00:00.000Z'))).toBe('2026-06-01');
    // Sunday should still resolve to the previous Monday.
    expect(getWeekStartIso(new Date('2026-05-24T12:00:00.000Z'))).toBe('2026-05-18');
  });

  it('formats a calendar label for each day in the week', () => {
    expect(formatWeekDayLabel('2026-05-25', 0)).toEqual({
      weekday: 'Mon',
      dayOfMonth: '25',
    });
    expect(formatWeekDayLabel('2026-05-25', 6)).toEqual({
      weekday: 'Sun',
      dayOfMonth: '31',
    });
  });

  it('builds an empty 7x3 grid when no entries exist', () => {
    const grid = buildWeekGrid({ weekStartIso: '2026-05-25', entries: [] });

    expect(grid).toHaveLength(7);
    grid.forEach((day) => {
      expect(day.slots).toHaveLength(3);
      expect(day.slots.every((slot) => slot.recipeId === null)).toBe(true);
    });

    expect(grid[0].weekday).toBe('Mon');
    expect(grid[0].slots.map((slot) => slot.slot)).toEqual(['breakfast', 'lunch', 'dinner']);
  });

  it('places entries onto their day/slot cell and ignores unrelated weeks', () => {
    const entries: MealPlanEntry[] = [
      {
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'breakfast',
        recipeId: 'seed-001',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
      {
        weekStartIso: '2026-05-25',
        day: 3,
        slot: 'dinner',
        recipeId: 'seed-002',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
      {
        weekStartIso: '2026-06-01',
        day: 0,
        slot: 'breakfast',
        recipeId: 'seed-other',
        privacy: 'local-only',
        createdAt: '2026-06-01T08:00:00.000Z',
        updatedAt: '2026-06-01T08:00:00.000Z',
      },
    ];

    const grid = buildWeekGrid({ weekStartIso: '2026-05-25', entries });

    expect(grid[0].slots.find((slot) => slot.slot === 'breakfast')?.recipeId).toBe('seed-001');
    expect(grid[3].slots.find((slot) => slot.slot === 'dinner')?.recipeId).toBe('seed-002');
    expect(grid[1].slots.every((slot) => slot.recipeId === null)).toBe(true);
  });

  it('counts how many of the 21 weekly slots are filled', () => {
    const entries: MealPlanEntry[] = [
      {
        weekStartIso: '2026-05-25',
        day: 0,
        slot: 'breakfast',
        recipeId: 'seed-001',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
      {
        weekStartIso: '2026-05-25',
        day: 1,
        slot: 'lunch',
        recipeId: 'seed-002',
        privacy: 'local-only',
        createdAt: '2026-05-25T08:00:00.000Z',
        updatedAt: '2026-05-25T08:00:00.000Z',
      },
    ];

    const grid = buildWeekGrid({ weekStartIso: '2026-05-25', entries });
    const filled = grid.flatMap((day) => day.slots).filter((slot) => slot.recipeId !== null);
    expect(filled).toHaveLength(2);
  });
});
