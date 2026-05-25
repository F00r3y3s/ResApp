import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { getAuthService } from './auth-service-provider';

type RequireAuthState = {
  /** True once the auth check has completed and user is authenticated. */
  isAuthenticated: boolean;
  /** True while the auth check is in progress. */
  isChecking: boolean;
};

/**
 * Hook for account-required features (sync, sharing, AI, purchases).
 * Redirects to the auth welcome screen if no session exists.
 *
 * Usage: call at the top of any screen that requires authentication.
 * Show a loading state while `isChecking` is true.
 */
export function useRequireAuth(): RequireAuthState {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const authService = getAuthService();

      if (!authService) {
        // Supabase not configured — redirect to auth
        if (isMounted) {
          setIsChecking(false);
          router.replace('/welcome');
        }
        return;
      }

      const session = await authService.getSession();

      if (!isMounted) return;

      if (session) {
        setIsAuthenticated(true);
      } else {
        router.replace('/welcome');
      }

      setIsChecking(false);
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isAuthenticated, isChecking };
}
