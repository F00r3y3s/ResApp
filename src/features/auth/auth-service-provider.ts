import { supabase } from '@/lib/supabase';

import { createAuthService, type AuthService } from './auth-service';

let authService: AuthService | null = null;

/**
 * Returns the singleton AuthService instance.
 * Returns null if Supabase is not configured (no env vars).
 */
export function getAuthService(): AuthService | null {
  if (authService) {
    return authService;
  }

  if (!supabase) {
    return null;
  }

  authService = createAuthService(supabase);
  return authService;
}
