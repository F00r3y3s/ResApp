import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import { getPreferencesRepository } from '@/features/onboarding/preferences-repository-provider';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import type { Recipe } from '@/features/recipes/recipes-repository';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';
import { getChatRepository } from '@/features/smart-chef/chat-repository-provider';
import { ChatScreenContent } from '@/features/smart-chef/chat-screen';

/**
 * Route file for the Smart Chef chat screen (T7.3).
 *
 * - Free users: local Smart Chef Lite responses (no AI gateway calls)
 * - Premium users: AI gateway responses (T7.2 backend)
 *
 * Currently passes isPremium=false; T11.1 will wire RevenueCat entitlement.
 */
export default function SmartChefRoute() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [preferences, setPreferences] = useState<GuestPreferences | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const recipesRepo = getRecipesRepository();
      const pantryRepo = getPantryRepository();
      const preferencesRepo = getPreferencesRepository();

      const [loadedRecipes, loadedPantry, loadedPrefs] = await Promise.all([
        recipesRepo.listRecipes().catch(() => [] as Recipe[]),
        pantryRepo.listItems().catch(() => [] as PantryItem[]),
        preferencesRepo.getPreferences().catch(() => null),
      ]);

      if (isMounted) {
        setRecipes(loadedRecipes);
        setPantryItems(loadedPantry);
        setPreferences(loadedPrefs);
        setIsReady(true);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={KitchenDesign.colors.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ChatScreenContent
        chatRepository={getChatRepository()}
        recipes={recipes}
        pantryItems={pantryItems}
        preferences={preferences}
        isPremium={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
