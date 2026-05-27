import { getMealPlanRepository } from '@/features/meal-plan/meal-plan-repository-provider';
import { MealPlanScreenContent } from '@/features/meal-plan/meal-plan-screen';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';

export default function PlannerScreen() {
  return (
    <MealPlanScreenContent
      repository={getMealPlanRepository()}
      recipesRepository={getRecipesRepository()}
    />
  );
}
