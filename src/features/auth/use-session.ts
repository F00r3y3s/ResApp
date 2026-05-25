import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import type { AuthService } from './auth-service';

export type SessionState = {
  /** Current session, null if not authenticated. */
  session: Session | null;
  /** True once the initial session check has completed. */
  isReady: boolean;
  /** True if the user has an active session. */
  isAuthenticated: boolean;
};

/**
 * Hook that tracks the current auth session.
 * Returns isReady=false until the initial session check completes.
 */
export function useSession(authService: AuthService | null): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!authService) {
      setIsReady(true);
      return;
    }

    let isMounted = true;

    async function loadSession() {
      const currentSession = await authService!.getSession();
      if (isMounted) {
        setSession(currentSession);
        setIsReady(true);
      }
    }

    loadSession();

    const unsubscribe = authService.onAuthStateChange((nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [authService]);

  return {
    session,
    isReady,
    isAuthenticated: session !== null,
  };
}
