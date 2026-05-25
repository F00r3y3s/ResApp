import { getPreferencesRepository } from '@/features/onboarding/preferences-repository-provider';
import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';
import { TodayScreenContent } from '@/features/today/today-screen';

export default function TodayScreen() {
  return (
    <TodayScreenContent
      preferencesRepository={getPreferencesRepository()}
      pantryRepository={getPantryRepository()}
      recipesRepository={getRecipesRepository()}
    />
  );
}
