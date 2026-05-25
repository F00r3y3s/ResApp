/**
 * Usage gate — enforces free-tier limits and premium entitlement checks.
 *
 * Fail-closed design:
 * - If entitlement state cannot be verified, premium actions are BLOCKED.
 * - Free-tier limits are tracked locally for UX (showing "2 of 3 used")
 *   but the actual enforcement happens server-side for AI/scan calls.
 * - This module provides the client-side gate that prevents the UI from
 *   even attempting a premium action when the user clearly isn't entitled.
 */

import { getISOWeek } from 'date-fns';

import type { EntitlementState, UsageCounter } from './entitlement-types';
import { FREE_TIER_LIMITS } from './entitlement-types';

// ---------------------------------------------------------------------------
// Gate result
// ---------------------------------------------------------------------------

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: GateBlockReason };

export type GateBlockReason =
  | 'not-premium'
  | 'daily-ai-limit'
  | 'daily-scan-limit'
  | 'weekly-meal-plan-limit'
  | 'verification-failed';

// ---------------------------------------------------------------------------
// Action types that can be gated
// ---------------------------------------------------------------------------

export type GatedAction =
  | 'ai-suggestion'
  | 'scan'
  | 'ai-meal-plan'
  | 'premium-feature';

// ---------------------------------------------------------------------------
// Gate check
// ---------------------------------------------------------------------------

/**
 * Checks whether a gated action is allowed given the current entitlement
 * state and usage counters.
 *
 * Rules:
 * 1. Premium users can always perform any action.
 * 2. Free users are subject to daily/weekly limits.
 * 3. If entitlement state has never been verified (lastVerifiedAt is null
 *    and the action requires premium), fail closed.
 */
export function checkGate(
  action: GatedAction,
  entitlementState: EntitlementState,
  usage: UsageCounter,
  now?: Date,
): GateResult {
  // Premium users pass all gates
  if (entitlementState.isPremium) {
    return { allowed: true };
  }

  // Generic premium feature gate (no free-tier allowance)
  if (action === 'premium-feature') {
    return { allowed: false, reason: 'not-premium' };
  }

  // Ensure usage counters are for the current period
  const currentDate = now ?? new Date();
  const todayStr = toDateString(currentDate);
  const weekStr = toWeekString(currentDate);

  const effectiveUsage = normalizeUsage(usage, todayStr, weekStr);

  // Check per-action limits
  switch (action) {
    case 'ai-suggestion': {
      if (effectiveUsage.aiSuggestionsToday >= FREE_TIER_LIMITS.aiSuggestionsPerDay) {
        return { allowed: false, reason: 'daily-ai-limit' };
      }
      return { allowed: true };
    }
    case 'scan': {
      if (effectiveUsage.scansToday >= FREE_TIER_LIMITS.scansPerDay) {
        return { allowed: false, reason: 'daily-scan-limit' };
      }
      return { allowed: true };
    }
    case 'ai-meal-plan': {
      if (effectiveUsage.aiMealPlansThisWeek >= FREE_TIER_LIMITS.aiMealPlansPerWeek) {
        return { allowed: false, reason: 'weekly-meal-plan-limit' };
      }
      return { allowed: true };
    }
    default:
      return { allowed: false, reason: 'not-premium' };
  }
}

// ---------------------------------------------------------------------------
// Usage counter management
// ---------------------------------------------------------------------------

/**
 * Increments the appropriate counter for a completed action.
 * Returns a new UsageCounter (immutable).
 */
export function incrementUsage(
  usage: UsageCounter,
  action: GatedAction,
  now?: Date,
): UsageCounter {
  const currentDate = now ?? new Date();
  const todayStr = toDateString(currentDate);
  const weekStr = toWeekString(currentDate);

  const normalized = normalizeUsage(usage, todayStr, weekStr);

  switch (action) {
    case 'ai-suggestion':
      return { ...normalized, aiSuggestionsToday: normalized.aiSuggestionsToday + 1 };
    case 'scan':
      return { ...normalized, scansToday: normalized.scansToday + 1 };
    case 'ai-meal-plan':
      return { ...normalized, aiMealPlansThisWeek: normalized.aiMealPlansThisWeek + 1 };
    default:
      return normalized;
  }
}

/**
 * Returns remaining uses for a given action under free tier.
 */
export function remainingUses(
  action: GatedAction,
  usage: UsageCounter,
  now?: Date,
): number {
  const currentDate = now ?? new Date();
  const todayStr = toDateString(currentDate);
  const weekStr = toWeekString(currentDate);

  const normalized = normalizeUsage(usage, todayStr, weekStr);

  switch (action) {
    case 'ai-suggestion':
      return Math.max(0, FREE_TIER_LIMITS.aiSuggestionsPerDay - normalized.aiSuggestionsToday);
    case 'scan':
      return Math.max(0, FREE_TIER_LIMITS.scansPerDay - normalized.scansToday);
    case 'ai-meal-plan':
      return Math.max(0, FREE_TIER_LIMITS.aiMealPlansPerWeek - normalized.aiMealPlansThisWeek);
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * If the usage counters are from a different day/week, reset them.
 * This ensures stale counters don't incorrectly block actions.
 */
function normalizeUsage(
  usage: UsageCounter,
  todayStr: string,
  weekStr: string,
): UsageCounter {
  let result = usage;

  // Reset daily counters if date changed
  if (result.counterDate !== todayStr) {
    result = {
      ...result,
      aiSuggestionsToday: 0,
      scansToday: 0,
      counterDate: todayStr,
    };
  }

  // Reset weekly counters if week changed
  if (result.counterWeek !== weekStr) {
    result = {
      ...result,
      aiMealPlansThisWeek: 0,
      counterWeek: weekStr,
    };
  }

  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toWeekString(date: Date): string {
  const year = date.getUTCFullYear();
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
