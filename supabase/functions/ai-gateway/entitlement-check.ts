/**
 * T7.2 Entitlement verification — reads user_entitlements table.
 *
 * Fail-closed design:
 * - If the query errors, the user is treated as NOT premium.
 * - If no row exists, the user is free-tier.
 * - Only status === 'active' grants premium access.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.106.1';

export type EntitlementCheckResult = {
  isPremium: boolean;
  status: 'active' | 'expired' | 'none';
  expiresAt: string | null;
};

export async function checkEntitlement(
  supabase: SupabaseClient,
  userId: string,
): Promise<EntitlementCheckResult> {
  try {
    const { data, error } = await supabase
      .from('user_entitlements')
      .select('status, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ai-gateway] Entitlement check failed:', error.message);
      // Fail-closed
      return { isPremium: false, status: 'none', expiresAt: null };
    }

    if (!data) {
      return { isPremium: false, status: 'none', expiresAt: null };
    }

    const isPremium = data.status === 'active';

    // Double-check expiry hasn't passed (belt-and-suspenders with webhook)
    if (isPremium && data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        return { isPremium: false, status: 'expired', expiresAt: data.expires_at };
      }
    }

    return {
      isPremium,
      status: data.status as 'active' | 'expired' | 'none',
      expiresAt: data.expires_at ?? null,
    };
  } catch (err) {
    console.error('[ai-gateway] Entitlement check exception:', err);
    // Fail-closed
    return { isPremium: false, status: 'none', expiresAt: null };
  }
}
