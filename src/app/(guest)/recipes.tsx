import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';
import { RecipesScreenContent } from '@/features/recipes/recipes-screen';

export default function RecipesScreen() {
  return (
    <RecipesScreenContent
      repository={getRecipesRepository()}
      pantryRepository={getPantryRepository()}
    />
  );
}
