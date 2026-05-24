import { OnboardingScreenContent } from '@/features/onboarding/onboarding-screen';
import { getPreferencesRepository } from '@/features/onboarding/preferences-repository-provider';

export default function OnboardingScreen() {
  return <OnboardingScreenContent repository={getPreferencesRepository()} />;
}
