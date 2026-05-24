import { TodayScreenContent } from '@/features/today/today-screen';
import { getPreferencesRepository } from '@/features/onboarding/preferences-repository-provider';

export default function TodayScreen() {
  return <TodayScreenContent preferencesRepository={getPreferencesRepository()} />;
}
