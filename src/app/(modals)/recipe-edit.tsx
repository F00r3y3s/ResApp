import { RecipeFormScreenContent } from '@/features/recipes/recipe-form-screen';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';

export default function RecipeEditModalRoute() {
  return <RecipeFormScreenContent repository={getRecipesRepository()} />;
}
