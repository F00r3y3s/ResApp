/**
 * T7.2 Rate limiter — enforces free-tier daily AI request limits.
 *
 * Uses the ai_usage table with an atomic upsert to prevent race conditions.
 * Free-tier limit: 3 AI requests per day (matches FREE_TIER_LIMITS.aiSuggestionsPerDay).
 *
 * Design:
 * - Atomic increment via upsert + raw SQL to avoid TOCTOU races.
 * - Returns the current count so the client can display "2 of 3 used".
 * - Premium users skip this check entirely (handled in the main handler).
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.106.1';
import type { AIGatewayAction } from './types.ts';

const FREE_TIER_DAILY_LIMIT = 3;

export type RateLimitResult =
  | { allowed: true; used: number; limit: number }
  | { allowed: false; used: number; limit: number; message: string; resetAt: string };

export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
  _action: AIGatewayAction,
): Promise<RateLimitResult> {
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Atomic upsert: insert with count=1 or increment existing count
    const { data, error } = await supabase.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_date: today,
      p_limit: FREE_TIER_DAILY_LIMIT,
    });

    if (error) {
      // If the RPC doesn't exist yet, fall back to manual check
      console.error('[ai-gateway] RPC increment_ai_usage failed, using fallback:', error.message);
      return await fallbackCheckAndIncrement(supabase, userId, today);
    }

    // RPC returns { allowed: boolean, request_count: number }
    const result = data as { allowed: boolean; request_count: number };

    if (!result.allowed) {
      const resetAt = getNextDayMidnight();
      return {
        allowed: false,
        used: result.request_count,
        limit: FREE_TIER_DAILY_LIMIT,
        message: `Daily AI limit reached (${FREE_TIER_DAILY_LIMIT} requests). Resets at midnight UTC.`,
        resetAt,
      };
    }

    return { allowed: true, used: result.request_count, limit: FREE_TIER_DAILY_LIMIT };
  } catch (err) {
    console.error('[ai-gateway] Rate limiter exception:', err);
    // Fail-open for rate limiting (don't block users due to internal errors)
    // But log it — this is a monitoring signal
    return { allowed: true, used: 0, limit: FREE_TIER_DAILY_LIMIT };
  }
}

/**
 * Fallback rate limiting without the RPC (for initial deployment before
 * the RPC migration is applied).
 */
async function fallbackCheckAndIncrement(
  supabase: SupabaseClient,
  userId: string,
  today: string,
): Promise<RateLimitResult> {
  // Read current usage
  const { data: existing } = await supabase
    .from('ai_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  const currentCount = existing?.request_count ?? 0;

  if (currentCount >= FREE_TIER_DAILY_LIMIT) {
    const resetAt = getNextDayMidnight();
    return {
      allowed: false,
      used: currentCount,
      limit: FREE_TIER_DAILY_LIMIT,
      message: `Daily AI limit reached (${FREE_TIER_DAILY_LIMIT} requests). Resets at midnight UTC.`,
      resetAt,
    };
  }

  // Increment (upsert)
  await supabase
    .from('ai_usage')
    .upsert(
      {
        user_id: userId,
        usage_date: today,
        request_count: currentCount + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,usage_date' },
    );

  return { allowed: true, used: currentCount + 1, limit: FREE_TIER_DAILY_LIMIT };
}

function getNextDayMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
