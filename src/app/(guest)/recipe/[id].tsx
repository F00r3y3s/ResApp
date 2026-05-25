import { useLocalSearchParams } from 'expo-router';

import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import { RecipeDetailScreenContent } from '@/features/recipes/recipe-detail-screen';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';

export default function RecipeDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  return (
    <RecipeDetailScreenContent
      recipeId={id}
      repository={getRecipesRepository()}
      pantryRepository={getPantryRepository()}
    />
  );
}
