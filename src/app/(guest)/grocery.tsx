import { getGroceryRepository } from '@/features/grocery/grocery-repository-provider';
import { GroceryScreenContent } from '@/features/grocery/grocery-screen';
import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';

export default function GroceryScreen() {
  return (
    <GroceryScreenContent
      repository={getGroceryRepository()}
      recipesRepository={getRecipesRepository()}
      pantryRepository={getPantryRepository()}
    />
  );
}
