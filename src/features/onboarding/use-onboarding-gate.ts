import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import type { PreferencesRepository } from './preferences-repository';

type OnboardingGateState = {
  /** True once the preference check has completed (regardless of outcome). */
  isReady: boolean;
};

/**
 * Checks whether onboarding preferences exist.
 * If not, redirects to the onboarding flow.
 *
 * Use in the Today screen (or root guest screen) to gate first-launch users.
 */
export function useOnboardingGate(repository: PreferencesRepository): OnboardingGateState {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkPreferences() {
      const preferences = await repository.getPreferences();

      if (!isMounted) return;

      if (preferences === null) {
        router.replace('/onboarding');
      }

      setIsReady(true);
    }

    checkPreferences();

    return () => {
      isMounted = false;
    };
  }, [repository]);

  return { isReady };
}
