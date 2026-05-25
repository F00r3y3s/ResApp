import { SafeAreaView, StyleSheet } from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';
import { SmartChefScreenContent } from '@/features/smart-chef/smart-chef-screen';

/**
 * Route file for the Smart Chef screen.
 * Behavior lives in src/features/smart-chef/. This file handles route
 * composition and data loading only.
 *
 * TODO: Wire up real repositories once DI/context is available at this layer.
 * For now this renders the content component with empty defaults so the route
 * is navigable and the screen is testable via SmartChefScreenContent directly.
 */
export default function SmartChefRoute() {
  const recipes: Recipe[] = [];
  const pantryItems: PantryItem[] = [];
  const preferences: GuestPreferences | null = null;

  return (
    <SafeAreaView style={styles.safe}>
      <SmartChefScreenContent
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={preferences}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
});
