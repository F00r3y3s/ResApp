import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';
import { getPreferencesRepository } from '@/features/onboarding/preferences-repository-provider';
import { useOnboardingGate } from '@/features/onboarding/use-onboarding-gate';
import { getPantryRepository } from '@/features/pantry/pantry-repository-provider';
import { getRecipesRepository } from '@/features/recipes/recipes-repository-provider';
import { TodayScreenContent } from '@/features/today/today-screen';

export default function TodayScreen() {
  const preferencesRepository = getPreferencesRepository();
  const { isReady } = useOnboardingGate(preferencesRepository);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={KitchenDesign.colors.orange} />
      </View>
    );
  }

  return (
    <TodayScreenContent
      preferencesRepository={preferencesRepository}
      pantryRepository={getPantryRepository()}
      recipesRepository={getRecipesRepository()}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.cream,
  },
});
