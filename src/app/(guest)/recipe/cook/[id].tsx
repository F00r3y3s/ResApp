import { useLocalSearchParams } from 'expo-router';

import { CookModeScreenContent } from '@/features/cook/cook-mode-screen';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';

export default function CookModeRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  return <CookModeScreenContent recipeId={id} repository={getRecipesRepository()} />;
}
